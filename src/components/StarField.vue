<template>
  <view class="star-field">
    <view
      v-for="star in stars"
      :key="star.id"
      class="star"
      :style="{
        left: `${star.x}%`,
        top: `${star.y}%`,
        width: `${rpx2px(star.size)}px`,
        height: `${rpx2px(star.size)}px`,
        animationDelay: `${star.delay}s`,
        animationDuration: `${star.duration}s`
      }"
    />
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import { rpx2px } from '@/utils/system'

const props = withDefaults(defineProps<{ count?: number }>(), { count: 28 })

interface Star {
  id: number
  x: number
  y: number
  size: number
  delay: number
  duration: number
}

const stars = computed<Star[]>(() =>
  Array.from({ length: props.count }, (_, index) => {
    const size = 2 + Math.random() * 4
    return {
      id: index,
      x: Math.random() * 98,
      y: Math.random() * 92,
      size: Math.round(size * 10) / 10,
      delay: Math.round(Math.random() * -80) / 10,
      duration: 3.2 + Math.random() * 3.6
    }
  })
)
</script>

<style>
.star-field {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  z-index: 0;
}

.star {
  position: absolute;
  border-radius: 50%;
  background: #f8fafc;
  box-shadow: 0 0 8rpx rgba(226, 232, 240, 0.85);
  animation-name: twinkle;
  animation-timing-function: ease-in-out;
  animation-iteration-count: infinite;
}

@keyframes twinkle {
  0%,
  100% {
    opacity: 0.18;
    transform: scale(0.75);
  }

  50% {
    opacity: 0.85;
    transform: scale(1);
  }
}
</style>
