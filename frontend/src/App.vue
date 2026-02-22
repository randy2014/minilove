<script setup lang="ts">
import { RouterView } from 'vue-router'
import { onMounted } from 'vue'
import { useAuthStore } from './stores/auth'

const authStore = useAuthStore()

// 初始化应用时检查认证状态
onMounted(() => {
  authStore.checkAuthStatus()
})
</script>

<template>
  <div id="app" class="min-h-screen bg-gray-50">
    <!-- 全局加载状态 -->
    <div v-if="authStore.loading" class="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div class="text-center">
        <div class="loading-spinner w-12 h-12 border-4 mx-auto"></div>
        <p class="mt-4 text-gray-600 font-medium">加载中...</p>
      </div>
    </div>

    <!-- 路由视图 -->
    <RouterView />
    
    <!-- 全局通知 -->
    <div class="fixed bottom-4 right-4 z-40 space-y-2">
      <div v-for="notification in authStore.notifications" 
           :key="notification.id"
           :class="['px-4 py-3 rounded-lg shadow-lg border-l-4 animate-slide-up',
                    notification.type === 'success' ? 'bg-success-50 border-success-500 text-success-800' :
                    notification.type === 'error' ? 'bg-error-50 border-error-500 text-error-800' :
                    notification.type === 'warning' ? 'bg-warning-50 border-warning-500 text-warning-800' :
                    'bg-primary-50 border-primary-500 text-primary-800']">
        <div class="flex items-start">
          <div class="flex-1">
            <p class="text-sm font-medium">{{ notification.message }}</p>
          </div>
          <button @click="authStore.removeNotification(notification.id)" 
                  class="ml-4 text-gray-400 hover:text-gray-600">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>