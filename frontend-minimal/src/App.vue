<template>
  <div class="app">
    <!-- 导航栏 -->
    <nav class="navbar">
      <div class="container">
        <div class="logo">
          <span class="heart">❤️</span>
          <span class="name">MiniLove</span>
          <span class="tag">情感支持社区</span>
        </div>
        <div class="nav-buttons">
          <button @click="showLogin = !showLogin" class="btn btn-primary">
            登录
          </button>
          <button @click="showRegister = !showRegister" class="btn btn-secondary">
            注册
          </button>
        </div>
      </div>
    </nav>

    <!-- 主内容 -->
    <main class="main-content">
      <div class="container">
        <!-- 英雄区域 -->
        <section class="hero">
          <h1 class="title">找到属于你的情感支持</h1>
          <p class="subtitle">
            专为18-45岁男性设计，在晚间时段提供情感支持、目标引导和社交连接
          </p>
          <div class="actions">
            <button @click="testAPI" class="btn btn-large btn-primary">
              <span v-if="loading">测试中...</span>
              <span v-else>测试API连接</span>
            </button>
            <button @click="openApiDocs" class="btn btn-large btn-outline">
              查看API文档
            </button>
          </div>
        </section>

        <!-- API状态 -->
        <section class="status-section">
          <h2>系统状态</h2>
          <div class="status-card">
            <div class="status-item">
              <span class="status-dot" :class="{ online: apiStatus }"></span>
              <span class="status-text">后端API服务</span>
              <span class="status-url">http://localhost:3000</span>
            </div>
            <div v-if="testResult" class="test-result">
              <h3>测试结果</h3>
              <pre>{{ testResult }}</pre>
            </div>
          </div>
        </section>

        <!-- 功能模块 -->
        <section class="features">
          <h2>核心功能</h2>
          <div class="features-grid">
            <div class="feature-card">
              <div class="feature-icon">💬</div>
              <h3>情感倾诉</h3>
              <p>匿名分享你的心情，获得社区支持和共鸣</p>
            </div>
            <div class="feature-card">
              <div class="feature-icon">🌙</div>
              <h3>晚间社群</h3>
              <p>18:00-04:00专属活动，夜间不再孤单</p>
            </div>
            <div class="feature-card">
              <div class="feature-icon">🎯</div>
              <h3>目标引导</h3>
              <p>会员专属目标规划，逐步找到人生方向</p>
            </div>
          </div>
        </section>

        <!-- 测试账户 -->
        <section class="test-account">
          <h2>测试账户</h2>
          <div class="account-card">
            <div class="account-info">
              <div><strong>用户名:</strong> test_user</div>
              <div><strong>密码:</strong> test123</div>
              <div><strong>会员等级:</strong> 免费会员</div>
            </div>
          </div>
        </section>
      </div>
    </main>

    <!-- 页脚 -->
    <footer class="footer">
      <div class="container">
        <p>© 2026 MiniLove项目 · 版本 v0.1.0-beta</p>
        <p>为你的情感之旅点亮光芒</p>
      </div>
    </footer>

    <!-- 登录模态框 -->
    <div v-if="showLogin" class="modal">
      <div class="modal-content">
        <h3>登录</h3>
        <form @submit.prevent="handleLogin">
          <div class="form-group">
            <label>用户名</label>
            <input v-model="loginForm.username" type="text" required>
          </div>
          <div class="form-group">
            <label>密码</label>
            <input v-model="loginForm.password" type="password" required>
          </div>
          <div class="form-actions">
            <button type="submit" class="btn btn-primary">登录</button>
            <button @click="showLogin = false" type="button" class="btn btn-outline">取消</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

// 响应式数据
const showLogin = ref(false)
const showRegister = ref(false)
const loading = ref(false)
const apiStatus = ref(false)
const testResult = ref('')
const loginForm = ref({
  username: '',
  password: ''
})

// 生命周期钩子
onMounted(() => {
  checkApiStatus()
})

// 检查API状态
async function checkApiStatus() {
  try {
    const response = await fetch('http://localhost:3000/health')
    apiStatus.value = response.ok
  } catch (error) {
    apiStatus.value = false
  }
}

// 测试API连接
async function testAPI() {
  loading.value = true
  try {
    const response = await fetch('http://localhost:3000/api/v1/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'test_user',
        password: 'test123'
      })
    })
    
    const data = await response.json()
    testResult.value = JSON.stringify(data, null, 2)
    
    if (data.token) {
      alert('✅ 登录成功！Token已获取')
    }
  } catch (error) {
    testResult.value = `错误: ${error.message}`
    alert('❌ API连接失败')
  } finally {
    loading.value = false
  }
}

