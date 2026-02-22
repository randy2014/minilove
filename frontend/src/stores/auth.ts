import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axios from 'axios'

interface User {
  id: number
  username: string
  email: string
  avatarUrl?: string
  membershipLevel: 'free' | 'basic' | 'premium'
  membershipExpiresAt?: string
}

interface Notification {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  message: string
  timeout?: number
}

export const useAuthStore = defineStore('auth', () => {
  // 状态
  const user = ref<User | null>(null)
  const token = ref<string | null>(null)
  const loading = ref(false)
  const notifications = ref<Notification[]>([])
  const isAuthenticated = computed(() => !!token.value && !!user.value)

  // API配置
  const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
    timeout: 10000,
  })

  // 请求拦截器，添加认证令牌
  api.interceptors.request.use(
    (config) => {
      if (token.value) {
        config.headers.Authorization = `Bearer ${token.value}`
      }
      return config
    },
    (error) => Promise.reject(error)
  )

  // 响应拦截器，处理错误
  api.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        // 认证失败，清除用户状态
        clearAuth()
        addNotification({
          type: 'error',
          message: '登录已过期，请重新登录'
        })
      }
      return Promise.reject(error)
    }
  )

  // 添加通知
  const addNotification = (notification: Omit<Notification, 'id'>) => {
    const id = Date.now().toString()
    const fullNotification: Notification = {
      id,
      ...notification,
      timeout: notification.timeout || 5000
    }
    
    notifications.value.push(fullNotification)
    
    // 自动移除通知
    if (fullNotification.timeout) {
      setTimeout(() => {
        removeNotification(id)
      }, fullNotification.timeout)
    }
  }

  // 移除通知
  const removeNotification = (id: string) => {
    notifications.value = notifications.value.filter(n => n.id !== id)
  }

  // 清除所有通知
  const clearNotifications = () => {
    notifications.value = []
  }

  // 从本地存储加载认证状态
  const loadFromStorage = () => {
    const savedToken = localStorage.getItem('minilove_token')
    const savedUser = localStorage.getItem('minilove_user')
    
    if (savedToken && savedUser) {
      token.value = savedToken
      try {
        user.value = JSON.parse(savedUser)
      } catch (error) {
        console.error('解析用户数据失败:', error)
        clearAuth()
      }
    }
  }

  // 保存到本地存储
  const saveToStorage = () => {
    if (token.value) {
      localStorage.setItem('minilove_token', token.value)
    }
    if (user.value) {
      localStorage.setItem('minilove_user', JSON.stringify(user.value))
    }
  }

  // 清除认证状态
  const clearAuth = () => {
    token.value = null
    user.value = null
    localStorage.removeItem('minilove_token')
    localStorage.removeItem('minilove_user')
  }

  // 初始化
  const initialize = () => {
    loadFromStorage()
  }

  // 用户注册
  const register = async (userData: {
    username: string
    email: string
    password: string
    phone?: string
    gender?: string
    age?: number
    city?: string
  }) => {
    loading.value = true
    try {
      const response = await api.post('/auth/register', userData)
      
      if (response.data.success) {
        token.value = response.data.data.token
        user.value = response.data.data.user
        saveToStorage()
        
        addNotification({
          type: 'success',
          message: '注册成功！欢迎加入MiniLove'
        })
        
        return { success: true, data: response.data.data }
      } else {
        addNotification({
          type: 'error',
          message: response.data.message || '注册失败'
        })
        return { success: false, error: response.data.message }
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || '网络错误，请稍后重试'
      addNotification({
        type: 'error',
        message: errorMessage
      })
      return { success: false, error: errorMessage }
    } finally {
      loading.value = false
    }
  }

  // 用户登录
  const login = async (credentials: { username: string; password: string }) => {
    loading.value = true
    try {
      const response = await api.post('/auth/login', credentials)
      
      if (response.data.success) {
        token.value = response.data.data.token
        user.value = response.data.data.user
        saveToStorage()
        
        addNotification({
          type: 'success',
          message: `欢迎回来，${user.value?.username}！`
        })
        
        return { success: true, data: response.data.data }
      } else {
        addNotification({
          type: 'error',
          message: response.data.message || '登录失败'
        })
        return { success: false, error: response.data.message }
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || '网络错误，请稍后重试'
      addNotification({
        type: 'error',
        message: errorMessage
      })
      return { success: false, error: errorMessage }
    } finally {
      loading.value = false
    }
  }

  // 用户登出
  const logout = async () => {
    loading.value = true
    try {
      await api.post('/auth/logout')
    } catch (error) {
      // 忽略登出错误
    } finally {
      clearAuth()
      addNotification({
        type: 'info',
        message: '已成功退出登录'
      })
      loading.value = false
    }
  }

  // 获取用户信息
  const fetchProfile = async () => {
    if (!isAuthenticated.value) return { success: false, error: '未登录' }
    
    loading.value = true
    try {
      const response = await api.get('/auth/profile')
      
      if (response.data.success) {
        user.value = response.data.data.user
        saveToStorage()
        return { success: true, data: response.data.data }
      } else {
        return { success: false, error: response.data.message }
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || '获取用户信息失败'
      addNotification({
        type: 'error',
        message: errorMessage
      })
      return { success: false, error: errorMessage }
    } finally {
      loading.value = false
    }
  }

  // 更新用户信息
  const updateProfile = async (userData: Partial<User>) => {
    if (!isAuthenticated.value) return { success: false, error: '未登录' }
    
    loading.value = true
    try {
      const response = await api.put('/auth/profile', userData)
      
      if (response.data.success) {
        user.value = { ...user.value, ...response.data.data.user }
        saveToStorage()
        
        addNotification({
          type: 'success',
          message: '个人信息更新成功'
        })
        
        return { success: true, data: response.data.data }
      } else {
        addNotification({
          type: 'error',
          message: response.data.message || '更新失败'
        })
        return { success: false, error: response.data.message }
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || '更新失败，请稍后重试'
      addNotification({
        type: 'error',
        message: errorMessage
      })
      return { success: false, error: errorMessage }
    } finally {
      loading.value = false
    }
  }

  // 更新密码
  const updatePassword = async (passwords: { currentPassword: string; newPassword: string }) => {
    if (!isAuthenticated.value) return { success: false, error: '未登录' }
    
    loading.value = true
    try {
      const response = await api.put('/auth/password', passwords)
      
      if (response.data.success) {
        addNotification({
          type: 'success',
          message: '密码更新成功'
        })
        return { success: true, data: response.data.data }
      } else {
        addNotification({
          type: 'error',
          message: response.data.message || '密码更新失败'
        })
        return { success: false, error: response.data.message }
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || '密码更新失败，请稍后重试'
      addNotification({
        type: 'error',
        message: errorMessage
      })
      return { success: false, error: errorMessage }
    } finally {
      loading.value = false
    }
  }

  // 检查认证状态
  const checkAuthStatus = async () => {
    if (!token.value) return false
    
    loading.value = true
    try {
      const response = await api.get('/auth/verify')
      return response.data.success
    } catch (error) {
      clearAuth()
      return false
    } finally {
      loading.value = false
    }
  }

  return {
    // 状态
    user,
    token,
    loading,
    notifications,
    isAuthenticated,
    
    // 计算属性
    isPremium: computed(() => user.value?.membershipLevel === 'premium'),
    isBasic: computed(() => user.value?.membershipLevel === 'basic'),
    isFree: computed(() => user.value?.membershipLevel === 'free'),
    
    // 方法
    addNotification,
    removeNotification,
    clearNotifications,
    initialize,
    register,
    login,
    logout,
    fetchProfile,
    updateProfile,
    updatePassword,
    checkAuthStatus,
    clearAuth
  }
})