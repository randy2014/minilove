<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()

// 当前标签页
const activeTab = ref('posts')

// 标签页配置
const tabs = [
  { id: 'posts', name: '我的帖子', icon: 'fas fa-newspaper' },
  { id: 'comments', name: '我的评论', icon: 'fas fa-comment' },
  { id: 'likes', name: '我的点赞', icon: 'fas fa-heart' },
  { id: 'following', name: '关注', icon: 'fas fa-user-friends' },
  { id: 'settings', name: '设置', icon: 'fas fa-cog' }
]

// 用户统计数据（模拟）
const userStats = ref({
  posts: 12,
  comments: 45,
  likes: 128,
  followers: 156,
  following: 89,
  daysActive: 30
})

// 最近的帖子（模拟）
const recentPosts = ref([
  { id: 1, title: '深夜的思考', content: '工作压力大，有点迷茫...', likes: 15, comments: 8, time: '2小时前' },
  { id: 2, title: '周末的安排', content: '一个人不知道做什么好...', likes: 23, comments: 12, time: '1天前' },
  { id: 3, title: '最近的收获', content: '开始学习新技能，感觉充实多了', likes: 8, comments: 3, time: '3天前' }
])

// 最近的评论（模拟）
const recentComments = ref([
  { id: 1, postTitle: '大家怎么度过周末？', content: '我也经常一个人，可以一起交流', likes: 5, time: '5小时前' },
  { id: 2, postTitle: '工作压力大怎么办', content: '建议尝试冥想，对我很有帮助', likes: 12, time: '1天前' },
  { id: 3, postTitle: '学习新技能的感受', content: '我也在学编程，可以组队学习', likes: 3, time: '2天前' }
])

// 格式化会员到期时间
const membershipExpiry = computed(() => {
  if (!authStore.user?.membershipExpiresAt) {
    return authStore.isPremium ? '永久' : '免费版'
  }
  
  const date = new Date(authStore.user.membershipExpiresAt)
  return date.toLocaleDateString('zh-CN')
})

// 计算活跃度等级
const activityLevel = computed(() => {
  const score = userStats.value.posts + userStats.value.comments / 2 + userStats.value.likes / 5
  if (score > 100) return '活跃达人'
  if (score > 50) return '积极参与'
  if (score > 20) return '日常活跃'
  return '新人用户'
})

// 编辑资料
const editProfile = () => {
  console.log('编辑资料')
}

// 升级会员
const upgradeMembership = () => {
  console.log('升级会员')
}
</script>

