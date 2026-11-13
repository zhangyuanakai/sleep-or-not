<template>
  <view class="home-page">
    <StarField :count="30" />
    <view class="moon-deco moon-a" />
    <view class="moon-deco moon-b" />

    <view class="safe-top" :style="{ height: `${statusBarHeight}px` }" />

    <view class="topbar" :style="{ paddingRight: `${menuSafeRight}px` }">
      <view class="day-badge">
        <view class="day-dot" :class="{ 'day-dot--done': phase === 'completed' }" />
        <text class="day-text">{{ badgeText }}</text>
      </view>
      <view class="settings-btn" hover-class="settings-hover" @tap="openSettings">
        <view class="dot-column">
          <view class="dot" />
          <view class="dot" />
          <view class="dot" />
        </view>
      </view>
    </view>

    <view class="content">
      <view class="title-block">
        <text class="page-title">{{
          phase === 'completed' ? '22天挑战已完成' : '22天早睡习惯挑战'
        }}</text>
        <text class="page-subtitle">{{ subtitle }}</text>
      </view>

      <template v-if="phase === 'loading'">
        <view class="loading-hero">
          <view class="loading-orb" />
          <text class="loading-text">正在读取你的契约…</text>
        </view>
      </template>

      <template v-else-if="phase === 'none'">
        <view class="intro-card">
          <view class="coin">
            <text class="coin-symbol">¥</text>
            <text class="coin-amount">22</text>
          </view>
          <text class="intro-title">用 22 元契约，赎回你的深度睡眠</text>
          <text class="intro-sub">22 天习惯养成 · 每日返还 ¥1.00 · 完赛解锁 ¥6.66</text>
          <view class="rule-list">
            <view v-for="(rule, index) in rules" :key="rule.title" class="rule-item">
              <text class="rule-index">0{{ index + 1 }}</text>
              <view class="rule-copy">
                <text class="rule-title">{{ rule.title }}</text>
                <text class="rule-desc">{{ rule.desc }}</text>
              </view>
            </view>
          </view>
        </view>
      </template>

      <template v-else-if="phase === 'pending'">
        <view class="pending-card">
          <view class="pending-ring">
            <view class="pending-dot" />
          </view>
          <text class="pending-title">报名已提交，等待人工核验</text>
          <text class="pending-desc">
            内测期请添加发起人微信并转账 ¥{{ depositLabel }}，备注你的微信号。核验通过后，今晚即可开启第 1 天契约。
          </text>
          <view class="pending-steps">
            <view class="pending-step">
              <text class="step-num">1</text>
              <text class="step-text">添加发起人微信并转账</text>
            </view>
            <view class="pending-step">
              <text class="step-num">2</text>
              <text class="step-text">备注微信号，等待人工核验</text>
            </view>
            <view class="pending-step">
              <text class="step-num">3</text>
              <text class="step-text">激活后回到首页开启守护</text>
            </view>
          </view>
        </view>
      </template>

      <template v-else-if="phase === 'completed'">
        <view class="complete-card">
          <view class="medal">
            <text class="medal-check">✓</text>
          </view>
          <text class="complete-title">契约达成</text>
          <text class="complete-sub">你用 22 个夜晚，认真赎回了一次深度睡眠</text>
          <view class="complete-stats">
            <view class="complete-stat">
              <text class="stat-value number-font">¥{{ formatMoney(refundedTotal) }}</text>
              <text class="stat-label">累计退还</text>
            </view>
            <view class="stat-divider" />
            <view class="complete-stat">
              <text class="stat-value number-font">{{ successCount }}</text>
              <text class="stat-label">达标天数</text>
            </view>
            <view class="stat-divider" />
            <view class="complete-stat">
              <text class="stat-value number-font">{{ leaveCount }}</text>
              <text class="stat-label">请假次数</text>
            </view>
          </view>
          <view class="bonus-strip" :class="{ 'bonus-strip--lost': bonusStatus === 'LOST' }">
            <text class="bonus-strip-label">完赛红包</text>
            <text class="bonus-strip-value">¥6.66</text>
            <text class="bonus-strip-state">{{ bonusLabel }}</text>
          </view>
        </view>
      </template>

      <template v-else>
        <view class="ring-wrap">
          <ProgressRing :progress="ringProgress" :size="520" :color="ringColor">
            <text class="ring-label">距离今晚入睡目标</text>
            <text class="ring-time number-font">{{ targetTime }}</text>
            <text class="ring-countdown">{{ countdownLabel }}</text>
          </ProgressRing>
        </view>

        <view class="meta-pill">
          <text class="meta-text">已存押金 ¥{{ depositLabel }}</text>
          <text class="meta-divider">|</text>
          <text class="meta-text">剩余请假 {{ leaveRemaining }}/3 次</text>
        </view>

        <view v-if="pendingWake" class="wake-banner" hover-class="banner-hover" @tap="goWake()">
          <view class="wake-icon">
            <view class="wake-sun" />
          </view>
          <view class="wake-copy">
            <text class="wake-title">晨间唤醒待验证</text>
            <text class="wake-desc">完成 4 位图形验证，领回今日 ¥1.00</text>
          </view>
          <view class="wake-action">去验证</view>
        </view>

        <view v-if="todayResult" class="result-banner" :class="`result-banner--${todayResult}`">
          <text class="result-title">{{ resultTitle }}</text>
          <text class="result-desc">{{ resultDesc }}</text>
        </view>

        <view class="actions">
          <view
            class="primary-btn"
            :class="{
              'primary-btn--disabled': primaryDisabled,
              'primary-btn--guard': isGuarding
            }"
            hover-class="primary-hover"
            @tap="onPrimary"
          >
            <text class="primary-text">{{ primaryText }}</text>
          </view>

          <text v-if="canLeave" class="sub-action" @tap="onLeave">今晚使用请假特权</text>
          <text v-else-if="leaveHint" class="sub-action sub-action--muted">{{ leaveHint }}</text>

          <text class="footnote">
            今晚 {{ targetTime }} 前开始守护，晨间验证后返还 ¥1.00
          </text>
        </view>
      </template>

      <view v-if="phase === 'none'" class="actions actions--intro">
        <view class="primary-btn" hover-class="primary-hover" @tap="goEnroll">
          <text class="primary-text">缴纳 ¥{{ depositLabel }} 开启挑战</text>
        </view>
        <text class="footnote">内测期人工核验 · 30 个种子名额</text>
      </view>

      <view v-if="phase === 'pending'" class="actions actions--intro">
        <view class="primary-btn primary-btn--disabled" hover-class="none" @tap="showPendingHelp">
          <text class="primary-text">等待人工核验</text>
        </view>
        <text class="footnote">核验通常在 5 分钟内完成</text>
      </view>

      <view v-if="phase === 'completed'" class="actions actions--intro">
        <view class="primary-btn" hover-class="primary-hover" @tap="goWallet">
          <text class="primary-text">查看 22 天战绩</text>
        </view>
        <text class="sub-action" @tap="goEnroll">开启新一期 22 天契约</text>
        <text class="footnote">本期已结束 · 完赛红包与押金可在战绩页提现</text>
      </view>
    </view>

    <view v-if="showSettings" class="sheet-mask" @tap="showSettings = false">
      <view class="sheet" @tap.stop>
        <view class="sheet-handle" />
        <text class="sheet-title">挑战设置</text>

        <view class="sheet-row">
          <view class="row-copy">
            <text class="row-label">每日目标入睡时间</text>
            <text class="row-note">当天开始守护后不可修改</text>
          </view>
          <Picker mode="time" :value="settingsTime" @change="onTimeChange">
            <view class="time-picker">
              <text class="time-value number-font">{{ settingsTime }}</text>
              <view class="chevron-sm" />
            </view>
          </Picker>
        </view>

        <view class="sheet-row">
          <view class="row-copy">
            <text class="row-label">数据模式</text>
            <text class="row-note">{{
              isCloud ? '数据已同步至微信云开发' : '数据仅保存在本机，可随时重置'
            }}</text>
          </view>
          <text class="mode-chip" :class="{ 'mode-chip--cloud': isCloud }">
            {{ isCloud ? '云端' : '本地演示' }}
          </text>
        </view>

        <view v-if="!isCloud" class="sheet-secondary" hover-class="sheet-secondary-hover" @tap="onClearDemo">
          体验报名流程（清空当前进度）
        </view>

        <view v-if="!isCloud" class="sheet-danger" hover-class="sheet-danger-hover" @tap="onResetDemo">
          重置演示数据
        </view>

        <view class="sheet-close" hover-class="sheet-close-hover" @tap="showSettings = false">
          完成
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import Taro, { useDidShow, useShareAppMessage } from '@tarojs/taro'
import { computed, ref } from 'vue'

