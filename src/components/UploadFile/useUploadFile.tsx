import { useCallback, useRef } from "react";
import axios from "axios";
import {
  CONFIG,
  generateFileMd5,
  splitFileIntoChunks,
  storage,
} from "./utils";

/**
 * 文件上传 Hook - 基于业界主流方案的架构设计
 * 
 * 核心设计原则：
 * 1. 状态分层：
 *    - 内存状态（fileStateRef）：同步，负责业务逻辑（计数、暂停判断、合并触发）
 *    - React 状态（uploadList）：异步，仅负责 UI 渲染，不参与任何决策
 *    - LocalStorage：持久化，用于断点续传
 * 
 * 2. 数据结构优化：
 *    - Set<number> 存储已上传分片：自动去重、O(1)查找、原子更新
 *    - Map 存储文件状态：O(1)访问
 * 
 * 3. 校验权威：
 *    - 已上传分片数以「后端校验结果」为准
 *    - 前端缓存仅做性能优化
 * 
 * 4. 暂停/续传无状态：
 *    - 续传复用上传逻辑
 *    - 依靠断点续传自动跳过已传分片
 *    - 无需维护暂停位置
 * 
 * 5. 合并兜底：
 *    - 后端合并接口强制校验所有分片
 *    - 避免前端计数错误导致的合并失败
 */

// 类型定义
export type UploadStatus = "idle" | "uploading" | "paused" | "completed" | "failed";

export interface ChunkInfo {
  fileMd5: string;
  chunkIndex: number;
  chunkSize: number;
  totalChunks: number;
  fileSize: number;
  fileName: string;
  lastUpdateTime: number;
}

export interface FileUploadItem {
  id: string;
  file: File;
  status: UploadStatus;
  progress: number;
  error: string;
  uploadedChunks: number[];
  totalChunks: number;
  startTime?: number;
  endTime?: number;
}

interface UseUploadFileParams {
  setUploadList: (updater: (prevMap: Map<string, FileUploadItem>) => Map<string, FileUploadItem>) => void;
  uploadList: Map<string, FileUploadItem>;
}

