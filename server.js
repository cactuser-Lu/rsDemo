const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const PORT = 3001;

// 配置
const UPLOAD_DIR = path.join(__dirname, 'uploads');
const CHUNKS_DIR = path.join(__dirname, 'chunks');
const TEMP_DIR = path.join(__dirname, 'temp');

// 确保所有需要的目录存在
[UPLOAD_DIR, CHUNKS_DIR, TEMP_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 配置 multer - 使用 memoryStorage，然后手动保存
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB单个分片大小限制
});

// 分片记录存储：{ fileMd5: { uploadedChunks: [0, 1, 2...], totalChunks, fileName } }
const uploadRecords = new Map();

// ============ API 接口 ============

/**
 * POST /api/upload/chunk
 * 上传文件分片
 */
app.post('/api/upload/chunk', upload.single('file'), (req, res) => {
  try {
    const { fileMd5, chunkIndex, totalChunks, fileName } = req.body;
    const chunkIndexNum = parseInt(chunkIndex);
    const totalChunksNum = parseInt(totalChunks);

    if (!fileMd5 || chunkIndex === undefined || !totalChunks || !req.file) {
      return res.status(400).json({ code: 1, msg: '缺少必要参数' });
    }

    // 手动保存分片文件
    const chunkPath = path.join(CHUNKS_DIR, `${fileMd5}-${chunkIndexNum}`);
    fs.writeFileSync(chunkPath, req.file.buffer);

    // 初始化分片记录
    if (!uploadRecords.has(fileMd5)) {
      uploadRecords.set(fileMd5, {
        uploadedChunks: [],
        totalChunks: totalChunksNum,
        fileName,
        startTime: Date.now()
      });
    }

    const record = uploadRecords.get(fileMd5);
    
    // 记录已上传分片
    if (!record.uploadedChunks.includes(chunkIndexNum)) {
      record.uploadedChunks.push(chunkIndexNum);
    }

    // 检查是否所有分片都已上传
    const allChunksUploaded = record.uploadedChunks.length === totalChunksNum;

    res.json({
      code: 0,
      msg: '分片上传成功',
      data: {
        chunkIndex: chunkIndexNum,
        uploadedChunks: record.uploadedChunks,
        allChunksUploaded
      }
    });
  } catch (error) {
    console.error('上传分片错误：', error);
    res.status(500).json({ code: 1, msg: '上传分片失败', error: error.message });
  }
});

/**
 * POST /api/upload/verify
 * 校验已上传的分片
 */
app.post('/api/upload/verify', (req, res) => {
  try {
    const { fileMd5, fileName } = req.body;

    if (!fileMd5) {
      return res.status(400).json({ code: 1, msg: '缺少fileMd5参数' });
    }

    // 检查该文件是否已完全上传
    if (uploadRecords.has(fileMd5)) {
      const record = uploadRecords.get(fileMd5);
      const allChunksUploaded = record.uploadedChunks.length === record.totalChunks;
      
      // 如果已完全上传，检查最终文件是否存在
      if (allChunksUploaded) {
        const finalFilePath = path.join(UPLOAD_DIR, `${record.fileName}`);
        if (fs.existsSync(finalFilePath)) {
          return res.json({
            code: 0,
            msg: '文件已存在',
            data: {
              uploadedChunks: record.uploadedChunks,
              fileExists: true
            }
          });
        }
      }

      return res.json({
        code: 0,
        msg: '校验成功',
        data: {
          uploadedChunks: record.uploadedChunks,
          totalChunks: record.totalChunks
        }
      });
    }

    // 没有记录，返回空的已上传分片列表
    res.json({
      code: 0,
      msg: '校验成功',
      data: {
        uploadedChunks: []
      }
    });
  } catch (error) {
    console.error('校验分片错误：', error);
    res.status(500).json({ code: 1, msg: '校验分片失败', error: error.message });
  }
});

/**
 * POST /api/upload/merge
 * 合并所有分片
 */
