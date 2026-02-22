<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const authStore = useAuthStore()

// 表单步骤
const currentStep = ref(1)
const totalSteps = 2

// 表单数据
const form = ref({
  // 步骤1: 基础信息
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
  
  // 步骤2: 个人信息
  phone: '',
  gender: '',
  age: '',
  city: '',
  bio: ''
})

// 表单验证
const errors = ref({
  username: '',
  email: '',
  password: '',
  confirmPassword: ''
})

// 性别选项
const genderOptions = [
  { value: '', label: '请选择' },
  { value: 'male', label: '男' },
  { value: 'female', label: '女' },
  { value: 'other', label: '其他' },
  { value: 'unknown', label: '不愿透露' }
]

// 验证步骤1
const validateStep1 = () => {
  errors.value = { username: '', email: '', password: '', confirmPassword: '' }
  let isValid = true
  
  // 用户名验证
  if (!form.value.username.trim()) {
    errors.value.username = '请输入用户名'
    isValid = false
  } else if (form.value.username.length < 3) {
    errors.value.username = '用户名至少3个字符'
    isValid = false
  } else if (form.value.username.length > 20) {
    errors.value.username = '用户名最多20个字符'
    isValid = false
  }
  
  // 邮箱验证
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!form.value.email) {
    errors.value.email = '请输入邮箱'
    isValid = false
  } else if (!emailRegex.test(form.value.email)) {
    errors.value.email = '邮箱格式不正确'
    isValid = false
  }
  
  // 密码验证
  if (!form.value.password) {
    errors.value.password = '请输入密码'
    isValid = false
  } else if (form.value.password.length < 6) {
    errors.value.password = '密码至少6位'
    isValid = false
  }
  
  // 确认密码
  if (form.value.password !== form.value.confirmPassword) {
    errors.value.confirmPassword = '两次输入的密码不一致'
    isValid = false
  }
  
  return isValid
}

// 下一步
const nextStep = () => {
  if (validateStep1()) {
    currentStep.value = 2
  }
}

// 上一步
const prevStep = () => {
  currentStep.value = 1
}

// 表单提交
const handleSubmit = async () => {
  // 准备用户数据
  const userData = {
    username: form.value.username,
    email: form.value.email,
    password: form.value.password,
    phone: form.value.phone || undefined,
    gender: form.value.gender || undefined,
    age: form.value.age ? parseInt(form.value.age) : undefined,
    city: form.value.city || undefined,
    bio: form.value.bio || undefined
  }
  
  // 注册
  const result = await authStore.register(userData)
  
  if (result.success) {
    router.push('/')
  }
}

// 跳转到登录
const goToLogin = () => {
  router.push('/auth/login')
}

// 步骤标题
const stepTitles = {
  1: '创建账户',
  2: '完善信息'
}
</script>

