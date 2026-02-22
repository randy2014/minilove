#!/usr/bin/env node

/**
 * MiniLove 完整集成测试
 * 测试前后端所有核心功能
 */

const http = require('http');
const fs = require('fs').promises;
const path = require('path');

// 配置
const API_BASE_URL = 'http://localhost:3000';
const FRONTEND_URL = 'http://localhost:5173';

// 测试状态
const testResults = {
  passed: 0,
  failed: 0,
  total: 0,
  tests: []
};

// 实用函数
function makeRequest(method, endpoint, data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, API_BASE_URL);
    
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(responseData);
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: parsedData
          });
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: responseData
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// 测试用例
async function runTest(name, testFn) {
  testResults.total++;
  console.log(`\n📋 测试: ${name}`);
  
  try {
    const result = await testFn();
    if (result.success) {
      console.log(`   ✅ 通过: ${result.message || '测试成功'}`);
      testResults.passed++;
      testResults.tests.push({ name, status: 'passed', message: result.message });
    } else {
      console.log(`   ❌ 失败: ${result.error || '未知错误'}`);
      testResults.failed++;
      testResults.tests.push({ name, status: 'failed', error: result.error });
    }
  } catch (error) {
    console.log(`   ❌ 异常: ${error.message}`);
    testResults.failed++;
    testResults.tests.push({ name, status: 'error', error: error.message });
  }
}

