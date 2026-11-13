<template>
  <view class="sleep-page" :class="{ 'sleep-page--settled': settledOutcome }">
    <StarField :count="36" />
    <view class="ambient-glow ambient-glow--top" />
    <view class="ambient-glow ambient-glow--bottom" />

    <view class="safe-top" :style="{ height: `${statusBarHeight}px` }" />

    <view class="top-row">
      <view class="min-btn" hover-class="min-hover" @tap="finishGuard">
        <view class="chevron-down" />
      </view>
      <text class="guard-pill">{{ guardPill }}</text>
      <view class="top-placeholder" />
    </view>

    <template v-if="log">
      <view class="moon-stage">
        <view class="moon-halo" />
        <view class="moon">
          <view class="moon-shade" />
          <view class="moon-crater moon-crater--a" />
          <view class="moon-crater moon-crater--b" />
          <view class="moon-crater moon-crater--c" />
        </view>
        <view class="orbit-star orbit-star--a" />
        <view class="orbit-star orbit-star--b" />
        <view class="orbit-star orbit-star--c" />
      </view>

      <view class="info">
        <text class="guard-tip">睡眠守护中 · 切出屏幕超过 90 秒将判定破戒</text>
        <text class="elapsed number-font">{{ elapsedText }}</text>
        <text class="started">今晚 {{ startClockLabel }} 开始守护 · 累计切出 {{ screenOut }} 秒</text>
        <text class="started">支持直接锁屏睡觉，明早 06:30 - 08:30 回来验证</text>
      </view>

      <view class="bottom">
        <view class="sound-btn" :class="{ 'sound-btn--playing': sound !== 'mute' }" @tap="cycleSound">
          <view class="wave">
            <view
              v-for="(bar, index) in 5"
              :key="index"
              class="wave-bar"
              :style="{ height: `${rpx2px(barHeights[index])}px`, animationDelay: `${index * 0.12}s` }"
            />
          </view>
        </view>
        <text class="sound-label">{{ soundLabel }}</text>
        <text class="exit-link" @tap="finishGuard">完成守护 · 明早验证</text>
      </view>
    </template>

    <view v-else class="missing">
      <text class="missing-title">没有找到今晚的守护记录</text>
      <text class="missing-desc">请先回到首页点击「我要睡了」，开启睡眠守护。</text>
      <view class="missing-btn" hover-class="btn-hover" @tap="goHome">
        <text class="missing-btn-text">返回首页</text>
      </view>
    </view>

    <view v-if="settledOutcome" class="result-mask">
      <view class="result-card" :class="`result-card--${settledOutcome}`">
        <view class="result-icon">
          <text class="result-icon-text">{{ resultIcon }}</text>
        </view>
        <text class="result-title">{{ resultTitle }}</text>
        <text class="result-amount number-font">{{ resultAmount }}</text>
        <text class="result-desc">{{ resultDesc }}</text>
        <view class="result-btn" hover-class="btn-hover" @tap="goHome">
          <text class="result-btn-text">返回挑战首页</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import Taro, { useDidShow, useLoad, useUnload } from '@tarojs/taro'
import { computed, ref, watch } from 'vue'

import StarField from '@/components/StarField.vue'
import { SOUND_OPTIONS, type SoundKey, isTerminalState } from '@/constants'
import { playAmbient, stopAmbient } from '@/services/wechat'
import {
  clock,
  findLog,
  guardingLog,
  isCloud,
  openLog,
  refresh
} from '@/store'
import { formatClock, formatDuration } from '@/utils/date'
import { rpx2px, statusBarHeight } from '@/utils/system'

const logId = ref('')
const sound = ref<SoundKey>('mute')
const barHeights = [22, 38, 52, 34, 20]

const log = computed(() => {
  const target = logId.value ? findLog(logId.value) : null
  return target ?? guardingLog.value ?? openLog.value
})

const elapsedText = computed(() => {
  const start = log.value?.sleepStartTime
  if (!start) return '00:00:00'
  return formatDuration(clock.now - start)
})

const startClockLabel = computed(() => {
  const start = log.value?.sleepStartTime
  return start ? formatClock(start) : '--:--'
})

const screenOut = computed(() => log.value?.screenOutSeconds ?? 0)

const soundLabel = computed(
  () => SOUND_OPTIONS.find((option) => option.key === sound.value)?.label ?? '静音'
)

