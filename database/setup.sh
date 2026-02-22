#!/bin/bash

# MiniLove 数据库设置脚本
set -e

echo "🔧 MiniLove 数据库环境设置"

# 检查Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker未安装，尝试安装Docker..."
    # 这里应该添加Docker安装逻辑
    echo "⚠️ 请手动安装Docker后再运行此脚本"
    exit 1
fi

# 检查Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose未安装，尝试安装..."
    # 这里应该添加Docker Compose安装逻辑
    echo "⚠️ 请手动安装Docker Compose后再运行此脚本"
    exit 1
fi

# 创建数据目录
mkdir -p ./data/postgres
mkdir -p ./data/redis

echo "📁 数据目录创建完成"

# 检查PostgreSQL容器是否正在运行
if docker ps | grep -q "minilove-postgres"; then
    echo "✅ PostgreSQL容器已在运行"
else
    echo "🐘 启动PostgreSQL容器..."
    docker run -d \
        --name minilove-postgres \
        -e POSTGRES_USER=postgres \
        -e POSTGRES_PASSWORD=password \
        -e POSTGRES_DB=minilove_dev \
        -p 5432:5432 \
        -v $(pwd)/data/postgres:/var/lib/postgresql/data \
        postgres:15-alpine
    
    echo "⏳ 等待PostgreSQL启动..."
    sleep 10
fi

# 检查Redis容器是否正在运行
if docker ps | grep -q "minilove-redis"; then
    echo "✅ Redis容器已在运行"
else
    echo "🔴 启动Redis容器..."
    docker run -d \
        --name minilove-redis \
        -p 6379:6379 \
        -v $(pwd)/data/redis:/data \
        redis:7-alpine redis-server --appendonly yes
fi

echo "📊 检查数据库连接..."

# 等待PostgreSQL完全启动
for i in {1..10}; do
    if docker exec minilove-postgres pg_isready -U postgres > /dev/null 2>&1; then
        echo "✅ PostgreSQL已就绪"
        break
    fi
    echo "⏳ 等待PostgreSQL... ($i/10)"
    sleep 2
done

# 执行数据库迁移
echo "📝 执行数据库迁移..."
if [ -f "schema.sql" ]; then
    docker cp schema.sql minilove-postgres:/tmp/schema.sql
    docker exec minilove-postgres psql -U postgres -d minilove_dev -f /tmp/schema.sql
    
    if [ $? -eq 0 ]; then
        echo "✅ 数据库架构创建成功"
    else
        echo "❌ 数据库架构创建失败"
        exit 1
    fi
else
    echo "⚠️ schema.sql文件未找到"
fi

# 创建.env文件
echo "⚙️ 创建环境配置文件..."
cat > .env << EOF
# MiniLove 环境配置
NODE_ENV=development

# 服务器配置
PORT=3000
HOST=0.0.0.0
CORS_ORIGIN=http://localhost:5173,http://localhost:3000,http://localhost:8000
API_PREFIX=/api
API_VERSION=v1

# 数据库配置
DATABASE_URL=postgresql://postgres:password@localhost:5432/minilove_dev
DATABASE_TEST_URL=postgresql://postgres:password@localhost:5432/minilove_test

# Redis配置
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT配置
JWT_SECRET=minilove_dev_secret_key_2026_change_in_production
JWT_EXPIRES_IN=7d

# 文件上传配置
MAX_FILE_SIZE=10485760  # 10MB
UPLOAD_PATH=./uploads

# 日志配置
LOG_LEVEL=info
LOG_FILE=./logs/app.log

# 微信配置 (开发环境)
WECHAT_APP_ID=your_wechat_app_id_dev
WECHAT_APP_SECRET=your_wechat_app_secret_dev

# 支付宝配置 (开发环境)
ALIPAY_APP_ID=your_alipay_app_id_dev
ALIPAY_PRIVATE_KEY=your_alipay_private_key_dev

# 测试模式
USE_MOCK_DB=false
EOF

echo "✅ 环境配置文件创建完成"

# 创建Docker Compose文件
echo "🐳 创建Docker Compose配置..."
cat > docker-compose.yml << EOF
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: minilove-postgres
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
      POSTGRES_DB: minilove_dev
    ports:
      - "5432:5432"
    volumes:
      - ./data/postgres:/var/lib/postgresql/data
      - ./database/schema.sql:/docker-entrypoint-initdb.d/init.sql
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: minilove-redis
    ports:
      - "6379:6379"
    volumes:
      - ./data/redis:/data
    command: redis-server --appendonly yes
    restart: unless-stopped

  api:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: minilove-api
    depends_on:
      - postgres
      - redis
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://postgres:password@postgres:5432/minilove_dev
      - REDIS_URL=redis://redis:6379
    volumes:
      - ./backend:/app
      - /app/node_modules
    restart: unless-stopped
    command: npm run dev

  adminer:
    image: adminer
    container_name: minilove-adminer
    ports:
      - "8080:8080"
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:

networks:
  minilove-network:
    driver: bridge
EOF

echo "✅ Docker Compose配置创建完成"

echo ""
echo "🎉 数据库环境设置完成！"
echo ""
echo "📊 可用服务："
echo "  - PostgreSQL: localhost:5432 (postgres/password)"
echo "  - Redis: localhost:6379"
echo "  - Adminer (数据库管理): http://localhost:8080"
echo ""
echo "🔧 启动所有服务："
echo "  docker-compose up -d"
echo ""
echo "📝 查看日志："
echo "  docker-compose logs -f"
echo ""
echo "🛑 停止服务："
echo "  docker-compose down"
echo ""