// MiniLove 简化版应用（用于演示）
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs').promises;

const app = express();

// 中间件
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// 内存数据库
let mockData = {
  users: [],
  posts: [],
  comments: [],
  topics: []
};

// 加载模拟数据
const loadMockData = async () => {
  try {
    const data = await fs.readFile(process.env.MOCK_DB_FILE || './mock-data.json', 'utf8');
    mockData = JSON.parse(data);
    console.log('模拟数据加载成功');
  } catch (error) {
    console.log('使用默认模拟数据');
    // 创建默认测试数据
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('test123', salt);
    
    mockData = {
      users: [
        {
          id: 1,
          username: 'test_user',
          email: 'test@minilove.com',
          password_hash: passwordHash,
          gender: 'male',
          age: 30,
          city: '北京',
          bio: '这是一个测试用户',
          membership_level: 'free',
          created_at: new Date().toISOString()
        },
        {
          id: 2,
          username: 'premium_user',
          email: 'premium@minilove.com',
          password_hash: passwordHash,
          gender: 'male',
          age: 35,
          city: '上海',
          bio: '高级会员测试用户',
          membership_level: 'premium',
          created_at: new Date().toISOString()
        }
      ],
      posts: [
        {
          id: 1,
          user_id: 1,
          title: '深夜的迷茫',
          content: '工作十年，突然不知道自己要什么了...感觉每天都在重复，找不到生活的意义。',
          category: '情感倾诉',
          tags: ['迷茫', '工作', '人生'],
          emotion_tags: ['迷茫', '焦虑'],
          likes_count: 15,
          comments_count: 8,
          views_count: 120,
          visibility: 'public',
          status: 'published',
          created_at: new Date().toISOString()
        },
        {
          id: 2,
          user_id: 1,
          title: '一个人的周末',
          content: '周末不知道做什么，大家都怎么度过？感觉自己好无聊...',
          category: '单身生活',
          tags: ['周末', '独处', '生活'],
          emotion_tags: ['孤独', '无聊'],
          likes_count: 23,
          comments_count: 12,
          views_count: 185,
          visibility: 'public',
          status: 'published',
          created_at: new Date().toISOString()
        },
        {
          id: 3,
          user_id: 2,
          title: '设定小目标的重要性',
          content: '分享我如何通过设定小目标找到方向：每周完成一个小目标，生活变得充实多了！',
          category: '目标规划',
          tags: ['目标', '规划', '成长'],
          emotion_tags: ['积极', '希望'],
          likes_count: 42,
          comments_count: 25,
          views_count: 320,
          visibility: 'public',
          status: 'published',
          created_at: new Date().toISOString()
        }
      ],
      comments: [
        {
          id: 1,
          post_id: 1,
          user_id: 2,
          content: '我也有同样的感受，一起加油！',
          likes_count: 5,
          created_at: new Date().toISOString()
        },
        {
          id: 2,
          post_id: 2,
          user_id: 2,
          content: '周末可以试试新的兴趣爱好，比如摄影或者运动',
          likes_count: 3,
          created_at: new Date().toISOString()
        }
      ],
      topics: [
        {
          id: 1,
          name: '情感倾诉',
          description: '分享你的心情故事，寻找共鸣',
          is_featured: true,
          posts_count: 25,
          participants_count: 120
        },
        {
          id: 2,
          name: '目标规划',
          description: '如何找到人生方向，设定可实现的目标',
          is_featured: true,
          posts_count: 18,
          participants_count: 85
        },
        {
          id: 3,
          name: '晚间闲聊',
          description: '夜深人静时的随性交流',
          is_featured: true,
          posts_count: 42,
          participants_count: 210
        }
      ]
    };
  }
};

// 认证中间件
const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: '需要认证令牌'
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    req.user = {
      id: decoded.sub,
      role: decoded.role
    };
    
    next();
  } catch (error) {
    return res.status(401).json({
      error: 'InvalidToken',
      message: '无效的认证令牌'
    });
  }
};

// 生成Token
const generateToken = (userId, userRole = 'user') => {
  return jwt.sign(
    { sub: userId, role: userRole },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// API路由

// 健康检查
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'minilove-api',
    version: '0.1.0',
    timestamp: new Date().toISOString(),
    mockData: process.env.USE_MOCK_DB === 'true'
  });
});

// 用户注册
app.post('/api/v1/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    // 检查用户是否存在
    const existingUser = mockData.users.find(u => 
      u.username === username || u.email === email
    );
    
    if (existingUser) {
      return res.status(409).json({
        error: 'Conflict',
        message: '用户名或邮箱已被注册'
      });
    }
    
    // 创建用户
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    
    const newUser = {
      id: mockData.users.length + 1,
      username,
      email,
      password_hash: passwordHash,
      gender: 'unknown',
      age: null,
      city: '',
      bio: '',
      membership_level: 'free',
      created_at: new Date().toISOString()
    };
    
    mockData.users.push(newUser);
    
    // 生成Token
    const token = generateToken(newUser.id);
    
    res.status(201).json({
      message: '注册成功',
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        membershipLevel: newUser.membership_level
      },
      token
    });
  } catch (error) {
    res.status(500).json({
      error: 'RegistrationError',
      message: '注册失败'
    });
  }
});

