import SparkMD5 from "spark-md5";

// 配置常量
export const CONFIG = {
  CHUNK_SIZE: 5 * 1024 * 1024, // 分片大小：5MB/片
  UPLOAD_URL: "/api/upload/chunk", // 分片上传接口
  VERIFY_URL: "/api/upload/verify", // 校验已上传分片接口
  MERGE_URL: "/api/upload/merge", // 合并分片接口
  STORAGE_KEY_PREFIX: "file_upload_", // 本地存储前缀
  EXPIRE_TIME: 24 * 60 * 60 * 1000, // 分片信息过期时间：24小时
};

/**
 * 生成文件MD5（唯一标识，用于断点续传）
 * @param {File} file - 要处理的文件
 * @returns {Promise<string>} - 文件的MD5值
 */
export const generateFileMd5 = (file) => {
  return new Promise((resolve) => {
    const fileReader = new FileReader();
    const spark = new SparkMD5.ArrayBuffer();
    fileReader.readAsArrayBuffer(file);
    fileReader.onload = (e) => {
      spark.append(e.target?.result);
      const md5 = (spark).end();
      resolve(md5);
    };
  });
};

/**
 * 切割文件为分片
 * @param {File} file - 要切割的文件
 * @param {number} chunkSize - 分片大小（字节）
 * @returns {Object} - { chunks: Blob[], totalChunks: number }
 */
export const splitFileIntoChunks = (file, chunkSize = CONFIG.CHUNK_SIZE) => {
  const chunks = [];
  let current = 0;
  const totalChunks = Math.ceil(file.size / chunkSize);
  
  while (current < file.size) {
    chunks.push(file.slice(current, current + chunkSize));
    current += chunkSize;
  }
  
  return { chunks, totalChunks };
};

/**
 * 本地存储工具函数
 */
export const storage = {
  /**
   * 保存分片信息到本地存储（累积保存已上传分片数组）
   * @param {string} fileMd5 - 文件MD5
   * @param {number[]} uploadedChunks - 已上传的分片索引数组
   * @param {number} totalChunks - 总分片数
   * @param {string} fileName - 文件名
   */
  saveChunkInfo: (fileMd5, uploadedChunks, totalChunks, fileName) => {
    try {
      const key = `${CONFIG.STORAGE_KEY_PREFIX}${fileMd5}`;
      const chunkInfo = {
        fileMd5,
        uploadedChunks,
        totalChunks,
        fileName,
        lastUpdateTime: Date.now()
      };
      localStorage.setItem(key, JSON.stringify(chunkInfo));
    } catch (e) {
      console.warn("localStorage 存储溢出", e);
    }
  },

  /**
   * 读取分片信息从本地存储
   * @param {string} fileMd5 - 文件MD5
   * @returns {Object|null} - 分片信息或null
   */
  getChunkInfo: (fileMd5) => {
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
      console.warn("读取分片信息失败", e);
      return null;
    }
  },

  /**
   * 清理分片信息从本地存储
   * @param {string} fileMd5 - 文件MD5
   */
  clearChunkInfo: (fileMd5) => {
    try {
      const key = `${CONFIG.STORAGE_KEY_PREFIX}${fileMd5}`;
      localStorage.removeItem(key);
    } catch (e) {
      console.warn("清理分片信息失败", e);
    }
  },

  /**
   * 清理所有分片信息
   */
  clearAllChunkInfo: () => {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach((key) => {
        if (key.startsWith(CONFIG.STORAGE_KEY_PREFIX)) {
          localStorage.removeItem(key);
        }
      });
    } catch (e) {
      console.warn("清理所有分片信息失败", e);
    }
  },
};

/**
 * 格式化文件大小
 * @param {number} bytes - 字节数
 * @returns {string} - 格式化后的文件大小字符串
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
};

/**
 * 格式化上传时间
 * @param {number} milliseconds - 毫秒数
 * @returns {string} - 格式化后的时间字符串
 */
export const formatUploadTime = (milliseconds) => {
  if (milliseconds < 1000) return milliseconds + "ms";
  if (milliseconds < 60000) return (milliseconds / 1000).toFixed(2) + "s";
  return (milliseconds / 60000).toFixed(2) + "m";
};

/**
 * 计算上传速度
 * @param {number} fileSize - 文件大小（字节）
 * @param {number} timeMs - 上传耗时（毫秒）
 * @returns {string} - 格式化后的上传速度
 */
export const calculateUploadSpeed = (fileSize, timeMs) => {
  if (timeMs === 0) return "0 KB/s";
  const speedKB = (fileSize / 1024) / (timeMs / 1000);
  if (speedKB < 1024) return speedKB.toFixed(2) + " KB/s";
  return (speedKB / 1024).toFixed(2) + " MB/s";
};
