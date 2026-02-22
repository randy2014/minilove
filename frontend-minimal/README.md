# MiniLove 前端 - 最小化版本

这是一个最小化的Vue 3前端应用，用于验证构建流程。

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览生产构建
npm run preview
```

## 技术栈

- **Vue 3** - 现代化前端框架
- **Vite** - 快速构建工具
- **ES Modules** - 现代JavaScript模块

## 项目结构

```
frontend-minimal/
├── src/
│   ├── App.vue          # 主应用组件
│   └── main.js          # 应用入口
├── index.html           # HTML入口文件
├── vite.config.js       # Vite配置
└── package.json         # 依赖配置
```

## 功能特性

1. **完整的Vue 3应用结构**
2. **响应式设计** - 支持移动端和桌面端
3. **API集成** - 与后端API服务连接
4. **开发热重载** - 实时更新开发体验
5. **生产构建优化** - 代码分割和压缩

## API集成

前端通过代理连接到后端API服务：
- 开发环境：`http://localhost:5173` -> `http://localhost:3000`
- API文档：`http://localhost:3000/api-docs`

## 开发说明

这个最小化版本用于验证Vue 3 + Vite的构建流程。成功构建后，可以将其作为基础模板扩展为完整的前端应用。

## 构建状态

- ✅ Vue 3应用结构完成
- ✅ Vite配置完成
- ✅ API代理配置完成
- 🚧 依赖安装中