import ProgressRing from '@/components/ProgressRing.vue'
import StarField from '@/components/StarField.vue'
import { CHALLENGE_DAYS, DEFAULT_TARGET_TIME, DEPOSIT_AMOUNT } from '@/constants'
import { maybeAutoOpenWake } from '@/services/wakePrompt'
import {
  bonusLabel,
  bonusStatus,
  challenge,
  clearDemo,
  countdownMs,
  currentDay,
  guardingLog,
  isCloud,
  leaveCount,
  notifyError,
  openLog,
  pendingWakeLog,
  phase,
  refundedTotal,
  requestLeave,
  resetDemo,
  ringProgress,
  startSleep,
  successCount,
  todayResult,
  updateTargetTime
} from '@/store'
import { formatDuration, formatMoney } from '@/utils/date'
import { menuSafeRight, statusBarHeight } from '@/utils/system'

const showSettings = ref(false)
const settingsTime = ref(DEFAULT_TARGET_TIME)
const submitting = ref(false)
const leaving = ref(false)
const depositLabel = formatMoney(DEPOSIT_AMOUNT)

const rules = [
  {
    title: '22 天契约周期',
    desc: '每日按时入睡并完成晨间验证，返还 ¥1.00'
  },
  {
    title: '3 次免死金牌',
    desc: '突发加班或社交可请假，当天照常退还'
  },
  {
    title: '三重守护',
    desc: '切屏 90 秒 / 夜间 50 步 / 图形验证码'
  }
]

