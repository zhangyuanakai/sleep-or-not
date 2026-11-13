<template>
  <view class="wallet-page">
    <StarField :count="22" />
    <view class="glow glow-a" />
    <view class="glow glow-b" />

    <view class="safe-top" :style="{ height: `${statusBarHeight}px` }" />

    <view class="header" :style="{ paddingRight: `${menuSafeRight}px` }">
      <view class="header-copy">
        <text class="header-title">22天战绩与钱包</text>
        <text class="header-sub">每一次按时入睡，都在为未来存钱</text>
      </view>
      <view class="header-moon">
        <view class="header-moon-shadow" />
      </view>
    </view>

    <view v-if="!challenge" class="empty">
      <view class="empty-orb">
        <text class="empty-orb-text">¥</text>
      </view>
      <text class="empty-title">还没有进行中的契约</text>
      <text class="empty-desc">先缴纳 ¥22 开启 22 天挑战，今晚就能开始攒回押金。</text>
      <view class="empty-btn" hover-class="btn-hover" @tap="goHome">
        <text class="empty-btn-text">去开启挑战</text>
      </view>
    </view>

    <template v-else>
      <view class="funds-card">
        <view class="funds-head">
          <view class="funds-copy">
            <text class="funds-label">累计已退还</text>
            <view class="funds-amount-line">
              <text class="funds-symbol">¥</text>
              <text class="funds-amount number-font">{{ formatMoney(refundedTotal) }}</text>
            </view>
            <text class="funds-sub">钱包余额 ¥{{ formatMoney(walletBalance) }}</text>
          </view>
          <view class="wallet-orb">
            <text class="wallet-orb-symbol">¥</text>
          </view>
        </view>

        <view
          class="withdraw-btn"
          :class="{ 'withdraw-btn--disabled': !canWithdraw }"
          hover-class="withdraw-hover"
          @tap="onWithdraw"
        >
          <text class="withdraw-text">{{ withdrawText }}</text>
        </view>
      </view>

      <view v-if="isPending" class="pending-panel">
        <view class="pending-orb">
          <view class="pending-dot" />
        </view>
        <text class="pending-title">契约待激活</text>
        <text class="pending-desc">
          发起人完成押金核验后，这里会显示 22 天打卡日历、累计退还金额与完赛红包。
        </text>
        <view class="pending-btn" hover-class="withdraw-hover" @tap="goHome">
          <text class="pending-btn-text">返回挑战首页</text>
        </view>
      </view>

      <template v-if="!isPending">
      <view class="panel calendar-panel">
        <view class="panel-head">
          <text class="panel-title">22 天打卡日历</text>
          <text class="panel-note">已达标 {{ successCount }} 天</text>
        </view>

        <view class="week-head">
          <view v-for="week in weekNames" :key="week" class="week-cell">
            <text class="week-text">{{ week }}</text>
          </view>
        </view>

        <view class="calendar-grid">
          <view v-for="blank in calendarOffset" :key="`blank-${blank}`" class="cal-cell" />
          <view
            v-for="cell in calendarCells"
            :key="cell.day"
            class="cal-cell"
            :class="{ 'cal-cell--today': cell.isToday }"
          >
            <text class="cal-day" :class="{ 'cal-day--today': cell.isToday }">
              {{ dayOfMonth(cell.date) }}
            </text>
            <view class="cal-badge" :class="badgeClass(cell)">
              <text v-if="cell.state === 'STATE_3_SUCCESS'" class="badge-check">✓</text>
              <text v-else-if="cell.state === 'STATE_3_LEAVE'" class="badge-leave">请假</text>
              <text v-else-if="cell.state === 'STATE_3_FAIL'" class="badge-fail">✕</text>
              <text v-else-if="cell.isToday" class="badge-today">今</text>
              <view v-else class="badge-dot" />
            </view>
          </view>
        </view>

        <view class="legend">
          <view class="legend-item">
            <view class="legend-dot legend-dot--success" />
            <text class="legend-text">成功</text>
          </view>
          <view class="legend-item">
            <view class="legend-dot legend-dot--leave" />
            <text class="legend-text">请假</text>
          </view>
          <view class="legend-item">
            <view class="legend-dot legend-dot--fail" />
            <text class="legend-text">失败</text>
          </view>
          <view class="legend-item">
            <view class="legend-dot legend-dot--empty" />
            <text class="legend-text">未开始</text>
          </view>
        </view>

        <view class="progress-block">
          <view class="progress-head">
            <text class="progress-day">第 {{ currentDay }} / 22 天</text>
            <text class="progress-note">已结算 {{ settledCount }} 天</text>
          </view>
          <view class="progress-track">
            <view class="progress-fill" :style="{ width: `${progressPercent}%` }" />
          </view>
        </view>
      </view>

      <view class="bonus-card" :class="`bonus-card--${bonusStatus.toLowerCase()}`">
        <view class="bonus-copy">
          <text class="bonus-label">完赛额外奖励</text>
          <view class="bonus-line">
            <text class="bonus-amount number-font">¥6.66</text>
            <text class="bonus-state">{{ bonusLabel }}</text>
          </view>
          <text class="bonus-hint">{{ bonusHint }}</text>
        </view>
        <view class="envelope">
          <view class="envelope-flap" />
          <view class="envelope-coin">
            <text class="coin-text">¥</text>
          </view>
        </view>
      </view>

      <view class="stats-strip">
        <view class="stat-cell">
          <text class="stat-value number-font">{{ successCount }}</text>
          <text class="stat-label">达标</text>
        </view>
        <view class="stat-line" />
        <view class="stat-cell">
          <text class="stat-value number-font">{{ leaveCount }}</text>
          <text class="stat-label">请假</text>
        </view>
        <view class="stat-line" />
        <view class="stat-cell">
          <text class="stat-value number-font">{{ 22 - settledCount }}</text>
          <text class="stat-label">剩余天数</text>
        </view>
      </view>

      <view class="rules-card">
        <text class="rules-title">契约规则</text>
        <view v-for="rule in ruleList" :key="rule" class="rule-row">
          <view class="rule-bullet" />
          <text class="rule-text">{{ rule }}</text>
        </view>
      </view>
      </template>
    </template>
  </view>
