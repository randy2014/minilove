<script setup lang="ts">
import { RouterView } from 'vue-router'
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50 flex items-center justify-center p-4">
    <div class="w-full max-w-md">
      <!-- 品牌标识 -->
      <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-2xl shadow-lg mb-4">
          <i class="fas fa-heart text-white text-2xl"></i>
        </div>
        <h1 class="text-3xl font-bold text-gray-800 mb-2">MiniLove</h1>
        <p class="text-gray-600">情感支持社区</p>
      </div>
      
      <!-- 内容区域 -->
      <div class="bg-white rounded-2xl shadow-xl p-8">
        <RouterView />
      </div>
      
      <!-- 页脚链接 -->
      <div class="mt-6 text-center">
        <div class="text-gray-600 text-sm">
          <p>加入MiniLove，寻找情感支持与共鸣</p>
          <p class="mt-2">面向18-45岁男性的情感支持社区</p>
        </div>
      </div>
    </div>
  </div>
</template>