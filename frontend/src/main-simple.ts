import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import { createPinia } from 'pinia'
import App from './App.vue'

// 创建路由
const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('./views/HomePage.vue')
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('./views/LoginPage.vue')
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('./views/RegisterPage.vue')
  },
  {
    path: '/profile',
    name: 'Profile',
    component: () => import('./views/ProfilePage.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 创建应用
const app = createApp(App)

// 使用插件
app.use(router)
app.use(createPinia())

// 挂载应用
app.mount('#app')