// 测试套件
async function runAllTests() {
  console.log('🎯 MiniLove 完整集成测试开始');
  console.log('==============================\n');
  
  console.log('📊 系统信息:');
  console.log(`   后端API: ${API_BASE_URL}`);
  console.log(`   前端应用: ${FRONTEND_URL}`);
  console.log(`   测试时间: ${new Date().toLocaleString('zh-CN')}`);
  console.log('');
  
  // 测试1: 后端健康检查
  await runTest('后端服务健康检查', async () => {
    const response = await makeRequest('GET', '/health');
    
    if (response.statusCode === 200 && response.data.status === 'ok') {
      return {
        success: true,
        message: `服务版本: ${response.data.version}, 状态: ${response.data.status}`
      };
    } else {
      return {
        success: false,
        error: `HTTP ${response.statusCode}: ${JSON.stringify(response.data)}`
      };
    }
  });
  
  // 测试2: API文档访问
  await runTest('API文档访问', async () => {
    const response = await makeRequest('GET', '/api-docs');
    
    if (response.statusCode === 200) {
      return {
        success: true,
        message: 'API文档可正常访问'
      };
    } else {
      return {
        success: false,
        error: `HTTP ${response.statusCode}`
      };
    }
  });
  
  // 测试3: 获取帖子列表
  await runTest('获取社区帖子列表', async () => {
    const response = await makeRequest('GET', '/api/v1/posts');
    
    if (response.statusCode === 200 && Array.isArray(response.data.posts)) {
      return {
        success: true,
        message: `获取到 ${response.data.posts.length} 个帖子`
      };
    } else {
      return {
        success: false,
        error: `HTTP ${response.statusCode}: ${JSON.stringify(response.data)}`
      };
    }
  });
  
  // 测试4: 获取话题列表
  await runTest('获取热门话题', async () => {
    const response = await makeRequest('GET', '/api/v1/topics');
    
    if (response.statusCode === 200 && Array.isArray(response.data.topics)) {
      return {
        success: true,
        message: `获取到 ${response.data.topics.length} 个话题`
      };
    } else {
      return {
        success: false,
        error: `HTTP ${response.statusCode}: ${JSON.stringify(response.data)}`
      };
    }
  });
  
  // 测试5: 用户注册功能
  const testUsername = `integration_test_${Date.now()}`;
  const testEmail = `${testUsername}@minilove.com`;
  
  await runTest('用户注册功能', async () => {
    const registerData = {
      username: testUsername,
      email: testEmail,
      password: 'Test123456!',
      gender: 'male',
      age: 28,
      city: '测试城市'
    };
    
    const response = await makeRequest('POST', '/api/v1/auth/register', registerData);
    
    if (response.statusCode === 201) {
      return {
        success: true,
        message: `用户注册成功: ${testUsername}`,
        data: response.data
      };
    } else {
      return {
        success: false,
        error: `HTTP ${response.statusCode}: ${response.data?.message || '注册失败'}`
      };
    }
  });
  
  // 测试6: 用户登录功能
  let authToken = null;
  
  await runTest('用户登录功能', async () => {
    const loginData = {
      username: testUsername,
      password: 'Test123456!'
    };
    
    const response = await makeRequest('POST', '/api/v1/auth/login', loginData);
    
    if (response.statusCode === 200 && response.data.success) {
      authToken = response.data.data.token;
      return {
        success: true,
        message: `登录成功，获取到认证令牌`,
        data: response.data
      };
    } else {
      return {
        success: false,
        error: `HTTP ${response.statusCode}: ${response.data?.message || '登录失败'}`
      };
    }
  });
  
  // 测试7: 使用令牌获取用户信息
  if (authToken) {
    await runTest('令牌验证和用户信息获取', async () => {
      const response = await makeRequest('GET', '/api/v1/auth/profile', null, {
        'Authorization': `Bearer ${authToken}`
      });
      
      if (response.statusCode === 200) {
        return {
          success: true,
          message: `用户信息获取成功: ${response.data.data?.user?.username}`
        };
      } else {
        return {
          success: false,
          error: `HTTP ${response.statusCode}: ${response.data?.message || '获取失败'}`
        };
      }
    });
  }
  
  // 测试8: 创建新帖子（需要认证）
  if (authToken) {
    await runTest('创建新帖子', async () => {
      const postData = {
        title: '集成测试帖子',
        content: '这是一个自动创建的测试帖子，用于验证API功能。',
        category: '测试分类',
        tags: ['测试', '集成'],
        emotion_tags: ['测试中'],
        visibility: 'public'
      };
      
      const response = await makeRequest('POST', '/api/v1/posts', postData, {
        'Authorization': `Bearer ${authToken}`
      });
      
      if (response.statusCode === 201) {
        return {
          success: true,
          message: `帖子创建成功: ${response.data.data?.post?.title}`
        };
      } else {
        return {
          success: false,
          error: `HTTP ${response.statusCode}: ${response.data?.message || '创建失败'}`
        };
      }
    });
  }
  
  // 测试9: 前端项目结构检查
  await runTest('前端项目结构验证', async () => {
    const frontendPath = path.join(__dirname, '../frontend');
    
    const requiredFiles = [
      'package.json',
      'vite.config.ts',
      'src/main.ts',
      'src/App.vue',
      'src/router/index.ts',
      'src/stores/auth.ts',
      'src/views/LoginPage.vue',
      'src/views/RegisterPage.vue',
      'src/views/HomePage.vue'
    ];
    
    const missingFiles = [];
    
    for (const file of requiredFiles) {
      try {
        await fs.access(path.join(frontendPath, file));
      } catch {
        missingFiles.push(file);
      }
    }
    
    if (missingFiles.length === 0) {
      return {
        success: true,
        message: '前端项目结构完整'
      };
    } else {
      return {
        success: false,
        error: `缺少文件: ${missingFiles.join(', ')}`
      };
    }
  });
  
  // 测试10: 数据库配置检查
  await runTest('数据库配置文件检查', async () => {
    const configFiles = [
      '../backend/.env',
      '../backend/.env.postgresql',
      '../database/schema.sql',
      '../docker-compose.yml',
      '../deployment/docker-compose.prod.yml'
    ];
    
    const missingFiles = [];
    
    for (const configFile of configFiles) {
      try {
        await fs.access(path.join(__dirname, configFile));
      } catch {
        missingFiles.push(configFile);
      }
    }
    
    if (missingFiles.length === 0) {
      return {
        success: true,
        message: '所有配置文件都存在'
      };
    } else {
      return {
        success: false,
        error: `缺少配置文件: ${missingFiles.join(', ')}`
      };
    }
  });
  
  // 测试总结
  console.log('\n📊 测试结果汇总');
  console.log('====================');
  console.log(`✅ 通过: ${testResults.passed}`);
  console.log(`❌ 失败: ${testResults.failed}`);
  console.log(`📈 总数: ${testResults.total}`);
  console.log(`🏆 成功率: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);
  console.log('');
  
  if (testResults.failed > 0) {
    console.log('📋 失败的测试:');
    testResults.tests
      .filter(test => test.status !== 'passed')
      .forEach(test => {
        console.log(`   • ${test.name}: ${test.error || '未知错误'}`);
      });
  }
  
  console.log('\n🎯 下一步建议:');
  console.log('====================');
  
  if (testResults.passed === testResults.total) {
    console.log('✅ 所有测试通过！系统已准备好进行部署。');
    console.log('   建议下一步:');
    console.log('   1. 配置PostgreSQL数据库');
    console.log('   2. 部署到测试环境');
    console.log('   3. 进行性能测试');
  } else if (testResults.passed >= testResults.total * 0.8) {
    console.log('⚠️  大部分测试通过，系统基本可用。');
    console.log('   建议修复失败的测试后继续。');
  } else {
    console.log('❌ 需要解决核心功能问题。');
    console.log('   建议优先修复:');
    console.log('   1. 后端API服务问题');
    console.log('   2. 数据库连接问题');
    console.log('   3. 认证系统问题');
  }
  
  console.log('\n📋 详细测试报告已保存到: integration-test-report.json');
  
  // 保存详细报告
  const report = {
    timestamp: new Date().toISOString(),
    apiBaseUrl: API_BASE_URL,
    frontendUrl: FRONTEND_URL,
    summary: {
      passed: testResults.passed,
      failed: testResults.failed,
      total: testResults.total,
      successRate: (testResults.passed / testResults.total) * 100
    },
    tests: testResults.tests
  };
  
  await fs.writeFile(
    path.join(__dirname, 'integration-test-report.json'),
    JSON.stringify(report, null, 2)
  );
}

// 运行所有测试
runAllTests().catch(console.error);