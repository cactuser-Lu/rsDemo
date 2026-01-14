import React, { useState, useRef, useCallback } from "react";
import axios from "axios";
import SparkMD5 from "spark-md5"; // 用于生成文件MD5（需安装：npm i spark-md5）

// 配置常量（可抽离为单独配置文件）
const CONFIG = {
  CHUNK_SIZE: 5 * 1024 * 1024, // 分片大小：5MB/片
  UPLOAD_URL: "/api/upload/chunk", // 分片上传接口
  VERIFY_URL: "/api/upload/verify", // 校验已上传分片接口
  MERGE_URL: "/api/upload/merge", // 合并分片接口
  STORAGE_KEY_PREFIX: "file_upload_", // 本地存储前缀
  EXPIRE_TIME: 24 * 60 * 60 * 1000, // 分片信息过期时间：24小时
};

// 类型定义（TS）
type UploadStatus = "idle" | "uploading" | "paused" | "completed" | "failed";

interface ChunkInfo {
  fileMd5: string; // 文件唯一标识
  chunkIndex: number; // 分片索引
  chunkSize: number; // 分片大小
  totalChunks: number; // 总分片数
  fileSize: number; // 文件总大小
  fileName: string; // 文件名
  lastUpdateTime: number; // 最后更新时间
}

interface FileUploadItem {
  id: string; // 文件唯一标识（MD5）
  file: File; // 原始文件对象
  status: UploadStatus; // 上传状态
  progress: number; // 上传进度 0-100
  error: string; // 错误信息
  uploadedChunks: number[]; // 已上传分片列表
  totalChunks: number; // 总分片数
  startTime?: number; // 开始上传时间
  endTime?: number; // 完成上传时间
}