</template>

<script setup lang="ts">
import Taro, { useDidShow } from '@tarojs/taro'
import { computed } from 'vue'

import StarField from '@/components/StarField.vue'
import { maybeAutoOpenWake } from '@/services/wakePrompt'
import {
  bonusLabel,
  bonusStatus,
  calendarCells,
  challenge,
  currentDay,
  isCloud,
  leaveCount,
  progressPercent,
  refundedTotal,
  settledCount,
  successCount,
  walletBalance,
  withdraw
} from '@/store'
import type { CalendarCell } from '@/types'
import { formatMoney, getMondayIndex, parseDateStr } from '@/utils/date'
import { menuSafeRight, statusBarHeight } from '@/utils/system'

const weekNames = ['一', '二', '三', '四', '五', '六', '日']

const ruleList = [
  '22 天为一个完整周期，每日按时入睡并通过晨间验证，退还 ¥1.00。',
  '每人初始 3 次请假机会，消耗请假当天仍可退还 ¥1.00。',
  '切屏超过 90 秒、夜间步数增加超过 50 步或未完成晨间验证，均视为一次违约。',
  '第 4 次违约（请假用尽后）当日押金扣除，并永久失去 ¥6.66 完赛红包资格。'
]

const isPending = computed(() => Boolean(challenge.value && !challenge.value.startDate))

const calendarOffset = computed(() => {
  if (!challenge.value?.startDate) return 0
  return getMondayIndex(challenge.value.startDate)
})

const canWithdraw = computed(
  () => challenge.value?.status === 'COMPLETED' && walletBalance.value > 0
)

const withdrawText = computed(() => {
  if (!challenge.value) return '暂无契约'
  if (challenge.value.status !== 'COMPLETED') return '22 天结束后可一键提现'
  if (walletBalance.value <= 0) return '本期已提现完成'
  return `申请提现 ¥${formatMoney(walletBalance.value)}`
})

const bonusHint = computed(() => {
  if (bonusStatus.value === 'LOST') return '第 4 次违约后，红包资格已永久失效'
  if (bonusStatus.value === 'UNLOCKED') return '红包已随完赛结算入账，可一起提现'
  return '22 天内违约不超过 3 次，即可解锁这份奖励'
})