<template>
  <div class="space-y-6">
    <!-- 进度指示器 -->
    <div class="mb-8">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-2xl font-bold text-gray-800">{{ stepTitles[currentStep] }}</h2>
        <span class="text-sm text-gray-500">步骤 {{ currentStep }}/{{ totalSteps }}</span>
      </div>
      
      <div class="flex items-center">
        <div 
          :class="[
            'h-2 rounded-full transition-all duration-300',
            currentStep >= 1 ? 'bg-primary-500' : 'bg-gray-200'
          ]" 
          class="flex-1"
        ></div>
        <div 
          :class="[
            'w-2 h-2 rounded-full mx-2 transition-all duration-300',
            currentStep >= 1 ? 'bg-primary-500' : 'bg-gray-300'
          ]"
        ></div>
        <div 
          :class="[
            'h-2 rounded-full transition-all duration-300',
            currentStep >= 2 ? 'bg-primary-500' : 'bg-gray-200'
          ]" 
          class="flex-1"
        ></div>
      </div>
    </div>
    
    <!-- 步骤1: 基础信息 -->
    <form v-if="currentStep === 1" @submit.prevent="nextStep" class="space-y-4">
      <!-- 用户名 -->
      <div>
        <label for="username" class="form-label">用户名</label>
        <div class="relative">
          <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <i class="fas fa-user text-gray-400"></i>
          </div>
          <input
            id="username"
            v-model="form.username"
            type="text"
            placeholder="3-20个字符，支持字母、数字、下划线"
            class="form-input pl-10"
            :class="{ 'border-red-500': errors.username }"
          />
        </div>
        <p v-if="errors.username" class="form-error">
          {{ errors.username }}
        </p>
      </div>
      
      <!-- 邮箱 -->
      <div>
        <label for="email" class="form-label">邮箱</label>
        <div class="relative">
          <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <i class="fas fa-envelope text-gray-400"></i>
          </div>
          <input
            id="email"
            v-model="form.email"
            type="email"
            placeholder="请输入您的邮箱"
            class="form-input pl-10"
            :class="{ 'border-red-500': errors.email }"
          />
        </div>
        <p v-if="errors.email" class="form-error">
          {{ errors.email }}
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
            placeholder="至少6位字符"
            class="form-input pl-10"
            :class="{ 'border-red-500': errors.password }"
          />
        </div>
        <p v-if="errors.password" class="form-error">
          {{ errors.password }}
        </p>
        <p class="mt-1 text-xs text-gray-500">
          密码长度至少6位，建议使用字母、数字和特殊字符组合
        </p>
      </div>
      
      <!-- 确认密码 -->
      <div>
        <label for="confirmPassword" class="form-label">确认密码</label>
        <div class="relative">
          <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <i class="fas fa-lock text-gray-400"></i>
          </div>
          <input
            id="confirmPassword"
            v-model="form.confirmPassword"
            type="password"
            placeholder="请再次输入密码"
            class="form-input pl-10"
            :class="{ 'border-red-500': errors.confirmPassword }"
          />
        </div>
        <p v-if="errors.confirmPassword" class="form-error">
          {{ errors.confirmPassword }}
        </p>
      </div>
      
      <!-- 下一步按钮 -->
      <button
        type="submit"
        class="btn-primary w-full py-3 text-base"
      >
        下一步
        <i class="fas fa-arrow-right ml-2"></i>
      </button>
    </form>
    
    <!-- 步骤2: 个人信息 -->
    <form v-else @submit.prevent="handleSubmit" class="space-y-4">
      <!-- 手机号 -->
      <div>
        <label for="phone" class="form-label">手机号（可选）</label>
        <div class="relative">
          <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <i class="fas fa-phone text-gray-400"></i>
          </div>
          <input
            id="phone"
            v-model="form.phone"
            type="tel"
            placeholder="请输入手机号"
            class="form-input pl-10"
          />
        </div>
      </div>
      
      <!-- 性别 -->
      <div>
        <label for="gender" class="form-label">性别（可选）</label>
        <select
          id="gender"
          v-model="form.gender"
          class="form-input"
        >
          <option v-for="option in genderOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
      </div>
      
      <!-- 年龄 -->
      <div>
        <label for="age" class="form-label">年龄（可选）</label>
        <input
          id="age"
          v-model="form.age"
          type="number"
          min="18"
          max="45"
          placeholder="18-45"
          class="form-input"
        />
      </div>
      
      <!-- 城市 -->
      <div>
        <label for="city" class="form-label">城市（可选）</label>
        <div class="relative">
          <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <i class="fas fa-city text-gray-400"></i>
          </div>
          <input
            id="city"
            v-model="form.city"
            type="text"
            placeholder="请输入您所在的城市"
            class="form-input pl-10"
          />
        </div>
      </div>
      
      <!-- 个人简介 -->
      <div>
        <label for="bio" class="form-label">个人简介（可选）</label>
        <textarea
          id="bio"
          v-model="form.bio"
          rows="3"
          placeholder="简单介绍一下自己..."
          class="form-input resize-none"
        ></textarea>
      </div>
      
      <!-- 注册协议 -->
      <div class="bg-gray-50 rounded-lg p-4">
        <label class="flex items-start">
          <input
            type="checkbox"
            class="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500 mt-1"
            required
          />
          <span class="ml-3 text-sm text-gray-700">
            我已阅读并同意
            <a href="#" class="text-primary-600 hover:underline">《用户协议》</a>
            和
            <a href="#" class="text-primary-600 hover:underline">《隐私政策》</a>
            ，了解MiniLove是面向18-45岁男性的情感支持社区
          </span>
        </label>
      </div>
      
      <!-- 按钮组 -->
      <div class="flex space-x-3">
        <button
          type="button"
          @click="prevStep"
          class="btn-outline flex-1 py-3"
        >
          <i class="fas fa-arrow-left mr-2"></i>
          上一步
        </button>
        <button
          type="submit"
          :disabled="authStore.loading"
          class="btn-primary flex-1 py-3"
        >
          <span v-if="!authStore.loading">
            <i class="fas fa-user-plus mr-2"></i>
            完成注册
          </span>
          <span v-else class="flex items-center justify-center">
            <i class="fas fa-spinner fa-spin mr-2"></i>
            注册中...
          </span>
        </button>
      </div>
    </form>
    
    <!-- 分隔线 -->
    <div class="relative pt-4">
      <div class="absolute inset-0 top-0 flex items-center">
        <div class="w-full border-t border-gray-300"></div>
      </div>
      <div class="relative flex justify-center">
        <span class="px-4 bg-white text-gray-500 text-sm">已有账户？</span>
      </div>
    </div>
    
    <!-- 登录链接 -->
    <button
      @click="goToLogin"
      class="w-full btn-outline py-3"
    >
      <i class="fas fa-sign-in-alt mr-2"></i>
      立即登录
    </button>
    
    <!-- 社区特色 -->
    <div class="bg-primary-50 border border-primary-200 rounded-lg p-4 mt-6">
      <div class="flex items-start">
        <i class="fas fa-heart text-primary-500 mt-1 mr-3"></i>
        <div>
          <p class="text-sm text-primary-800 font-medium mb-2">MiniLove社区特色</p>
          <ul class="text-xs text-primary-700 space-y-1">
            <li class="flex items-center">
              <i class="fas fa-check-circle mr-2 text-green-500"></i>
              情感支持与共鸣
            </li>
            <li class="flex items-center">
              <i class="fas fa-check-circle mr-2 text-green-500"></i>
              晚间特别活动（18:00-04:00）
            </li>
            <li class="flex items-center">
              <i class="fas fa-check-circle mr-2 text-green-500"></i>
              目标规划与成长引导
            </li>
            <li class="flex items-center">
              <i class="fas fa-check-circle mr-2 text-green-500"></i>
              会员专属个性化服务
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>