const badgeText = computed(() => {
  if (!challenge.value) return '22 天契约'
  if (challenge.value.status === 'PENDING_VERIFICATION') return '待人工核验'
  if (challenge.value.status === 'COMPLETED') return '本期已完赛'
  return `第 ${currentDay.value} / ${CHALLENGE_DAYS} 天`
})

const subtitle = computed(() => {
  if (phase.value === 'loading') return '正在读取契约数据'
  if (!challenge.value) return '用一份小契约，换回规律的睡眠'
  if (challenge.value.status === 'PENDING_VERIFICATION') return '报名已提交 · 等待发起人核验'
  if (challenge.value.status === 'COMPLETED') return `累计退还 ¥${formatMoney(refundedTotal.value)} · 感谢认真睡觉的每一天`
  return `第 ${currentDay.value} 天 · 距离完赛还有 ${Math.max(0, CHALLENGE_DAYS - currentDay.value)} 天`
})

const targetTime = computed(() => challenge.value?.targetSleepTime || DEFAULT_TARGET_TIME)
const leaveRemaining = computed(() => challenge.value?.leaveRemaining ?? 0)
const pendingWake = computed(() => pendingWakeLog.value)
const isGuarding = computed(() => Boolean(guardingLog.value))

const countdownLabel = computed(() => {
  if (primaryIsAwaiting.value) return '守护已完成，等待晨间验证'
  if (countdownMs.value <= 0) return '已到入睡时间，现在开始守护吧'
  return `还剩 ${formatDuration(countdownMs.value)}`
})

const ringColor = computed(() => {
  if (todayResult.value === 'success') return '#10B981'
  if (todayResult.value === 'fail') return '#EF4444'
  return '#F59E0B'
})

const primaryIsAwaiting = computed(() => {
  const log = openLog.value
  return Boolean(log && log.state === 'STATE_2_AWAITING_WAKE' && log.date >= todayStr())
})

const primaryText = computed(() => {
  if (submitting.value) return '守护启动中…'
  if (phase.value === 'completed') return '查看 22 天战绩'
  if (phase.value === 'pending') return '等待人工核验'
  if (phase.value === 'none') return `缴纳 ¥${depositLabel} 开启挑战`
  if (todayResult.value === 'success') return '今日已达标 · +¥1.00'
  if (todayResult.value === 'leave') return '今日已请假 · +¥1.00'
  if (todayResult.value === 'fail') return '今日未达标'
  if (pendingWake.value) return '前往晨间验证'
  if (isGuarding.value) return '返回睡眠守护'
  if (primaryIsAwaiting.value) return '前往晨间验证'
  return '我要睡了'
})

const primaryDisabled = computed(() => {
  if (submitting.value) return true
  if (phase.value === 'completed' || phase.value === 'pending') return true
  return Boolean(todayResult.value)
})

const canLeave = computed(() => {
  const current = challenge.value
  if (!current || current.status !== 'ACTIVE') return false
  if (todayResult.value || guardingLog.value) return false
  return current.leaveRemaining > 0
})

const leaveHint = computed(() => {
  const current = challenge.value
  if (!current || current.status !== 'ACTIVE') return ''
  if (current.leaveRemaining <= 0) return '请假次数已用完'
  if (todayResult.value) return '今日已结算'
  if (guardingLog.value) return '守护中不可请假'
  return ''
})