function dayOfMonth(dateStr: string): number {
  return parseDateStr(dateStr).getDate()
}

function badgeClass(cell: CalendarCell): string {
  if (cell.state === 'STATE_3_SUCCESS') return 'cal-badge--success'
  if (cell.state === 'STATE_3_LEAVE') return 'cal-badge--leave'
  if (cell.state === 'STATE_3_FAIL') return 'cal-badge--fail'
  if (cell.isToday) return 'cal-badge--today'
  if (cell.isFuture) return 'cal-badge--future'
  return 'cal-badge--empty'
}

function goHome(): void {
  void Taro.switchTab({ url: '/pages/index/index' })
}

async function onWithdraw(): Promise<void> {
  if (!canWithdraw.value) {
    if (!challenge.value) return
    if (challenge.value.status !== 'COMPLETED') {
      void Taro.showToast({ title: '22 天挑战结束后才能提现', icon: 'none' })
      return
    }
    void Taro.showToast({ title: '暂无可提现余额', icon: 'none' })
    return
  }

  const modal = await Taro.showModal({
    title: '申请提现',
    content: `将提取钱包余额 ¥${formatMoney(walletBalance.value)}，提交后 1-3 个工作日内到账。`,
    confirmText: '确认提现',
    cancelText: '再等等'
  })
  if (!modal.confirm) return

  void Taro.showLoading({ title: '提交中', mask: true })
  try {
    const amount = await withdraw()
    await Taro.showModal({
      title: '提现申请已提交',
      content: isCloud.value
        ? `¥${formatMoney(amount)} 将在 1-3 个工作日内到账。`
        : `演示模式已模拟到账 ¥${formatMoney(amount)}，钱包余额已清零。`,
      showCancel: false,
      confirmText: '好的'
    })
  } catch (error) {
    void Taro.showToast({
      title: error instanceof Error ? error.message : '提现失败',
      icon: 'none'
    })
  } finally {
    void Taro.hideLoading()
  }
}

useDidShow(() => {
  void maybeAutoOpenWake()
})
</script>

