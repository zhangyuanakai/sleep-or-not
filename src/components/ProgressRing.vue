<template>
  <view class="progress-ring" :style="rootStyle">
    <view class="ring-glow" />
    <view class="ring-track" />
    <view class="ring-inner" :style="{ inset: `${thicknessPx}px` }">
      <slot />
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import { rpx2px } from '@/utils/system'

const props = withDefaults(
  defineProps<{
    progress: number
    size?: number
    thickness?: number
    color?: string
    track?: string
    glow?: string
  }>(),
  {
    size: 520,
    thickness: 18,
    color: '#F59E0B',
    track: 'rgba(255, 255, 255, 0.08)',
    glow: 'rgba(245, 158, 11, 0.45)'
  }
)

const thicknessPx = computed(() => rpx2px(props.thickness))

const rootStyle = computed(() => {
  const ratio = Math.max(0, Math.min(1, props.progress || 0))
  const sizePx = rpx2px(props.size)
  return {
    width: `${sizePx}px`,
    height: `${sizePx}px`,
    '--ring-angle': `${ratio * 360}deg`,
    '--ring-color': props.color,
    '--ring-track': props.track,
    '--ring-glow': props.glow
  }
})
</script>

<style>
.progress-ring {
  position: relative;
  border-radius: 50%;
}

.ring-glow {
  position: absolute;
  inset: -6rpx;
  border-radius: 50%;
  background: conic-gradient(
    from 0deg,
    var(--ring-glow) 0deg,
    var(--ring-glow) var(--ring-angle),
    transparent var(--ring-angle) 360deg
  );
  filter: blur(28rpx);
  opacity: 0.7;
}

.ring-track {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background-color: var(--ring-track);
  background-image: conic-gradient(
    from 0deg,
    var(--ring-color) 0deg,
    var(--ring-color) var(--ring-angle),
    var(--ring-track) var(--ring-angle),
    var(--ring-track) 360deg
  );
  box-shadow: inset 0 0 30rpx rgba(0, 0, 0, 0.35);
}

.ring-inner {
  position: absolute;
  border-radius: 50%;
  background: radial-gradient(circle at 50% 36%, #1b2740 0%, #0b1120 72%);
  border: 1rpx solid rgba(255, 255, 255, 0.05);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  overflow: hidden;
}
</style>
