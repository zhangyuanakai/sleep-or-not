<template>
  <view class="wake-page">
    <view class="star-wrap">
      <StarField :count="18" />
    </view>
    <view class="warm-glow" />

    <NavBar theme="warm" title="">
      <template #right>
        <text v-if="isDemo" class="demo-chip">演示模式</text>
      </template>
    </NavBar>

    <view class="content">
      <view class="hero">
        <text class="hero-title">早安唤醒验证</text>
        <text class="hero-sub">每天按时醒来，领回今天的 ¥1.00</text>
      </view>

      <template v-if="log && !settled">
        <view class="captcha-card">
          <Captcha ref="captchaRef" v-model="inputValue" />
        </view>

        <view class="werun-card" hover-class="card-hover" @tap="onRefreshSteps">
          <view class="werun-icon">
            <text class="werun-icon-text">步</text>
          </view>
          <view class="werun-copy">
            <text class="werun-title">WeRun 步数检查</text>
            <text class="werun-desc" :class="stepClass">{{ stepText }}</text>
          </view>
          <view class="werun-chevron" />
        </view>

        <view class="window-note" :class="{ 'window-note--warn': !canUseWindow }">
          <view class="note-dot" />
          <text class="note-text">{{ windowNote }}</text>
        </view>

        <view class="actions">
          <view
            class="primary-btn"
            :class="{ 'primary-btn--disabled': !canVerify }"
            hover-class="primary-hover"
            @tap="onSubmit"
          >
            <text class="primary-text">
              {{ submitting ? '正在验证…' : '确认早安 · 领取今日退还 ¥1.00' }}
            </text>
          </view>
          <text class="footnote">点击图形可刷新验证码 · 验证仅用于确认你已清醒</text>
        </view>
      </template>

      <view v-else-if="settledInfo" class="settled-card" :class="`settled-card--${settledInfo.outcome}`">
        <view class="settled-icon">
          <text class="settled-icon-text">{{ settledInfo.icon }}</text>
        </view>
        <text class="settled-title">{{ settledInfo.title }}</text>
        <text class="settled-amount number-font">{{ settledInfo.amount }}</text>
        <text class="settled-desc">{{ settledInfo.desc }}</text>
        <view class="secondary-btn" hover-class="secondary-hover" @tap="goHome">
          <text class="secondary-text">返回挑战首页</text>
        </view>
      </view>

      <view v-else class="empty-card">
        <view class="empty-moon">
          <view class="empty-moon-shadow" />
        </view>
        <text class="empty-title">暂无需验证的守护记录</text>
        <text class="empty-desc">
          今晚在首页点击「我要睡了」开启守护，明早 06:30 - 08:30 再回来完成早安验证。
        </text>
        <view class="secondary-btn" hover-class="secondary-hover" @tap="goHome">
          <text class="secondary-text">返回挑战首页</text>
        </view>
      </view>
    </view>

    <view v-if="result" class="result-mask">
      <view class="result-card" :class="`result-card--${result.outcome}`">
        <view class="result-icon">
          <text class="result-icon-text">{{ resultIcon }}</text>
        </view>
        <text class="result-title">{{ resultTitle }}</text>
        <text class="result-amount number-font">{{ resultAmount }}</text>
        <text class="result-desc">{{ result.message }}</text>
        <view class="result-btn" hover-class="primary-hover" @tap="goHome">
          <text class="result-btn-text">返回挑战首页</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import Taro, { useDidShow, useLoad } from '@tarojs/taro'
import { computed, ref } from 'vue'

import Captcha from '@/components/Captcha.vue'
import NavBar from '@/components/NavBar.vue'
import StarField from '@/components/StarField.vue'
import { STEP_LIMIT, isOpenState, isTerminalState } from '@/constants'
import { fetchRunSteps, stopAmbient } from '@/services/wechat'
import {
  beginWake,
  clock,
  findLog,
  isCloud,
  notifyError,
  openLog,
  pendingWakeLog,
  refresh,
  verifyWakeup
} from '@/store'
import type { DailyLog, SettlementResult } from '@/types'
import { isInWakeWindow, toDateStr } from '@/utils/date'
import { errorMessage } from '@/utils/system'

interface CaptchaInstance {
  refresh: () => void
  validate: (input: string) => boolean
  getAnswer: () => string
}

interface WakeLoadOptions {
  logId?: string
  demo?: string
}

const logId = ref('')
const demoRequested = ref(false)
const inputValue = ref('')
const captchaRef = ref<CaptchaInstance | null>(null)
const steps = ref<number | null>(null)
const stepsLoading = ref(false)
const stepsError = ref('')
const submitting = ref(false)
const result = ref<SettlementResult | null>(null)

const isDemo = computed(() => demoRequested.value || !isCloud.value)

