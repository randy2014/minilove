import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'

import App from './App.vue'
import router from './router'
import { useAuthStore } from './stores/auth'

// 创建应用
const app = createApp(App)

// 使用Pinia状态管理
const pinia = createPinia()
app.use(pinia)

// 使用路由
app.use(router)

// 初始化认证状态
const authStore = useAuthStore()
authStore.initialize()

// 挂载应用
app.mount('#app')