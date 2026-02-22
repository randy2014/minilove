#!/bin/bash

# MiniLove 数据库快速设置脚本
set -e

echo "🔧 MiniLove 数据库环境快速设置"

# 创建必要目录
echo "📁 创建数据目录..."
mkdir -p ../data/postgres
mkdir -p ../data/redis
mkdir -p ../logs

# 检查是否有可用的PostgreSQL服务
echo "🔍 检查PostgreSQL服务..."

if command -v psql &> /dev/null; then
    echo "✅ PostgreSQL已安装"
    
    # 尝试连接到默认PostgreSQL
    if psql -U postgres -c "SELECT 1;" &> /dev/null; then
        echo "✅ PostgreSQL服务正常运行"
        
        # 创建数据库
        echo "📝 创建MiniLove数据库..."
        psql -U postgres -c "CREATE DATABASE minilove_dev;" || echo "数据库可能已存在"
        
        # 执行架构脚本
        echo "📊 执行数据库架构..."
        psql -U postgres -d minilove_dev -f ../database/schema.sql
        
        echo "✅ 数据库设置完成！"
        exit 0
    else
        echo "⚠️ PostgreSQL服务未运行或需要密码"
    fi
fi

# 尝试使用SQLite作为替代方案
echo "🔄 尝试使用SQLite作为开发替代方案..."

# 检查是否安装了sqlite3
if command -v sqlite3 &> /dev/null; then
    echo "✅ SQLite已安装"
    
    # 创建SQLite数据库文件
    SQLITE_DB="../data/minilove_dev.db"
    echo "📝 创建SQLite数据库..."
    
    # 创建数据库文件
    sqlite3 "$SQLITE_DB" ".exit"
    
    echo "🎉 SQLite数据库已创建: $SQLITE_DB"
    echo ""
    echo "⚠️ 注意：SQLite仅适用于开发和测试环境"
    echo "📋 生产环境请使用PostgreSQL"
    
    # 更新环境变量
    cat > ../backend/.env << EOF
# MiniLove 环境配置 - SQLite开发模式
NODE_ENV=development

# 服务器配置
PORT=3000
HOST=0.0.0.0
CORS_ORIGIN=http://localhost:5173,http://localhost:3000,http://localhost:8000
API_PREFIX=/api
API_VERSION=v1

# 数据库配置 - SQLite
DB_TYPE=sqlite
DB_PATH=$SQLITE_DB

# 测试模式
USE_MOCK_DB=false
USE_SQLITE=true

# JWT配置
JWT_SECRET=minilove_dev_secret_key_2026_change_in_production
JWT_EXPIRES_IN=7d

# 文件上传配置
MAX_FILE_SIZE=10485760  # 10MB
UPLOAD_PATH=./uploads

# 日志配置
LOG_LEVEL=debug
LOG_FILE=./logs/app.log
EOF
    
    echo "✅ 环境配置文件已更新为SQLite模式"
    exit 0
else
    echo "❌ 未找到可用的数据库服务"
    echo ""
    echo "📋 请选择以下方案之一："
    echo ""
    echo "1. 安装并配置PostgreSQL："
    echo "   sudo apt-get install postgresql postgresql-contrib"
    echo "   sudo -u postgres psql -c \"CREATE DATABASE minilove_dev;\""
    echo "   sudo -u postgres psql -d minilove_dev -f ../database/schema.sql"
    echo ""
    echo "2. 安装SQLite："
    echo "   sudo apt-get install sqlite3"
    echo "   然后重新运行此脚本"
    echo ""
    echo "3. 使用Docker（推荐）："
    echo "   sudo apt-get install docker.io docker-compose"
    echo "   sudo docker-compose up -d"
    echo ""
    echo "4. 继续使用内存模拟数据（仅限开发）："
    echo "   设置 USE_MOCK_DB=true"
    echo ""
    exit 1
fi