const resultTitle = computed(() => {
  if (todayResult.value === 'success') return '今日已达标'
  if (todayResult.value === 'leave') return '今日已使用请假'
  return '今日未达标'
})

const resultDesc = computed(() => {
  if (todayResult.value === 'success') return '晨间验证完成，¥1.00 已退还至钱包'
  if (todayResult.value === 'leave') return '免死金牌已消耗，今日仍退还 ¥1.00'
  return '今日押金 ¥1.00 未退还，明天继续加油'
})

// 用于判断“待唤醒”是否为今晚这条（演示模式同日验证）
function todayStr(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')}`
}

function openSettings(): void {
  settingsTime.value = challenge.value?.targetSleepTime || DEFAULT_TARGET_TIME
  showSettings.value = true
}

async function onTimeChange(event: { detail: { value: string } }): Promise<void> {
  const next = event.detail.value
  const previous = settingsTime.value
  settingsTime.value = next
  try {
    await updateTargetTime(next)
    void Taro.showToast({ title: '目标入睡时间已更新', icon: 'none' })
  } catch (error) {
    settingsTime.value = previous
    notifyError(error)
  }
}

async function onClearDemo(): Promise<void> {
  const modal = await Taro.showModal({
    title: '体验报名流程？',
    content: '将清空当前演示进度，回到未报名状态。',
    confirmText: '清空体验',
    confirmColor: '#F59E0B'
  })
  if (!modal.confirm) return
  try {
    await clearDemo()
    showSettings.value = false
    void Taro.showToast({ title: '已回到未报名状态', icon: 'none' })
  } catch (error) {
    notifyError(error)
  }
}

async function onResetDemo(): Promise<void> {
  const modal = await Taro.showModal({
    title: '重置演示数据？',
    content: '将恢复到第 14 天的演示进度，当前本机打卡记录会被清空。',
    confirmText: '重置',
    confirmColor: '#EF4444'
  })
  if (!modal.confirm) return
  try {
    await resetDemo()
    showSettings.value = false
    void Taro.showToast({ title: '演示数据已重置', icon: 'success' })
  } catch (error) {
    notifyError(error)
  }
}

function showPendingHelp(): void {
  void Taro.showModal({
    title: '等待人工核验',
    content: '内测期请添加发起人微信，转账 ¥22 并备注你的微信号。开发者核对后会将你激活，通常不超过 5 分钟。',
    showCancel: false,
    confirmText: '知道了'
  })
}

function goEnroll(): void {
  void Taro.navigateTo({ url: '/pages/enroll/index' })
}

function goWallet(): void {
  void Taro.switchTab({ url: '/pages/wallet/index' })
}

function goSleep(logId: string): void {
  void Taro.navigateTo({ url: `/pages/sleep/index?logId=${logId}` })
}

function goWake(): void {
  const log = pendingWake.value
  if (!log) return
  void Taro.navigateTo({ url: `/pages/wake/index?logId=${log.id}` })
}

async function onPrimary(): Promise<void> {
  if (submitting.value) return
  if (phase.value === 'none') {
    goEnroll()
    return
  }
  if (phase.value === 'pending') {
    showPendingHelp()
    return
  }
  if (phase.value === 'completed') {
    goWallet()
    return
  }
  if (todayResult.value) {
    void Taro.showToast({ title: '今日已经完成结算', icon: 'none' })
    return
  }
  if (pendingWake.value) {
    goWake()
    return
  }
  if (guardingLog.value) {
    goSleep(guardingLog.value.id)
    return
  }
  const awaiting = openLog.value
  if (primaryIsAwaiting.value && awaiting) {
    void Taro.navigateTo({ url: `/pages/wake/index?logId=${awaiting.id}` })
    return
  }

  submitting.value = true
  void Taro.showLoading({ title: '正在开启守护', mask: true })
  try {
    const log = await startSleep()
    goSleep(log.id)
  } catch (error) {
    notifyError(error, '开启守护失败')
  } finally {
    void Taro.hideLoading()
    submitting.value = false
  }
}