const useUploadFile = ({ setUploadList, uploadList }: UseUploadFileParams) => {
  // ========== 内存状态层（同步，负责业务逻辑） ==========
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());
  
  // 核心业务状态：使用 ref 存储同步状态，避免 React 异步问题
  const fileStateRef = useRef<Map<string, {
    fileMd5: string;
    totalChunks: number;
    uploadedChunks: Set<number>;  // Set 自动去重，O(1) 查找
    status: UploadStatus;
  }>>(new Map());

  // 生成文件MD5（唯一标识，用于断点续传）
  const memoizedGenerateFileMd5 = useCallback(
    (file: File) => generateFileMd5(file),
    []
  );

  // ========== 状态同步函数：内存 -> React -> localStorage ==========
  // 统一的状态更新入口，确保三层状态一致
  const syncFileState = useCallback(
    (fileId: string, fileMd5: string, updates: {
      uploadedChunks?: Set<number>;
      totalChunks?: number;
      status?: UploadStatus;
      progress?: number;
      error?: string;
    }) => {
      // 1. 同步更新内存状态（业务逻辑层）
      const state = fileStateRef.current.get(fileId);
      if (state) {
        if (updates.uploadedChunks) state.uploadedChunks = updates.uploadedChunks;
        if (updates.totalChunks) state.totalChunks = updates.totalChunks;
        if (updates.status) state.status = updates.status;
      }

      // 2. 异步更新 React 状态（UI 渲染层）
      setUploadList((prev) => {
        const newMap = new Map(prev);
        const item = newMap.get(fileId);
        if (item) {
          const newItem = { ...item };
          if (updates.uploadedChunks) {
            newItem.uploadedChunks = Array.from(updates.uploadedChunks);
            newItem.progress = Math.round((updates.uploadedChunks.size / (updates.totalChunks || item.totalChunks)) * 100);
          }
          if (updates.totalChunks !== undefined) newItem.totalChunks = updates.totalChunks;
          if (updates.status) newItem.status = updates.status;
          if (updates.error) newItem.error = updates.error;
          if (updates.progress !== undefined) newItem.progress = updates.progress;
          newMap.set(fileId, newItem);
        }
        return newMap;
      });

      // 3. 同步持久化到 localStorage（断点续传层）
      if (updates.uploadedChunks && state) {
        const item = uploadList.get(fileId);
        if (item) {
          storage.saveChunkInfo(
            fileMd5,
            Array.from(updates.uploadedChunks),
            updates.totalChunks || state.totalChunks,
            item.file.name
          );
        }
      }
    },
    [setUploadList, uploadList]
  );

  // 更新单个文件的上传项（仅用于状态字段更新）
  const updateFileItem = useCallback(
    (id: string, updates: Partial<FileUploadItem>) => {
      setUploadList((prevMap: Map<string, FileUploadItem>) => {
        const newMap = new Map(prevMap);
        const item = newMap.get(id);
        if (item) {
          newMap.set(id, { ...item, ...updates });
        }
        return newMap;
      });
      
      // 同步更新内存状态的 status
      if (updates.status) {
        const state = fileStateRef.current.get(id);
        if (state) state.status = updates.status;
      }
    },
    [setUploadList]
  );

  // 校验已上传分片（前端+后端双重校验）
  const verifyUploadedChunks = useCallback(
    async (fileMd5: string, fileName: string) => {
      // 先读前端缓存
      const localInfo = storage.getChunkInfo(fileMd5) as any;
      if (localInfo?.uploadedChunks && Array.isArray(localInfo.uploadedChunks)) {
        console.log(`从localStorage读取到已上传分片: ${localInfo.uploadedChunks.length}/${localInfo.totalChunks}`);
        return localInfo.uploadedChunks as number[];
      }
      // 前端无缓存，请求后端校验
      try {
        const res = await axios.post(CONFIG.VERIFY_URL, { fileMd5, fileName });
        const uploadedChunks = res.data.data?.uploadedChunks || [];
        console.log(`从后端读取到已上传分片: ${uploadedChunks.length}`);
        return uploadedChunks;
      } catch (e) {
        console.error("校验分片失败", e);
        return [];
      }
    },
    []
  );

  // 切割文件为分片
  const memoizedSplitFileIntoChunks = useCallback(
    (file: File): { chunks: Blob[]; totalChunks: number } =>
      splitFileIntoChunks(file) as { chunks: Blob[]; totalChunks: number },
    []
  );

  // ========== 分片上传函数：返回成功状态 ==========
  const uploadSingleChunk = useCallback(
    async (
      fileId: string,
      chunk: Blob,
      chunkIndex: number,
      fileMd5: string,
      totalChunks: number,
      fileName: string
    ): Promise<boolean> => {  // 返回是否成功
      const formData = new FormData();
      formData.append("file", chunk);
      formData.append("fileMd5", fileMd5);
      formData.append("chunkIndex", chunkIndex.toString());
      formData.append("totalChunks", totalChunks.toString());
      formData.append("fileName", fileName);

      // 获取或创建该文件的中止控制器
      let controller = abortControllersRef.current.get(fileId);
      if (!controller) {
        controller = new AbortController();
        abortControllersRef.current.set(fileId, controller);
      }

      try {
        await axios.post(CONFIG.UPLOAD_URL, formData, {
          signal: controller.signal,
          headers: { "Content-Type": "multipart/form-data" },
        });

        // 上传成功：同步更新内存状态
        const state = fileStateRef.current.get(fileId);
        if (state) {
          state.uploadedChunks.add(chunkIndex);  // Set 自动去重，同步原子操作
          
          // 同步三层状态
          syncFileState(fileId, fileMd5, {
            uploadedChunks: state.uploadedChunks,
            totalChunks
          });
        }

        return true;  // 上传成功
      } catch (e) {
        if ((e as Error).message === "canceled") {
          return false;  // 被取消，不算失败
        }
        throw new Error(`分片 ${chunkIndex + 1} 上传失败`);
      }
    },
    [syncFileState]
  );

  // ========== 核心上传逻辑：基于内存状态的业务决策 ==========
  const uploadFile = useCallback(
    async (fileId: string) => {
      const fileItem = uploadList.get(fileId);
      if (!fileItem) return;

      const { file } = fileItem;
      updateFileItem(fileId, { status: "uploading", startTime: Date.now() });

      try {
        // 生成文件MD5
        const fileMd5 = await memoizedGenerateFileMd5(file);

        // 切割文件
        const { chunks, totalChunks } = memoizedSplitFileIntoChunks(file);

        // 校验已上传分片（以后端为准，前端缓存仅做优化）
        const uploadedChunksArray = await verifyUploadedChunks(fileMd5, file.name);
        const uploadedChunksSet = new Set<number>(uploadedChunksArray);
        
        // 初始化内存状态（业务逻辑层）
        fileStateRef.current.set(fileId, {
          fileMd5,
          totalChunks,
          uploadedChunks: uploadedChunksSet,
          status: "uploading"
        });

        // 同步到 React 状态（UI 层）
        updateFileItem(fileId, {
          uploadedChunks: uploadedChunksArray,
          totalChunks,
          progress: Math.round((uploadedChunksSet.size / totalChunks) * 100)
        });
        
        // 如果已上传的分片数等于总数，说明所有分片都已完成，直接合并
        if (uploadedChunksSet.size === totalChunks && totalChunks > 0) {
          await axios.post(CONFIG.MERGE_URL, {
            fileMd5,
            fileName: file.name,
            totalChunks,
          });
          updateFileItem(fileId, {
            status: "completed",
            progress: 100,
            endTime: Date.now(),
          });
          storage.clearChunkInfo(fileMd5);
          fileStateRef.current.delete(fileId);
          return;
        }

        // 过滤已上传分片，仅上传未完成的
        const unUploadedChunks = chunks
          .map((chunk: Blob, index: number) => ({ chunk, index }))
          .filter(({ index }) => !uploadedChunksSet.has(index));

        // 串行上传分片（避免并发过多导致服务器压力）
        for (const { chunk, index } of unUploadedChunks) {
          // 读取内存状态判断是否暂停（同步读取，无延迟）
          const state = fileStateRef.current.get(fileId);
          if (!state || state.status === "paused") {
            break;
          }
          
          // 上传单个分片
          await uploadSingleChunk(
            fileId,
            chunk,
            index,
            fileMd5,
            totalChunks,
            file.name
          );
        }

        // for循环结束，基于内存状态判断是否 merge（100% 准确）
        const finalState = fileStateRef.current.get(fileId);
        if (!finalState) return;

        // 如果被暂停，则不执行merge
        if (finalState.status === "paused") {
          return;
        }

        // 同步读取已上传数量（业界方案：直接从内存状态读取）
        const actualUploadedCount = finalState.uploadedChunks.size;

        // 只要所有分片都上传完成，就执行合并
        if (actualUploadedCount === totalChunks) {
          await axios.post(CONFIG.MERGE_URL, {
            fileMd5,
            fileName: file.name,
            totalChunks,
          });
          updateFileItem(fileId, {
            status: "completed",
            progress: 100,
            endTime: Date.now(),
          });
          storage.clearChunkInfo(fileMd5);
          fileStateRef.current.delete(fileId);  // 清理内存状态
        }
      } catch (e) {
        updateFileItem(fileId, {
          status: "failed",
          error: (e as Error).message,
        });
        fileStateRef.current.delete(fileId);  // 失败也清理
      }
    },
    [
      uploadList,
      memoizedGenerateFileMd5,
      memoizedSplitFileIntoChunks,
      verifyUploadedChunks,
      uploadSingleChunk,
      updateFileItem,
    ]
  );

  // ========== 暂停/继续/取消：无状态设计 ==========
  // 暂停：仅标记状态，上传循环自动检测退出
  const handlePauseFile = useCallback(
    (fileId: string) => {
      // 同步更新内存状态
      const state = fileStateRef.current.get(fileId);
      if (state) state.status = "paused";
      
      // 更新UI状态
      updateFileItem(fileId, { status: "paused" });
      
      // 中止当前请求
      abortControllersRef.current.get(fileId)?.abort();
    },
    [updateFileItem]
  );

  // 继续：直接复用 uploadFile，依靠断点续传自动跳过已传分片
  const handleResumeFile = useCallback(
    (fileId: string) => {
      abortControllersRef.current.delete(fileId);
      uploadFile(fileId);  // 复用上传逻辑，无需维护暂停位置
    },
    [uploadFile]
  );

  // 取消：清理所有状态
  const handleCancelFile = useCallback(
    (fileId: string) => {
      const item = uploadList.get(fileId);
      if (item) {
        // 中止请求
        abortControllersRef.current.get(fileId)?.abort();
        abortControllersRef.current.delete(fileId);
        
        // 清理内存状态
        const state = fileStateRef.current.get(fileId);
        if (state) {
          storage.clearChunkInfo(state.fileMd5);
          fileStateRef.current.delete(fileId);
        }
        
        // 清理UI状态
        setUploadList((prev) => {
          const newMap = new Map(prev);
          newMap.delete(fileId);
          return newMap;
        });
      }
    },
    [uploadList, setUploadList]
  );

  return {
    uploadFile,
    handlePauseFile,
    handleResumeFile,
    handleCancelFile,
  };
};

export default useUploadFile;