app.post('/api/upload/merge', (req, res) => {
  try {
    const { fileMd5, fileName, totalChunks } = req.body;

    if (!fileMd5 || !fileName || !totalChunks) {
      return res.status(400).json({ code: 1, msg: '缺少必要参数' });
    }

    // 检查分片是否完整
    const record = uploadRecords.get(fileMd5);
    if (!record || record.uploadedChunks.length !== totalChunks) {
      return res.status(400).json({ 
        code: 1, 
        msg: '分片不完整，无法合并',
        data: {
          uploadedCount: record?.uploadedChunks.length || 0,
          totalChunks
        }
      });
    }

    // 合并分片
    const finalFilePath = path.join(UPLOAD_DIR, fileName);
    const writeStream = fs.createWriteStream(finalFilePath);

    // 按顺序合并分片
    let mergedCount = 0;
    const mergeChunks = (index) => {
      if (index >= totalChunks) {
        // 所有分片合并完成，清理分片文件
        for (let i = 0; i < totalChunks; i++) {
          const chunkPath = path.join(CHUNKS_DIR, `${fileMd5}-${i}`);
          if (fs.existsSync(chunkPath)) {
            fs.unlinkSync(chunkPath);
          }
        }

        writeStream.end();
        
        // 清除记录
        uploadRecords.delete(fileMd5);

        res.json({
          code: 0,
          msg: '文件合并成功',
          data: {
            fileName,
            filePath: `/uploads/${fileName}`,
            fileSize: fs.statSync(finalFilePath).size
          }
        });
        return;
      }

      const chunkPath = path.join(CHUNKS_DIR, `${fileMd5}-${index}`);
      if (!fs.existsSync(chunkPath)) {
        writeStream.destroy();
        return res.status(400).json({ 
          code: 1, 
          msg: `分片 ${index} 不存在`
        });
      }

      const readStream = fs.createReadStream(chunkPath);
      readStream.on('end', () => {
        mergedCount++;
        mergeChunks(index + 1);
      });
      readStream.on('error', (error) => {
        writeStream.destroy();
        res.status(500).json({ code: 1, msg: '合并分片失败', error: error.message });
      });
      readStream.pipe(writeStream, { end: false });
    };

    mergeChunks(0);
  } catch (error) {
    console.error('合并分片错误：', error);
    res.status(500).json({ code: 1, msg: '合并分片失败', error: error.message });
  }
});

/**
 * GET /uploads/:filename
 * 下载已上传的文件
 */
app.get('/uploads/:filename', (req, res) => {
  try {
    const filePath = path.join(UPLOAD_DIR, req.params.filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ code: 1, msg: '文件不存在' });
    }

    res.download(filePath);
  } catch (error) {
    console.error('下载文件错误：', error);
    res.status(500).json({ code: 1, msg: '下载文件失败' });
  }
});

/**
 * GET /api/upload/list
 * 列出所有已上传的文件
 */
app.get('/api/upload/list', (req, res) => {
  try {
    const files = fs.readdirSync(UPLOAD_DIR).map(filename => {
      const filePath = path.join(UPLOAD_DIR, filename);
      const stat = fs.statSync(filePath);
      return {
        fileName: filename,
        fileSize: stat.size,
        uploadedTime: stat.mtimeMs,
        downloadUrl: `/uploads/${filename}`
      };
    });

    res.json({
      code: 0,
      msg: '获取文件列表成功',
      data: files
    });
  } catch (error) {
    console.error('获取文件列表错误：', error);
    res.status(500).json({ code: 1, msg: '获取文件列表失败' });
  }
});

/**
 * DELETE /api/upload/:filename
 * 删除已上传的文件
 */
app.delete('/api/upload/:filename', (req, res) => {
  try {
    const filePath = path.join(UPLOAD_DIR, req.params.filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ code: 1, msg: '文件不存在' });
    }

    fs.unlinkSync(filePath);
    res.json({
      code: 0,
      msg: '文件删除成功'
    });
  } catch (error) {
    console.error('删除文件错误：', error);
    res.status(500).json({ code: 1, msg: '删除文件失败' });
  }
});

// 健康检查
app.get('/health', (req, res) => {
  res.json({ code: 0, msg: 'Server is running' });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════╗
║     文件上传服务器已启动                        ║
║     Server: http://localhost:${PORT}         ║
║                                              ║
║     API 端点：                                ║
║     - POST   /api/upload/chunk   (上传分片)   ║
║     - POST   /api/upload/verify  (校验分片)   ║
║     - POST   /api/upload/merge   (合并分片)   ║
║     - GET    /api/upload/list    (文件列表)   ║
║     - DELETE /api/upload/:name   (删除文件)   ║
║     - GET    /uploads/:filename  (下载文件)   ║
║                                              ║
║     上传文件夹: ${UPLOAD_DIR}  ║
║╚══════════════════════════════════════════════╝
  `);
});
