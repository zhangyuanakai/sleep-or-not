<template>
  <view class="navbar" :class="`navbar--${theme}`" :style="{ paddingTop: `${statusBarHeight}px` }">
    <view class="nav-row">
      <view v-if="back" class="back-btn" hover-class="back-hover" @tap="handleBack">
        <view class="chevron" />
      </view>
      <text class="nav-title">{{ title }}</text>
      <view class="nav-right" :style="{ right: `${menuSafeRight}px` }">
        <slot name="right" />
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import Taro from '@tarojs/taro'

import { menuSafeRight, statusBarHeight } from '@/utils/system'

withDefaults(defineProps<{ title?: string; back?: boolean; theme?: 'dark' | 'warm' }>(), {
  title: '',
  back: true,
  theme: 'dark'
})

function handleBack(): void {
  const pages = Taro.getCurrentPages()
  if (pages.length > 1) {
    void Taro.navigateBack({ delta: 1 })
    return
  }
  void Taro.switchTab({ url: '/pages/index/index' })
}
</script>

<style>
.navbar {
  position: relative;
  z-index: 10;
  width: 100%;
  color: #f8fafc;
}

.navbar--warm {
  color: #3b2a15;
}

.nav-row {
  position: relative;
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 28rpx;
}

.back-btn {
  position: absolute;
  left: 20rpx;
  top: 0;
  bottom: 0;
  width: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

.back-hover {
  background: rgba(255, 255, 255, 0.08);
}

.chevron {
  width: 22rpx;
  height: 22rpx;
  border-left: 4rpx solid currentColor;
  border-bottom: 4rpx solid currentColor;
  transform: rotate(45deg);
  margin-left: 10rpx;
  opacity: 0.9;
}

.nav-title {
  font-size: 30rpx;
  font-weight: 600;
  letter-spacing: 1rpx;
}

.nav-right {
  position: absolute;
  right: 28rpx;
  top: 0;
  bottom: 0;
  display: flex;
  align-items: center;
}
</style>