const settledOutcome = computed<'success' | 'leave' | 'fail' | null>(() => {
  const current = log.value
  if (!current || !isTerminalState(current.state)) return null
  if (current.state === 'STATE_3_SUCCESS') return 'success'
  if (current.state === 'STATE_3_LEAVE') return 'leave'
  return 'fail'
})

const guardPill = computed(() => {
  if (settledOutcome.value) return '守护已结算'
  if (log.value?.state === 'STATE_2_AWAITING_WAKE') return '等待晨间验证'
  return '睡眠守护中'
})

const resultIcon = computed(() => {
  if (settledOutcome.value === 'success') return '✓'
  if (settledOutcome.value === 'leave') return '¥'
  return '×'
})

const resultTitle = computed(() => {
  if (settledOutcome.value === 'success') return '今日守护完成'
  if (settledOutcome.value === 'leave') return '已自动抵扣 1 次请假'
  return '本次守护未达标'
})

const resultAmount = computed(() => {
  const refund = log.value?.refundAmount ?? 0
  return refund > 0 ? `+¥${refund.toFixed(2)}` : '¥0.00'
})

const resultDesc = computed(() => {
  if (settledOutcome.value === 'success') return '早安验证已完成，今日返还已存入钱包。'
  if (settledOutcome.value === 'leave') return '守护中断，系统已自动使用免死金牌，今日仍退还 ¥1.00。'
  return '请假次数已用完，今日押金 ¥1.00 未退还，明天继续加油。'
})

function cycleSound(): void {
  const currentIndex = SOUND_OPTIONS.findIndex((option) => option.key === sound.value)
  const next = SOUND_OPTIONS[(currentIndex + 1) % SOUND_OPTIONS.length]
  sound.value = next.key
  playAmbient(next.key)
  if (next.key !== 'mute') {
    void Taro.showToast({ title: `已切换为${next.label}`, icon: 'none', duration: 1200 })
  }
}

function goHome(): void {
  stopAmbient()
  void Taro.switchTab({ url: '/pages/index/index' })
}

async function finishGuard(): Promise<void> {
  const modal = await Taro.showModal({
    title: '结束今晚守护？',
    content: '结束后仍需在明早 06:30 - 08:30 完成晨间验证，才能拿回今日 ¥1.00。',
    confirmText: '结束守护',
    cancelText: '继续守护'
  })
  if (!modal.confirm) return

  stopAmbient()
  const current = log.value
  if (!isCloud.value && current) {
    const demo = await Taro.showModal({
      title: '演示模式',
      content: '是否立即前往晨间验证页，体验完整的早安验证流程？正式环境需要等到明早 06:30 后。',
      confirmText: '去体验',
      cancelText: '先回首页'
    })
    if (demo.confirm) {
      void Taro.redirectTo({
        url: `/pages/wake/index?logId=${current.id}&demo=1`
      })
      return
    }
  }
  goHome()
}

useLoad((options) => {
  logId.value = (options?.logId as string) || ''
})

useDidShow(() => {
  void refresh().catch(() => undefined)
})

useUnload(() => {
  stopAmbient()
})

watch(settledOutcome, (value) => {
  if (value) stopAmbient()
})
</script>

<style>
.sleep-page {
  position: relative;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  overflow-x: hidden;
  background:
    radial-gradient(circle at 50% 30%, rgba(99, 102, 241, 0.16), transparent 42%),
    radial-gradient(circle at 50% 100%, rgba(30, 64, 175, 0.14), transparent 55%),
    linear-gradient(180deg, #04080f 0%, #0a1222 52%, #070d1a 100%);
}

.ambient-glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(50rpx);
  pointer-events: none;
}

.ambient-glow--top {
  width: 420rpx;
  height: 420rpx;
  top: -180rpx;
  right: -160rpx;
  background: rgba(99, 102, 241, 0.14);
}

.ambient-glow--bottom {
  width: 480rpx;
  height: 480rpx;
  bottom: -260rpx;
  left: -200rpx;
  background: rgba(245, 158, 11, 0.06);
}

.safe-top {
  position: relative;
  z-index: 3;
}

.top-row {
  position: relative;
  z-index: 3;
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32rpx;
  flex-shrink: 0;
}