// 用户登录
app.post('/api/v1/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // 查找用户
    const user = mockData.users.find(u => 
      u.username === username || u.email === username
    );
    
    if (!user) {
      return res.status(401).json({
        error: 'AuthenticationError',
        message: '用户名或密码错误'
      });
    }
    
    // 验证密码
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({
        error: 'AuthenticationError',
        message: '用户名或密码错误'
      });
    }
    
    // 生成Token
    const token = generateToken(user.id);
    
    res.status(200).json({
      message: '登录成功',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        membershipLevel: user.membership_level
      },
      token
    });
  } catch (error) {
    res.status(500).json({
      error: 'LoginError',
      message: '登录失败'
    });
  }
});

// 获取当前用户信息
app.get('/api/v1/auth/profile', authenticate, (req, res) => {
  const user = mockData.users.find(u => u.id === req.user.id);
  
  if (!user) {
    return res.status(404).json({
      error: 'NotFound',
      message: '用户不存在'
    });
  }
  
  res.status(200).json({
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      gender: user.gender,
      age: user.age,
      city: user.city,
      bio: user.bio,
      membershipLevel: user.membership_level,
      createdAt: user.created_at
    }
  });
});

// 获取帖子列表
app.get('/api/v1/posts', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const category = req.query.category;
  
  let posts = [...mockData.posts]
    .filter(p => p.status === 'published' && p.visibility === 'public');
  
  if (category) {
    posts = posts.filter(p => p.category === category);
  }
  
  // 模拟分页
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const paginatedPosts = posts.slice(startIndex, endIndex);
  
  // 添加作者信息
  const postsWithAuthors = paginatedPosts.map(post => {
    const author = mockData.users.find(u => u.id === post.user_id);
    return {
      ...post,
      author_username: author?.username || '未知用户',
      author_avatar: author?.avatar
    };
  });
  
  res.status(200).json({
    posts: postsWithAuthors,
    pagination: {
      total: posts.length,
      page,
      limit,
      totalPages: Math.ceil(posts.length / limit),
      hasNextPage: endIndex < posts.length,
      hasPrevPage: page > 1
    }
  });
});

// 获取帖子详情
app.get('/api/v1/posts/:id', (req, res) => {
  const postId = parseInt(req.params.id);
  const post = mockData.posts.find(p => p.id === postId && p.status === 'published');
  
  if (!post) {
    return res.status(404).json({
      error: 'NotFound',
      message: '帖子不存在'
    });
  }
  
  // 增加浏览量
  post.views_count = (post.views_count || 0) + 1;
  
  // 获取作者信息
  const author = mockData.users.find(u => u.id === post.user_id);
  
  res.status(200).json({
    post: {
      ...post,
      author_username: author?.username || '未知用户',
      author_avatar: author?.avatar
    }
  });
});

// 创建帖子（需要认证）
app.post('/api/v1/posts', authenticate, (req, res) => {
  try {
    const { title, content, category, tags, visibility = 'public' } = req.body;
    
    const newPost = {
      id: mockData.posts.length + 1,
      user_id: req.user.id,
      title,
      content,
      category,
      tags: tags || [],
      emotion_tags: [], // 简化版不分析情感标签
      likes_count: 0,
      comments_count: 0,
      views_count: 0,
      visibility,
      status: 'published',
      created_at: new Date().toISOString()
    };
    
    mockData.posts.push(newPost);
    
    res.status(201).json({
      message: '帖子创建成功',
      post: newPost
    });
  } catch (error) {
    res.status(500).json({
      error: 'ServerError',
      message: '创建帖子失败'
    });
  }
});

// 获取话题列表
app.get('/api/v1/topics', (req, res) => {
  const topics = mockData.topics.filter(t => t.is_featured);
  
  res.status(200).json({
    topics
  });
});

// 获取评论
app.get('/api/v1/posts/:id/comments', (req, res) => {
  const postId = parseInt(req.params.id);
  const comments = mockData.comments
    .filter(c => c.post_id === postId)
    .map(comment => {
      const author = mockData.users.find(u => u.id === comment.user_id);
      return {
        ...comment,
        author_username: author?.username || '未知用户',
        author_avatar: author?.avatar
      };
    });
  
  res.status(200).json({
    comments
  });
});

