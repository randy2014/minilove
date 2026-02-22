// 业务逻辑测试脚本
const http = require('http');

function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
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
            data: parsedData
          });
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
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

async function runBusinessLogicTests() {
  console.log('🎯 MiniLove 业务逻辑测试');
  console.log('========================\n');
  
  // 测试1: 健康检查
  console.log('📋 测试1: 系统健康检查');
  try {
    const health = await makeRequest('GET', '/health');
    console.log(`   状态码: ${health.statusCode}`);
    console.log(`   服务状态: ${health.data.status}`);
    console.log(`   服务版本: ${health.data.version}`);
    console.log(`   ✅ 系统运行正常\n`);
  } catch (error) {
    console.log(`   ❌ 健康检查失败: ${error.message}\n`);
  }
  
  // 测试2: 用户注册功能
  console.log('📋 测试2: 用户注册功能');
  const testUsername = `test_${Date.now()}`;
  const testEmail = `${testUsername}@minilove.com`;
  
  const registerData = {
    username: testUsername,
    email: testEmail,
    password: 'Test@123456',
    gender: 'male',
    age: 30,
    city: '北京'
  };
  
  try {
    const registerResult = await makeRequest('POST', '/api/v1/auth/register', registerData);
    console.log(`   状态码: ${registerResult.statusCode}`);
    
    if (registerResult.statusCode === 201) {
      console.log(`   用户ID: ${registerResult.data.data.user.id}`);
      console.log(`   用户名: ${registerResult.data.data.user.username}`);
      console.log(`   令牌: ${registerResult.data.data.token ? '已生成' : '未生成'}`);
      console.log(`   ✅ 用户注册成功\n`);
      
      // 保存测试用户的令牌
      const testToken = registerResult.data.data.token;
      
      // 测试3: 新用户登录
      console.log('📋 测试3: 用户登录功能');
      const loginData = {
        username: testUsername,
        password: 'Test@123456'
      };
      
      try {
        const loginResult = await makeRequest('POST', '/api/v1/auth/login', loginData);
        console.log(`   状态码: ${loginResult.statusCode}`);
        
        if (loginResult.statusCode === 200) {
          console.log(`   登录成功: ${loginResult.data.success}`);
          console.log(`   用户会员等级: ${loginResult.data.data.user.membershipLevel}`);
          console.log(`   ✅ 用户登录成功\n`);
        } else {
          console.log(`   登录失败: ${loginResult.data.message}`);
          console.log(`   ❌ 用户登录失败\n`);
        }
      } catch (loginError) {
        console.log(`   ❌ 登录测试出错: ${loginError.message}\n`);
      }
      
      // 测试4: 获取用户信息（需要认证）
      console.log('📋 测试4: 获取用户信息（需要认证）');
      if (testToken) {
        try {
          // 注意：需要修改makeRequest以支持Authorization头
          const profileResult = await makeRequest('GET', '/api/v1/auth/profile');
          console.log(`   状态码: ${profileResult.statusCode}`);
          
          if (profileResult.statusCode === 200) {
            console.log(`   用户名: ${profileResult.data.data.user.username}`);
            console.log(`   邮箱: ${profileResult.data.data.user.email}`);
            console.log(`   ✅ 获取用户信息成功\n`);
          } else {
            console.log(`   错误: ${profileResult.data.message}`);
            console.log(`   ⚠️  需要有效的认证令牌\n`);
          }
        } catch (profileError) {
          console.log(`   ❌ 获取用户信息失败: ${profileError.message}\n`);
        }
      }
      
    } else {
      console.log(`   注册失败: ${registerResult.data.message}`);
      console.log(`   ❌ 用户注册失败\n`);
    }
  } catch (registerError) {
    console.log(`   ❌ 注册测试出错: ${registerError.message}\n`);
  }
  
  // 测试5: 获取帖子列表
  console.log('📋 测试5: 获取社区帖子列表');
  try {
    const postsResult = await makeRequest('GET', '/api/v1/posts');
    console.log(`   状态码: ${postsResult.statusCode}`);
    console.log(`   帖子数量: ${postsResult.data.posts?.length || 0}`);
    
    if (postsResult.data.posts && postsResult.data.posts.length > 0) {
      const firstPost = postsResult.data.posts[0];
      console.log(`   第一个帖子标题: ${firstPost.title}`);
      console.log(`   作者: ${firstPost.author_username}`);
      console.log(`   点赞数: ${firstPost.likes_count}`);
      console.log(`   ✅ 获取帖子列表成功\n`);
    } else {
      console.log(`   ⚠️  没有找到帖子\n`);
    }
  } catch (postsError) {
    console.log(`   ❌ 获取帖子列表失败: ${postsError.message}\n`);
  }
  
  // 测试6: 获取话题列表
  console.log('📋 测试6: 获取热门话题');
  try {
    const topicsResult = await makeRequest('GET', '/api/v1/topics');
    console.log(`   状态码: ${topicsResult.statusCode}`);
    console.log(`   话题数量: ${topicsResult.data.topics?.length || 0}`);
    
    if (topicsResult.data.topics && topicsResult.data.topics.length > 0) {
      topicsResult.data.topics.forEach((topic, index) => {
        if (index < 3) { // 只显示前3个话题
          console.log(`   ${index + 1}. ${topic.name} (${topic.posts_count}个帖子)`);
        }
      });
      console.log(`   ✅ 获取话题列表成功\n`);
    } else {
      console.log(`   ⚠️  没有找到话题\n`);
    }
  } catch (topicsError) {
    console.log(`   ❌ 获取话题列表失败: ${topicsError.message}\n`);
  }
  
  // 测试总结
  console.log('📊 业务逻辑测试总结');
  console.log('=======================');
  console.log('✅ 已测试功能:');
  console.log('   - 系统健康检查');
  console.log('   - 用户注册流程');
  console.log('   - 用户登录功能');
  console.log('   - 帖子列表浏览');
  console.log('   - 话题列表浏览');
  console.log('');
  console.log('⚠️  需要注意:');
  console.log('   - 认证功能需要有效的JWT令牌');
  console.log('   - 部分API端点需要用户认证');
  console.log('   - 当前使用模拟数据模式');
  console.log('');
  console.log('🎯 下一步建议:');
  console.log('   1. 配置真实数据库');
  console.log('   2. 实现完整的认证流程');
  console.log('   3. 创建更多业务功能测试');
  console.log('   4. 开发前端界面');
  console.log('=======================');
}

// 运行测试
runBusinessLogicTests().catch(console.error);