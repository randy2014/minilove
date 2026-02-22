#!/bin/bash

# MiniLove 简化开发环境启动脚本
# 不需要Docker，使用内存数据库

echo "========================================"
echo "MiniLove 简化开发环境启动"
echo "========================================"

# 进入后端目录
cd "$(dirname "$0")"

# 检查Node.js
if ! command -v node &> /dev/null; then
    echo "错误: Node.js未安装"
    echo "请安装Node.js 18+"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "错误: npm未安装"
    echo "请安装npm"
    exit 1
fi

echo "✓ Node.js版本: $(node --version)"
echo "✓ npm版本: $(npm --version)"

# 检查依赖
if [ ! -d "node_modules" ]; then
    echo "安装依赖..."
    npm install
else
    echo "依赖已安装"
fi

# 创建开发环境配置
echo "创建开发环境配置..."
cat > .env << 'EOF'
# MiniLove 开发环境配置
NODE_ENV=development
PORT=3000
API_VERSION=v1
API_PREFIX=/api

# 内存数据库配置（简化开发）
USE_MOCK_DB=true
MOCK_DB_FILE=./mock-data.json

# JWT配置
JWT_SECRET=minilove_dev_secret_key_change_in_production
JWT_EXPIRES_IN=7d

# 文件存储配置
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760

# CORS配置
CORS_ORIGIN=http://localhost:5173

# 开发配置
LOG_LEVEL=debug
EOF

# 创建目录
mkdir -p uploads logs

# 创建模拟数据文件
cat > mock-data.json << 'EOF'
{
  "users": [
    {
      "id": 1,
      "username": "test_user",
      "email": "test@minilove.com",
      "password_hash": "$2a$10$N9qo8uLOickgx2ZMRZoMye3Z6gZ7x2ZH8q5.9.5J8Q7Yz6Y7Z6Y7C",
      "gender": "male",
      "age": 30,
      "city": "北京",
      "bio": "这是一个测试用户",
      "membership_level": "free",
      "created_at": "2026-02-22T08:00:00Z"
    },
    {
      "id": 2,
      "username": "premium_user",
      "email": "premium@minilove.com",
      "password_hash": "$2a$10$N9qo8uLOickgx2ZMRZoMye3Z6gZ7x2ZH8q5.9.5J8Q7Yz6Y7Z6Y7C",
      "gender": "male",
      "age": 35,
      "city": "上海",
      "bio": "高级会员测试用户",
      "membership_level": "premium",
      "created_at": "2026-02-22T08:05:00Z"
    }
  ],
  "posts": [
    {
      "id": 1,
      "user_id": 1,
      "title": "深夜的迷茫",
      "content": "工作十年，突然不知道自己要什么了...",
      "category": "情感倾诉",
      "tags": ["迷茫", "工作", "人生"],
      "emotion_tags": ["迷茫", "焦虑"],
      "likes_count": 15,
      "comments_count": 8,
      "views_count": 120,
      "visibility": "public",
      "status": "published",
      "created_at": "2026-02-22T20:30:00Z"
    },
    {
      "id": 2,
      "user_id": 1,
      "title": "一个人的周末",
      "content": "周末不知道做什么，大家都怎么度过？",
      "category": "单身生活",
      "tags": ["周末", "独处", "生活"],
      "emotion_tags": ["孤独", "无聊"],
      "likes_count": 23,
      "comments_count": 12,
      "views_count": 185,
      "visibility": "public",
      "status": "published",
      "created_at": "2026-02-22T21:15:00Z"
    },
    {
      "id": 3,
      "user_id": 2,
      "title": "设定小目标的重要性",
      "content": "分享我如何通过设定小目标找到方向",
      "category": "目标规划",
      "tags": ["目标", "规划", "成长"],
      "emotion_tags": ["积极", "希望"],
      "likes_count": 42,
      "comments_count": 25,
      "views_count": 320,
      "visibility": "public",
      "status": "published",
      "created_at": "2026-02-22T22:00:00Z"
    }
  ],
  "comments": [
    {
      "id": 1,
      "post_id": 1,
      "user_id": 2,
      "content": "我也有同样的感受，一起加油！",
      "likes_count": 5,
      "created_at": "2026-02-22T20:45:00Z"
    },
    {
      "id": 2,
      "post_id": 2,
      "user_id": 2,
      "content": "周末可以试试新的兴趣爱好",
      "likes_count": 3,
      "created_at": "2026-02-22T21:30:00Z"
    }
  ],
  "topics": [
    {
      "id": 1,
      "name": "情感倾诉",
      "description": "分享你的心情故事，寻找共鸣",
      "is_featured": true,
      "posts_count": 25,
      "participants_count": 120
    },
    {
      "id": 2,
      "name": "目标规划",
      "description": "如何找到人生方向，设定可实现的目标",
      "is_featured": true,
      "posts_count": 18,
      "participants_count": 85
    },
    {
      "id": 3,
      "name": "晚间闲聊",
      "description": "夜深人静时的随性交流",
      "is_featured": true,
      "posts_count": 42,
      "participants_count": 210
    }
  ]
}
EOF

echo "✓ 环境配置完成"
echo ""

echo "========================================"
echo "服务启动信息:"
echo "========================================"
echo "后端API: http://localhost:3000"
echo "健康检查: http://localhost:3000/health"
echo "模拟数据: 已创建测试用户和帖子"
echo ""
echo "测试账户:"
echo "  1. test_user / test123 (免费会员)"
echo "  2. premium_user / test123 (高级会员)"
echo "========================================"
echo ""

# 启动服务器
echo "启动Express服务器..."
npm run dev