#!/bin/bash

# MiniLove PostgreSQL 数据库配置脚本
set -e

echo "============================================"
echo "🔧 MiniLove PostgreSQL 数据库配置"
echo "============================================"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 数据库配置
DB_NAME="minilove_dev"
DB_USER="minilove_user"
DB_PASSWORD="minilove_password_2026"
DB_PORT="5432"

# 检查是否已安装PostgreSQL客户端
echo -e "${BLUE}[1/7]${NC} 检查PostgreSQL客户端..."
if ! command -v psql &> /dev/null; then
    echo -e "${YELLOW}⚠️ PostgreSQL客户端未安装${NC}"
    echo "正在尝试安装PostgreSQL客户端..."
    
    if command -v apt-get &> /dev/null; then
        apt-get update
        apt-get install -y postgresql-client
    elif command -v yum &> /dev/null; then
        yum install -y postgresql
    elif command -v apk &> /dev/null; then
        apk add postgresql-client
    else
        echo -e "${RED}❌ 无法自动安装PostgreSQL客户端${NC}"
        echo "请手动安装PostgreSQL客户端后重新运行此脚本"
        exit 1
    fi
fi

echo -e "${GREEN}✅ PostgreSQL客户端已安装${NC}"

# 检查PostgreSQL服务是否可用
echo -e "${BLUE}[2/7]${NC} 检查PostgreSQL服务连接..."
if ! pg_isready -h localhost -p $DB_PORT 2>/dev/null; then
    echo -e "${YELLOW}⚠️ PostgreSQL服务未在本地运行${NC}"
    
    # 尝试使用Docker启动PostgreSQL
    echo "尝试使用Docker启动PostgreSQL服务..."
    
    if command -v docker &> /dev/null; then
        echo "启动PostgreSQL容器..."
        docker run -d \
            --name minilove-postgres \
            -e POSTGRES_USER=postgres \
            -e POSTGRES_PASSWORD=postgres \
            -e POSTGRES_DB=$DB_NAME \
            -p $DB_PORT:5432 \
            -v $(pwd)/../data/postgres:/var/lib/postgresql/data \
            postgres:15-alpine
        
        echo -e "${YELLOW}等待PostgreSQL启动...${NC}"
        sleep 10
        
        # 设置环境变量使用容器内的PostgreSQL
        export PGHOST=localhost
        export PGPORT=$DB_PORT
        export PGUSER=postgres
        export PGPASSWORD=postgres
        
        echo -e "${GREEN}✅ PostgreSQL容器已启动${NC}"
    else
        echo -e "${RED}❌ Docker未安装，无法启动PostgreSQL${NC}"
        echo "请确保PostgreSQL服务在本地运行，或安装Docker"
        exit 1
    fi
else
    echo -e "${GREEN}✅ PostgreSQL服务正在运行${NC}"
fi

# 设置环境变量
export PGHOST=${PGHOST:-localhost}
export PGPORT=${PGPORT:-$DB_PORT}
export PGUSER=${PGUSER:-postgres}
export PGPASSWORD=${PGPASSWORD:-postgres}

# 创建数据库
echo -e "${BLUE}[3/7]${NC} 创建数据库: $DB_NAME"
if psql -lqt | cut -d \| -f 1 | grep -qw $DB_NAME; then
    echo -e "${YELLOW}⚠️ 数据库 $DB_NAME 已存在${NC}"
else
    createdb $DB_NAME
    echo -e "${GREEN}✅ 数据库 $DB_NAME 创建成功${NC}"
fi

# 执行数据库架构
echo -e "${BLUE}[4/7]${NC} 执行数据库架构..."
SCHEMA_FILE="../database/schema.sql"
if [ -f "$SCHEMA_FILE" ]; then
    echo "执行架构文件: $SCHEMA_FILE"
    psql -d $DB_NAME -f "$SCHEMA_FILE"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ 数据库架构执行成功${NC}"
    else
        echo -e "${RED}❌ 数据库架构执行失败${NC}"
        exit 1
    fi
else
    echo -e "${RED}❌ 架构文件不存在: $SCHEMA_FILE${NC}"
    exit 1
