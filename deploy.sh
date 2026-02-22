#!/bin/bash

# MiniLove 一键部署脚本
# 适用于有足够资源的开发/生产环境

set -e

echo "============================================"
echo "🚀 MiniLove 一键部署脚本"
echo "============================================"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 检查必要工具
check_tools() {
    echo -e "${BLUE}[1/10]${NC} 检查系统工具..."
    
    local missing_tools=()
    
    # 检查Docker
    if ! command -v docker &> /dev/null; then
        missing_tools+=("Docker")
    fi
    
    # 检查Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        missing_tools+=("Docker Compose")
    fi
    
    # 检查Git
    if ! command -v git &> /dev/null; then
        missing_tools+=("Git")
    fi
    
    if [ ${#missing_tools[@]} -gt 0 ]; then
        echo -e "${YELLOW}⚠️  缺少以下工具: ${missing_tools[*]}${NC}"
        echo "请先安装必要的工具后再运行此脚本。"
        exit 1
    fi
    
    echo -e "${GREEN}✅ 所有必要工具都已安装${NC}"
}

# 创建项目目录结构
setup_directory() {
    echo -e "${BLUE}[2/10]${NC} 创建项目目录结构..."
    
    # 创建必要目录
    mkdir -p ./data/postgres
    mkdir -p ./data/redis
    mkdir -p ./logs
    mkdir -p ./uploads
    mkdir -p ./ssl
    
    echo -e "${GREEN}✅ 目录结构创建完成${NC}"
}

# 配置环境变量
setup_environment() {
    echo -e "${BLUE}[3/10]${NC} 配置环境变量..."
    
    # 生成安全密钥
    local jwt_secret=$(openssl rand -hex 32 2>/dev/null || echo "minilove_jwt_secret_$(date +%s)")
    local db_password=$(openssl rand -hex 16 2>/dev/null || echo "minilove_db_password_$(date +%s)")
    local redis_password=$(openssl rand -hex 16 2>/dev/null || echo "minilove_redis_password_$(date +%s)")
    
    # 创建生产环境配置
    cat > .env.production << EOF
# MiniLove 生产环境配置
NODE_ENV=production

# 服务器配置
PORT=3000
HOST=0.0.0.0
CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com
API_PREFIX=/api
API_VERSION=v1

# PostgreSQL数据库配置
DATABASE_URL=postgresql://minilove_user:${db_password}@postgres:5432/minilove_prod
DB_HOST=postgres
DB_PORT=5432
DB_NAME=minilove_prod
DB_USER=minilove_user
DB_PASSWORD=${db_password}

# Redis缓存配置
REDIS_URL=redis://:${redis_password}@redis:6379
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=${redis_password}

# JWT配置
JWT_SECRET=${jwt_secret}
JWT_EXPIRES_IN=7d

# 文件上传配置
MAX_FILE_SIZE=10485760  # 10MB
UPLOAD_PATH=/uploads

# 禁用模拟数据
USE_MOCK_DB=false
USE_SQLITE=false

# 日志配置
LOG_LEVEL=info
LOG_FILE=/logs/app.log

# 安全配置
RATE_LIMIT_WINDOW_MS=900000  # 15分钟
RATE_LIMIT_MAX_REQUESTS=100  # 每个IP每15分钟最多100个请求
EOF
    
    echo -e "${GREEN}✅ 环境变量配置完成${NC}"
    echo -e "${YELLOW}📝 重要: 请妥善保存生成的密钥和密码${NC}"
}

# 创建Nginx配置
setup_nginx() {
    echo -e "${BLUE}[4/10]${NC} 配置Nginx反向代理..."
    
    mkdir -p ./nginx/conf.d
    mkdir -p ./nginx/ssl
    
    # 创建Nginx配置
    cat > ./nginx/conf.d/minilove.conf << 'EOF'
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    
    # 重定向到HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;
    
    # SSL证书配置
    ssl_certificate /etc/nginx/ssl/certificate.crt;
    ssl_certificate_key /etc/nginx/ssl/private.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    
    # 前端静态文件
    location / {
        root /usr/share/nginx/html;
        index index.html;
        try_files $uri $uri/ /index.html;
        
        # 缓存控制
        expires 1h;
        add_header Cache-Control "public, immutable";
    }
    
    # API代理
    location /api {
        proxy_pass http://api:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # 超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # 健康检查
    location /health {
        proxy_pass http://api:3000/health;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        access_log off;
    }
    
    # 静态文件缓存
    location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
        root /usr/share/nginx/html;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # 上传文件
    location /uploads {
        alias /uploads;
        expires 1h;
        add_header Cache-Control "public";
    }
    
    # 安全头部
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self' https: data: 'unsafe-inline' 'unsafe-eval';" always;
}
EOF
    
    echo -e "${GREEN}✅ Nginx配置完成${NC}"
    echo -e "${YELLOW}📝 注意: 需要将SSL证书放入 ./nginx/ssl/ 目录${NC}"
}

# 创建Docker Compose文件
setup_docker_compose() {
    echo -e "${BLUE}[5/10]${NC} 创建Docker Compose配置..."
    
    cat > docker-compose.production.yml << 'EOF'
version: '3.8'

services:
  # PostgreSQL数据库
  postgres:
    image: postgres:15-alpine
    container_name: minilove-postgres
    environment:
      POSTGRES_USER: minilove_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: minilove_prod
    volumes:
      - ./data/postgres:/var/lib/postgresql/data
      - ./database/schema.sql:/docker-entrypoint-initdb.d/init.sql
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U minilove_user"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - minilove-network

  # Redis缓存
  redis:
    image: redis:7-alpine
    container_name: minilove-redis
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    volumes:
      - ./data/redis:/data
    restart: unless-stopped
    networks:
      - minilove-network

  # 后端API服务
  api:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: minilove-api
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_started
    environment:
      - NODE_ENV=production
      - PORT=3000
      - HOST=0.0.0.0
      - DATABASE_URL=postgresql://minilove_user:${DB_PASSWORD}@postgres:5432/minilove_prod
      - REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379
      - JWT_SECRET=${JWT_SECRET}
    volumes:
      - ./logs:/logs
      - ./uploads:/uploads
    restart: unless-stopped
    networks:
      - minilove-network
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Nginx反向代理
  nginx:
    image: nginx:alpine
    container_name: minilove-nginx
    depends_on:
      - api
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/conf.d:/etc/nginx/conf.d
      - ./nginx/ssl:/etc/nginx/ssl
      - ./logs:/var/log/nginx
      - ./uploads:/uploads
    restart: unless-stopped
    networks:
      - minilove-network

  # 前端构建和部署
  frontend-builder:
    image: node:18-alpine
    container_name: minilove-frontend-builder
    working_dir: /app
    volumes:
      - ./frontend:/app
      - ./nginx/html:/dist
    command: |
      sh -c "
        npm ci &&
        npm run build &&
        cp -r dist/* /dist/
      "
    networks:
      - minilove-network

  # 监控服务（可选）
  prometheus:
    image: prom/prometheus:latest
    container_name: minilove-prometheus
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
    ports:
      - "9090:9090"
    restart: unless-stopped
    networks:
      - minilove-network

  # Grafana仪表板（可选）
  grafana:
    image: grafana/grafana:latest
    container_name: minilove-grafana
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - ./monitoring/grafana:/var/lib/grafana
    ports:
      - "3001:3000"
    restart: unless-stopped
    networks:
      - minilove-network

volumes:
  postgres_data:
  redis_data:
  nginx_html:

networks:
  minilove-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
EOF
    
    echo -e "${GREEN}✅ Docker Compose配置完成${NC}"
}

# 创建备份脚本
setup_backup() {
    echo -e "${BLUE}[6/10]${NC} 创建数据库备份脚本..."
    
    cat > backup.sh << 'EOF'
#!/bin/bash

# MiniLove 数据库备份脚本
set -e

BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/minilove_backup_$TIMESTAMP.sql"

# 创建备份目录
mkdir -p "$BACKUP_DIR"

echo "开始备份数据库..."
docker-compose -f docker-compose.production.yml exec -T postgres pg_dump -U minilove_user minilove_prod > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    # 压缩备份文件
    gzip "$BACKUP_FILE"
    echo "✅ 数据库备份成功: ${BACKUP_FILE}.gz"
    
    # 删除7天前的备份
    find "$BACKUP_DIR" -name "*.gz" -mtime +7 -delete
    echo "🧹 已清理7天前的备份文件"
else
    echo "❌ 数据库备份失败"
    exit 1
fi
EOF
    
    chmod +x backup.sh
    
    cat > restore.sh << 'EOF'
#!/bin/bash

# MiniLove 数据库恢复脚本
set -e

if [ -z "$1" ]; then
    echo "使用方法: $0 <备份文件.sql.gz>"
    exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
    echo "错误: 备份文件不存在: $BACKUP_FILE"
    exit 1
fi

echo "开始恢复数据库..."
echo "警告: 这将覆盖现有数据库，请确认继续 (y/N)"
read -r CONFIRM

if [[ "$CONFIRM" != "y" && "$CONFIRM" != "Y" ]]; then
    echo "恢复操作已取消"
    exit 0
fi

# 解压备份文件
gunzip -c "$BACKUP_FILE" | docker-compose -f docker-compose.production.yml exec -T postgres psql -U minilove_user minilove_prod

if [ $? -eq 0 ]; then
    echo "✅ 数据库恢复成功"
else
    echo "❌ 数据库恢复失败"
    exit 1
fi
EOF
    
    chmod +x restore.sh
    
    echo -e "${GREEN}✅ 备份脚本创建完成${NC}"
}

# 创建监控配置
setup_monitoring() {
    echo -e "${BLUE}[7/10]${NC} 创建监控配置..."
    
    mkdir -p ./monitoring
    
    # Prometheus配置
    cat > ./monitoring/prometheus.yml << 'EOF'
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'minilove-api'
    static_configs:
      - targets: ['api:3000']
    
  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']
    
  - job_name: 'postgres-exporter'
    static_configs:
      - targets: ['postgres-exporter:9187']
EOF
    
    echo -e "${GREEN}✅ 监控配置完成${NC}"
}

# 创建部署检查脚本
setup_deployment_check() {
    echo -e "${BLUE}[8/10]${NC} 创建部署检查脚本..."
    
    cat > check-deployment.sh << 'EOF'
#!/bin/bash

# MiniLove 部署检查脚本
set -e

echo "🔍 检查部署状态..."
echo ""

# 检查容器状态
echo "1. 容器状态:"
docker-compose -f docker-compose.production.yml ps

echo ""
echo "2. 服务健康状态:"

# 检查API健康
API_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/health || echo "error")
if [ "$API_HEALTH" = "200" ]; then
    echo "   ✅ API服务: 正常"
else
    echo "   ❌ API服务: 异常 (HTTP $API_HEALTH)"
fi

# 检查数据库连接
DB_STATUS=$(docker-compose -f docker-compose.production.yml exec -T postgres pg_isready -U minilove_user 2>/dev/null && echo "正常" || echo "异常")
echo "   📊 数据库: $DB_STATUS"

# 检查Redis连接
REDIS_STATUS=$(docker-compose -f docker-compose.production.yml exec -T redis redis-cli -a "$REDIS_PASSWORD" ping 2>/dev/null | grep -q PONG && echo "正常" || echo "异常")
echo "   🔴 Redis: $REDIS_STATUS"

# 检查Nginx
NGINX_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost || echo "error")
if [ "$NGINX_STATUS" = "200" ] || [ "$NGINX_STATUS" = "301" ] || [ "$NGINX_STATUS" = "302" ]; then
    echo "   🌐 Nginx: 正常"
else
    echo "   ❌ Nginx: 异常 (HTTP $NGINX_STATUS)"
fi

echo ""
echo "📊 资源使用情况:"
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}" minilove-postgres minilove-redis minilove-api minilove-nginx 2>/dev/null || echo "   无法获取资源使用情况"

echo ""
echo "📈 日志状态:"
docker-compose -f docker-compose.production.yml logs --tail=10 api

echo ""
echo "🎯 部署状态检查完成"
EOF
    
    chmod +x check-deployment.sh
    
    echo -e "${GREEN}✅ 部署检查脚本创建完成${NC}"
}

# 创建README文档
create_documentation() {
    echo -e "${BLUE}[9/10]${NC} 创建部署文档..."
    
    cat > DEPLOYMENT.md << 'EOF'
# MiniLove 部署指南

## 系统要求
- Docker 20.10+
- Docker Compose 2.0+
- 至少 2GB 可用内存
- 至少 10GB 磁盘空间

## 快速开始

### 1. 克隆项目
```bash
git clone <repository-url>
cd MiniLove-project
```

### 2. 运行一键部署脚本
```bash
chmod +x deploy.sh
./deploy.sh
```

### 3. 启动服务
```bash
# 加载环境变量
source .env.production

# 启动所有服务
docker-compose -f docker-compose.production.yml up -d
```

### 4. 检查部署状态
```bash
./check-deployment.sh
```

## 服务说明

### PostgreSQL 数据库
- 端口: 5432 (内部)
- 用户: minilove_user
- 密码: 自动生成（查看 .env.production）
- 数据库: minilove_prod

### Redis 缓存
- 端口: 6379 (内部)
- 密码: 自动生成（查看 .env.production）

### API 服务
- 端口: 3000 (内部)
- 健康检查: http://localhost/health
- API文档: http://localhost/api-docs

### Nginx 反向代理
- HTTP端口: 80
- HTTPS端口: 443
- 前端文件: /usr/share/nginx/html
- SSL证书: 需要放入 ./nginx/ssl/

## 管理命令

### 启动服务
```bash
docker-compose -f docker-compose.production.yml up -d
```

### 停止服务
```bash
docker-compose -f docker-compose.production.yml down
```

### 查看日志
```bash
# 查看所有日志
docker-compose -f docker-compose.production.yml logs

# 查看API服务日志
docker-compose -f docker-compose.production.yml logs api

# 实时查看日志
docker-compose -f docker-compose.production.yml logs -f
```

### 数据库备份
```bash
./backup.sh
```

### 数据库恢复
```bash
./restore.sh backups/minilove_backup_YYYYMMDD_HHMMSS.sql.gz
```

### 更新服务
```bash
# 拉取最新代码
git pull

# 重建并重启服务
docker-compose -f docker-compose.production.yml up -d --build
```

## 监控和告警

### Prometheus
- 端口: 9090
- 地址: http://localhost:9090

### Grafana
- 端口: 3001
- 地址: http://localhost:3001
- 默认用户: admin
- 默认密码: admin

## 故障排除

### 1. 服务无法启动
```bash
# 查看错误日志
docker-compose -f docker-compose.production.yml logs

# 检查端口占用
netstat -tulpn | grep :80
netstat -tulpn | grep :443
```

### 2. 数据库连接问题
```bash
# 检查数据库状态
docker-compose -f docker-compose.production.yml exec postgres pg_isready -U minilove_user

# 重置数据库（警告：会丢失数据）
docker-compose -f docker-compose.production.yml down -v
docker-compose -f docker-compose.production.yml up -d
```

### 3. SSL证书问题
```bash
# 检查证书文件
ls -la ./nginx/ssl/

# 应包含以下文件：
# - certificate.crt (SSL证书)
# - private.key (私钥)
```

## 安全建议

1. **修改默认密码**
   - 部署后立即修改 .env.production 中的密码
   - 使用强密码生成器生成新密码

2. **配置防火墙**
   ```bash
   # 只开放必要端口
   ufw allow 80/tcp
   ufw allow 443/tcp
   ufw enable
   ```

3. **定期更新**
   ```bash
   # 更新Docker镜像
   docker-compose -f docker-compose.production.yml pull
   docker-compose -f docker-compose.production.yml up -d
   ```

4. **监控和告警**
   - 配置Prometheus告警规则
   - 设置Grafana告警通知

## 技术支持
如有问题，请查看：
1. 项目文档: docs/
2. API文档: http://yourdomain.com/api-docs
3. 错误日志: ./logs/
EOF
    
    echo -e "${GREEN}✅ 部署文档创建完成${NC}"
}

# 完成部署
complete_deployment() {
    echo -e "${BLUE}[10/10]${NC} 完成部署准备..."
    
    # 创建完成标志
    cat > .deployment-ready << EOF
MiniLove 部署配置完成
生成时间: $(date)
版本: 1.0.0

下一步操作:
1. 将SSL证书放入 ./nginx/ssl/ 目录
2. 编辑 .env.production 中的域名配置
3. 运行: docker-compose -f docker-compose.production.yml up -d
4. 运行: ./check-deployment.sh 检查状态
EOF
    
    echo -e "${GREEN}============================================${NC}"
    echo -e "${GREEN}🎉 MiniLove 部署配置完成！${NC}"
    echo -e "${GREEN}============================================${NC}"
    echo ""
    echo -e "${YELLOW}📋 生成的文件:${NC}"
    echo "   • .env.production          - 生产环境配置"
    echo "   • docker-compose.production.yml - Docker Compose配置"
    echo "   • nginx/conf.d/minilove.conf - Nginx配置"
    echo "   • backup.sh                - 数据库备份脚本"
    echo "   • restore.sh               - 数据库恢复脚本"
    echo "   • check-deployment.sh      - 部署检查脚本"
    echo "   • DEPLOYMENT.md            - 部署文档"
    echo ""
    echo -e "${YELLOW}🚀 下一步操作:${NC}"
    echo "   1. 将SSL证书放入 ./nginx/ssl/ 目录"
    echo "   2. 编辑 .env.production 中的 CORS_ORIGIN"
    echo "   3. 启动服务: docker-compose -f docker-compose.production.yml up -d"
    echo "   4. 检查状态: ./check-deployment.sh"
    echo ""
    echo -e "${YELLOW}⚠️  重要安全提示:${NC}"
    echo "   • 妥善保存 .env.production 中的密码"
    echo "   • 定期运行 ./backup.sh 备份数据库"
    echo "   • 配置防火墙限制访问"
    echo ""
    echo -e "${GREEN}部署脚本运行完成！${NC}"
}

# 主函数
main() {
    echo "开始部署配置..."
    echo ""
    
    # 检查工具
    check_tools
    
    # 设置目录结构
    setup_directory
    
    # 配置环境变量
    setup_environment
    
    # 配置Nginx
    setup_nginx
    
    # 配置Docker Compose
    setup_docker_compose
    
    # 创建备份脚本
    setup_backup
    
    # 配置监控
    setup_monitoring
    
    # 创建部署检查
    setup_deployment_check
    
    # 创建文档
    create_documentation
    
    # 完成部署
    complete_deployment
}

# 运行主函数
main "$@"