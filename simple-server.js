const express = require('express');
const path = require('path');

const app = express();
const PORT = 8080;

// 静态文件服务
app.use(express.static(path.join(__dirname, 'frontend-simple')));

// API代理（转发到后端服务）
app.use('/api', (req, res) => {
  const backendUrl = 'http://localhost:3000' + req.url;
  console.log(`代理请求: ${req.method} ${backendUrl}`);
  
  // 简单代理实现
  const { method, headers, body } = req;
  // 这里实际应该使用HTTP客户端转发请求
  res.json({ 
    message: 'API请求需要通过后端服务访问',
    backend: 'http://localhost:3000',
    path: req.url,
    note: '请直接访问后端API或使用前端中的测试按钮'
  });
});

// 主页重定向
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend-simple', 'index.html'));
});

// 健康检查
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    service: 'MiniLove Frontend Server',
    version: '0.1.0',
    time: new Date().toISOString(),
    endpoints: {
      api: 'http://localhost:3000',
      frontend: `http://localhost:${PORT}`,
      apiDocs: 'http://localhost:3000/api-docs'
    }
  });
});

app.listen(PORT, () => {
  console.log(`
========================================
MiniLove 前端简易服务器
环境: development
端口: ${PORT}
地址: http://localhost:${PORT}
后端API: http://localhost:3000
========================================
  `);
});