const log = computed<DailyLog | null>(() => {
  if (logId.value) return findLog(logId.value)
  return pendingWakeLog.value ?? (isDemo.value ? openLog.value : null)
})

const settled = computed(() => Boolean(log.value && isTerminalState(log.value.state)))

const inWindow = computed(() => isInWakeWindow(new Date(clock.now)))

const canUseWindow = computed(() => isDemo.value || inWindow.value)

const stepDelta = computed(() => {
  if (steps.value == null) return null
  const start = log.value?.startSteps
  if (start == null) return null
  return Math.max(0, steps.value - start)
})

const stepText = computed(() => {
  if (stepsLoading.value) return '正在读取微信运动步数…'
  if (stepsError.value) return stepsError.value
  if (steps.value == null) return '未获取到步数，点击重试'
  if (stepDelta.value == null) return `夜间步数：${steps.value} 步`
  return `夜间步数：${stepDelta.value} 步（${stepDelta.value <= STEP_LIMIT ? '达标' : '超标'}）`
})

const stepClass = computed(() => {
  if (stepsError.value) return 'werun-desc--error'
  if (steps.value == null || stepDelta.value == null) return 'werun-desc--muted'
  return stepDelta.value <= STEP_LIMIT ? 'werun-desc--ok' : 'werun-desc--error'
})

const windowNote = computed(() => {
  if (isDemo.value) return '演示模式 · 非唤醒时段也可体验完整验证流程'
  const current = log.value
  if (current && current.date >= toDateStr()) {
    return '这条守护记录需要在次日 06:30 - 08:30 完成验证'
  }
  if (!inWindow.value) return '当前不在唤醒时段（06:30 - 08:30）'
  return '验证时段 06:30 - 08:30 · 请在闹钟响起后完成验证'
})

const canVerify = computed(
  () =>
    Boolean(log.value && isOpenState(log.value.state)) &&
    inputValue.value.length === 4 &&
    steps.value != null &&
    canUseWindow.value &&
    !submitting.value
)

const settledInfo = computed(() => {
  const current = log.value
  if (!current || !isTerminalState(current.state)) return null
  if (current.state === 'STATE_3_SUCCESS') {
    return {
      outcome: 'success',
      icon: '✓',
      title: '这条守护已达标',
      amount: `+¥${current.refundAmount.toFixed(2)}`,
      desc: '早安验证已完成，今日返还已存入钱包。'
    }
  }
  if (current.state === 'STATE_3_LEAVE') {
    return {
      outcome: 'leave',
      icon: '¥',
      title: '这条守护已请假结算',
      amount: `+¥${current.refundAmount.toFixed(2)}`,
      desc: '已自动抵扣 1 次请假机会，今日仍退还 ¥1.00。'
    }
  }
  return {
    outcome: 'fail',
    icon: '×',
    title: '这条守护未达标',
    amount: '¥0.00',
    desc: '请假次数已用完，当日押金 ¥1.00 未退还。'
  }
})

const resultIcon = computed(() => {
  if (result.value?.outcome === 'success') return '✓'
  if (result.value?.outcome === 'leave') return '¥'
  return '×'
})

const resultTitle = computed(() => {
  if (result.value?.outcome === 'success') return '早安，今日已达标'
  if (result.value?.outcome === 'leave') return '已自动使用 1 次请假'
  return '今日未达标'
})

const resultAmount = computed(() => {
  const refund = result.value?.refund ?? 0
  return refund > 0 ? `+¥${refund.toFixed(2)}` : '¥0.00'
})

async function loadSteps(showTip = false): Promise<void> {
  if (stepsLoading.value) return
  stepsLoading.value = true
  stepsError.value = ''
  try {
    const resultSteps = await fetchRunSteps()
    steps.value = resultSteps.steps
    if (showTip) {
      void Taro.showToast({ title: '步数已更新', icon: 'none' })
    }
  } catch (error) {
    steps.value = null
    stepsError.value = errorMessage(error, '未获取到步数')
  } finally {
    stepsLoading.value = false
  }
}

function onRefreshSteps(): void {
  void loadSteps(true)
}

