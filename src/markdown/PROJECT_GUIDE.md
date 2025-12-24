# React + Router + Redux + Ant Design 项目

一个完整的React项目示例，集成了路由、状态管理、UI组件库等现代前端技术栈。

## 🚀 技术栈

- **React 19** - 最新版本的React框架
- **Rspack** - 高性能的构建工具
- **React Router v6** - 声明式路由
- **Redux Toolkit** - 现代化的Redux状态管理
- **Ant Design** - 企业级UI组件库

## 📦 项目结构

```
src/
├── components/          # 公共组件
│   └── Layout/         # 布局组件
├── pages/              # 页面组件
│   ├── Home/          # 首页
│   ├── DebounceTest/  # 防抖测试页面
│   └── Drawer/        # 抽屉页面
├── router/            # 路由配置
│   └── index.jsx
├── store/             # Redux状态管理
│   ├── index.js       # Store配置
│   └── slices/        # Redux切片
│       └── userSlice.js
├── utils/             # 工具函数
│   └── debounce.js    # 防抖函数
├── App.jsx
└── main.jsx           # 入口文件
```

## 🛠️ 安装与运行

### 安装依赖
```bash
npm install
```

### 启动开发服务器
```bash
npm run dev
```

访问 http://localhost:8081

### 构建生产版本
```bash
npm run build
```

### 预览生产构建
```bash
npm run preview
```

## 📄 页面说明

### 1. 首页 (/)
项目介绍和技术栈说明

### 2. 防抖测试页面 (/debounce-test)
一个完整的防抖函数测试页面，包含：
- 实时搜索输入框
- 输入次数和API调用次数统计
- 可视化展示防抖效果
- 防抖函数源码展示

**防抖函数核心代码：**
```javascript
function debounce(func, delay) {
  let timer;
  return function(...args) {
    const context = this;
    clearTimeout(timer);
    timer = setTimeout(() => {
      func.apply(context, args);
    }, delay);
  };
}
```

### 3. 抽屉页面 (/drawer)
演示Ant Design抽屉组件

## 🔥 核心功能

### 路由配置
使用React Router v6的`createBrowserRouter`创建路由：
```javascript
import { createBrowserRouter } from 'react-router-dom';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { path: 'home', element: <Home /> },
      { path: 'debounce-test', element: <DebounceTest /> }
    ]
  }
]);
```

### 状态管理
使用Redux Toolkit简化Redux配置：
```javascript
import { configureStore } from '@reduxjs/toolkit';

export const store = configureStore({
  reducer: {
    user: userReducer,
  },
});
```

### 布局系统
使用Ant Design的Layout组件创建统一的页面布局：
- Header：导航菜单
- Content：页面内容区
- Footer：页面底部

## 💡 防抖函数使用示例

```javascript
import debounce from './utils/debounce';

// 创建防抖函数
const debouncedSearch = debounce((value) => {
  console.log('搜索:', value);
}, 500);

// 在输入事件中使用
<input onChange={(e) => debouncedSearch(e.target.value)} />
```

## 📝 开发建议

1. **组件命名**：使用PascalCase命名React组件
2. **文件结构**：每个页面/组件独立文件夹，包含index.jsx和style.css
3. **状态管理**：复杂状态使用Redux，简单状态使用useState
4. **样式方案**：CSS Modules或CSS-in-JS
5. **代码规范**：使用ESLint和Prettier

## 🎯 后续优化方向

- [ ] 添加TypeScript支持
- [ ] 集成ESLint和Prettier
- [ ] 添加单元测试（Jest + React Testing Library）
- [ ] 添加CI/CD配置
- [ ] 性能优化（代码分割、懒加载）
- [ ] 添加错误边界
- [ ] 国际化支持

## 📚 参考资源

- [React官方文档](https://react.dev/)
- [React Router文档](https://reactrouter.com/)
- [Redux Toolkit文档](https://redux-toolkit.js.org/)
- [Ant Design文档](https://ant.design/)
- [Rspack文档](https://rspack.dev/)

## 📄 License

MIT
