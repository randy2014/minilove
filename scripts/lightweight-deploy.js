#!/usr/bin/env node

/**
 * MiniLove 轻量级部署方案
 * 适用于没有Docker的环境
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

// 项目根目录
const PROJECT_ROOT = path.join(__dirname, '..');

async function checkSystemRequirements() {
  console.log('🔍 检查系统要求...');
  
  const requirements = {
    node: { command: 'node --version', required: '>=18.0.0' },
    npm: { command: 'npm --version', required: '>=8.0.0' },
    python: { command: 'python3 --version', required: '>=3.8', optional: true }
  };
  
  let allMet = true;
  
  for (const [tool, config] of Object.entries(requirements)) {
    try {
      const output = execSync(config.command, { encoding: 'utf8' }).trim();
      console.log(`   ✅ ${tool}: ${output}`);
    } catch (error) {
      if (config.optional) {
        console.log(`   ⚠️  ${tool}: 未安装 (可选)`);
      } else {
        console.log(`   ❌ ${tool}: 未安装 (必需)`);
        allMet = false;
      }
    }
  }
  
  // 检查磁盘空间
  try {
    const dfOutput = execSync('df -h .', { encoding: 'utf8' });
    console.log('\n💾 磁盘空间:');
    console.log(dfOutput);
  } catch (error) {
    console.log('   ⚠️  无法检查磁盘空间');
  }
  
  return allMet;
}

async function setupBackend() {
  console.log('\n🔧 设置后端服务...');
  
  const backendPath = path.join(PROJECT_ROOT, 'backend');
  
  // 检查后端依赖
  try {
    const packageJson = JSON.parse(
      await fs.readFile(path.join(backendPath, 'package.json'), 'utf8')
    );
    
    console.log(`   后端名称: ${packageJson.name}`);
    console.log(`   版本: ${packageJson.version}`);
    
    // 检查node_modules
    try {
      await fs.access(path.join(backendPath, 'node_modules'));
      console.log('   ✅ 后端依赖已安装');
    } catch {
      console.log('   📦 正在安装后端依赖...');
      execSync('npm install', { cwd: backendPath, stdio: 'inherit' });
    }
    
    // 检查环境配置
    try {
      await fs.access(path.join(backendPath, '.env'));
      console.log('   ✅ 环境配置存在');
    } catch {
      console.log('   ⚙️  创建环境配置...');
      await fs.copyFile(
        path.join(backendPath, '.env.example'),
        path.join(backendPath, '.env')
      );
    }
    
  } catch (error) {
    console.error(`   ❌ 后端设置失败: ${error.message}`);
    return false;
  }
  
  return true;
}

async function setupFrontend() {
  console.log('\n🎨 设置前端应用...');
  
  const frontendPath = path.join(PROJECT_ROOT, 'frontend');
  
  // 检查前端项目结构
  const requiredFiles = [
    'package.json',
    'vite.config.ts',
    'src/main.ts',
    'src/App.vue',
    'index.html'
  ];
  
  for (const file of requiredFiles) {
    try {
      await fs.access(path.join(frontendPath, file));
    } catch {
      console.log(`   ❌ 缺少必需文件: ${file}`);
      return false;
    }
  }
  
  console.log('   ✅ 前端项目结构完整');
  
  // 检查依赖（可选，因为可能空间不足）
  try {
    await fs.access(path.join(frontendPath, 'node_modules'));
    console.log('   ✅ 前端依赖已安装');
  } catch {
    console.log('   ⚠️  前端依赖未安装 (空间可能不足)');
    console.log('   💡 可以在其他机器构建后上传dist目录');
  }
  
  return true;
}

async function setupDatabase() {
  console.log('\n🗄️ 设置数据库...');
  
  const databasePath = path.join(PROJECT_ROOT, 'database');
  
  // 检查数据库架构文件
  try {
    await fs.access(path.join(databasePath, 'schema.sql'));
    const stats = await fs.stat(path.join(databasePath, 'schema.sql'));
    console.log(`   ✅ 数据库架构文件存在 (${stats.size} 字节)`);
    
    // 显示表结构概览
    const schema = await fs.readFile(path.join(databasePath, 'schema.sql'), 'utf8');
    const tableCount = (schema.match(/CREATE TABLE/g) || []).length;
    console.log(`   📊 包含 ${tableCount} 个数据表定义`);
    
  } catch (error) {
    console.log(`   ❌ 数据库架构文件缺失: ${error.message}`);
    return false;
  }
  
  // 检查是否安装了PostgreSQL客户端
  try {
    execSync('which psql', { stdio: 'pipe' });
    console.log('   ✅ PostgreSQL客户端已安装');
    
    // 提供数据库设置指导
    console.log('\n💡 数据库设置指导:');
    console.log('   1. 确保PostgreSQL服务正在运行');
    console.log('   2. 创建数据库: createdb minilove_dev');
    console.log('   3. 执行迁移: psql -d minilove_dev -f database/schema.sql');
    console.log('   4. 更新后端 .env 中的数据库连接字符串');
    
  } catch {
    console.log('   ⚠️  PostgreSQL客户端未安装');
    console.log('   💡 可以使用SQLite作为开发替代方案');
    console.log('      设置 USE_SQLITE=true 在 backend/.env 中');
  }
  
  return true;
}

async function createStartupScripts() {
  console.log('\n🚀 创建启动脚本...');
  
  // 创建启动后端脚本
  const startBackendScript = `#!/bin/bash
# 启动MiniLove后端服务
cd "$(dirname "$0")/backend"
npm start
`;
  
  await fs.writeFile(
    path.join(PROJECT_ROOT, 'start-backend.sh'),
    startBackendScript
  );
  execSync(`chmod +x ${path.join(PROJECT_ROOT, 'start-backend.sh')}`);
  console.log('   ✅ 创建启动后端脚本: start-backend.sh');
  
  // 创建开发脚本
  const devBackendScript = `#!/bin/bash
# 开发模式启动后端
cd "$(dirname "$0")/backend"
npm run dev
`;
  
  await fs.writeFile(
    path.join(PROJECT_ROOT, 'dev-backend.sh'),
    devBackendScript
  );
  execSync(`chmod +x ${path.join(PROJECT_ROOT, 'dev-backend.sh')}`);
  console.log('   ✅ 创建开发后端脚本: dev-backend.sh');
  
  // 创建前端构建脚本
  const buildFrontendScript = `#!/bin/bash
# 构建前端应用
cd "$(dirname "$0")/frontend"
npm install && npm run build
echo "前端构建完成，输出到 frontend/dist/"
`;
  
  await fs.writeFile(
    path.join(PROJECT_ROOT, 'build-frontend.sh'),
    buildFrontendScript
  );
  execSync(`chmod +x ${path.join(PROJECT_ROOT, 'build-frontend.sh')}`);
  console.log('   ✅ 创建前端构建脚本: build-frontend.sh');
  
  // 创建检查脚本
  const checkScript = `#!/bin/bash
# 检查MiniLove服务状态
echo "🔍 MiniLove 服务状态检查"
echo "=========================="

# 检查后端进程
echo "1. 后端服务:"
if pgrep -f "node.*backend" > /dev/null; then
    echo "   ✅ 正在运行"
    echo "   地址: http://localhost:3000"
    echo "   健康检查: http://localhost:3000/health"
else
    echo "   ❌ 未运行"
fi

# 检查端口占用
echo ""
echo "2. 端口占用:"
for port in 3000 5173; do
    if netstat -tulpn 2>/dev/null | grep ":$port" > /dev/null; then
        echo "   端口 $port: 已占用"
    else
        echo "   端口 $port: 可用"
    fi
done

# 检查项目文件
echo ""
echo "3. 项目文件:"
for dir in backend frontend database; do
    if [ -d "$dir" ]; then
        count=$(find "$dir" -type f -name "*.js" -o -name "*.vue" -o -name "*.sql" | wc -l)
        echo "   $dir: $count 个文件"
    else
        echo "   $dir: 不存在"
    fi
done

echo ""
echo "🎯 检查完成"
`;
  
  await fs.writeFile(
    path.join(PROJECT_ROOT, 'check-status.sh'),
    checkScript
  );
  execSync(`chmod +x ${path.join(PROJECT_ROOT, 'check-status.sh')}`);
  console.log('   ✅ 创建状态检查脚本: check-status.sh');
  
  return true;
}

async function createDeploymentGuide() {
  console.log('\n📚 创建部署指南...');
  
  const guide = `# MiniLove 轻量级部署指南

## 系统要求
- Node.js 18+
- npm 8+
- 推荐: PostgreSQL 15+ (或使用SQLite)
- 至少1GB可用内存
- 至少2GB磁盘空间

## 快速开始

### 1. 启动后端服务
\`\`\`bash
./start-backend.sh
\`\`\`

### 2. 测试后端API
\`\`\`bash
# 健康检查
curl http://localhost:3000/health

# 获取帖子列表
curl http://localhost:3000/api/v1/posts

# 测试账户登录
免费会员: test_user / test123
高级会员: premium_user / test123
\`\`\`

### 3. 访问API文档
打开浏览器访问: http://localhost:3000/api-docs

## 详细部署步骤

### 选项A: 使用PostgreSQL
\`\`\`bash
# 安装PostgreSQL
sudo apt-get install postgresql postgresql-contrib

# 创建数据库
sudo -u postgres createdb minilove_dev

# 执行迁移
sudo -u postgres psql -d minilove_dev -f database/schema.sql

# 更新配置 (backend/.env)
DATABASE_URL=postgresql://postgres:@localhost/minilove_dev
USE_MOCK_DB=false
\`\`\`

### 选项B: 使用SQLite (开发)
\`\`\`bash
# 更新配置 (backend/.env)
USE_SQLITE=true
DB_PATH=../data/minilove_dev.db
\`\`\`

### 选项C: 继续使用模拟数据
\`\`\`bash
# 保持默认配置
USE_MOCK_DB=false
# 后端会自动使用SQLite作为备用
\`\`\`

## 管理命令

### 启动服务
\`\`\`bash
# 生产模式
./start-backend.sh

# 开发模式 (热重载)
./dev-backend.sh

# 后台运行
nohup ./start-backend.sh > backend.log 2>&1 &
\`\`\`

### 停止服务
\`\`\`bash
pkill -f "node.*backend"
\`\`\`

### 检查状态
\`\`\`bash
./check-status.sh
\`\`\`

### 查看日志
\`\`\`bash
tail -f backend.log
\`\`\`

## 前端构建 (可选)

### 在其他机器构建
\`\`\`bash
# 1. 在其他机器克隆项目
git clone <repository-url>
cd MiniLove-project/frontend

# 2. 安装依赖并构建
npm install
npm run build

# 3. 将 dist/ 目录上传到服务器
\`\`\`

### 使用简单HTTP服务器
\`\`\`bash
# 在 frontend/dist 目录
python3 -m http.server 8080

# 访问 http://localhost:8080
\`\`\`

## 生产环境建议

### 使用PM2进程管理
\`\`\`bash
npm install -g pm2
pm2 start backend/src/app.js --name minilove-backend
pm2 startup
pm2 save
\`\`\`

### Nginx配置示例
\`\`\`nginx
server {
    listen 80;
    server_name yourdomain.com;
    
    location /api {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
    }
    
    location / {
        root /path/to/frontend/dist;
        try_files $uri $uri/ /index.html;
    }
}
\`\`\`

## 故障排除

### 端口占用
\`\`\`bash
# 检查端口3000是否被占用
netstat -tulpn | grep :3000

# 停止占用进程
sudo kill <pid>
\`\`\`

### 依赖问题
\`\`\`bash
# 重新安装依赖
cd backend && rm -rf node_modules && npm install
\`\`\`

### 数据库连接失败
1. 检查PostgreSQL服务状态
2. 验证连接字符串
3. 检查防火墙设置

---

**部署完成时间**: ${new Date().toLocaleString('zh-CN')}
**更多信息**: 查看 PROJECT_STATUS.md
`;
  
  await fs.writeFile(
    path.join(PROJECT_ROOT, 'LIGHTWEIGHT_DEPLOYMENT.md'),
    guide
  );
  console.log('   ✅ 创建部署指南: LIGHTWEIGHT_DEPLOYMENT.md');
  
  return true;
}

async function main() {
  console.log('🚀 MiniLove 轻量级部署方案');
  console.log('==============================\n');
  
  try {
    // 检查系统要求
    const requirementsMet = await checkSystemRequirements();
    if (!requirementsMet) {
      console.log('\n❌ 系统要求未满足，请先安装必要工具');
      return;
    }
    
    // 设置后端
    const backendReady = await setupBackend();
    if (!backendReady) {
      console.log('\n❌ 后端设置失败');
      return;
    }
    
    // 设置前端
    const frontendReady = await setupFrontend();
    if (!frontendReady) {
      console.log('\n❌ 前端设置失败');
      return;
    }
    
    // 设置数据库
    const databaseReady = await setupDatabase();
    if (!databaseReady) {
      console.log('\n⚠️  数据库设置有问题，但可以继续');
    }
    
    // 创建启动脚本
    await createStartupScripts();
    
    // 创建部署指南
    await createDeploymentGuide();
    
    console.log('\n🎉 部署配置完成！');
    console.log('==============================');
    console.log('\n📋 生成的文件:');
    console.log('   • start-backend.sh     - 启动后端服务');
    console.log('   • dev-backend.sh       - 开发模式启动');
    console.log('   • build-frontend.sh    - 构建前端');
    console.log('   • check-status.sh      - 检查服务状态');
    console.log('   • LIGHTWEIGHT_DEPLOYMENT.md - 详细部署指南');
    
    console.log('\n🚀 下一步操作:');
    console.log('   1. 配置数据库连接 (backend/.env)');
    console.log('   2. 启动后端服务: ./start-backend.sh');
    console.log('   3. 访问后端API: http://localhost:3000');
    console.log('   4. 检查状态: ./check-status.sh');
    
    console.log('\n💡 提示:');
    console.log('   • 可以使用测试账户登录: test_user / test123');
    console.log('   • 查看API文档: http://localhost:3000/api-docs');
    console.log('   • 更多信息请阅读 PROJECT_STATUS.md');
    console.log('\n✅ 部署脚本执行完成！');
    
  } catch (error) {
    console.error(`\n❌ 部署过程中出现错误: ${error.message}`);
    console.error(error.stack);
  }
}

// 执行主函数
main().catch(console.error);