async function onSubmit(): Promise<void> {
  if (submitting.value) return
  const current = log.value
  if (!current || !isOpenState(current.state)) {
    void Taro.showToast({ title: '当前没有待验证的守护', icon: 'none' })
    return
  }
  if (!isDemo.value && !inWindow.value) {
    await Taro.showModal({
      title: '不在验证时段',
      content: '晨间唤醒验证时间为 06:30 - 08:30，请在闹钟响起后再来完成验证。',
      showCancel: false,
      confirmText: '知道了'
    })
    return
  }
  if (!isDemo.value && current.date >= toDateStr()) {
    await Taro.showModal({
      title: '还未到验证时间',
      content: '本记录需要等到次日 06:30 后才能验证。',
      showCancel: false,
      confirmText: '知道了'
    })
    return
  }
  if (inputValue.value.length !== 4) {
    void Taro.showToast({ title: '请输入 4 位验证码', icon: 'none' })
    return
  }
  if (!captchaRef.value?.validate(inputValue.value)) {
    void Taro.showToast({ title: '验证码不正确，已为你换一张', icon: 'none' })
    captchaRef.value?.refresh()
    inputValue.value = ''
    return
  }
  if (steps.value == null) {
    void Taro.showToast({ title: '未获取到步数，请点击步数卡片重试', icon: 'none' })
    return
  }

  submitting.value = true
  void Taro.showLoading({ title: '正在验证', mask: true })
  try {
    result.value = await verifyWakeup(current.id, steps.value)
  } catch (error) {
    notifyError(error, '早安验证失败')
    captchaRef.value?.refresh()
    inputValue.value = ''
  } finally {
    void Taro.hideLoading()
    submitting.value = false
  }
}

function goHome(): void {
  result.value = null
  void Taro.switchTab({ url: '/pages/index/index' })
}

async function prepare(): Promise<void> {
  try {
    await refresh()
  } catch {
    return
  }
  const current = log.value
  if (current && current.state === 'STATE_1_GUARDING') {
    try {
      await beginWake(current.id)
    } catch (error) {
      console.warn('[wake] 更新验证状态失败', error)
    }
  }
  await loadSteps()
}

useLoad((options: WakeLoadOptions) => {
  logId.value = options?.logId || ''
  demoRequested.value = options?.demo === '1'
  // 进入晨间验证时停止睡眠白噪音
  stopAmbient()
})

useDidShow(() => {
  void prepare()
})
</script>

<style>
.wake-page {
  position: relative;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  overflow-x: hidden;
  background:
    radial-gradient(circle at 50% 2%, rgba(254, 243, 199, 0.55), transparent 34%),
    linear-gradient(
      180deg,
      #f6c56b 0%,
      #eaa94c 22%,
      #cf8a49 36%,
      #6f5a5d 52%,
      #1c2a48 68%,
      #0f172a 84%,
      #0b1120 100%
    );
}

.star-wrap {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 46%;
  overflow: hidden;
  pointer-events: none;
  opacity: 0.8;
}

.warm-glow {
  position: absolute;
  top: -120rpx;
  left: 50%;
  width: 700rpx;
  height: 380rpx;
  margin-left: -350rpx;
  border-radius: 50%;
  background: rgba(255, 237, 190, 0.28);
  filter: blur(60rpx);
  pointer-events: none;
}

.demo-chip {
  padding: 8rpx 18rpx;
  border-radius: 999rpx;
  font-size: 19rpx;
  color: #7c2d12;
  background: rgba(255, 255, 255, 0.32);
  border: 1rpx solid rgba(255, 255, 255, 0.35);
}

.content {
  position: relative;
  z-index: 2;
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 20rpx 40rpx 40rpx;
}

.hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 26rpx;
}

.hero-title {
  font-size: 46rpx;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: 2rpx;
  text-shadow: 0 6rpx 28rpx rgba(120, 53, 15, 0.28);
}

.hero-sub {
  margin-top: 14rpx;
  font-size: 23rpx;
  color: rgba(255, 255, 255, 0.78);
  letter-spacing: 1rpx;
}

.captcha-card {
  margin-top: 46rpx;
  padding: 30rpx 28rpx 26rpx;
  border-radius: 32rpx;
  background: rgba(15, 23, 42, 0.84);
  border: 1rpx solid rgba(255, 255, 255, 0.12);
  box-shadow: 0 24rpx 60rpx rgba(8, 15, 30, 0.35);
  backdrop-filter: blur(18px);
}

.werun-card {
  margin-top: 24rpx;
  padding: 22rpx 24rpx;
  border-radius: 26rpx;
  display: flex;
  align-items: center;
  background: rgba(30, 41, 59, 0.72);
  border: 1rpx solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(12px);
}

.card-hover {
  opacity: 0.88;
}

