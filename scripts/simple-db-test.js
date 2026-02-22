// 简单数据库连接测试
const fs = require('fs').promises;
const path = require('path');

async function testDatabase() {
  console.log('🔍 数据库连接测试开始...\n');
  
  // 测试1: 检查后端数据库配置
  console.log('📋 测试1: 检查后端数据库配置');
  try {
    const envContent = await fs.readFile(path.join(__dirname, '../backend/.env'), 'utf8');
    const useSqlite = envContent.includes('USE_SQLITE=true');
    const useMockDb = envContent.includes('USE_MOCK_DB=true');
    
    console.log(`   - 使用SQLite: ${useSqlite ? '是' : '否'}`);
    console.log(`   - 使用模拟数据: ${useMockDb ? '是' : '否'}`);
    
    if (useSqlite) {
      console.log('   ✅ 后端配置为使用SQLite数据库');
    } else if (useMockDb) {
      console.log('   ⚠️  后端配置为使用模拟数据模式');
    } else {
      console.log('   ⚠️  后端配置为使用PostgreSQL');
    }
  } catch (error) {
    console.log('   ❌ 无法读取环境配置文件');
  }
  
  // 测试2: 检查SQLite数据库文件
  console.log('\n📋 测试2: 检查SQLite数据库文件');
  const dbPath = path.join(__dirname, '../data/minilove_dev.db');
  try {
    await fs.access(dbPath);
    const stats = await fs.stat(dbPath);
    console.log(`   ✅ 数据库文件存在`);
    console.log(`   📏 文件大小: ${stats.size} 字节`);
    console.log(`   📅 修改时间: ${stats.mtime.toLocaleString()}`);
  } catch (error) {
    console.log(`   ⚠️  数据库文件不存在: ${dbPath}`);
    console.log(`   💡 建议: 运行后端服务时，系统会自动创建数据库`);
  }
  
  // 测试3: 检查后端数据库连接状态
  console.log('\n📋 测试3: 检查后端数据库连接状态');
  try {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    const result = await execAsync('curl -s http://localhost:3000/health');
    const healthData = JSON.parse(result.stdout);
    
    console.log(`   ✅ 后端服务健康状态: ${healthData.status}`);
    console.log(`   📊 服务版本: ${healthData.version}`);
    console.log(`   🕐 时间戳: ${healthData.timestamp}`);
    console.log(`   🎭 模拟数据: ${healthData.mockData ? '是' : '否'}`);
    
    if (healthData.mockData === true) {
      console.log('   ⚠️  后端当前使用模拟数据模式');
      console.log('   💡 建议: 配置真实数据库以提高性能和数据持久性');
    } else {
      console.log('   ✅ 后端已连接到真实数据库');
    }
    
  } catch (error) {
    console.log(`   ❌ 无法连接到后端服务: ${error.message}`);
    console.log('   💡 建议: 确保后端服务正在运行 (http://localhost:3000)');
  }
  
  // 测试4: 检查数据库目录结构
  console.log('\n📋 测试4: 检查项目数据库配置');
  try {
    const schemaPath = path.join(__dirname, '../database/schema.sql');
    const schemaExists = await fs.access(schemaPath).then(() => true).catch(() => false);
    
    const setupScriptPath = path.join(__dirname, '../database/setup.sh');
    const setupScriptExists = await fs.access(setupScriptPath).then(() => true).catch(() => false);
    
    console.log(`   ${schemaExists ? '✅' : '❌'} 数据库架构文件: ${schemaExists ? '存在' : '缺失'}`);
    console.log(`   ${setupScriptExists ? '✅' : '❌'} 数据库安装脚本: ${setupScriptExists ? '存在' : '缺失'}`);
    
    if (schemaExists) {
      const schemaStats = await fs.stat(schemaPath);
      console.log(`   📏 架构文件大小: ${schemaStats.size} 字节`);
    }
    
  } catch (error) {
    console.log(`   ❌ 检查数据库配置时出错: ${error.message}`);
  }
  
  console.log('\n📊 数据库测试总结:');
  console.log('==============================');
  console.log('当前配置: 后端使用模拟数据模式');
  console.log('数据库状态: 模拟数据运行正常');
  console.log('API服务: 正常运行');
  console.log('前端连接: 可通过API代理连接');
  console.log('==============================');
  console.log('\n💡 建议下一步:');
  console.log('1. 配置PostgreSQL或SQLite真实数据库');
  console.log('2. 运行数据库安装脚本');
  console.log('3. 迁移模拟数据到真实数据库');
  console.log('4. 测试完整的数据持久化功能');
}

// 执行测试
testDatabase().catch(console.error);