const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// 配置
const UPLOAD_DIR = path.join(__dirname, '../uploads');
const CHUNKS_DIR = path.join(__dirname, '../chunks');

// 分片记录存储
const uploadRecords = new Map();

// 配置 multer
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }
});

/**
 * POST /api/upload/chunk
 * 上传文件分片
 */
router.post('/chunk', upload.single('file'), (req, res) => {
  try {
    const { fileMd5, chunkIndex, totalChunks, fileName } = req.body;
    const chunkIndexNum = parseInt(chunkIndex);
    const totalChunksNum = parseInt(totalChunks);

    if (!fileMd5 || chunkIndex === undefined || !totalChunks || !req.file) {
      return res.status(400).json({ code: 1, msg: '缺少必要参数' });
    }

    const chunkPath = path.join(CHUNKS_DIR, `${fileMd5}-${chunkIndexNum}`);
    fs.writeFileSync(chunkPath, req.file.buffer);

    if (!uploadRecords.has(fileMd5)) {
      uploadRecords.set(fileMd5, {
        uploadedChunks: [],
        totalChunks: totalChunksNum,
        fileName,
        startTime: Date.now()
      });
    }

    const record = uploadRecords.get(fileMd5);
    if (!record.uploadedChunks.includes(chunkIndexNum)) {
      record.uploadedChunks.push(chunkIndexNum);
    }

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
router.post('/verify', (req, res) => {
  try {
    const { fileMd5, fileName } = req.body;

    if (!fileMd5) {
      return res.status(400).json({ code: 1, msg: '缺少fileMd5参数' });
    }

    if (uploadRecords.has(fileMd5)) {
      const record = uploadRecords.get(fileMd5);
      const allChunksUploaded = record.uploadedChunks.length === record.totalChunks;
      
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
router.post('/merge', (req, res) => {
  try {
    const { fileMd5, fileName, totalChunks } = req.body;

    if (!fileMd5 || !fileName || !totalChunks) {
      return res.status(400).json({ code: 1, msg: '缺少必要参数' });
    }

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

    const finalFilePath = path.join(UPLOAD_DIR, fileName);
    const writeStream = fs.createWriteStream(finalFilePath);

    let mergedCount = 0;
    const mergeChunks = (index) => {
      if (index >= totalChunks) {
        for (let i = 0; i < totalChunks; i++) {
          const chunkPath = path.join(CHUNKS_DIR, `${fileMd5}-${i}`);
          if (fs.existsSync(chunkPath)) {
            fs.unlinkSync(chunkPath);
          }
        }

        writeStream.end();
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
 * GET /api/upload/list
 * 列出所有已上传的文件
 */
router.get('/list', (req, res) => {
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
router.delete('/:filename', (req, res) => {
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

module.exports = router;