<style>
.wallet-page {
  position: relative;
  min-height: 100vh;
  padding-bottom: 48rpx;
  background:
    radial-gradient(circle at 85% 6%, rgba(245, 158, 11, 0.1), transparent 40%),
    linear-gradient(180deg, #0b1120 0%, #0f172a 60%, #111c31 100%);
  overflow-x: hidden;
}

.glow {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
  filter: blur(30rpx);
}

.glow-a {
  width: 260rpx;
  height: 260rpx;
  top: -120rpx;
  right: -80rpx;
  background: rgba(245, 158, 11, 0.16);
}

.glow-b {
  width: 300rpx;
  height: 300rpx;
  top: 520rpx;
  left: -160rpx;
  background: rgba(99, 102, 241, 0.12);
}

.safe-top {
  position: relative;
  z-index: 2;
}

.header {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 26rpx 40rpx 10rpx;
}

.header-copy {
  display: flex;
  flex-direction: column;
}

.header-title {
  font-size: 38rpx;
  font-weight: 700;
  color: #f8fafc;
  letter-spacing: 1rpx;
}

.header-sub {
  margin-top: 12rpx;
  font-size: 22rpx;
  color: #94a3b8;
}

.header-moon {
  width: 78rpx;
  height: 78rpx;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #fef3c7, #fbbf24 62%, #d97706);
  box-shadow: 0 0 40rpx rgba(245, 158, 11, 0.35);
  position: relative;
  overflow: hidden;
}

.header-moon-shadow {
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: #0f172a;
  left: 34%;
  top: -6%;
  opacity: 0.88;
}

.funds-card {
  position: relative;
  z-index: 2;
  margin: 30rpx 36rpx 0;
  padding: 34rpx 30rpx 28rpx;
  border-radius: 32rpx;
  background:
    radial-gradient(circle at 88% 12%, rgba(245, 158, 11, 0.18), transparent 46%),
    rgba(30, 41, 59, 0.62);
  border: 1rpx solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 20rpx 50rpx rgba(0, 0, 0, 0.25);
  backdrop-filter: blur(14px);
}

.funds-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.funds-copy {
  display: flex;
  flex-direction: column;
}

.funds-label {
  font-size: 23rpx;
  color: #94a3b8;
  letter-spacing: 1rpx;
}

.funds-amount-line {
  display: flex;
  align-items: baseline;
  margin-top: 8rpx;
}

.funds-symbol {
  font-size: 30rpx;
  color: #fbbf24;
  font-weight: 700;
  margin-right: 6rpx;
}

.funds-amount {
  font-size: 70rpx;
  line-height: 1.1;
  font-weight: 700;
  color: #f8fafc;
}

.funds-sub {
  margin-top: 10rpx;
  font-size: 21rpx;
  color: rgba(148, 163, 184, 0.7);
}

.wallet-orb {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(circle at 35% 30%, #fde68a, #f59e0b 70%);
  box-shadow: 0 0 32rpx rgba(245, 158, 11, 0.3);
}

.wallet-orb-symbol {
  font-size: 44rpx;
  font-weight: 800;
  color: #78350f;
  font-family: var(--font-display);
}

.withdraw-btn {
  margin-top: 26rpx;
  height: 80rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(245, 158, 11, 0.14);
  border: 1rpx solid rgba(245, 158, 11, 0.32);
}

.withdraw-hover {
  background: rgba(245, 158, 11, 0.22);
}

.withdraw-btn--disabled {
  background: rgba(148, 163, 184, 0.06);
  border-color: rgba(148, 163, 184, 0.12);
}

.withdraw-text {
  font-size: 25rpx;
  font-weight: 600;
  color: #fbbf24;
}

.withdraw-btn--disabled .withdraw-text {
  color: rgba(148, 163, 184, 0.55);
  font-weight: 400;
}

.panel {
  position: relative;
  z-index: 2;
  margin: 24rpx 36rpx 0;
  padding: 30rpx 28rpx;
  border-radius: 30rpx;
  background: rgba(30, 41, 59, 0.55);
  border: 1rpx solid rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(14px);
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20rpx;
}

.panel-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #f8fafc;
}

.panel-note {
  font-size: 21rpx;
  color: #64748b;
}

.week-head {
  display: flex;
  margin-bottom: 6rpx;
}

.week-cell {
  width: 14.2857%;
  display: flex;
  justify-content: center;
  padding: 8rpx 0;
}

.week-text {
  font-size: 20rpx;
  color: #64748b;
}

.calendar-grid {
  display: flex;
  flex-wrap: wrap;
}

.cal-cell {
  width: 14.2857%;
  padding: 7rpx 0;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.cal-day {
  font-size: 18rpx;
  color: rgba(148, 163, 184, 0.55);
  font-family: var(--font-display);
  margin-bottom: 8rpx;
}

.cal-day--today {
  color: #fbbf24;
  font-weight: 700;
}

.cal-badge {
  width: 54rpx;
  height: 54rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1rpx solid transparent;
}

.cal-badge--success {
  background: linear-gradient(160deg, #34d399, #10b981);
  box-shadow: 0 6rpx 16rpx rgba(16, 185, 129, 0.22);
}

.cal-badge--leave {
  background: rgba(180, 83, 9, 0.72);
  border-color: rgba(251, 191, 36, 0.35);
}

.cal-badge--fail {
  background: rgba(239, 68, 68, 0.78);
}

.cal-badge--today {
  background: rgba(245, 158, 11, 0.08);
  border: 2rpx dashed rgba(245, 158, 11, 0.7);
  box-shadow: 0 0 22rpx rgba(245, 158, 11, 0.18);
}

.cal-badge--future {
  background: rgba(148, 163, 184, 0.07);
  border-color: rgba(148, 163, 184, 0.08);
}

.cal-badge--empty {
  background: rgba(148, 163, 184, 0.07);
  border-color: rgba(148, 163, 184, 0.1);
}

.badge-check {
  font-size: 28rpx;
  color: #ecfdf5;
  font-weight: 700;
}

.badge-leave {
  font-size: 16rpx;
  color: #fde68a;
}

.badge-fail {
  font-size: 28rpx;
  color: #fee2e2;
  font-weight: 700;
}

.badge-today {
  font-size: 20rpx;
  color: #fbbf24;
  font-weight: 600;
}

.badge-dot {
  width: 9rpx;
  height: 9rpx;
  border-radius: 50%;
  background: rgba(148, 163, 184, 0.28);
}

.cal-cell--today .cal-badge {
  transform: scale(1.04);
}

.legend {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 26rpx;
  margin-top: 20rpx;
  padding-top: 18rpx;
  border-top: 1rpx solid rgba(255, 255, 255, 0.05);
}

.legend-item {
  display: flex;
  align-items: center;
}

.legend-dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  margin-right: 8rpx;
}

.legend-dot--success {
  background: #10b981;
}

.legend-dot--leave {
  background: #b45309;
}

.legend-dot--fail {
  background: #ef4444;
}

.legend-dot--empty {
  background: rgba(148, 163, 184, 0.25);
}

.legend-text {
  font-size: 18rpx;
  color: #64748b;
}

.progress-block {
  margin-top: 24rpx;
  padding-top: 22rpx;
  border-top: 1rpx solid rgba(255, 255, 255, 0.05);
}

.progress-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16rpx;
}

.progress-day {
  font-size: 26rpx;
  font-weight: 600;
  color: #e2e8f0;
}

.progress-note {
  font-size: 20rpx;
  color: #64748b;
}

.progress-track {
  height: 14rpx;
  border-radius: 999rpx;
  background: rgba(148, 163, 184, 0.12);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 999rpx;
  background: linear-gradient(90deg, #34d399, #10b981);
  box-shadow: 0 0 18rpx rgba(16, 185, 129, 0.4);
  transition: width 0.4s ease;
}

.bonus-card {
  position: relative;
  z-index: 2;
  margin: 24rpx 36rpx 0;
  padding: 28rpx;
  border-radius: 30rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background:
    radial-gradient(circle at 82% 20%, rgba(251, 191, 36, 0.16), transparent 48%),
    linear-gradient(135deg, rgba(120, 53, 15, 0.4), rgba(30, 41, 59, 0.62));
  border: 1rpx solid rgba(245, 158, 11, 0.22);
}

.bonus-card--lost {
  background: rgba(30, 41, 59, 0.45);
  border-color: rgba(148, 163, 184, 0.12);
}

.bonus-card--unlocked {
  border-color: rgba(16, 185, 129, 0.3);
}

.bonus-copy {
  flex: 1;
  display: flex;
  flex-direction: column;
  margin-right: 16rpx;
}

.bonus-label {
  font-size: 22rpx;
  color: #cbd5e1;
}

.bonus-line {
  display: flex;
  align-items: baseline;
  margin-top: 6rpx;
}

.bonus-amount {
  font-size: 46rpx;
  font-weight: 700;
  color: #fbbf24;
  letter-spacing: 1rpx;
}

.bonus-state {
  margin-left: 14rpx;
  font-size: 20rpx;
  color: #fcd34d;
  padding: 5rpx 12rpx;
  border-radius: 999rpx;
  background: rgba(245, 158, 11, 0.12);
}

.bonus-hint {
  margin-top: 10rpx;
  font-size: 19rpx;
  color: rgba(203, 213, 225, 0.55);
  line-height: 1.5;
}

.envelope {
  position: relative;
  width: 116rpx;
  height: 140rpx;
  border-radius: 16rpx;
  background: linear-gradient(160deg, #f87171, #dc2626);
  box-shadow: 0 14rpx 30rpx rgba(220, 38, 38, 0.24);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
}

.envelope-flap {
  position: absolute;
  top: 0;
  left: 0;
  width: 0;
  height: 0;
  border-left: 58rpx solid transparent;
  border-right: 58rpx solid transparent;
  border-top: 44rpx solid rgba(255, 255, 255, 0.28);
}

.envelope-coin {
  width: 54rpx;
  height: 54rpx;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #fef3c7, #fbbf24 70%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4rpx 12rpx rgba(120, 53, 15, 0.35);
  margin-top: 26rpx;
  z-index: 1;
}

.coin-text {
  font-size: 28rpx;
  font-weight: 800;
  color: #92400e;
  font-family: var(--font-display);
}

.stats-strip {
  position: relative;
  z-index: 2;
  margin: 24rpx 36rpx 0;
  padding: 24rpx 0;
  border-radius: 26rpx;
  display: flex;
  align-items: center;
  justify-content: space-around;
  background: rgba(30, 41, 59, 0.4);
  border: 1rpx solid rgba(255, 255, 255, 0.05);
}

.stat-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
}

.stat-value {
  font-size: 32rpx;
  font-weight: 700;
  color: #e2e8f0;
}

.stat-label {
  margin-top: 6rpx;
  font-size: 19rpx;
  color: #64748b;
}

.stat-line {
  width: 1rpx;
  height: 44rpx;
  background: rgba(255, 255, 255, 0.06);
}

.pending-panel {
  position: relative;
  z-index: 2;
  margin: 24rpx 36rpx 0;
  padding: 50rpx 36rpx 36rpx;
  border-radius: 30rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  background: rgba(30, 41, 59, 0.55);
  border: 1rpx solid rgba(255, 255, 255, 0.08);
}

.pending-orb {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  border: 2rpx dashed rgba(245, 158, 11, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
}

.pending-dot {
  width: 42rpx;
  height: 42rpx;
  border-radius: 50%;
  background: #f59e0b;
  box-shadow: 0 0 28rpx rgba(245, 158, 11, 0.65);
  animation: pendingPulse 2.2s ease-in-out infinite;
}

.pending-title {
  margin-top: 26rpx;
  font-size: 32rpx;
  font-weight: 700;
  color: #f8fafc;
}

.pending-desc {
  margin-top: 14rpx;
  font-size: 22rpx;
  line-height: 1.7;
  color: #94a3b8;
}

.pending-btn {
  margin-top: 30rpx;
  width: 100%;
  height: 84rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(245, 158, 11, 0.12);
  border: 1rpx solid rgba(245, 158, 11, 0.28);
}

.pending-btn-text {
  font-size: 25rpx;
  font-weight: 600;
  color: #fbbf24;
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

.rules-card {
  position: relative;
  z-index: 2;
  margin: 24rpx 36rpx 0;
  padding: 28rpx;
  border-radius: 28rpx;
  background: rgba(30, 41, 59, 0.35);
  border: 1rpx solid rgba(255, 255, 255, 0.05);
}

.rules-title {
  font-size: 25rpx;
  font-weight: 600;
  color: #cbd5e1;
}

.rule-row {
  display: flex;
  align-items: flex-start;
  margin-top: 16rpx;
}

.rule-bullet {
  width: 8rpx;
  height: 8rpx;
  border-radius: 50%;
  background: rgba(245, 158, 11, 0.6);
  margin-top: 12rpx;
  margin-right: 14rpx;
  flex-shrink: 0;
}

.rule-text {
  flex: 1;
  font-size: 21rpx;
  line-height: 1.65;
  color: #64748b;
}

.empty {
  position: relative;
  z-index: 2;
  margin: 100rpx 60rpx 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.empty-orb {
  width: 160rpx;
  height: 160rpx;
  border-radius: 50%;
  background: rgba(30, 41, 59, 0.6);
  border: 1rpx dashed rgba(245, 158, 11, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-orb-text {
  font-size: 64rpx;
  color: rgba(245, 158, 11, 0.7);
  font-family: var(--font-display);
  font-weight: 700;
}

.empty-title {
  margin-top: 30rpx;
  font-size: 32rpx;
  font-weight: 700;
  color: #e2e8f0;
}

.empty-desc {
  margin-top: 14rpx;
  font-size: 23rpx;
  line-height: 1.7;
  color: #64748b;
}

.empty-btn {
  margin-top: 36rpx;
  width: 100%;
  height: 96rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #fde68a, #f59e0b);
  box-shadow: 0 14rpx 34rpx rgba(245, 158, 11, 0.25);
}

.btn-hover {
  opacity: 0.9;
}

.empty-btn-text {
  font-size: 30rpx;
  font-weight: 700;
  color: #1f2937;
  letter-spacing: 1rpx;
}
</style>