// 打开API文档
function openApiDocs() {
  window.open('http://localhost:3000/api-docs', '_blank')
}

// 处理登录
async function handleLogin() {
  try {
    const response = await fetch('http://localhost:3000/api/v1/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(loginForm.value)
    })
    
    const data = await response.json()
    if (data.token) {
      alert('登录成功！')
      showLogin.value = false
      loginForm.value = { username: '', password: '' }
    } else {
      alert('登录失败：' + (data.error || '未知错误'))
    }
  } catch (error) {
    alert('登录出错：' + error.message)
  }
}
</script>

<style scoped>
/* 基础样式 */
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}

/* 导航栏 */
.navbar {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 15px 0;
  box-shadow: 0 4px 20px rgba(0,0,0,0.1);
}

.logo {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 24px;
  font-weight: bold;
}

.heart {
  font-size: 28px;
}

.tag {
  font-size: 14px;
  background: rgba(255,255,255,0.2);
  padding: 2px 10px;
  border-radius: 12px;
}

.nav-buttons {
  display: flex;
  gap: 10px;
}

/* 按钮样式 */
.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-secondary {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;
}

.btn-outline {
  background: transparent;
  border: 2px solid #667eea;
  color: #667eea;
}

.btn-large {
  padding: 15px 30px;
  font-size: 18px;
}

.btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(0,0,0,0.2);
}

/* 主内容 */
.main-content {
  padding: 40px 0;
}

.hero {
  text-align: center;
  margin-bottom: 60px;
}

.title {
  font-size: 48px;
  margin-bottom: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.subtitle {
  font-size: 20px;
  color: #666;
  margin-bottom: 30px;
  max-width: 800px;
  margin-left: auto;
  margin-right: auto;
}

.actions {
  display: flex;
  gap: 20px;
  justify-content: center;
  margin-top: 30px;
}

/* 状态卡片 */
.status-section {
  margin-bottom: 60px;
}

.status-card {
  background: white;
  border-radius: 15px;
  padding: 30px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.1);
}

.status-item {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 20px;
}

.status-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #ef4444;
}

.status-dot.online {
  background: #10b981;
  box-shadow: 0 0 10px #10b981;
}

.status-text {
  font-weight: bold;
  flex: 1;
}

.status-url {
  color: #666;
  font-family: monospace;
}

.test-result {
  margin-top: 30px;
  background: #f8fafc;
  padding: 20px;
  border-radius: 10px;
}

.test-result pre {
  margin: 0;
  white-space: pre-wrap;
  word-wrap: break-word;
  font-size: 14px;
}

/* 功能模块 */
.features {
  margin-bottom: 60px;
}

.features h2 {
  text-align: center;
  margin-bottom: 40px;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 30px;
}

.feature-card {
  background: white;
  border-radius: 15px;
  padding: 30px;
  text-align: center;
  box-shadow: 0 5px 20px rgba(0,0,0,0.1);
  transition: transform 0.3s ease;
}

.feature-card:hover {
  transform: translateY(-5px);
}

.feature-icon {
  font-size: 48px;
  margin-bottom: 20px;
}

.feature-card h3 {
  margin-bottom: 15px;
  color: #333;
}

.feature-card p {
  color: #666;
  line-height: 1.6;
}

/* 测试账户 */
.test-account {
  margin-bottom: 60px;
}

.account-card {
  background: linear-gradient(135deg, #e0e7ff 0%, #ede9fe 100%);
  border-radius: 15px;
  padding: 30px;
}

.account-info {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  font-family: monospace;
  font-size: 16px;
}

/* 模态框 */
.modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 15px;
  padding: 40px;
  max-width: 500px;
  width: 90%;
  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
}

.modal-content h3 {
  margin-bottom: 30px;
  text-align: center;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: bold;
}

.form-group input {
  width: 100%;
  padding: 12px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 16px;
  transition: border-color 0.3s ease;
}

.form-group input:focus {
  outline: none;
  border-color: #667eea;
}

.form-actions {
  display: flex;
  gap: 15px;
  margin-top: 30px;
}

.form-actions .btn {
  flex: 1;
}

/* 页脚 */
.footer {
  background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
  color: white;
  padding: 40px 0;
  text-align: center;
}

.footer p {
  margin: 10px 0;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .title {
    font-size: 36px;
  }
  
  .subtitle {
    font-size: 18px;
  }
  
  .actions {
    flex-direction: column;
    align-items: center;
  }
  
  .features-grid {
    grid-template-columns: 1fr;
  }
  
  .account-info {
    grid-template-columns: 1fr;
  }
  
  .form-actions {
    flex-direction: column;
  }
}
</style>