const FileUploader: React.FC = () => {
  // 状态管理
  const [uploadList, setUploadList] = useState<Map<string, FileUploadItem>>(new Map());
  const [isUploading, setIsUploading] = useState(false);

  // 引用存储：避免重渲染丢失状态
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());

  // 生成文件MD5（唯一标识，用于断点续传）
  const generateFileMd5 = useCallback((file: File): Promise<string> => {
    return new Promise((resolve) => {
      const fileReader = new FileReader();
      const spark = new SparkMD5.ArrayBuffer();
      fileReader.readAsArrayBuffer(file);
      fileReader.onload = (e) => {
        spark.append(e.target?.result as ArrayBuffer);
        resolve(spark.end());
      };
    });
  }, []);

  // 更新单个文件的上传项
  const updateFileItem = useCallback((id: string, updates: Partial<FileUploadItem>) => {
    setUploadList((prevMap) => {
      const newMap = new Map(prevMap);
      const item = newMap.get(id);
      if (item) {
        newMap.set(id, { ...item, ...updates });
      }
      return newMap;
    });
  }, []);

  // 本地存储工具函数
  const storage = {
    saveChunkInfo: (chunkInfo: ChunkInfo) => {
      try {
        const key = `${CONFIG.STORAGE_KEY_PREFIX}${chunkInfo.fileMd5}`;
        localStorage.setItem(key, JSON.stringify(chunkInfo));
      } catch (e) {
        console.warn("localStorage 存储溢出", e);
      }
    },
    getChunkInfo: (fileMd5: string) => {
      try {
        const key = `${CONFIG.STORAGE_KEY_PREFIX}${fileMd5}`;
        const data = localStorage.getItem(key);
        if (!data) return null;
        const parsed = JSON.parse(data);
        // 校验是否过期
        if (Date.now() - parsed.lastUpdateTime > CONFIG.EXPIRE_TIME) {
          localStorage.removeItem(key);
          return null;
        }
        return parsed;
      } catch (e) {
        return null;
      }
    },
    clearChunkInfo: (fileMd5: string) => {
      const key = `${CONFIG.STORAGE_KEY_PREFIX}${fileMd5}`;
      localStorage.removeItem(key);
    },
  };

  // 校验已上传分片（前端+后端双重校验）
  const verifyUploadedChunks = useCallback(
    async (fileMd5: string, fileName: string) => {
      // 先读前端缓存
      const localInfo = storage.getChunkInfo(fileMd5);
      if (localInfo?.uploadedChunks) {
        return localInfo.uploadedChunks;
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
  const splitFileIntoChunks = useCallback((file: File) => {
    const chunks: Blob[] = [];
    let current = 0;
    const totalChunks = Math.ceil(file.size / CONFIG.CHUNK_SIZE);
    while (current < file.size) {
      chunks.push(file.slice(current, current + CONFIG.CHUNK_SIZE));
      current += CONFIG.CHUNK_SIZE;
    }
    return { chunks, totalChunks };
  }, []);

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

        // 更新已上传分片列表
        updateFileItem(fileId, (prevItem) => ({
          ...prevItem,
          uploadedChunks: [...(prevItem?.uploadedChunks || []), chunkIndex],
          progress: Math.round(
            (((prevItem?.uploadedChunks || []).length + 1) / totalChunks) * 100
          ),
        }));

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
    [updateFileItem, storage]
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
        const fileMd5 = await generateFileMd5(file);

        // 切割文件
        const { chunks, totalChunks } = splitFileIntoChunks(file);

        // 校验已上传分片（断点续传核心）
        const uploadedChunks = await verifyUploadedChunks(fileMd5, file.name);
        updateFileItem(fileId, { uploadedChunks, totalChunks });

        // 过滤已上传分片，仅上传未完成的
        const unUploadedChunks = chunks
          .map((chunk, index) => ({ chunk, index }))
          .filter(({ index }) => !uploadedChunks.includes(index));

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
          await uploadSingleChunk(fileId, chunk, index, fileMd5, totalChunks, file.name);
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
    [uploadList, generateFileMd5, splitFileIntoChunks, verifyUploadedChunks, uploadSingleChunk, updateFileItem, storage]
  );

  // 上传全部文件
  const handleUploadAll = useCallback(async () => {
    if (uploadList.size === 0) return;
    setIsUploading(true);
    const fileIds = Array.from(uploadList.keys());
    for (const fileId of fileIds) {
      const item = uploadList.get(fileId);
      if (item && item.status === "idle") {
        await uploadFile(fileId);
      }
    }
    setIsUploading(false);
  }, [uploadList, uploadFile]);

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
    [uploadList, storage]
  );

  // 移除已完成的文件
  const handleRemoveFile = useCallback(
    (fileId: string) => {
      setUploadList((prev) => {
        const newMap = new Map(prev);
        newMap.delete(fileId);
        return newMap;
      });
    },
    []
  );

  // 文件选择回调
  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files) return;

      setUploadList((prevMap) => {
        const newMap = new Map(prevMap);
        Array.from(files).forEach((file) => {
          const fileId = `${file.name}-${file.size}-${Date.now()}`;
          newMap.set(fileId, {
            id: fileId,
            file,
            status: "idle",
            progress: 0,
            error: "",
            uploadedChunks: [],
            totalChunks: 0,
          });
        });
        return newMap;
      });

      // 重置 input
      e.target.value = "";
    },
    []
  );

  // 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  };

  // UI 渲染
  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
      <h2>多文件上传管理</h2>

      {/* 文件选择区 */}
      <div
        style={{
          border: "2px dashed #ccc",
          borderRadius: "8px",
          padding: "20px",
          textAlign: "center",
          marginBottom: "20px",
          backgroundColor: "#f9f9f9",
        }}
      >
        <input
          type="file"
          multiple
          onChange={handleFileChange}
          disabled={isUploading}
          style={{ display: "none" }}
          id="fileInput"
        />
        <label
          htmlFor="fileInput"
          style={{
            cursor: isUploading ? "not-allowed" : "pointer",
            opacity: isUploading ? 0.5 : 1,
          }}
        >
          <p>👆 点击选择文件或拖放文件到此处</p>
          <p style={{ fontSize: "12px", color: "#999" }}>
            已选择 {uploadList.size} 个文件
          </p>
        </label>
      </div>

      {/* 文件列表 */}
      {uploadList.size > 0 && (
        <div style={{ marginBottom: "20px" }}>
          <div style={{ marginBottom: "10px" }}>
            <button
              onClick={handleUploadAll}
              disabled={isUploading || uploadList.size === 0}
              style={{
                padding: "8px 16px",
                backgroundColor: "#1890ff",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: isUploading ? "not-allowed" : "pointer",
                opacity: isUploading ? 0.6 : 1,
              }}
            >
              全部上传
            </button>
          </div>

          {Array.from(uploadList.values()).map((item) => (
            <div
              key={item.id}
              style={{
                padding: "12px",
                border: "1px solid #ddd",
                borderRadius: "4px",
                marginBottom: "8px",
                backgroundColor: "#fafafa",
              }}
            >
              {/* 文件信息 */}
              <div style={{ marginBottom: "8px" }}>
                <span style={{ fontWeight: "bold" }}>{item.file.name}</span>
                <span style={{ color: "#999", marginLeft: "8px" }}>
                  {formatFileSize(item.file.size)}
                </span>
                <span
                  style={{
                    marginLeft: "8px",
                    padding: "2px 6px",
                    borderRadius: "3px",
                    fontSize: "12px",
                    backgroundColor:
                      item.status === "completed"
                        ? "#f6ffed"
                        : item.status === "failed"
                          ? "#fff2f0"
                          : item.status === "uploading"
                            ? "#e6f7ff"
                            : "#fafafa",
                    color:
                      item.status === "completed"
                        ? "#52c41a"
                        : item.status === "failed"
                          ? "#ff4d4f"
                          : item.status === "uploading"
                            ? "#1890ff"
                            : "#000",
                  }}
                >
                  {item.status === "idle" && "待上传"}
                  {item.status === "uploading" && "上传中"}
                  {item.status === "paused" && "已暂停"}
                  {item.status === "completed" && "已完成"}
                  {item.status === "failed" && "失败"}
                </span>
              </div>

              {/* 进度条 */}
              {item.progress > 0 && (
                <div
                  style={{
                    width: "100%",
                    height: "6px",
                    backgroundColor: "#f0f0f0",
                    borderRadius: "3px",
                    overflow: "hidden",
                    marginBottom: "8px",
                  }}
                >
                  <div
                    style={{
                      width: `${item.progress}%`,
                      height: "100%",
                      backgroundColor: "#1890ff",
                      transition: "width 0.3s ease",
                    }}
                  />
                </div>
              )}

              {/* 进度文字 */}
              <div
                style={{
                  fontSize: "12px",
                  color: "#666",
                  marginBottom: "8px",
                }}
              >
                {item.uploadedChunks.length > 0 && (
                  <span>
                    已上传: {item.uploadedChunks.length}/{item.totalChunks} 分片 ({item.progress}%)
                  </span>
                )}
              </div>

              {/* 错误信息 */}
              {item.error && (
                <div style={{ color: "#ff4d4f", fontSize: "12px", marginBottom: "8px" }}>
                  ❌ {item.error}
                </div>
              )}

              {/* 操作按钮 */}
              <div style={{ display: "flex", gap: "8px" }}>
                {item.status === "idle" && (
                  <button
                    onClick={() => uploadFile(item.id)}
                    style={{
                      padding: "4px 12px",
                      fontSize: "12px",
                      backgroundColor: "#1890ff",
                      color: "white",
                      border: "none",
                      borderRadius: "3px",
                      cursor: "pointer",
                    }}
                  >
                    上传
                  </button>
                )}
                {item.status === "uploading" && (
                  <button
                    onClick={() => handlePauseFile(item.id)}
                    style={{
                      padding: "4px 12px",
                      fontSize: "12px",
                      backgroundColor: "#faad14",
                      color: "white",
                      border: "none",
                      borderRadius: "3px",
                      cursor: "pointer",
                    }}
                  >
                    暂停
                  </button>
                )}
                {item.status === "paused" && (
                  <button
                    onClick={() => handleResumeFile(item.id)}
                    style={{
                      padding: "4px 12px",
                      fontSize: "12px",
                      backgroundColor: "#1890ff",
                      color: "white",
                      border: "none",
                      borderRadius: "3px",
                      cursor: "pointer",
                    }}
                  >
                    继续
                  </button>
                )}
                {(item.status === "failed" || item.status === "paused") && (
                  <button
                    onClick={() => uploadFile(item.id)}
                    style={{
                      padding: "4px 12px",
                      fontSize: "12px",
                      backgroundColor: "#1890ff",
                      color: "white",
                      border: "none",
                      borderRadius: "3px",
                      cursor: "pointer",
                    }}
                  >
                    重试
                  </button>
                )}
                {item.status !== "uploading" && (
                  <button
                    onClick={() => handleCancelFile(item.id)}
                    style={{
                      padding: "4px 12px",
                      fontSize: "12px",
                      backgroundColor: "#ff4d4f",
                      color: "white",
                      border: "none",
                      borderRadius: "3px",
                      cursor: "pointer",
                    }}
                  >
                    删除
                  </button>
                )}
                {item.status === "completed" && (
                  <button
                    onClick={() => handleRemoveFile(item.id)}
                    style={{
                      padding: "4px 12px",
                      fontSize: "12px",
                      backgroundColor: "#999",
                      color: "white",
                      border: "none",
                      borderRadius: "3px",
                      cursor: "pointer",
                    }}
                  >
                    移除
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 统计信息 */}
      {uploadList.size > 0 && (
        <div
          style={{
            padding: "12px",
            backgroundColor: "#f0f2f5",
            borderRadius: "4px",
          }}
        >
          <p>
            总计: {uploadList.size} 个文件 |{" "}
            已完成: {Array.from(uploadList.values()).filter((v) => v.status === "completed").length} |{" "}
            上传中: {Array.from(uploadList.values()).filter((v) => v.status === "uploading").length}
          </p>
        </div>
      )}
    </div>
  );
};

export default FileUploader;