.werun-icon {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background: linear-gradient(145deg, #34d399, #10b981);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 20rpx rgba(16, 185, 129, 0.25);
  flex-shrink: 0;
}

.werun-icon-text {
  font-size: 26rpx;
  font-weight: 700;
  color: #ecfdf5;
}

.werun-copy {
  flex: 1;
  display: flex;
  flex-direction: column;
  margin-left: 20rpx;
}

.werun-title {
  font-size: 25rpx;
  font-weight: 600;
  color: #e2e8f0;
}

.werun-desc {
  margin-top: 7rpx;
  font-size: 21rpx;
  color: #94a3b8;
}

.werun-desc--ok {
  color: #34d399;
}

.werun-desc--error {
  color: #f87171;
}

.werun-desc--muted {
  color: #94a3b8;
}

.werun-chevron {
  width: 14rpx;
  height: 14rpx;
  border-right: 3rpx solid rgba(148, 163, 184, 0.6);
  border-top: 3rpx solid rgba(148, 163, 184, 0.6);
  transform: rotate(45deg);
  margin-right: 6rpx;
}

.window-note {
  margin-top: 20rpx;
  padding: 0 8rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.note-dot {
  width: 10rpx;
  height: 10rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.55);
  margin-right: 12rpx;
}

.note-text {
  font-size: 20rpx;
  color: rgba(255, 255, 255, 0.7);
  letter-spacing: 0.5rpx;
}

.window-note--warn .note-dot {
  background: #fbbf24;
}

.window-note--warn .note-text {
  color: #fde68a;
}

.actions {
  margin-top: auto;
  padding-top: 46rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.primary-btn {
  width: 100%;
  height: 100rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #fff3d1 0%, #fde68a 45%, #fbbf24 100%);
  box-shadow: 0 18rpx 45rpx rgba(245, 158, 11, 0.3);
}

.primary-btn--disabled {
  opacity: 0.5;
  box-shadow: none;
}

.primary-hover {
  transform: scale(0.985);
  opacity: 0.92;
}

.primary-text {
  font-size: 29rpx;
  font-weight: 700;
  color: #3b2508;
  letter-spacing: 0.5rpx;
}

.footnote {
  margin-top: 20rpx;
  font-size: 19rpx;
  color: rgba(255, 255, 255, 0.45);
  letter-spacing: 0.5rpx;
}

.settled-card,
.empty-card {
  margin-top: 50rpx;
  padding: 46rpx 36rpx 38rpx;
  border-radius: 34rpx;
  background: rgba(15, 23, 42, 0.82);
  border: 1rpx solid rgba(255, 255, 255, 0.1);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  backdrop-filter: blur(16px);
}

.settled-icon {
  width: 116rpx;
  height: 116rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(16, 185, 129, 0.12);
  border: 1rpx solid rgba(16, 185, 129, 0.3);
}

.settled-card--leave .settled-icon {
  background: rgba(245, 158, 11, 0.12);
  border-color: rgba(245, 158, 11, 0.3);
}

.settled-card--fail .settled-icon {
  background: rgba(239, 68, 68, 0.12);
  border-color: rgba(239, 68, 68, 0.3);
}

.settled-icon-text {
  font-size: 50rpx;
  font-weight: 700;
  color: #34d399;
}

.settled-card--leave .settled-icon-text {
  color: #fbbf24;
}

.settled-card--fail .settled-icon-text {
  color: #f87171;
}

.settled-title {
  margin-top: 24rpx;
  font-size: 32rpx;
  font-weight: 700;
  color: #f8fafc;
}

.settled-amount {
  margin-top: 14rpx;
  font-size: 54rpx;
  font-weight: 700;
  color: #34d399;
  font-family: var(--font-display);
}

.settled-card--leave .settled-amount {
  color: #fbbf24;
}

.settled-card--fail .settled-amount {
  color: #f87171;
}

.settled-desc {
  margin-top: 14rpx;
  font-size: 22rpx;
  line-height: 1.7;
  color: #94a3b8;
}

.secondary-btn {
  margin-top: 34rpx;
  width: 100%;
  height: 90rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.08);
  border: 1rpx solid rgba(255, 255, 255, 0.12);
}

.secondary-hover {
  background: rgba(255, 255, 255, 0.14);
}

.secondary-text {
  font-size: 27rpx;
  font-weight: 600;
  color: #cbd5e1;
}

.empty-moon {
  width: 110rpx;
  height: 110rpx;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #f8fafc, #cbd5e1 60%, #94a3b8);
  position: relative;
  overflow: hidden;
  box-shadow: 0 0 50rpx rgba(226, 232, 240, 0.2);
}

.empty-moon-shadow {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: radial-gradient(circle at 30% 30%, transparent 35%, rgba(15, 23, 42, 0.75) 100%);
}

.empty-title {
  margin-top: 26rpx;
  font-size: 30rpx;
  font-weight: 700;
  color: #e2e8f0;
}

.empty-desc {
  margin-top: 14rpx;
  font-size: 22rpx;
  line-height: 1.7;
  color: #64748b;
}

.result-mask {
  position: fixed;
  inset: 0;
  z-index: 30;
  background: rgba(3, 7, 18, 0.8);
  backdrop-filter: blur(12px);
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
  margin-top: 16rpx;
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
}
</style>
