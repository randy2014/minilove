<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()

// 状态
const greeting = ref('')
const currentTime = ref('')
const activePosts = ref([])
const trendingTopics = ref([])
const userStats = ref({
  posts: 0,
  comments: 0,
  likes: 0
})

// 生成问候语
const getGreeting = () => {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) {
    return '早上好'
  } else if (hour >= 12 && hour < 18) {
    return '下午好'
  } else if (hour >= 18 && hour < 22) {
    return '晚上好'
  } else {
    return '夜深了'
  }
}

// 更新时间
const updateTime = () => {
  const now = new Date()
  currentTime.value = now.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 模拟加载数据
const loadData = async () => {
  // 这里应该调用API获取数据
  // 暂时使用模拟数据
  trendingTopics.value = [
    { id: 1, name: '情感倾诉', posts: 25, color: 'bg-gradient-to-r from-purple-500 to-pink-500' },
    { id: 2, name: '目标规划', posts: 18, color: 'bg-gradient-to-r from-blue-500 to-cyan-500' },
    { id: 3, name: '晚间闲聊', posts: 42, color: 'bg-gradient-to-r from-green-500 to-emerald-500' },
    { id: 4, name: '单身生活', posts: 15, color: 'bg-gradient-to-r from-orange-500 to-red-500' }
  ]
}

// 发布新帖子
const createNewPost = () => {
  // 这里应该跳转到发布页面
  console.log('创建新帖子')
}

// 查看通知
const viewNotifications = () => {
  console.log('查看通知')
}

// 查看消息
const viewMessages = () => {
  console.log('查看消息')
}

// 初始化
onMounted(() => {
  greeting.value = getGreeting()
  updateTime()
  setInterval(updateTime, 60000) // 每分钟更新一次时间
  
  loadData()
})
</script>

<template>
  <div class="space-y-6">
    <!-- 顶部欢迎栏 -->
    <div class="bg-gradient-to-r from-primary-500 to-secondary-500 rounded-2xl p-6 text-white shadow-lg">
      <div class="flex justify-between items-start">
        <div>
          <h1 class="text-2xl font-bold mb-2">{{ greeting }}, {{ authStore.user?.username || '朋友' }}！</h1>
          <p class="opacity-90">
            {{ currentTime }} • 欢迎回到MiniLove情感支持社区
          </p>
          <div class="flex items-center mt-4 space-x-4">
            <div class="flex items-center bg-white/20 backdrop-blur-sm rounded-lg px-3 py-2">
              <i class="fas fa-newspaper mr-2"></i>
              <span class="text-sm">今日新帖: 128</span>
            </div>
            <div class="flex items-center bg-white/20 backdrop-blur-sm rounded-lg px-3 py-2">
              <i class="fas fa-users mr-2"></i>
              <span class="text-sm">在线用户: 2.8k</span>
            </div>
          </div>
        </div>
        <div class="flex space-x-2">
          <button 
            @click="viewNotifications"
            class="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition"
          >
            <i class="fas fa-bell"></i>
          </button>
          <button 
            @click="viewMessages"
            class="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition"
          >
            <i class="fas fa-envelope"></i>
          </button>
        </div>
      </div>
    </div>
    
    <!-- 主要内容区域 -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- 左侧：用户信息和快速操作 -->
      <div class="lg:col-span-1 space-y-6">
        <!-- 用户卡片 -->
        <div class="card">
          <div class="flex items-center mb-4">
            <div class="w-16 h-16 rounded-full bg-gradient-to-r from-primary-400 to-secondary-400 flex items-center justify-center text-white text-xl font-bold">
              {{ authStore.user?.username?.charAt(0).toUpperCase() || 'U' }}
            </div>
            <div class="ml-4">
              <h3 class="font-bold text-lg">{{ authStore.user?.username || '用户' }}</h3>
              <div class="flex items-center mt-1">
                <span :class="[
                  'px-2 py-1 rounded-full text-xs font-medium',
                  authStore.isPremium ? 'bg-yellow-100 text-yellow-800' :
                  authStore.isBasic ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
                ]">
                  <i v-if="authStore.isPremium" class="fas fa-crown mr-1"></i>
                  {{ authStore.user?.membershipLevel === 'premium' ? '高级会员' :
                     authStore.user?.membershipLevel === 'basic' ? '基础会员' : '免费会员' }}
                </span>
              </div>
            </div>
          </div>
          
          <div class="grid grid-cols-3 gap-2 mb-4">
            <div class="text-center p-3 bg-gray-50 rounded-lg">
              <div class="text-xl font-bold text-gray-800">{{ userStats.posts }}</div>
              <div class="text-xs text-gray-600">帖子</div>
            </div>
            <div class="text-center p-3 bg-gray-50 rounded-lg">
              <div class="text-xl font-bold text-gray-800">{{ userStats.comments }}</div>
              <div class="text-xs text-gray-600">评论</div>
            </div>
            <div class="text-center p-3 bg-gray-50 rounded-lg">
              <div class="text-xl font-bold text-gray-800">{{ userStats.likes }}</div>
              <div class="text-xs text-gray-600">获赞</div>
            </div>
          </div>
          
          <button class="btn-outline w-full">
            <i class="fas fa-user-edit mr-2"></i>
            完善资料
          </button>
        </div>
        
        <!-- 快速发布 -->
        <div class="card">
          <h3 class="font-bold text-lg mb-4">分享你的心情</h3>
          <textarea 
            placeholder="此刻想说什么？分享你的心情..."
            rows="3"
            class="w-full p-3 border border-gray-300 rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
          ></textarea>
          <div class="flex justify-between">
            <div class="flex space-x-2">
              <button class="p-2 text-gray-500 hover:text-gray-700">
                <i class="fas fa-image"></i>
              </button>
              <button class="p-2 text-gray-500 hover:text-gray-700">
                <i class="fas fa-smile"></i>
              </button>
            </div>
            <button 
              @click="createNewPost"
              class="btn-primary px-4"
            >
              发布
            </button>
          </div>
        </div>
      </div>
      
      <!-- 中间：帖子列表 -->
      <div class="lg:col-span-2 space-y-6">
        <!-- 帖子列表标题 -->
        <div class="flex justify-between items-center">
          <h2 class="text-xl font-bold text-gray-800">最新动态</h2>
          <div class="flex space-x-2">
            <button class="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition">
              全部
            </button>
            <button class="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition">
              关注
            </button>
            <button class="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition">
              热门
            </button>
          </div>
        </div>
        
        <!-- 帖子列表 -->
        <div class="space-y-4">
          <!-- 帖子卡片 -->
          <div v-for="post in activePosts" :key="post.id" class="card">
            <div class="flex justify-between items-start mb-3">
              <div class="flex items-center">
                <div class="w-10 h-10 rounded-full bg-gray-200"></div>
                <div class="ml-3">
                  <h4 class="font-medium">{{ post.author }}</h4>
                  <p class="text-xs text-gray-500">{{ post.time }}</p>
                </div>
              </div>
              <button class="p-1 text-gray-400 hover:text-gray-600">
                <i class="fas fa-ellipsis-h"></i>
              </button>
            </div>
            
            <h3 class="font-bold text-lg mb-2">{{ post.title }}</h3>
            <p class="text-gray-700 mb-4">{{ post.content }}</p>
            
            <div class="flex flex-wrap gap-1 mb-4">
              <span v-for="tag in post.tags" :key="tag" 
                    class="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                {{ tag }}
              </span>
            </div>
            
            <div class="flex justify-between text-gray-500">
              <div class="flex space-x-4">
                <button class="flex items-center hover:text-red-500 transition">
                  <i class="far fa-heart mr-1"></i>
                  <span>{{ post.likes }}</span>
                </button>
                <button class="flex items-center hover:text-blue-500 transition">
                  <i class="far fa-comment mr-1"></i>
                  <span>{{ post.comments }}</span>
                </button>
                <button class="flex items-center hover:text-green-500 transition">
                  <i class="far fa-share-square mr-1"></i>
                  <span>分享</span>
                </button>
              </div>
              <div class="text-xs">
                <i class="far fa-eye mr-1"></i>
                {{ post.views }}次浏览
              </div>
            </div>
          </div>
          
          <!-- 空状态 -->
          <div v-if="activePosts.length === 0" class="card text-center py-12">
            <div class="text-4xl mb-4 text-gray-300">
              <i class="fas fa-newspaper"></i>
            </div>
            <h3 class="text-lg font-medium text-gray-700 mb-2">暂无动态</h3>
            <p class="text-gray-500 mb-6">尝试关注更多用户或参与热门话题</p>
            <button class="btn-primary">
              <i class="fas fa-compass mr-2"></i>
              探索发现
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 热门话题 -->
    <div class="card">
      <h3 class="font-bold text-lg mb-4">热门话题</h3>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div v-for="topic in trendingTopics" :key="topic.id" 
             class="relative overflow-hidden rounded-xl p-4 text-white cursor-pointer hover:scale-[1.02] transition-transform duration-200"
             :class="topic.color">
          <div class="relative z-10">
            <h4 class="font-bold text-lg mb-2">{{ topic.name }}</h4>
            <p class="text-sm opacity-90">{{ topic.posts }} 个帖子</p>
          </div>
          <div class="absolute right-2 bottom-2 text-3xl opacity-20">
            <i class="fas fa-hashtag"></i>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 底部信息 -->
    <div class="text-center text-gray-500 text-sm py-6">
      <p>MiniLove • 面向18-45岁男性的情感支持社区 • 活跃时间: 18:00-04:00</p>
      <p class="mt-2">这里是一个安全的倾诉空间，我们尊重每一份情感</p>
    </div>
  </div>
</template>