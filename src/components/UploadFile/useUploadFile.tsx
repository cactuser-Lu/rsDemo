import { useCallback, useRef } from "react";
import axios from "axios";
import {
  CONFIG,
  generateFileMd5,
  splitFileIntoChunks,
  storage,
} from "./utils";

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
  // 引用存储
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());

  // 生成文件MD5（唯一标识，用于断点续传）
  const memoizedGenerateFileMd5 = useCallback(
    (file: File) => generateFileMd5(file),
    []
  );

  // 更新单个文件的上传项
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
    },
    [setUploadList]
  );

  // 校验已上传分片（前端+后端双重校验）
  const verifyUploadedChunks = useCallback(
    async (fileMd5: string, fileName: string) => {
      // 先读前端缓存
      const localInfo = storage.getChunkInfo(fileMd5) as any;
      if (localInfo?.uploadedChunks) {
        return localInfo.uploadedChunks as number[];
      }
      // 前端无缓存，请求后端校验
      try {
        const res = await axios.post(CONFIG.VERIFY_URL, { fileMd5, fileName });
        return res.data.uploadedChunks || [];
      } catch (e) {
        throw new Error("校验分片失败，请重试");
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

  // 上传单个分片
  const uploadSingleChunk = useCallback(
    async (
      fileId: string,
      chunk: Blob,
      chunkIndex: number,
      fileMd5: string,
      totalChunks: number,
      fileName: string
    ) => {
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

        // 获取当前文件项并更新已上传分片
        // const currentItem = uploadList.get(fileId);
        // if (currentItem) {
        //   const newUploadedChunks = [...(currentItem.uploadedChunks || []), chunkIndex];
        //   const newProgress = Math.round((newUploadedChunks.length / totalChunks) * 100);
        //   updateFileItem(fileId, {
        //     uploadedChunks: newUploadedChunks,
        //     progress: newProgress,
        //   });
        // }

        // setUploadList((prev) => {
        //   const newMap = new Map(prev);
        //   const cur = newMap.get(fileId);
        //   if (cur) {
        //     const newUploadedChunks = [...(cur.uploadedChunks || []), chunkIndex];
        //     const newProgress = Math.round((newUploadedChunks.length / totalChunks) * 100);
        //     newMap.set(fileId, { ...cur, uploadedChunks: newUploadedChunks, progress: newProgress });
        //   }
        //   return newMap;
        // });

        // 更新本地存储
        storage.saveChunkInfo({
          fileMd5,
          chunkIndex,
          chunkSize: CONFIG.CHUNK_SIZE,
          totalChunks,
          fileSize: 0,
          fileName,
          lastUpdateTime: Date.now(),
        });
      } catch (e) {
        if ((e as Error).message !== "canceled") {
          throw new Error(`分片 ${chunkIndex + 1} 上传失败`);
        }
      }
    },
    [updateFileItem, storage, uploadList]
  );

  // 核心上传逻辑（分片+断点续传）
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

        // 校验已上传分片（断点续传核心）
        const uploadedChunks = await verifyUploadedChunks(fileMd5, file.name);
        updateFileItem(fileId, { uploadedChunks, totalChunks });

        // 过滤已上传分片，仅上传未完成的
        const unUploadedChunks = chunks
          .map((chunk: Blob, index: number) => ({ chunk, index }))
          .filter(({ index }: { index: number }) => !uploadedChunks.includes(index));

        // 无未上传分片，直接合并
        if (unUploadedChunks.length === 0) {
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
          return;
        }

        // 串行上传分片（避免并发过多导致服务器压力）
        for (const { chunk, index } of unUploadedChunks) {
          const currentItem = uploadList.get(fileId);
          if (currentItem?.status === "paused") break;
          await uploadSingleChunk(
            fileId,
            chunk,
            index,
            fileMd5,
            totalChunks,
            file.name
          );
        }

        // 所有分片上传完成，请求合并
        const finalItem = uploadList.get(fileId);
        if (finalItem?.status !== "paused") {
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
        }
      } catch (e) {
        updateFileItem(fileId, {
          status: "failed",
          error: (e as Error).message,
        });
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

  // 暂停单个文件上传
  const handlePauseFile = useCallback(
    (fileId: string) => {
      updateFileItem(fileId, { status: "paused" });
      abortControllersRef.current.get(fileId)?.abort();
    },
    [updateFileItem]
  );

  // 继续上传单个文件
  const handleResumeFile = useCallback(
    (fileId: string) => {
      abortControllersRef.current.delete(fileId);
      uploadFile(fileId);
    },
    [uploadFile]
  );

  // 取消单个文件上传
  const handleCancelFile = useCallback(
    (fileId: string) => {
      const item = uploadList.get(fileId);
      if (item) {
        abortControllersRef.current.get(fileId)?.abort();
        storage.clearChunkInfo(fileId);
        abortControllersRef.current.delete(fileId);
        setUploadList((prev) => {
          const newMap = new Map(prev);
          newMap.delete(fileId);
          return newMap;
        });
      }
    },
    [uploadList, storage, setUploadList]
  );

  return {
    uploadFile,
    handlePauseFile,
    handleResumeFile,
    handleCancelFile,
  };
};

export default useUploadFile;
