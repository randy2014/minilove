<script setup lang="ts">
import { ref, computed } from 'vue'
import { RouterView, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const authStore = useAuthStore()
const mobileMenuOpen = ref(false)

// 导航菜单
const navItems = [
  { name: '首页', path: '/', icon: 'fas fa-home' },
  { name: '探索', path: '/explore', icon: 'fas fa-compass' },
  { name: '发布', path: '/create', icon: 'fas fa-plus-circle' },
  { name: '消息', path: '/messages', icon: 'fas fa-envelope' },
  { name: '我的', path: '/profile', icon: 'fas fa-user' }
]

// 获取当前激活的导航项
const activeNav = computed(() => {
  const currentPath = router.currentRoute.value.path
  return navItems.findIndex(item => currentPath === item.path || currentPath.startsWith(item.path + '/'))
})

// 导航到指定页面
const navigateTo = (path: string) => {
  router.push(path)
  mobileMenuOpen.value = false
}

// 用户登出
const handleLogout = async () => {
  await authStore.logout()
  navigateTo('/auth/login')
}

// 检查是否在登录页面
const isAuthPage = computed(() => {
  return router.currentRoute.value.path.startsWith('/auth')
})
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <!-- 顶部导航栏 -->
    <nav class="bg-white shadow-md sticky top-0 z-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16">
          <!-- 左侧Logo和品牌 -->
          <div class="flex items-center">
            <button @click="mobileMenuOpen = !mobileMenuOpen" class="lg:hidden p-2 mr-2">
              <i class="fas fa-bars text-gray-700"></i>
            </button>
            
            <div class="flex items-center cursor-pointer" @click="navigateTo('/')">
              <div class="w-8 h-8 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-lg flex items-center justify-center mr-3">
                <i class="fas fa-heart text-white"></i>
              </div>
              <span class="text-xl font-bold text-gray-800">MiniLove</span>
              <span class="ml-2 text-xs bg-primary-100 text-primary-800 px-2 py-1 rounded-full">Beta</span>
            </div>
            
            <!-- 桌面端导航 -->
            <div class="hidden lg:flex ml-10 space-x-1">
              <button
                v-for="(item, index) in navItems"
                :key="item.name"
                @click="navigateTo(item.path)"
                :class="[
                  'flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors',
                  activeNav === index
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-700 hover:bg-gray-100'
                ]"
              >
                <i :class="[item.icon, 'mr-2']"></i>
                {{ item.name }}
              </button>
            </div>
          </div>
          
          <!-- 右侧用户菜单 -->
          <div class="flex items-center">
            <!-- 搜索框 -->
            <div class="hidden md:block relative mr-4">
              <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <i class="fas fa-search text-gray-400"></i>
              </div>
              <input
                type="search"
                placeholder="搜索帖子、话题或用户..."
                class="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent w-64"
              />
            </div>
            
            <!-- 通知按钮 -->
            <button class="p-2 text-gray-600 hover:text-gray-900 relative mr-2">
              <i class="fas fa-bell"></i>
              <span class="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
            
            <!-- 用户下拉菜单 -->
            <div class="relative">
              <button class="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100">
                <div class="w-8 h-8 rounded-full bg-gradient-to-r from-primary-400 to-secondary-400 flex items-center justify-center text-white font-bold">
                  {{ authStore.user?.username?.charAt(0).toUpperCase() || 'U' }}
                </div>
                <span class="hidden md:block text-sm font-medium text-gray-700">
                  {{ authStore.user?.username || '用户' }}
                </span>
                <i class="fas fa-chevron-down text-gray-500"></i>
              </button>
              
              <!-- 下拉菜单内容 -->
              <div class="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 hidden hover:block">
                <div class="px-4 py-3 border-b border-gray-100">
                  <p class="text-sm font-medium text-gray-900">{{ authStore.user?.username }}</p>
                  <p class="text-xs text-gray-500 truncate">{{ authStore.user?.email }}</p>
                  <div class="mt-1">
                    <span :class="[
                      'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                      authStore.isPremium ? 'bg-yellow-100 text-yellow-800' :
                      authStore.isBasic ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    ]">
                      <i v-if="authStore.isPremium" class="fas fa-crown mr-1 text-xs"></i>
                      {{ authStore.user?.membershipLevel === 'premium' ? '高级会员' :
                         authStore.user?.membershipLevel === 'basic' ? '基础会员' : '免费会员' }}
                    </span>
                  </div>
                </div>
                
                <div class="py-1">
                  <button @click="navigateTo('/profile')" class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    <i class="fas fa-user-circle mr-3"></i>
                    个人中心
                  </button>
                  <button @click="navigateTo('/profile?tab=settings')" class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    <i class="fas fa-cog mr-3"></i>
                    账户设置
                  </button>
                  <button class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    <i class="fas fa-question-circle mr-3"></i>
                    帮助与支持
                  </button>
                </div>
                
                <div class="border-t border-gray-100 py-1">
                  <button @click="handleLogout" class="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50">
                    <i class="fas fa-sign-out-alt mr-3"></i>
                    退出登录
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 移动端菜单 -->
      <div v-if="mobileMenuOpen" class="lg:hidden border-t border-gray-200">
        <div class="px-2 pt-2 pb-3 space-y-1">
          <button
            v-for="(item, index) in navItems"
            :key="item.name"
            @click="navigateTo(item.path)"
            :class="[
              'flex items-center w-full px-3 py-2 text-base font-medium rounded-lg',
              activeNav === index
                ? 'bg-primary-50 text-primary-700'
                : 'text-gray-700 hover:bg-gray-100'
            ]"
          >
            <i :class="[item.icon, 'mr-3']"></i>
            {{ item.name }}
          </button>
        </div>
        
        <div class="border-t border-gray-200 pt-4 pb-3 px-4">
          <div class="flex items-center">
            <div class="w-10 h-10 rounded-full bg-gradient-to-r from-primary-400 to-secondary-400 flex items-center justify-center text-white font-bold">
              {{ authStore.user?.username?.charAt(0).toUpperCase() || 'U' }}
            </div>
            <div class="ml-3">
              <p class="text-base font-medium text-gray-800">{{ authStore.user?.username || '用户' }}</p>
              <p class="text-sm text-gray-500">{{ authStore.user?.email }}</p>
            </div>
          </div>
        </div>
      </div>
    </nav>
    
    <!-- 主内容区域 -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <RouterView />
    </main>
    
    <!-- 移动端底部导航 -->
    <div class="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <div class="flex justify-around py-2">
        <button
          v-for="(item, index) in navItems.slice(0, 5)"
          :key="item.name"
          @click="navigateTo(item.path)"
          :class="[
            'flex flex-col items-center px-4 py-2',
            activeNav === index
              ? 'text-primary-600'
              : 'text-gray-600'
          ]"
        >
          <i :class="[item.icon, 'text-lg']"></i>
          <span class="text-xs mt-1">{{ item.name }}</span>
        </button>
      </div>
    </div>
  </div>
</template>