.min-btn {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background: rgba(30, 41, 59, 0.45);
  border: 1rpx solid rgba(255, 255, 255, 0.06);
  display: flex;
  align-items: center;
  justify-content: center;
}

.min-hover {
  background: rgba(30, 41, 59, 0.8);
}

.chevron-down {
  width: 18rpx;
  height: 18rpx;
  border-left: 3rpx solid rgba(226, 232, 240, 0.6);
  border-bottom: 3rpx solid rgba(226, 232, 240, 0.6);
  transform: rotate(-45deg) translate(3rpx, -3rpx);
}

.guard-pill {
  font-size: 22rpx;
  color: rgba(148, 163, 184, 0.75);
  letter-spacing: 3rpx;
}

.top-placeholder {
  width: 64rpx;
}

.moon-stage {
  position: relative;
  flex: 1;
  min-height: 340rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.moon-halo {
  position: absolute;
  width: 520rpx;
  height: 520rpx;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(226, 232, 240, 0.16), transparent 66%);
  filter: blur(18rpx);
  animation: haloBreathe 7s ease-in-out infinite;
}

.moon {
  position: relative;
  width: 250rpx;
  height: 250rpx;
  border-radius: 50%;
  background: radial-gradient(circle at 36% 30%, #f8fafc 0%, #dbe3ee 38%, #9aa8bd 78%, #6b7a91 100%);
  box-shadow:
    0 0 90rpx rgba(226, 232, 240, 0.25),
    inset -20rpx -24rpx 50rpx rgba(15, 23, 42, 0.35);
  animation: moonBreathe 6.5s ease-in-out infinite;
  overflow: hidden;
}

.moon-shade {
  position: absolute;
  width: 104%;
  height: 104%;
  left: 40%;
  top: -3%;
  border-radius: 50%;
  background: radial-gradient(
    circle at 55% 55%,
    #07101e 0%,
    #0a1424 72%,
    rgba(10, 20, 36, 0.9) 100%
  );
  filter: blur(6rpx);
}

.moon-crater {
  position: absolute;
  border-radius: 50%;
  background: rgba(100, 116, 139, 0.22);
  box-shadow: inset 2rpx 2rpx 6rpx rgba(15, 23, 42, 0.18);
}

.moon-crater--a {
  width: 40rpx;
  height: 40rpx;
  top: 58rpx;
  left: 120rpx;
}

.moon-crater--b {
  width: 24rpx;
  height: 24rpx;
  top: 118rpx;
  left: 82rpx;
}

.moon-crater--c {
  width: 16rpx;
  height: 16rpx;
  top: 82rpx;
  left: 158rpx;
}

.orbit-star {
  position: absolute;
  border-radius: 50%;
  background: #e2e8f0;
  box-shadow: 0 0 10rpx rgba(226, 232, 240, 0.9);
  animation: twinkleSoft 3.6s ease-in-out infinite;
}

.orbit-star--a {
  width: 8rpx;
  height: 8rpx;
  top: 22%;
  right: 20%;
}

.orbit-star--b {
  width: 5rpx;
  height: 5rpx;
  top: 64%;
  left: 18%;
  animation-delay: 1.2s;
}

.orbit-star--c {
  width: 6rpx;
  height: 6rpx;
  bottom: 18%;
  right: 26%;
  animation-delay: 2.1s;
}

.info {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 0 60rpx;
}

.guard-tip {
  font-size: 22rpx;
  color: rgba(148, 163, 184, 0.7);
  letter-spacing: 1rpx;
}

.elapsed {
  margin-top: 18rpx;
  font-size: 88rpx;
  line-height: 1.1;
  font-weight: 700;
  color: #f8fafc;
  letter-spacing: 5rpx;
  text-shadow: 0 10rpx 40rpx rgba(0, 0, 0, 0.55);
}

.started {
  margin-top: 14rpx;
  font-size: 20rpx;
  color: rgba(100, 116, 139, 0.85);
  letter-spacing: 0.5rpx;
}

.bottom {
  position: relative;
  z-index: 2;
  width: 100%;
  padding: 32rpx 0 calc(36rpx + env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
}

.sound-btn {
  width: 118rpx;
  height: 118rpx;
  border-radius: 50%;
  background: rgba(30, 41, 59, 0.55);
  border: 1rpx solid rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  transition: box-shadow 0.3s ease;
}

.sound-btn--playing {
  box-shadow: 0 0 40rpx rgba(99, 102, 241, 0.35);
  border-color: rgba(129, 140, 248, 0.35);
}

.wave {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6rpx;
  height: 56rpx;
}

.wave-bar {
  width: 5rpx;
  border-radius: 999rpx;
  background: rgba(203, 213, 225, 0.6);
}

.sound-btn--playing .wave-bar {
  background: #a5b4fc;
  animation: wavePulse 1.1s ease-in-out infinite;
}

.sound-label {
  margin-top: 14rpx;
  font-size: 20rpx;
  color: rgba(148, 163, 184, 0.65);
  letter-spacing: 2rpx;
}

.exit-link {
  margin-top: 40rpx;
  font-size: 21rpx;
  color: rgba(100, 116, 139, 0.65);
  text-decoration: underline;
  text-underline-offset: 6rpx;
}

.missing {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0 70rpx;
  text-align: center;
}

.missing-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #e2e8f0;
}

.missing-desc {
  margin-top: 16rpx;
  font-size: 23rpx;
  line-height: 1.7;
  color: #64748b;
}

.missing-btn {
  margin-top: 40rpx;
  padding: 22rpx 60rpx;
  border-radius: 999rpx;
  background: linear-gradient(135deg, #fde68a, #f59e0b);
}

.btn-hover {
  opacity: 0.9;
}

.missing-btn-text {
  font-size: 27rpx;
  font-weight: 700;
  color: #1f2937;
}

@keyframes moonBreathe {
  0%,
  100% {
    transform: scale(1);
    opacity: 0.92;
  }

  50% {
    transform: scale(1.035);
    opacity: 1;
  }
}

@keyframes haloBreathe {
  0%,
  100% {
    transform: scale(0.96);
    opacity: 0.7;
  }

  50% {
    transform: scale(1.06);
    opacity: 1;
  }
}

@keyframes twinkleSoft {
  0%,
  100% {
    opacity: 0.2;
    transform: scale(0.7);
  }

  50% {
    opacity: 0.9;
    transform: scale(1);
  }
}

@keyframes wavePulse {
  0%,
  100% {
    transform: scaleY(0.55);
  }

  50% {
    transform: scaleY(1.15);
  }
}

.result-mask {
  position: fixed;
  inset: 0;
  z-index: 20;
  background: rgba(3, 7, 18, 0.82);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 60rpx;
}

.result-card {
  width: 100%;
  padding: 50rpx 40rpx 40rpx;
  border-radius: 36rpx;
  background: #111c31;
  border: 1rpx solid rgba(255, 255, 255, 0.08);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  box-shadow: 0 30rpx 80rpx rgba(0, 0, 0, 0.45);
}

.result-icon {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(16, 185, 129, 0.12);
  border: 1rpx solid rgba(16, 185, 129, 0.35);
}

.result-card--leave .result-icon {
  background: rgba(245, 158, 11, 0.12);
  border-color: rgba(245, 158, 11, 0.35);
}

.result-card--fail .result-icon {
  background: rgba(239, 68, 68, 0.12);
  border-color: rgba(239, 68, 68, 0.35);
}

.result-icon-text {
  font-size: 54rpx;
  font-weight: 700;
  color: #34d399;
}

.result-card--leave .result-icon-text {
  color: #fbbf24;
}

.result-card--fail .result-icon-text {
  color: #f87171;
}

.result-title {
  margin-top: 26rpx;
  font-size: 34rpx;
  font-weight: 700;
  color: #f8fafc;
}

.result-amount {
  margin-top: 18rpx;
  font-size: 58rpx;
  font-weight: 700;
  color: #34d399;
  font-family: var(--font-display);
}

.result-card--leave .result-amount {
  color: #fbbf24;
}

.result-card--fail .result-amount {
  color: #f87171;
}

.result-desc {
  margin-top: 16rpx;
  font-size: 22rpx;
  line-height: 1.7;
  color: #94a3b8;
}

.result-btn {
  margin-top: 34rpx;
  width: 100%;
  height: 92rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #fde68a, #f59e0b);
}

.result-btn-text {
  font-size: 28rpx;
  font-weight: 700;
  color: #1f2937;
  letter-spacing: 1rpx;
}
</style>
