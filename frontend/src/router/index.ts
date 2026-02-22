import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

// 布局组件
import AuthLayout from '../layouts/AuthLayout.vue'
import MainLayout from '../layouts/MainLayout.vue'

// 页面组件
import LoginPage from '../views/LoginPage.vue'
import RegisterPage from '../views/RegisterPage.vue'
import HomePage from '../views/HomePage.vue'
import ProfilePage from '../views/ProfilePage.vue'
import PostDetailPage from '../views/PostDetailPage.vue'
import CreatePostPage from '../views/CreatePostPage.vue'
import ExplorePage from '../views/ExplorePage.vue'
import NotFoundPage from '../views/NotFoundPage.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: MainLayout,
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'home',
          component: HomePage,
          meta: { title: '首页' }
        },
        {
          path: 'profile',
          name: 'profile',
          component: ProfilePage,
          meta: { title: '个人中心', requiresAuth: true }
        },
        {
          path: 'post/:id',
          name: 'post-detail',
          component: PostDetailPage,
          meta: { title: '帖子详情', requiresAuth: true }
        },
        {
          path: 'create',
          name: 'create-post',
          component: CreatePostPage,
          meta: { title: '发布帖子', requiresAuth: true }
        },
        {
          path: 'explore',
          name: 'explore',
          component: ExplorePage,
          meta: { title: '探索发现', requiresAuth: true }
        }
      ]
    },
    {
      path: '/auth',
      component: AuthLayout,
      meta: { requiresGuest: true },
      children: [
        {
          path: 'login',
          name: 'login',
          component: LoginPage,
          meta: { title: '登录' }
        },
        {
          path: 'register',
          name: 'register',
          component: RegisterPage,
          meta: { title: '注册' }
        }
      ]
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: NotFoundPage,
      meta: { title: '页面不存在' }
    }
  ]
})

// 路由守卫
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()
  
  // 设置页面标题
  const title = to.meta.title as string || 'MiniLove'
  document.title = `${title} - MiniLove 情感支持社区`
  
  // 检查是否需要进行认证
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next({ name: 'login', query: { redirect: to.fullPath } })
    return
  }
  
  // 检查是否要求访客（已登录用户不能访问登录/注册页）
  if (to.meta.requiresGuest && authStore.isAuthenticated) {
    next({ name: 'home' })
    return
  }
  
  // 初始化认证状态（如果是首次加载）
  if (!authStore.user && authStore.token) {
    await authStore.fetchProfile()
  }
  
  next()
})

// 路由变化时滚动到顶部
router.afterEach(() => {
  window.scrollTo(0, 0)
})

export default router