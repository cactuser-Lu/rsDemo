const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

// 导入路由
const uploadRouter = require('./routes/upload');
const aiRouter = require('./routes/ai');

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

// 注册路由
app.use('/api/upload', uploadRouter);
app.use('/api/ai', aiRouter);

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
║     📤 文件上传:                              ║
║     - POST   /api/upload/chunk   (上传分片)   ║
║     - POST   /api/upload/verify  (校验分片)   ║
║     - POST   /api/upload/merge   (合并分片)   ║
║     - GET    /api/upload/list    (文件列表)   ║
║     - DELETE /api/upload/:name   (删除文件)   ║
║                                              ║
║     🤖 AI 对话:                               ║
║     - GET    /api/ai/chat        (流式对话)   ║
║                                              ║
║     上传文件夹: ${UPLOAD_DIR}  ║
║╚══════════════════════════════════════════════╝
  `);
});