async function onLeave(): Promise<void> {
  if (leaving.value) return
  const current = challenge.value
  if (!current) return
  const modal = await Taro.showModal({
    title: '确定使用请假特权？',
    content: `本周期内还剩 ${current.leaveRemaining} 次请假机会，消耗当天仍可退还 ¥1.00。`,
    confirmText: '确认请假',
    cancelText: '再想想'
  })
  if (!modal.confirm) return

  leaving.value = true
  void Taro.showLoading({ title: '正在提交请假', mask: true })
  try {
    const result = await requestLeave()
    await Taro.showModal({
      title: '请假成功',
      content: result.message,
      showCancel: false,
      confirmText: '好的'
    })
  } catch (error) {
    notifyError(error)
  } finally {
    void Taro.hideLoading()
    leaving.value = false
  }
}

useDidShow(() => {
  void maybeAutoOpenWake()
})

useShareAppMessage(() => ({
  title: '用 22 元契约，赎回你的深度睡眠',
  path: '/pages/index/index'
}))
</script>

<style>
.home-page {
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  padding-bottom: 32rpx;
  background:
    radial-gradient(circle at 12% 8%, rgba(99, 102, 241, 0.16), transparent 42%),
    radial-gradient(circle at 88% 18%, rgba(245, 158, 11, 0.12), transparent 38%),
    linear-gradient(180deg, #0b1120 0%, #0f172a 48%, #162038 100%);
  overflow-x: hidden;
}

.moon-deco {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
  z-index: 0;
  background: radial-gradient(
    circle at 36% 32%,
    rgba(253, 230, 138, 0.95) 0%,
    rgba(245, 158, 11, 0.35) 42%,
    rgba(245, 158, 11, 0) 70%
  );
}

.moon-a {
  width: 300rpx;
  height: 300rpx;
  top: -90rpx;
  left: -100rpx;
  opacity: 0.5;
  filter: blur(4rpx);
}

.moon-b {
  width: 200rpx;
  height: 200rpx;
  top: 210rpx;
  right: -80rpx;
  opacity: 0.22;
  filter: blur(6rpx);
}

.safe-top {
  position: relative;
  z-index: 2;
}

.topbar {
  position: relative;
  z-index: 3;
  height: 88rpx;
  padding: 0 36rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

.day-badge {
  display: flex;
  align-items: center;
  padding: 12rpx 26rpx;
  border-radius: 999rpx;
  background: rgba(30, 41, 59, 0.62);
  border: 1rpx solid rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(12px);
}

.day-dot {
  width: 14rpx;
  height: 14rpx;
  border-radius: 50%;
  margin-right: 14rpx;
  background: #f59e0b;
  box-shadow: 0 0 14rpx rgba(245, 158, 11, 0.9);
}

.day-dot--done {
  background: #10b981;
  box-shadow: 0 0 14rpx rgba(16, 185, 129, 0.9);
}

.day-text {
  font-size: 25rpx;
  color: #cbd5e1;
  font-weight: 500;
  letter-spacing: 0.5rpx;
}

.settings-btn {
  width: 68rpx;
  height: 68rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(30, 41, 59, 0.45);
  border: 1rpx solid rgba(255, 255, 255, 0.06);
}

.settings-hover {
  background: rgba(30, 41, 59, 0.8);
}

.dot-column {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.dot {
  width: 7rpx;
  height: 7rpx;
  border-radius: 50%;
  background: #94a3b8;
}

.content {
  position: relative;
  z-index: 2;
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 10rpx 40rpx 0;
}

.title-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 18rpx;
}

.page-title {
  font-size: 42rpx;
  font-weight: 700;
  color: #f8fafc;
  letter-spacing: 1rpx;
  text-shadow: 0 6rpx 30rpx rgba(0, 0, 0, 0.35);
}

.page-subtitle {
  margin-top: 14rpx;
  font-size: 24rpx;
  color: #94a3b8;
  letter-spacing: 0.5rpx;
}

.loading-hero {
  flex: 1;
  min-height: 620rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 30rpx;
}

.loading-orb {
  width: 90rpx;
  height: 90rpx;
  border-radius: 50%;
  border: 4rpx solid rgba(245, 158, 11, 0.2);
  border-top-color: #f59e0b;
  animation: spin 1.1s linear infinite;
}

.loading-text {
  font-size: 25rpx;
  color: #94a3b8;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.ring-wrap {
  display: flex;
  justify-content: center;
  margin-top: 40rpx;
}

.ring-label {
  font-size: 23rpx;
  color: #94a3b8;
  letter-spacing: 1rpx;
}

.ring-time {
  margin-top: 8rpx;
  font-size: 94rpx;
  line-height: 1.05;
  font-weight: 700;
  color: #f8fafc;
  letter-spacing: 2rpx;
  text-shadow: 0 8rpx 34rpx rgba(0, 0, 0, 0.45);
}

.ring-countdown {
  margin-top: 14rpx;
  font-size: 23rpx;
  color: #fcd34d;
  letter-spacing: 0.5rpx;
}

.meta-pill {
  align-self: center;
  display: flex;
  align-items: center;
  margin-top: 36rpx;
  padding: 14rpx 30rpx;
  border-radius: 999rpx;
  background: rgba(30, 41, 59, 0.55);
  border: 1rpx solid rgba(255, 255, 255, 0.07);
}

.meta-text {
  font-size: 23rpx;
  color: #cbd5e1;
  letter-spacing: 0.5rpx;
}

.meta-divider {
  margin: 0 18rpx;
  font-size: 20rpx;
  color: rgba(148, 163, 184, 0.35);
}

.wake-banner {
  margin-top: 28rpx;
  padding: 22rpx 26rpx;
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.18), rgba(245, 158, 11, 0.06));
  border: 1rpx solid rgba(245, 158, 11, 0.35);
}

