<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const authStore = useAuthStore()

// 表单数据
const form = ref({
  username: '',
  password: '',
  rememberMe: false
})

// 表单验证
const errors = ref({
  username: '',
  password: ''
})

// 表单提交
const handleSubmit = async () => {
  // 重置错误
  errors.value = { username: '', password: '' }
  
  // 简单验证
  if (!form.value.username.trim()) {
    errors.value.username = '请输入用户名或邮箱'
    return
  }
  
  if (!form.value.password) {
    errors.value.password = '请输入密码'
    return
  }
  
  // 登录
  const result = await authStore.login({
    username: form.value.username,
    password: form.value.password
  })
  
  if (result.success) {
    // 获取重定向路径
    const redirect = router.currentRoute.value.query.redirect as string
    router.push(redirect || '/')
  }
}

// 跳转到注册页面
const goToRegister = () => {
  router.push('/auth/register')
}

// 使用测试账户登录
const useTestAccount = (type: 'free' | 'premium') => {
  if (type === 'free') {
    form.value.username = 'test_user'
    form.value.password = 'test123'
  } else {
    form.value.username = 'premium_user'
    form.value.password = 'test123'
  }
  handleSubmit()
}
</script>

<template>
  <div class="space-y-6">
    <!-- 页面标题 -->
    <div class="text-center">
      <h2 class="text-2xl font-bold text-gray-800 mb-2">欢迎回来</h2>
      <p class="text-gray-600">登录您的MiniLove账户</p>
    </div>
    
    <!-- 测试账户提示 -->
    <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div class="flex items-start">
        <i class="fas fa-info-circle text-blue-500 mt-1 mr-3"></i>
        <div>
          <p class="text-sm text-blue-800 font-medium">测试账户</p>
          <div class="flex flex-wrap gap-2 mt-2">
            <button 
              @click="useTestAccount('free')"
              class="inline-flex items-center px-3 py-1.5 bg-blue-100 text-blue-700 text-sm font-medium rounded-lg hover:bg-blue-200 transition"
            >
              <i class="fas fa-user mr-2"></i>
              免费会员
            </button>
            <button 
              @click="useTestAccount('premium')"
              class="inline-flex items-center px-3 py-1.5 bg-purple-100 text-purple-700 text-sm font-medium rounded-lg hover:bg-purple-200 transition"
            >
              <i class="fas fa-crown mr-2"></i>
              高级会员
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 登录表单 -->
    <form @submit.prevent="handleSubmit" class="space-y-4">
      <!-- 用户名/邮箱 -->
      <div>
        <label for="username" class="form-label">用户名或邮箱</label>
        <div class="relative">
          <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <i class="fas fa-user text-gray-400"></i>
          </div>
          <input
            id="username"
            v-model="form.username"
            type="text"
            placeholder="请输入用户名或邮箱"
            class="form-input pl-10"
            :class="{ 'border-red-500': errors.username }"
          />
        </div>
        <p v-if="errors.username" class="form-error">
          {{ errors.username }}
        </p>
      </div>
      
      <!-- 密码 -->
      <div>
        <label for="password" class="form-label">密码</label>
        <div class="relative">
          <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <i class="fas fa-lock text-gray-400"></i>
          </div>
          <input
            id="password"
            v-model="form.password"
            type="password"
            placeholder="请输入密码"
            class="form-input pl-10"
            :class="{ 'border-red-500': errors.password }"
          />
        </div>
        <p v-if="errors.password" class="form-error">
          {{ errors.password }}
        </p>
      </div>
      
      <!-- 记住我和忘记密码 -->
      <div class="flex items-center justify-between">
        <label class="flex items-center">
          <input
            v-model="form.rememberMe"
            type="checkbox"
            class="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
          />
          <span class="ml-2 text-sm text-gray-700">记住我</span>
        </label>
        
        <a href="#" class="text-sm text-primary-600 hover:text-primary-800 hover:underline">
          忘记密码？
        </a>
      </div>
      
      <!-- 登录按钮 -->
      <button
        type="submit"
        :disabled="authStore.loading"
        class="btn-primary w-full py-3 text-base"
      >
        <span v-if="!authStore.loading">
          <i class="fas fa-sign-in-alt mr-2"></i>
          登录
        </span>
        <span v-else class="flex items-center justify-center">
          <i class="fas fa-spinner fa-spin mr-2"></i>
          登录中...
        </span>
      </button>
    </form>
    
    <!-- 分隔线 -->
    <div class="relative">
      <div class="absolute inset-0 flex items-center">
        <div class="w-full border-t border-gray-300"></div>
      </div>
      <div class="relative flex justify-center text-sm">
        <span class="px-4 bg-white text-gray-500">或</span>
      </div>
    </div>
    
    <!-- 社交登录 -->
    <div class="space-y-3">
      <button
        @click="goToRegister"
        class="w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg shadow-sm text-gray-700 bg-white hover:bg-gray-50 transition"
      >
        <i class="fas fa-user-plus mr-3"></i>
        创建新账户
      </button>
    </div>
    
    <!-- 协议说明 -->
    <p class="text-xs text-gray-500 text-center">
      登录即表示您同意我们的
      <a href="#" class="text-primary-600 hover:underline">服务条款</a>
      和
      <a href="#" class="text-primary-600 hover:underline">隐私政策</a>
    </p>
  </div>
</template>