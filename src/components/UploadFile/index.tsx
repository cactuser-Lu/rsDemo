import React, { useState, useCallback } from "react";
import useUploadFile, { FileUploadItem, UploadStatus } from "./useUploadFile";
import { formatFileSize } from "./utils";

const FileUploader: React.FC = () => {
  // 状态管理
  const [uploadList, setUploadList] = useState<Map<string, FileUploadItem>>(new Map());
  const [isUploading, setIsUploading] = useState(false);

  // 使用 hook 获取上传逻辑
  const { uploadFile, handlePauseFile, handleResumeFile, handleCancelFile } = useUploadFile({
    setUploadList,
    uploadList,
  });

  // 上传全部文件
  const handleUploadAll = useCallback(async () => {
    if (uploadList.size === 0) return;
    setIsUploading(true);
    const fileIds = Array.from(uploadList.keys());
    const uploadPromises = fileIds.map(uploadFile);
    await Promise.allSettled(uploadPromises);
    setIsUploading(false);
  }, [uploadList, uploadFile]);

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

      // 重置 input，解决无法选择同名文件的问题
      e.target.value = "";
    },
    []
  );

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