.banner-hover {
  opacity: 0.85;
}

.wake-icon {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background: rgba(245, 158, 11, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.wake-sun {
  width: 26rpx;
  height: 26rpx;
  border-radius: 50%;
  background: #fbbf24;
  box-shadow: 0 0 18rpx rgba(251, 191, 36, 0.9);
}

.wake-copy {
  flex: 1;
  display: flex;
  flex-direction: column;
  margin-left: 20rpx;
}

.wake-title {
  font-size: 26rpx;
  color: #fde68a;
  font-weight: 600;
}

.wake-desc {
  margin-top: 6rpx;
  font-size: 21rpx;
  color: rgba(253, 230, 138, 0.65);
}

.wake-action {
  padding: 10rpx 20rpx;
  border-radius: 999rpx;
  background: #f59e0b;
  color: #1f2937;
  font-size: 22rpx;
  font-weight: 600;
}

.result-banner {
  margin-top: 28rpx;
  padding: 22rpx 28rpx;
  border-radius: 24rpx;
  display: flex;
  flex-direction: column;
  border: 1rpx solid transparent;
}

.result-banner--success {
  background: rgba(16, 185, 129, 0.1);
  border-color: rgba(16, 185, 129, 0.28);
}

.result-banner--leave {
  background: rgba(245, 158, 11, 0.1);
  border-color: rgba(245, 158, 11, 0.28);
}

.result-banner--fail {
  background: rgba(239, 68, 68, 0.1);
  border-color: rgba(239, 68, 68, 0.28);
}

.result-title {
  font-size: 26rpx;
  font-weight: 600;
  color: #f8fafc;
}

.result-desc {
  margin-top: 8rpx;
  font-size: 22rpx;
  color: #94a3b8;
}

.actions {
  margin-top: auto;
  padding-top: 44rpx;
  padding-bottom: 12rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.actions--intro {
  padding-top: 32rpx;
}

.primary-btn {
  width: 100%;
  height: 104rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #fde68a 0%, #f59e0b 100%);
  box-shadow: 0 16rpx 40rpx rgba(245, 158, 11, 0.28);
  transition: transform 0.15s ease;
}

.primary-btn--guard {
  background: linear-gradient(135deg, #818cf8 0%, #6366f1 100%);
  box-shadow: 0 16rpx 40rpx rgba(99, 102, 241, 0.32);
}

.primary-btn--guard .primary-text {
  color: #f8fafc;
}

.primary-btn--disabled {
  background: rgba(51, 65, 85, 0.6);
  box-shadow: none;
}

.primary-btn--disabled .primary-text {
  color: rgba(203, 213, 225, 0.55);
}

.primary-hover {
  transform: scale(0.985);
  opacity: 0.92;
}

.primary-text {
  font-size: 33rpx;
  font-weight: 700;
  color: #1f2937;
  letter-spacing: 2rpx;
}

.sub-action {
  margin-top: 28rpx;
  font-size: 25rpx;
  color: #94a3b8;
  text-decoration: underline;
  text-underline-offset: 6rpx;
}

.sub-action--muted {
  color: rgba(148, 163, 184, 0.45);
  text-decoration: none;
}

.footnote {
  margin-top: 22rpx;
  font-size: 20rpx;
  color: rgba(148, 163, 184, 0.5);
  letter-spacing: 0.5rpx;
  text-align: center;
}

.intro-card,
.pending-card,
.complete-card {
  margin-top: 34rpx;
  padding: 40rpx 32rpx;
  border-radius: 34rpx;
  background: rgba(30, 41, 59, 0.55);
  border: 1rpx solid rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(16px);
  box-shadow: 0 20rpx 60rpx rgba(0, 0, 0, 0.25);
}

.intro-card {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.coin {
  width: 150rpx;
  height: 150rpx;
  border-radius: 50%;
  display: flex;
  align-items: baseline;
  justify-content: center;
  padding-top: 40rpx;
  background: radial-gradient(circle at 35% 30%, #fde68a, #f59e0b 68%);
  box-shadow: 0 0 50rpx rgba(245, 158, 11, 0.35);
  color: #1f2937;
}

.coin-symbol {
  font-size: 30rpx;
  font-weight: 700;
  margin-right: 4rpx;
}

.coin-amount {
  font-size: 66rpx;
  font-weight: 800;
  line-height: 1;
  font-family: var(--font-display);
}

.intro-title {
  margin-top: 30rpx;
  font-size: 32rpx;
  font-weight: 700;
  color: #f8fafc;
  text-align: center;
}

.intro-sub {
  margin-top: 14rpx;
  font-size: 22rpx;
  color: #94a3b8;
  text-align: center;
  line-height: 1.6;
}

.rule-list {
  width: 100%;
  margin-top: 34rpx;
  display: flex;
  flex-direction: column;
  gap: 22rpx;
}

.rule-item {
  display: flex;
  align-items: flex-start;
  padding: 18rpx 22rpx;
  border-radius: 20rpx;
  background: rgba(15, 23, 42, 0.5);
}

.rule-index {
  font-family: var(--font-display);
  font-size: 26rpx;
  font-weight: 700;
  color: #f59e0b;
  margin-right: 20rpx;
  margin-top: 2rpx;
}

.rule-copy {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.rule-title {
  font-size: 25rpx;
  color: #e2e8f0;
  font-weight: 600;
}

.rule-desc {
  margin-top: 6rpx;
  font-size: 21rpx;
  color: #94a3b8;
  line-height: 1.5;
}

.pending-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 60rpx;
}

.pending-ring {
  width: 130rpx;
  height: 130rpx;
  border-radius: 50%;
  border: 2rpx dashed rgba(245, 158, 11, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
}

.pending-dot {
  width: 46rpx;
  height: 46rpx;
  border-radius: 50%;
  background: #f59e0b;
  box-shadow: 0 0 30rpx rgba(245, 158, 11, 0.7);
  animation: pendingPulse 2.2s ease-in-out infinite;
}

@keyframes pendingPulse {
  0%,
  100% {
    transform: scale(0.9);
    opacity: 0.7;
  }

  50% {
    transform: scale(1.08);
    opacity: 1;
  }
}

.pending-title {
  margin-top: 28rpx;
  font-size: 32rpx;
  font-weight: 700;
  color: #f8fafc;
}

.pending-desc {
  margin-top: 16rpx;
  font-size: 23rpx;
  line-height: 1.7;
  color: #94a3b8;
  text-align: center;
}

.pending-steps {
  width: 100%;
  margin-top: 30rpx;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.pending-step {
  display: flex;
  align-items: center;
  padding: 16rpx 22rpx;
  border-radius: 18rpx;
  background: rgba(15, 23, 42, 0.5);
}

.step-num {
  width: 36rpx;
  height: 36rpx;
  border-radius: 50%;
  background: rgba(245, 158, 11, 0.16);
  color: #fbbf24;
  font-size: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 18rpx;
}

.step-text {
  font-size: 23rpx;
  color: #cbd5e1;
}

.complete-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 48rpx;
  background:
    radial-gradient(circle at 50% 0%, rgba(16, 185, 129, 0.16), transparent 60%),
    rgba(30, 41, 59, 0.55);
}

.medal {
  width: 132rpx;
  height: 132rpx;
  border-radius: 50%;
  border: 2rpx solid rgba(16, 185, 129, 0.4);
  background: rgba(16, 185, 129, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 40rpx rgba(16, 185, 129, 0.2);
}

.medal-check {
  font-size: 60rpx;
  color: #34d399;
  font-weight: 700;
}

.complete-title {
  margin-top: 22rpx;
  font-size: 38rpx;
  font-weight: 700;
  color: #f8fafc;
}

.complete-sub {
  margin-top: 12rpx;
  font-size: 23rpx;
  color: #94a3b8;
}

.complete-stats {
  width: 100%;
  margin-top: 34rpx;
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding: 24rpx 0;
  border-radius: 22rpx;
  background: rgba(15, 23, 42, 0.5);
}

.complete-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-value {
  font-size: 36rpx;
  font-weight: 700;
  color: #f8fafc;
}

.stat-label {
  margin-top: 8rpx;
  font-size: 20rpx;
  color: #94a3b8;
}

.stat-divider {
  width: 1rpx;
  height: 52rpx;
  background: rgba(255, 255, 255, 0.08);
}

.bonus-strip {
  width: 100%;
  margin-top: 22rpx;
  display: flex;
  align-items: center;
  padding: 22rpx 24rpx;
  border-radius: 20rpx;
  background: rgba(245, 158, 11, 0.1);
  border: 1rpx solid rgba(245, 158, 11, 0.25);
}

.bonus-strip--lost {
  background: rgba(148, 163, 184, 0.08);
  border-color: rgba(148, 163, 184, 0.15);
}

.bonus-strip-label {
  font-size: 23rpx;
  color: #94a3b8;
}

.bonus-strip-value {
  margin-left: 16rpx;
  font-size: 32rpx;
  font-weight: 700;
  color: #fbbf24;
  font-family: var(--font-display);
}

.bonus-strip-state {
  margin-left: auto;
  font-size: 21rpx;
  color: #fcd34d;
}

.sheet-mask {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(3, 7, 18, 0.72);
  display: flex;
  align-items: flex-end;
}

.sheet {
  width: 100%;
  padding: 18rpx 36rpx calc(36rpx + env(safe-area-inset-bottom));
  border-radius: 38rpx 38rpx 0 0;
  background: #111c31;
  border-top: 1rpx solid rgba(255, 255, 255, 0.08);
  animation: sheetUp 0.24s ease-out;
}

@keyframes sheetUp {
  from {
    transform: translateY(40rpx);
    opacity: 0.6;
  }

  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.sheet-handle {
  width: 72rpx;
  height: 8rpx;
  border-radius: 999rpx;
  background: rgba(148, 163, 184, 0.25);
  margin: 0 auto 26rpx;
}

.sheet-title {
  font-size: 32rpx;
  font-weight: 700;
  color: #f8fafc;
}

.sheet-row {
  margin-top: 30rpx;
  padding: 24rpx 26rpx;
  border-radius: 24rpx;
  background: rgba(30, 41, 59, 0.55);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.row-copy {
  display: flex;
  flex-direction: column;
  flex: 1;
  margin-right: 20rpx;
}

.row-label {
  font-size: 26rpx;
  color: #e2e8f0;
  font-weight: 500;
}

.row-note {
  margin-top: 8rpx;
  font-size: 20rpx;
  color: #64748b;
}

.time-picker {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 10rpx 18rpx;
  border-radius: 14rpx;
  background: rgba(15, 23, 42, 0.7);
}

.time-value {
  font-size: 30rpx;
  color: #fbbf24;
  font-weight: 600;
}

.chevron-sm {
  width: 12rpx;
  height: 12rpx;
  border-right: 3rpx solid #64748b;
  border-bottom: 3rpx solid #64748b;
  transform: rotate(-45deg);
}

.mode-chip {
  padding: 10rpx 20rpx;
  border-radius: 999rpx;
  font-size: 21rpx;
  color: #cbd5e1;
  background: rgba(148, 163, 184, 0.12);
  border: 1rpx solid rgba(148, 163, 184, 0.18);
}

.mode-chip--cloud {
  color: #6ee7b7;
  background: rgba(16, 185, 129, 0.1);
  border-color: rgba(16, 185, 129, 0.25);
}

.sheet-secondary {
  margin-top: 28rpx;
  height: 88rpx;
  border-radius: 22rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 25rpx;
  color: #cbd5e1;
  background: rgba(148, 163, 184, 0.08);
  border: 1rpx solid rgba(148, 163, 184, 0.16);
}

.sheet-secondary-hover {
  background: rgba(148, 163, 184, 0.14);
}

.sheet-danger {
  margin-top: 28rpx;
  height: 88rpx;
  border-radius: 22rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 25rpx;
  color: #f87171;
  background: rgba(239, 68, 68, 0.08);
  border: 1rpx solid rgba(239, 68, 68, 0.2);
}

.sheet-danger-hover {
  background: rgba(239, 68, 68, 0.14);
}

.sheet-close {
  margin-top: 24rpx;
  height: 96rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30rpx;
  font-weight: 600;
  color: #1f2937;
  background: linear-gradient(135deg, #fde68a, #f59e0b);
}

.sheet-close-hover {
  opacity: 0.9;
}
</style>
