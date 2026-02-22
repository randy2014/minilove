#!/bin/bash

# MiniLove 数据库设置脚本
# 用法: ./setup-database.sh [环境]
# 环境: dev (默认), test, prod

ENVIRONMENT=${1:-dev}
DB_NAME="minilove_${ENVIRONMENT}"
DB_USER="postgres"
DB_PASSWORD=""
DB_HOST="localhost"
DB_PORT="5432"

echo "========================================"
echo "MiniLove 数据库设置脚本"
echo "环境: $ENVIRONMENT"
echo "数据库: $DB_NAME"
echo "========================================"

# 检查 PostgreSQL 是否运行
if ! pg_isready -h $DB_HOST -p $DB_PORT > /dev/null 2>&1; then
    echo "错误: PostgreSQL 未运行在 $DB_HOST:$DB_PORT"
    echo "请启动 PostgreSQL 服务或检查连接设置"
    exit 1
fi

# 设置密码（如果未设置）
if [ -z "$DB_PASSWORD" ]; then
    read -sp "请输入 PostgreSQL 密码: " DB_PASSWORD
    echo ""
    export PGPASSWORD=$DB_PASSWORD
fi

# 检查数据库是否已存在
if psql -h $DB_HOST -p $DB_PORT -U $DB_USER -lqt | cut -d \| -f 1 | grep -qw $DB_NAME; then
    echo "数据库 '$DB_NAME' 已存在"
    read -p "是否删除并重新创建? (y/n): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "删除数据库 '$DB_NAME'..."
        psql -h $DB_HOST -p $DB_PORT -U $DB_USER -c "DROP DATABASE IF EXISTS $DB_NAME;"
    else
        echo "跳过数据库创建"
    fi
fi

# 创建数据库
if ! psql -h $DB_HOST -p $DB_PORT -U $DB_USER -lqt | cut -d \| -f 1 | grep -qw $DB_NAME; then
    echo "创建数据库 '$DB_NAME'..."
    psql -h $DB_HOST -p $DB_PORT -U $DB_USER -c "CREATE DATABASE $DB_NAME;"
    
    if [ $? -eq 0 ]; then
        echo "数据库创建成功"
    else
        echo "数据库创建失败"
        exit 1
    fi
fi

# 执行SQL schema
echo "执行数据库 schema..."
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f ../database/schema.sql

if [ $? -eq 0 ]; then
    echo "Schema 执行成功"
else
    echo "Schema 执行失败"
    exit 1
fi

# 插入初始数据（可选）
echo "插入初始数据..."
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME << EOF
-- 插入示例话题
INSERT INTO topics (name, description, cover_image, is_featured, is_active) VALUES
('情感倾诉', '分享你的心情故事，寻找共鸣', NULL, TRUE, TRUE),
('目标规划', '如何找到人生方向，设定可实现的目标', NULL, TRUE, TRUE),
('晚间闲聊', '夜深人静时的随性交流', NULL, TRUE, TRUE),
('单身生活', '单身男性的生活分享和思考', NULL, TRUE, TRUE),
('成长经历', '分享个人成长故事和经验', NULL, TRUE, TRUE)
ON CONFLICT (name) DO NOTHING;

-- 插入会员套餐
INSERT INTO membership_plans (name, description, price, duration_days, features, is_active, sort_order) VALUES
('基础会员', '基础功能套餐', 29.00, 30, '{"daily_goal_setting": true, "basic_content": true, "limited_chat": true}', TRUE, 1),
('高级会员', '完整功能套餐', 69.00, 30, '{"all_features": true, "one_on_one_chat": true, "personal_coaching": true, "premium_content": true}', TRUE, 2),
('季度会员', '长期使用优惠', 189.00, 90, '{"all_features": true, "priority_support": true, "exclusive_events": true}', TRUE, 3),
('年度会员', '最佳性价比套餐', 599.00, 365, '{"all_features": true, "vip_status": true, "custom_features": true}', TRUE, 4)
ON CONFLICT DO NOTHING;

-- 创建测试用户（密码：test123）
INSERT INTO users (username, phone, email, password_hash, gender, age, city, bio, membership_level) VALUES
('test_user', '13800138000', 'test@minilove.com', '\$2a\$10\$N9qo8uLOickgx2ZMRZoMye3Z6gZ7x2ZH8q5.9.5J8Q7Yz6Y7Z6Y7C', 'male', 30, '北京', '这是一个测试用户', 'free'),
('premium_user', '13900139000', 'premium@minilove.com', '\$2a\$10\$N9qo8uLOickgx2ZMRZoMye3Z6gZ7x2ZH8q5.9.5J8Q7Yz6Y7Z6Y7C', 'male', 35, '上海', '高级会员测试用户', 'premium')
ON CONFLICT DO NOTHING;

-- 插入测试帖子
INSERT INTO posts (user_id, title, content, category, tags, emotion_tags) VALUES
(1, '深夜的迷茫', '工作十年，突然不知道自己要什么了...', '情感倾诉', '{"迷茫", "工作", "人生"}', '{"迷茫", "焦虑"}'),
(1, '一个人的周末', '周末不知道做什么，大家都怎么度过？', '单身生活', '{"周末", "独处", "生活"}', '{"孤独", "无聊"}'),
(2, '设定小目标的重要性', '分享我如何通过设定小目标找到方向', '目标规划', '{"目标", "规划", "成长"}', '{"积极", "希望"}}')
ON CONFLICT DO NOTHING;

EOF

if [ $? -eq 0 ]; then
    echo "初始数据插入成功"
else
    echo "初始数据插入失败"
fi

# 创建 .env 文件
echo "创建环境配置文件..."
cat > ../backend/.env << EOF
# MiniLove 后端环境变量配置 - $ENVIRONMENT 环境

# 应用配置
NODE_ENV=$ENVIRONMENT
PORT=3000
API_VERSION=v1
API_PREFIX=/api

# 数据库配置
DB_HOST=$DB_HOST
DB_PORT=$DB_PORT
DB_NAME=$DB_NAME
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD

# Redis配置
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT配置
JWT_SECRET=minilove_jwt_secret_key_${ENVIRONMENT}_change_in_production
JWT_EXPIRES_IN=7d

# 文件存储配置
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760

# CORS配置
CORS_ORIGIN=http://localhost:5173

# 开发环境特定配置
EOF

if [ $ENVIRONMENT = "prod" ]; then
    cat >> ../backend/.env << EOF
# 生产环境配置
NODE_ENV=production
CORS_ORIGIN=https://minilove.com
JWT_SECRET=$(openssl rand -base64 32)
EOF
fi

echo ".env 文件创建完成"

echo "========================================"
echo "数据库设置完成!"
echo "数据库名称: $DB_NAME"
echo "下一步:"
echo "1. 进入后端目录: cd ../backend"
echo "2. 安装依赖: npm install"
echo "3. 启动服务: npm run dev"
echo "========================================"