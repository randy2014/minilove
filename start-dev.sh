#!/bin/bash

# MiniLove 开发环境启动脚本
# 用法: ./start-dev.sh [选项]
# 选项:
#   -d, --database  只启动数据库
#   -a, --all       启动完整环境
#   -h, --help      显示帮助

set -e

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  MiniLove 开发环境启动脚本${NC}"
echo -e "${BLUE}========================================${NC}"

show_help() {
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  -d, --database   只启动数据库"
    echo "  -a, --all        启动完整环境（后端 + 数据库）"
    echo "  -h, --help       显示此帮助信息"
    echo ""
    echo "示例:"
    echo "  $0 --all         启动完整开发环境"
    echo "  $0 --database    只启动数据库"
}

check_docker() {
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}错误: Docker未安装${NC}"
        echo "请安装Docker: https://docs.docker.com/get-docker/"
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        echo -e "${RED}错误: Docker服务未运行${NC}"
        echo "请启动Docker服务"
        exit 1
    fi
}

start_database() {
    echo -e "${YELLOW}[1/3] 检查Docker...${NC}"
    check_docker
    
    echo -e "${YELLOW}[2/3] 启动PostgreSQL数据库...${NC}"
    
    if docker ps -a --format "{{.Names}}" | grep -q "minilove-postgres"; then
        echo "数据库容器已存在，启动中..."
        docker start minilove-postgres
    else
        echo "创建新的数据库容器..."
        docker run -d \
            --name minilove-postgres \
            -e POSTGRES_PASSWORD=minilove123 \
            -e POSTGRES_USER=minilove \
            -e POSTGRES_DB=minilove_dev \
            -p 5432:5432 \
            -v minilove-postgres-data:/var/lib/postgresql/data \
            postgres:15-alpine
    fi
    
    echo -e "${YELLOW}[3/3] 等待数据库启动...${NC}"
    sleep 5
    
    # 测试数据库连接
    if docker exec minilove-postgres pg_isready -U minilove -d minilove_dev; then
        echo -e "${GREEN}✓ 数据库启动成功${NC}"
        echo "连接信息:"
        echo "  主机: localhost"
        echo "  端口: 5432"
        echo "  数据库: minilove_dev"
        echo "  用户名: minilove"
        echo "  密码: minilove123"
    else
        echo -e "${RED}✗ 数据库启动失败${NC}"
        exit 1
    fi
}

start_redis() {
    echo -e "${YELLOW}启动Redis...${NC}"
    
    if docker ps -a --format "{{.Names}}" | grep -q "minilove-redis"; then
        echo "Redis容器已存在，启动中..."
        docker start minilove-redis
    else
        echo "创建新的Redis容器..."
        docker run -d \
            --name minilove-redis \
            -p 6379:6379 \
            redis:7-alpine
    fi
    
    sleep 2
    echo -e "${GREEN}✓ Redis启动成功${NC}"
}

setup_backend() {
    echo -e "${YELLOW}[1/4] 进入后端目录...${NC}"
    cd backend || {
        echo -e "${RED}错误: backend目录不存在${NC}"
        exit 1
    }
    
    echo -e "${YELLOW}[2/4] 检查Node.js环境...${NC}"
    if ! command -v node &> /dev/null; then
        echo -e "${RED}错误: Node.js未安装${NC}"
        echo "请安装Node.js 18+"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        echo -e "${RED}错误: npm未安装${NC}"
        echo "请安装npm"
        exit 1
    fi
    
    echo "Node.js版本: $(node --version)"
    echo "npm版本: $(npm --version)"
    
    echo -e "${YELLOW}[3/4] 安装依赖...${NC}"
    if [ ! -d "node_modules" ]; then
        npm install
    else
        echo "依赖已安装，跳过..."
    fi
    
    echo -e "${YELLOW}[4/4] 创建环境配置文件...${NC}"
    cat > .env << EOF
# MiniLove 开发环境配置
NODE_ENV=development
PORT=3000
API_VERSION=v1
API_PREFIX=/api

# 数据库配置
DB_HOST=localhost
DB_PORT=5432
DB_NAME=minilove_dev
DB_USER=minilove
DB_PASSWORD=minilove123

# Redis配置
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

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
    
    echo -e "${GREEN}✓ 后端环境配置完成${NC}"
}

start_backend() {
    echo -e "${YELLOW}启动后端服务...${NC}"
    
    # 创建uploads目录
    mkdir -p uploads
    
    # 创建日志目录
    mkdir -p logs
    
    echo -e "${YELLOW}运行数据库迁移...${NC}"
    
    # 执行数据库迁移
    if [ -f "../database/schema.sql" ]; then
        echo "等待数据库准备就绪..."
        sleep 3
        
        # 使用pg_isready检查数据库
        for i in {1..10}; do
            if docker exec minilove-postgres pg_isready -U minilove -d minilove_dev > /dev/null 2>&1; then
                echo "数据库已就绪，执行迁移..."
                break
            fi
            echo "等待数据库... ($i/10)"
            sleep 2
        done
        
        # 执行schema
        docker exec -i minilove-postgres psql -U minilove -d minilove_dev < ../database/schema.sql
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓ 数据库迁移完成${NC}"
        else
            echo -e "${RED}✗ 数据库迁移失败${NC}"
        fi
    fi
    
    echo -e "${YELLOW}启动Express服务器...${NC}"
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}  服务启动信息:${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo "后端API: http://localhost:3000"
    echo "健康检查: http://localhost:3000/health"
    echo "API文档: http://localhost:3000/api-docs"
    echo "数据库: localhost:5432"
    echo "Redis: localhost:6379"
    echo -e "${BLUE}========================================${NC}"
    echo ""
    
    # 启动开发服务器
    npm run dev
}

case "$1" in
    -d|--database)
        start_database
        ;;
    -a|--all)
        start_database
        start_redis
        setup_backend
        start_backend
        ;;
    -h|--help)
        show_help
        ;;
    *)
        echo -e "${YELLOW}请选择启动选项:${NC}"
        echo "1) 启动完整环境 (后端 + 数据库)"
        echo "2) 只启动数据库"
        echo "3) 显示帮助"
        read -p "请选择 (1-3): " choice
        
        case $choice in
            1)
                start_database
                start_redis
                setup_backend
                start_backend
                ;;
            2)
                start_database
                ;;
            3)
                show_help
                ;;
            *)
                echo -e "${RED}无效的选择${NC}"
                show_help
                ;;
        esac
        ;;
esac