<template>
  <div class="space-y-6">
    <!-- 用户信息卡片 -->
    <div class="card">
      <div class="flex flex-col md:flex-row md:items-start">
        <!-- 头像区域 -->
        <div class="mb-6 md:mb-0 md:mr-8">
          <div class="w-32 h-32 rounded-2xl bg-gradient-to-r from-primary-400 to-secondary-400 flex items-center justify-center text-white text-4xl font-bold mb-4">
            {{ authStore.user?.username?.charAt(0).toUpperCase() || 'U' }}
          </div>
          <button @click="editProfile" class="btn-outline w-full">
            <i class="fas fa-edit mr-2"></i>
            编辑资料
          </button>
        </div>
        
        <!-- 用户信息 -->
        <div class="flex-1">
          <div class="flex flex-col md:flex-row md:items-start justify-between">
            <div>
              <h1 class="text-2xl font-bold text-gray-800 mb-2">{{ authStore.user?.username }}</h1>
              <p class="text-gray-600 mb-4">{{ authStore.user?.bio || '这个用户很懒，还没有写个人简介' }}</p>
              
              <div class="flex flex-wrap gap-2 mb-4">
                <span class="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                  <i class="fas fa-map-marker-alt mr-1"></i>
                  {{ authStore.user?.city || '未知城市' }}
                </span>
                <span class="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                  <i class="fas fa-user mr-1"></i>
                  {{ authStore.user?.gender === 'male' ? '男' : 
                     authStore.user?.gender === 'female' ? '女' : '未设置' }}
                </span>
                <span class="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                  <i class="fas fa-birthday-cake mr-1"></i>
                  {{ authStore.user?.age || '未设置' }}岁
                </span>
              </div>
            </div>
            
            <!-- 会员信息 -->
            <div class="md:text-right">
              <div :class="[
                'inline-flex items-center px-4 py-2 rounded-lg font-medium mb-3',
                authStore.isPremium ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white' :
                authStore.isBasic ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white' :
                'bg-gray-200 text-gray-800'
              ]">
                <i v-if="authStore.isPremium" class="fas fa-crown mr-2"></i>
                {{ authStore.user?.membershipLevel === 'premium' ? '高级会员' :
                   authStore.user?.membershipLevel === 'basic' ? '基础会员' : '免费会员' }}
              </div>
              
              <div v-if="!authStore.isPremium" class="md:text-right">
                <button @click="upgradeMembership" class="text-sm text-primary-600 hover:text-primary-800 hover:underline">
                  <i class="fas fa-rocket mr-1"></i>
                  升级会员享更多权益
                </button>
              </div>
            </div>
          </div>
          
          <!-- 统计数据 -->
          <div class="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6">
            <div class="bg-gray-50 rounded-lg p-4 text-center">
              <div class="text-2xl font-bold text-gray-800">{{ userStats.posts }}</div>
              <div class="text-sm text-gray-600">帖子</div>
            </div>
            <div class="bg-gray-50 rounded-lg p-4 text-center">
              <div class="text-2xl font-bold text-gray-800">{{ userStats.comments }}</div>
              <div class="text-sm text-gray-600">评论</div>
            </div>
            <div class="bg-gray-50 rounded-lg p-4 text-center">
              <div class="text-2xl font-bold text-gray-800">{{ userStats.likes }}</div>
              <div class="text-sm text-gray-600">获赞</div>
            </div>
            <div class="bg-gray-50 rounded-lg p-4 text-center">
              <div class="text-2xl font-bold text-gray-800">{{ userStats.followers }}</div>
              <div class="text-sm text-gray-600">粉丝</div>
            </div>
            <div class="bg-gray-50 rounded-lg p-4 text-center">
              <div class="text-2xl font-bold text-gray-800">{{ userStats.daysActive }}</div>
              <div class="text-sm text-gray-600">活跃天数</div>
            </div>
          </div>
          
          <!-- 活跃度等级 -->
          <div class="mt-6 bg-gradient-to-r from-primary-50 to-secondary-50 rounded-lg p-4">
            <div class="flex justify-between items-center">
              <div>
                <h4 class="font-medium text-gray-800 mb-1">活跃度等级</h4>
                <p class="text-sm text-gray-600">{{ activityLevel }}</p>
              </div>
              <div class="text-right">
                <div class="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div class="h-full bg-gradient-to-r from-primary-500 to-secondary-500" style="width: 75%"></div>
                </div>
                <p class="text-xs text-gray-500 mt-1">再活跃一些即可升级</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 标签页导航 -->
    <div class="border-b border-gray-200">
      <nav class="flex space-x-4 overflow-x-auto">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          @click="activeTab = tab.id"
          :class="[
            'flex items-center px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors',
            activeTab === tab.id
              ? 'border-primary-500 text-primary-700'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          ]"
        >
          <i :class="[tab.icon, 'mr-2']"></i>
          {{ tab.name }}
        </button>
      </nav>
    </div>
    
    <!-- 标签页内容 -->
    <div class="space-y-6">
      <!-- 我的帖子 -->
      <div v-if="activeTab === 'posts'" class="space-y-4">
        <div v-for="post in recentPosts" :key="post.id" class="card">
          <div class="flex justify-between items-start mb-3">
            <h3 class="font-bold text-lg">{{ post.title }}</h3>
            <span class="text-sm text-gray-500">{{ post.time }}</span>
          </div>
          <p class="text-gray-700 mb-4">{{ post.content }}</p>
          <div class="flex justify-between text-gray-500">
            <div class="flex space-x-4">
              <span class="flex items-center">
                <i class="far fa-heart mr-1"></i>
                {{ post.likes }}
              </span>
              <span class="flex items-center">
                <i class="far fa-comment mr-1"></i>
                {{ post.comments }}
              </span>
            </div>
            <div class="flex space-x-2">
              <button class="text-sm text-primary-600 hover:text-primary-800">
                <i class="fas fa-edit mr-1"></i>
                编辑
              </button>
              <button class="text-sm text-red-600 hover:text-red-800">
                <i class="fas fa-trash mr-1"></i>
                删除
              </button>
            </div>
          </div>
        </div>
        
        <!-- 空状态 -->
        <div v-if="recentPosts.length === 0" class="card text-center py-12">
          <div class="text-4xl mb-4 text-gray-300">
            <i class="fas fa-newspaper"></i>
          </div>
          <h3 class="text-lg font-medium text-gray-700 mb-2">暂无帖子</h3>
          <p class="text-gray-500 mb-6">发布你的第一个帖子，分享你的心情</p>
          <button class="btn-primary">
            <i class="fas fa-plus mr-2"></i>
            发布帖子
          </button>
        </div>
      </div>
      
      <!-- 我的评论 -->
      <div v-else-if="activeTab === 'comments'" class="space-y-4">
        <div v-for="comment in recentComments" :key="comment.id" class="card">
          <div class="mb-3">
            <div class="flex items-center text-sm text-gray-500 mb-2">
              <i class="fas fa-newspaper mr-2"></i>
              评论于: {{ comment.postTitle }}
            </div>
            <p class="text-gray-700">{{ comment.content }}</p>
          </div>
          <div class="flex justify-between text-gray-500">
            <div class="flex items-center">
              <i class="far fa-heart mr-1"></i>
              {{ comment.likes }}个赞
            </div>
            <span class="text-sm">{{ comment.time }}</span>
          </div>
        </div>
      </div>
      
      <!-- 设置 -->
      <div v-else-if="activeTab === 'settings'" class="space-y-6">
        <!-- 账户安全 -->
        <div class="card">
          <h3 class="font-bold text-lg mb-4">账户安全</h3>
          <div class="space-y-4">
            <div class="flex justify-between items-center">
              <div>
                <h4 class="font-medium text-gray-800">登录密码</h4>
                <p class="text-sm text-gray-600">定期更换密码保护账户安全</p>
              </div>
              <button class="btn-outline">
                <i class="fas fa-key mr-2"></i>
                修改密码
              </button>
            </div>
            
            <div class="flex justify-between items-center">
              <div>
                <h4 class="font-medium text-gray-800">邮箱绑定</h4>
                <p class="text-sm text-gray-600">{{ authStore.user?.email }}</p>
              </div>
              <button class="btn-outline">
                <i class="fas fa-envelope mr-2"></i>
                更换邮箱
              </button>
            </div>
            
            <div class="flex justify-between items-center">
              <div>
                <h4 class="font-medium text-gray-800">手机绑定</h4>
                <p class="text-sm text-gray-600">{{ authStore.user?.phone || '未绑定' }}</p>
              </div>
              <button class="btn-outline">
                <i class="fas fa-phone mr-2"></i>
                {{ authStore.user?.phone ? '更换手机' : '绑定手机' }}
              </button>
            </div>
          </div>
        </div>
        
        <!-- 隐私设置 -->
        <div class="card">
          <h3 class="font-bold text-lg mb-4">隐私设置</h3>
          <div class="space-y-4">
            <div class="flex justify-between items-center">
              <div>
                <h4 class="font-medium text-gray-800">个人资料可见性</h4>
                <p class="text-sm text-gray-600">控制谁可以看到你的个人信息</p>
              </div>
              <select class="form-input text-sm w-32">
                <option>所有人可见</option>
                <option>仅关注者可见</option>
                <option>仅自己可见</option>
              </select>
            </div>
            
            <div class="flex justify-between items-center">
              <div>
                <h4 class="font-medium text-gray-800">帖子可见性</h4>
                <p class="text-sm text-gray-600">新帖子的默认可见范围</p>
              </div>
              <select class="form-input text-sm w-32">
                <option>公开</option>
                <option>仅关注者</option>
                <option>私密</option>
              </select>
            </div>
            
            <div class="flex items-center">
              <input type="checkbox" id="private-account" class="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500">
              <label for="private-account" class="ml-3 text-gray-700">
                私密账户
                <p class="text-sm text-gray-500">需要你的批准才能关注你</p>
              </label>
            </div>
          </div>
        </div>
        
        <!-- 通知设置 -->
        <div class="card">
          <h3 class="font-bold text-lg mb-4">通知设置</h3>
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <div>
                <h4 class="font-medium text-gray-800">帖子通知</h4>
                <p class="text-sm text-gray-600">有人评论或点赞你的帖子时通知</p>
              </div>
              <input type="checkbox" class="relative h-6 w-11 rounded-full bg-gray-200 checked:bg-primary-500 transition-colors duration-200">
            </div>
            
            <div class="flex items-center justify-between">
              <div>
                <h4 class="font-medium text-gray-800">关注通知</h4>
                <p class="text-sm text-gray-600">有人关注你时通知</p>
              </div>
              <input type="checkbox" checked class="relative h-6 w-11 rounded-full bg-gray-200 checked:bg-primary-500 transition-colors duration-200">
            </div>
            
            <div class="flex items-center justify-between">
              <div>
                <h4 class="font-medium text-gray-800">私信通知</h4>
                <p class="text-sm text-gray-600">收到私信时通知</p>
              </div>
              <input type="checkbox" checked class="relative h-6 w-11 rounded-full bg-gray-200 checked:bg-primary-500 transition-colors duration-200">
            </div>
          </div>
        </div>
        
        <!-- 危险区域 -->
        <div class="card border-red-200 bg-red-50">
          <h3 class="font-bold text-lg mb-4 text-red-800">危险区域</h3>
          <div class="space-y-4">
            <div class="flex justify-between items-center">
              <div>
                <h4 class="font-medium text-red-800">注销账户</h4>
                <p class="text-sm text-red-600">永久删除你的账户和所有数据</p>
              </div>
              <button class="btn-outline border-red-300 text-red-700 hover:bg-red-50">
                <i class="fas fa-trash mr-2"></i>
                注销账户
              </button>
            </div>
            
            <div class="flex justify-between items-center">
              <div>
                <h4 class="font-medium text-red-800">导出数据</h4>
                <p class="text-sm text-red-600">导出你的所有个人数据</p>
              </div>
              <button class="btn-outline border-red-300 text-red-700 hover:bg-red-50">
                <i class="fas fa-download mr-2"></i>
                导出数据
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>