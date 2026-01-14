# 文件上传服务器设置指南

## 快速开始

### 1. 安装依赖

```bash
# 安装前端依赖
pnpm install

# 或者安装服务器依赖
npm install cors express multer
```

### 2. 启动服务器

**方式一：使用 npm 脚本**
```bash
npm run server
```

**方式二：直接运行**
```bash
node server.js
```

### 3. 启动前端开发服务器（新终端）

```bash
npm run dev
```

## 工作原理

本服务器实现了**大文件分片上传**和**断点续传**功能：

### API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/upload/chunk` | 上传单个分片 |
| POST | `/api/upload/verify` | 校验已上传分片 |
| POST | `/api/upload/merge` | 合并所有分片 |
| GET | `/api/upload/list` | 获取已上传文件列表 |
| DELETE | `/api/upload/:filename` | 删除已上传文件 |
| GET | `/uploads/:filename` | 下载已上传文件 |

### 上传流程

1. **文件选择** → 前端计算文件 MD5 值
2. **分片切割** → 5MB/片（可配置）
3. **校验分片** → 向服务器查询已上传分片
4. **上传分片** → 逐个上传未上传的分片
5. **合并文件** → 所有分片上传完成后请求合并
6. **清理资源** → 删除分片，更新前端状态

### 断点续传

- 前端使用 localStorage 缓存上传进度（支持 24 小时过期）
- 刷新页面后自动读取缓存，只上传未完成的分片
- 后端记录已上传分片，避免重复上传

## 文件存放位置

```
rsDemo/
├── uploads/          # 已上传的完整文件
├── chunks/           # 分片文件（上传过程中）
├── temp/             # 临时文件
└── server.js         # 服务器代码
```

## 配置修改

在 [rsDemo/src/components/UploadFile/index.tsx](src/components/UploadFile/index.tsx) 中修改配置：

```typescript
const CONFIG = {
  CHUNK_SIZE: 5 * 1024 * 1024,        // 分片大小（默认 5MB）
  UPLOAD_URL: '/api/upload/chunk',    // 上传分片端点
  VERIFY_URL: '/api/upload/verify',   // 校验分片端点
  MERGE_URL: '/api/upload/merge',     // 合并分片端点
};
```

## 测试步骤

1. 打开浏览器访问 `http://localhost:5173`（前端端口）
2. 导航到文件上传组件
3. 选择一个大文件（>5MB 效果最佳）
4. 点击"开始上传"
5. 可以：
   - 点击"暂停上传"暂停
   - 刷新页面后点击"继续上传"恢复上传
   - 点击"取消上传"取消并清理

## 常见问题

### Q: 跨域问题？
A: 已启用 CORS，服务器会响应所有来源的请求。

### Q: 上传失败？
A: 检查：
- 服务器是否运行在 `http://localhost:3001`
- 前端上传 URL 配置是否正确
- 浏览器控制台错误信息

### Q: 文件丢失？
A: 已上传文件存储在 `./uploads` 目录，重启服务器不会丢失。分片临时文件在 `./chunks` 目录。

### Q: 如何清理已上传文件？
A: 
- 通过 API 删除：`DELETE /api/upload/{filename}`
- 或直接删除 `./uploads` 目录中的文件

## 性能优化建议

- 调整 `CHUNK_SIZE` 适应网络环境
- 实现分片并发上传（当前为串行）
- 添加分片重试机制
- 使用 WebWorker 计算 MD5 避免卡顿

## 生产部署

部署到生产环境时建议：
1. 添加文件类型和大小限制
2. 实现用户认证和授权
3. 添加病毒扫描
4. 实现磁盘容量管理
5. 使用对象存储服务（如 AWS S3）
6. 添加详细的日志和监控