fi

# 更新后端环境配置
echo -e "${BLUE}[5/7]${NC} 更新后端环境配置..."
ENV_FILE="../backend/.env"
if [ -f "$ENV_FILE" ]; then
    # 备份原配置文件
    cp "$ENV_FILE" "$ENV_FILE.backup"
    
    # 更新数据库配置
    cat > "$ENV_FILE" << EOF
# MiniLove PostgreSQL 环境配置
NODE_ENV=development

# 服务器配置
PORT=3000
HOST=0.0.0.0
CORS_ORIGIN=http://localhost:5173,http://localhost:3000,http://localhost:8000
API_PREFIX=/api
API_VERSION=v1

# PostgreSQL数据库配置
DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@${PGHOST}:${PGPORT}/${DB_NAME}
DB_HOST=${PGHOST}
DB_PORT=${PGPORT}
DB_NAME=${DB_NAME}
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASSWORD}

# Redis配置（可选）
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT配置
JWT_SECRET=minilove_jwt_secret_production_2026
JWT_EXPIRES_IN=7d

# 文件上传配置
MAX_FILE_SIZE=10485760  # 10MB
UPLOAD_PATH=./uploads

# 日志配置
LOG_LEVEL=info
LOG_FILE=./logs/app.log

# 禁用模拟数据模式
USE_MOCK_DB=false
USE_SQLITE=false
EOF
    
    echo -e "${GREEN}✅ 环境配置文件已更新${NC}"
    echo "数据库连接字符串: postgresql://${DB_USER}:******@${PGHOST}:${PGPORT}/${DB_NAME}"
else
    echo -e "${RED}❌ 环境文件不存在: $ENV_FILE${NC}"
fi

# 测试数据库连接
echo -e "${BLUE}[6/7]${NC} 测试数据库连接..."
TEST_SCRIPT=$(cat << 'EOF'
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'minilove_dev',
  user: process.env.DB_USER || 'minilove_user',
  password: process.env.DB_PASSWORD || 'minilove_password_2026',
});

async function testConnection() {
  let client;
  try {
    client = await pool.connect();
    const result = await client.query('SELECT NOW() as current_time, version() as version');
    console.log('✅ 数据库连接测试成功');
    console.log(`   当前时间: ${result.rows[0].current_time}`);
    console.log(`   PostgreSQL版本: ${result.rows[0].version}`);
    
    // 检查表是否存在
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log(`\n📊 数据库中的表 (${tablesResult.rows.length}个):`);
    tablesResult.rows.forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.table_name}`);
    });
    
    return true;
  } catch (error) {
    console.error('❌ 数据库连接测试失败:');
    console.error(`   错误信息: ${error.message}`);
    return false;
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

testConnection();
EOF
)

# 创建临时测试文件
echo "$TEST_SCRIPT" > /tmp/test_db.js

# 运行测试
cd ../backend
if node /tmp/test_db.js; then
    echo -e "${GREEN}✅ 数据库连接测试通过${NC}"
else
    echo -e "${RED}❌ 数据库连接测试失败${NC}"
    exit 1
fi

# 清理临时文件
rm -f /tmp/test_db.js

# 完成提示
echo -e "${BLUE}[7/7]${NC} 配置完成！"
echo "============================================"
echo -e "${GREEN}🎉 PostgreSQL数据库配置完成！${NC}"
echo "============================================"
echo ""
echo "📊 配置信息:"
echo "   数据库名: $DB_NAME"
echo "   用户名: $DB_USER"
echo "   主机: $PGHOST"
echo "   端口: $PGPORT"
echo ""
echo "🔗 连接字符串:"
echo "   postgresql://$DB_USER:$DB_PASSWORD@$PGHOST:$PGPORT/$DB_NAME"
echo ""
echo "🚀 下一步操作:"
echo "   1. 重启后端服务以使用新数据库"
echo "   2. 运行数据库迁移（如果需要）"
echo "   3. 测试API端点功能"
echo ""
echo "💡 管理工具:"
echo "   - 使用 psql 命令行工具连接"
echo "   - 或使用 Adminer (http://localhost:8080)"
echo "============================================"