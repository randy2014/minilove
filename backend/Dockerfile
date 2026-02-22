# 构建阶段
FROM node:18-alpine AS builder

# 设置工作目录
WORKDIR /app

# 复制package文件
COPY package*.json ./
COPY package-lock.json ./

# 安装依赖
RUN npm ci --only=production

# 运行时阶段
FROM node:18-alpine AS runtime

# 安装必要的运行时依赖
RUN apk add --no-cache tini

# 设置工作目录
WORKDIR /app

# 从构建阶段复制依赖
COPY --from=builder /app/node_modules ./node_modules

# 复制应用代码
COPY . .

# 创建非root用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# 更改文件所有权
RUN chown -R nodejs:nodejs /app

# 切换到非root用户
USER nodejs

# 创建必要的目录
RUN mkdir -p logs uploads

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# 使用Tini作为init进程
ENTRYPOINT ["/sbin/tini", "--"]

# 启动应用
CMD ["node", "src/app.js"]