// 创建评论（需要认证）
app.post('/api/v1/comments', authenticate, (req, res) => {
  try {
    const { postId, content } = req.body;
    
    // 检查帖子是否存在
    const post = mockData.posts.find(p => p.id === postId);
    if (!post) {
      return res.status(404).json({
        error: 'NotFound',
        message: '帖子不存在'
      });
    }
    
    const newComment = {
      id: mockData.comments.length + 1,
      post_id: postId,
      user_id: req.user.id,
      content,
      likes_count: 0,
      created_at: new Date().toISOString()
    };
    
    mockData.comments.push(newComment);
    
    // 更新帖子评论计数
    post.comments_count = (post.comments_count || 0) + 1;
    
    res.status(201).json({
      message: '评论创建成功',
      comment: newComment
    });
  } catch (error) {
    res.status(500).json({
      error: 'ServerError',
      message: '创建评论失败'
    });
  }
});

// 测试数据端点（仅开发环境）
app.get('/api/v1/debug/data', (req, res) => {
  if (process.env.NODE_ENV !== 'development') {
    return res.status(403).json({
      error: 'Forbidden',
      message: '仅开发环境可用'
    });
  }
  
  res.status(200).json({
    users: mockData.users.map(u => ({
      id: u.id,
      username: u.username,
      email: u.email,
      membership_level: u.membership_level
    })),
    posts: mockData.posts.length,
    comments: mockData.comments.length,
    topics: mockData.topics.length
  });
});

// API文档
app.get('/api-docs', (req, res) => {
  const docs = `
  <!DOCTYPE html>
  <html>
  <head>
    <title>MiniLove API 文档</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 40px; }
      h1 { color: #333; }
      .endpoint { background: #f5f5f5; padding: 15px; margin: 10px 0; border-left: 4px solid #4CAF50; }
      .method { display: inline-block; padding: 4px 8px; background: #4CAF50; color: white; border-radius: 3px; font-weight: bold; }
      .url { font-family: monospace; color: #2196F3; }
      .desc { margin: 10px 0; }
    </style>
  </head>
  <body>
    <h1>MiniLove API 文档</h1>
    <p>当前环境: ${process.env.NODE_ENV || 'development'}</p>
    
    <div class="endpoint">
      <span class="method">GET</span> <span class="url">/health</span>
      <div class="desc">健康检查</div>
    </div>
    
    <div class="endpoint">
      <span class="method">POST</span> <span class="url">/api/v1/auth/register</span>
      <div class="desc">用户注册</div>
    </div>
    
    <div class="endpoint">
      <span class="method">POST</span> <span class="url">/api/v1/auth/login</span>
      <div class="desc">用户登录</div>
    </div>
    
    <div class="endpoint">
      <span class="method">GET</span> <span class="url">/api/v1/auth/profile</span>
      <div class="desc">获取当前用户信息（需要认证）</div>
    </div>
    
    <div class="endpoint">
      <span class="method">GET</span> <span class="url">/api/v1/posts</span>
      <div class="desc">获取帖子列表</div>
    </div>
    
    <div class="endpoint">
      <span class="method">POST</span> <span class="url">/api/v1/posts</span>
      <div class="desc">创建帖子（需要认证）</div>
    </div>
    
    <div class="endpoint">
      <span class="method">GET</span> <span class="url">/api/v1/posts/:id</span>
      <div class="desc">获取帖子详情</div>
    </div>
    
    <div class="endpoint">
      <span class="method">GET</span> <span class="url">/api/v1/topics</span>
      <div class="desc">获取话题列表</div>
    </div>
    
    <div class="endpoint">
      <span class="method">POST</span> <span class="url">/api/v1/comments</span>
      <div class="desc">创建评论（需要认证）</div>
    </div>
    
    <p>测试账户:</p>
    <ul>
      <li>用户名: test_user, 密码: test123 (免费会员)</li>
      <li>用户名: premium_user, 密码: test123 (高级会员)</li>
    </ul>
  </body>
  </html>
  `;
  
  res.send(docs);
});

// 404处理
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.originalUrl}`,
    availableEndpoints: [
      'GET /health',
      'GET /api-docs',
      'POST /api/v1/auth/register',
      'POST /api/v1/auth/login',
      'GET /api/v1/auth/profile',
      'GET /api/v1/posts',
      'POST /api/v1/posts',
      'GET /api/v1/posts/:id',
      'GET /api/v1/topics',
      'POST /api/v1/comments'
    ]
  });
});

// 启动服务器
const startServer = async () => {
  await loadMockData();
  
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`========================================`);
    console.log(`MiniLove API 服务已启动`);
    console.log(`环境: ${process.env.NODE_ENV || 'development'}`);
    console.log(`端口: ${PORT}`);
    console.log(`API基础路径: /api/v1`);
    console.log(`健康检查: http://localhost:${PORT}/health`);
    console.log(`API文档: http://localhost:${PORT}/api-docs`);
    console.log(`测试数据: http://localhost:${PORT}/api/v1/debug/data`);
    console.log(`========================================`);
    console.log(`可用账户:`);
    console.log(`  1. test_user / test123 (免费会员)`);
    console.log(`  2. premium_user / test123 (高级会员)`);
    console.log(`========================================`);
  });
};

startServer().catch(console.error);

module.exports = app;