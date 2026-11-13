<template>
  <view class="enroll-page">
    <StarField :count="24" />
    <view class="glow glow-a" />
    <view class="glow glow-b" />

    <NavBar title="开启 22 天契约" />

    <view class="content">
      <template v-if="successKind">
        <view class="success-card">
          <view class="success-icon">
            <text class="success-check">✓</text>
          </view>
          <text class="success-title">
            {{ successKind === 'active' ? '挑战已开启' : '报名已提交' }}
          </text>
          <text class="success-desc">
            {{
              successKind === 'active'
                ? '今晚开始第 1 天契约。点击「我要睡了」开启守护，明早完成唤醒验证即可拿回 ¥1.00。'
                : '内测期需要发起人人工核验押金，通常 5 分钟内完成。激活后回到首页即可开始挑战。'
            }}
          </text>
          <view class="success-stats">
            <view class="success-stat">
              <text class="success-stat-value number-font">22</text>
              <text class="success-stat-label">天周期</text>
            </view>
            <view class="success-line" />
            <view class="success-stat">
              <text class="success-stat-value number-font">¥22</text>
              <text class="success-stat-label">契约押金</text>
            </view>
            <view class="success-line" />
            <view class="success-stat">
              <text class="success-stat-value number-font">¥6.66</text>
              <text class="success-stat-label">完赛红包</text>
            </view>
          </view>
          <view class="primary-btn" hover-class="primary-hover" @tap="goHome">
            <text class="primary-text">返回挑战首页</text>
          </view>
        </view>
      </template>

      <template v-else-if="existingActive">
        <view class="existing-card">
          <view class="existing-icon"><text class="existing-icon-text">!</text></view>
          <text class="existing-title">你已有一期进行中的挑战</text>
          <text class="existing-desc">
            当前挑战状态：{{ existingActive.status === 'PENDING_VERIFICATION' ? '等待人工核验' : '进行中' }}。
            请先完成本周期，再开启新的 22 天契约。
          </text>
          <view class="secondary-btn" hover-class="secondary-hover" @tap="goHome">
            <text class="secondary-text">返回挑战首页</text>
          </view>
        </view>
      </template>

      <template v-else>
        <view class="hero">
          <view class="hero-moon">
            <view class="hero-moon-shadow" />
          </view>
          <text class="hero-title">用 22 元契约，赎回你的深度睡眠</text>
          <text class="hero-sub">21 天习惯养成 + 1 天巩固，按时睡觉就能拿回押金</text>
        </view>

        <view class="form-card">
          <view class="card-head">
            <text class="card-title">报名信息</text>
            <text class="card-tag">内测期</text>
          </view>

          <view class="field">
            <view class="field-copy">
              <text class="field-label">每日目标入睡时间</text>
              <text class="field-note">建议设在 22:00 - 23:30 之间</text>
            </view>
            <Picker mode="time" :value="targetTime" @change="onTimeChange">
              <view class="time-picker">
                <text class="time-value number-font">{{ targetTime }}</text>
                <view class="chevron-sm" />
              </view>
            </Picker>
          </view>

          <view class="field">
            <view class="field-copy">
              <text class="field-label">微信号</text>
              <text class="field-note">用于核对押金转账，请填写真实微信号</text>
            </view>
          </view>
          <input
            class="text-input"
            :value="wechatId"
            type="text"
            placeholder="请输入微信号（选填）"
            placeholder-class="input-placeholder"
            @input="onWechatInput"
          />
        </view>

        <view class="deposit-card">
          <view class="deposit-head">
            <view class="deposit-copy">
              <text class="deposit-label">本次需缴纳</text>
              <view class="deposit-amount-line">
                <text class="deposit-symbol">¥</text>
                <text class="deposit-amount number-font">22.00</text>
              </view>
              <text class="deposit-note">完赛最高可拿回 ¥28.66（含 ¥6.66 红包）</text>
            </view>
            <view class="deposit-badge">
              <text class="deposit-badge-top">22</text>
              <text class="deposit-badge-bottom">天契约</text>
            </view>
          </view>

          <view class="deposit-rows">
            <view class="deposit-row">
              <text class="row-left">每日按时完成</text>
              <text class="row-right">退还 ¥1.00</text>
            </view>
            <view class="deposit-row">
              <text class="row-left">3 次免死金牌</text>
              <text class="row-right">请假当天照退</text>
            </view>
            <view class="deposit-row">
              <text class="row-left">22 天完赛红包</text>
              <text class="row-right">额外 ¥6.66</text>
            </view>
          </view>
        </view>

        <view class="pay-card">
          <view class="card-head">
            <text class="card-title">内测支付方式</text>
            <text class="card-tag card-tag--muted">人工核验</text>
          </view>

          <view class="qr-box">
            <view class="qr-placeholder">
              <text class="qr-symbol">¥</text>
              <text class="qr-text">收款码</text>
            </view>
            <view class="qr-copy">
              <text class="qr-title">添加发起人微信转账</text>
              <text class="qr-desc">转账 ¥22.00，备注「睡了么 + 你的微信号」</text>
              <text class="qr-desc">
                {{ isCloud ? '完成转账后由发起人核对激活' : '演示模式不会产生真实扣款' }}
              </text>
            </view>
          </view>

          <view class="pay-steps">
            <view class="pay-step">
              <text class="pay-step-num">1</text>
              <text class="pay-step-text">扫码或添加发起人微信</text>
            </view>
            <view class="pay-step">
              <text class="pay-step-num">2</text>
              <text class="pay-step-text">转账 ¥22.00 并备注微信号</text>
            </view>
            <view class="pay-step">
              <text class="pay-step-num">3</text>
              <text class="pay-step-text">等待人工核验后开始挑战</text>
            </view>
          </view>
        </view>

        <view class="rules-card">
          <text class="rules-title">挑战规则</text>
          <view v-for="(rule, index) in ruleList" :key="rule" class="rule-row">
            <text class="rule-index">{{ index + 1 }}</text>
            <text class="rule-text">{{ rule }}</text>
          </view>
        </view>

        <view class="agreement" @tap="agreed = !agreed">
          <view class="checkbox" :class="{ 'checkbox--checked': agreed }">
            <text v-if="agreed" class="checkbox-check">✓</text>
          </view>
          <text class="agreement-text">
            我已阅读并同意《22 天早睡契约规则》，确认按时入睡并完成晨间验证。
          </text>
        </view>

        <view class="actions">
          <view
            class="primary-btn"
            :class="{ 'primary-btn--disabled': submitting }"
            hover-class="primary-hover"
            @tap="onSubmit"
          >
            <text class="primary-text">
              {{ submitting ? '正在提交…' : `我已转账 · 提交激活申请` }}
            </text>
          </view>
          <text class="footnote">
            {{ isCloud ? '内测期人工核验，通常 5 分钟内完成' : '演示模式 · 提交后立即激活并开始第 1 天' }}
          </text>
        </view>
      </template>
    </view>
  </view>
</template>

<script setup lang="ts">
import Taro, { useDidShow } from '@tarojs/taro'
import { computed, ref } from 'vue'

import NavBar from '@/components/NavBar.vue'
import StarField from '@/components/StarField.vue'
import { DEFAULT_TARGET_TIME } from '@/constants'
import {
  challenge,
  enroll,
  isCloud,
  notifyError,
  refresh
} from '@/store'

const targetTime = ref(DEFAULT_TARGET_TIME)
const wechatId = ref('')
const agreed = ref(false)
const submitting = ref(false)
const successKind = ref<'active' | 'pending' | null>(null)

const ruleList = [
  '缴纳 ¥22.00 押金，进入 22 天挑战周期。',
  '每日目标时间前开启睡眠守护，次日 06:30 - 08:30 完成早安验证，退还 ¥1.00。',
  '每人 3 次请假机会，请假当天照常退还；第 4 次违约扣除当日押金并失去红包资格。',
  '切屏超过 90 秒、夜间步数增加超过 50 步或未完成晨间验证，均视为违约。',
  '22 天结束且违约不超过 3 次，额外解锁 ¥6.66 完赛红包。'
]

const existingActive = computed(() => {
  const current = challenge.value
  if (!current) return null
  if (current.status === 'ACTIVE' || current.status === 'PENDING_VERIFICATION') return current
  return null
})

function onTimeChange(event: { detail: { value: string } }): void {
  targetTime.value = event.detail.value
}

function onWechatInput(event: { detail: { value: string } }): void {
  wechatId.value = event.detail.value
}

function goHome(): void {
  void Taro.switchTab({ url: '/pages/index/index' })
}

async function onSubmit(): Promise<void> {
  if (submitting.value) return
  if (existingActive.value) return
  if (!agreed.value) {
    void Taro.showToast({ title: '请先阅读并同意契约规则', icon: 'none' })
    return
  }
  if (isCloud.value && !wechatId.value.trim()) {
    void Taro.showToast({ title: '请填写微信号，便于核对转账', icon: 'none' })
    return
  }

  submitting.value = true
  void Taro.showLoading({ title: '正在提交报名', mask: true })
  try {
    await enroll({
      targetSleepTime: targetTime.value,
      wechatId: wechatId.value.trim()
    })
    successKind.value = isCloud.value ? 'pending' : 'active'
  } catch (error) {
    notifyError(error, '报名失败')
  } finally {
    void Taro.hideLoading()
    submitting.value = false
  }
}

useDidShow(() => {
  void refresh().catch(() => undefined)
  if (!successKind.value && challenge.value?.targetSleepTime) {
    targetTime.value = challenge.value.targetSleepTime
  }
})
</script>

<style>
.enroll-page {
  position: relative;
  min-height: 100vh;
  padding-bottom: 48rpx;
  background:
    radial-gradient(circle at 15% 4%, rgba(99, 102, 241, 0.16), transparent 40%),
    linear-gradient(180deg, #0b1120 0%, #0f172a 55%, #111c31 100%);
  overflow-x: hidden;
}

.glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(40rpx);
  pointer-events: none;
}

.glow-a {
  width: 320rpx;
  height: 320rpx;
  top: 40rpx;
  right: -140rpx;
  background: rgba(245, 158, 11, 0.12);
}

.glow-b {
  width: 340rpx;
  height: 340rpx;
  top: 620rpx;
  left: -180rpx;
  background: rgba(99, 102, 241, 0.1);
}

.content {
  position: relative;
  z-index: 2;
  padding: 20rpx 40rpx 0;
}

.hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  margin-top: 24rpx;
}

.hero-moon {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #fef3c7, #fbbf24 62%, #d97706);
  box-shadow: 0 0 60rpx rgba(245, 158, 11, 0.3);
  position: relative;
  overflow: hidden;
}

.hero-moon-shadow {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: #0f172a;
  left: 38%;
  top: -6%;
  opacity: 0.9;
}

.hero-title {
  margin-top: 28rpx;
  font-size: 42rpx;
  line-height: 1.35;
  font-weight: 700;
  color: #f8fafc;
  letter-spacing: 1rpx;
}

.hero-sub {
  margin-top: 16rpx;
  font-size: 22rpx;
  line-height: 1.6;
  color: #94a3b8;
  max-width: 580rpx;
}

.form-card,
.deposit-card,
.pay-card,
.rules-card {
  margin-top: 30rpx;
  padding: 30rpx 28rpx;
  border-radius: 30rpx;
  background: rgba(30, 41, 59, 0.55);
  border: 1rpx solid rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(14px);
}

.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20rpx;
}

.card-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #f8fafc;
}

.card-tag {
  padding: 6rpx 14rpx;
  border-radius: 999rpx;
  font-size: 18rpx;
  color: #fbbf24;
  background: rgba(245, 158, 11, 0.12);
  border: 1rpx solid rgba(245, 158, 11, 0.22);
}

.card-tag--muted {
  color: #94a3b8;
  background: rgba(148, 163, 184, 0.08);
  border-color: rgba(148, 163, 184, 0.14);
}

.field {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18rpx 0;
}

.field-copy {
  display: flex;
  flex-direction: column;
  flex: 1;
  margin-right: 20rpx;
}

.field-label {
  font-size: 25rpx;
  color: #e2e8f0;
  font-weight: 500;
}

.field-note {
  margin-top: 7rpx;
  font-size: 19rpx;
  color: #64748b;
}

.time-picker {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 12rpx 20rpx;
  border-radius: 16rpx;
  background: rgba(15, 23, 42, 0.7);
  border: 1rpx solid rgba(255, 255, 255, 0.08);
}

.time-value {
  font-size: 32rpx;
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

.text-input {
  width: 100%;
  height: 86rpx;
  border-radius: 18rpx;
  padding: 0 24rpx;
  background: rgba(15, 23, 42, 0.7);
  border: 1rpx solid rgba(255, 255, 255, 0.08);
  color: #f8fafc;
  font-size: 26rpx;
  margin-top: 4rpx;
}

.input-placeholder {
  color: rgba(100, 116, 139, 0.7);
}

.deposit-card {
  background:
    radial-gradient(circle at 86% 12%, rgba(245, 158, 11, 0.14), transparent 48%),
    rgba(30, 41, 59, 0.55);
}

.deposit-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.deposit-copy {
  display: flex;
  flex-direction: column;
}

.deposit-label {
  font-size: 22rpx;
  color: #94a3b8;
}

.deposit-amount-line {
  display: flex;
  align-items: baseline;
  margin-top: 6rpx;
}

.deposit-symbol {
  font-size: 30rpx;
  color: #fbbf24;
  font-weight: 700;
  margin-right: 6rpx;
}

.deposit-amount {
  font-size: 68rpx;
  font-weight: 700;
  color: #f8fafc;
  line-height: 1.1;
}

.deposit-note {
  margin-top: 10rpx;
  font-size: 20rpx;
  color: rgba(148, 163, 184, 0.65);
}

.deposit-badge {
  width: 104rpx;
  height: 104rpx;
  border-radius: 26rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(245, 158, 11, 0.12);
  border: 1rpx solid rgba(245, 158, 11, 0.24);
}

.deposit-badge-top {
  font-size: 36rpx;
  font-weight: 700;
  color: #fbbf24;
  font-family: var(--font-display);
  line-height: 1.1;
}

.deposit-badge-bottom {
  font-size: 17rpx;
  color: rgba(251, 191, 36, 0.7);
  margin-top: 2rpx;
}

.deposit-rows {
  margin-top: 24rpx;
  padding-top: 10rpx;
  border-top: 1rpx solid rgba(255, 255, 255, 0.06);
}

.deposit-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14rpx 0;
}

.row-left {
  font-size: 22rpx;
  color: #94a3b8;
}

.row-right {
  font-size: 22rpx;
  color: #cbd5e1;
  font-weight: 500;
}

.qr-box {
  display: flex;
  align-items: center;
  padding: 22rpx;
  border-radius: 22rpx;
  background: rgba(15, 23, 42, 0.55);
  border: 1rpx dashed rgba(148, 163, 184, 0.25);
}

.qr-placeholder {
  width: 150rpx;
  height: 150rpx;
  border-radius: 18rpx;
  background:
    radial-gradient(circle at 30% 30%, rgba(245, 158, 11, 0.1), transparent 60%),
    rgba(30, 41, 59, 0.7);
  border: 1rpx solid rgba(245, 158, 11, 0.2);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.qr-symbol {
  font-size: 54rpx;
  font-weight: 800;
  color: rgba(251, 191, 36, 0.85);
  font-family: var(--font-display);
}

.qr-text {
  margin-top: 4rpx;
  font-size: 18rpx;
  color: rgba(251, 191, 36, 0.55);
  letter-spacing: 2rpx;
}

.qr-copy {
  flex: 1;
  display: flex;
  flex-direction: column;
  margin-left: 24rpx;
}

.qr-title {
  font-size: 25rpx;
  font-weight: 600;
  color: #e2e8f0;
}

.qr-desc {
  margin-top: 10rpx;
  font-size: 20rpx;
  line-height: 1.55;
  color: #64748b;
}

.pay-steps {
  margin-top: 22rpx;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.pay-step {
  display: flex;
  align-items: center;
}

.pay-step-num {
  width: 32rpx;
  height: 32rpx;
  border-radius: 50%;
  background: rgba(245, 158, 11, 0.1);
  color: #fbbf24;
  font-size: 18rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 14rpx;
  flex-shrink: 0;
}

.pay-step-text {
  font-size: 21rpx;
  color: #94a3b8;
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

.rule-index {
  width: 30rpx;
  font-size: 20rpx;
  color: rgba(245, 158, 11, 0.7);
  font-family: var(--font-display);
  flex-shrink: 0;
  margin-top: 2rpx;
}

.rule-text {
  flex: 1;
  font-size: 21rpx;
  line-height: 1.65;
  color: #64748b;
}

.agreement {
  margin-top: 26rpx;
  padding: 0 6rpx;
  display: flex;
  align-items: flex-start;
}

.checkbox {
  width: 34rpx;
  height: 34rpx;
  border-radius: 10rpx;
  border: 2rpx solid rgba(148, 163, 184, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16rpx;
  margin-top: 2rpx;
  flex-shrink: 0;
}

.checkbox--checked {
  background: #f59e0b;
  border-color: #f59e0b;
}

.checkbox-check {
  font-size: 22rpx;
  color: #1f2937;
  font-weight: 700;
}

.agreement-text {
  flex: 1;
  font-size: 20rpx;
  line-height: 1.65;
  color: #64748b;
}

.actions {
  padding-top: 34rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.primary-btn {
  width: 100%;
  height: 102rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #fde68a 0%, #f59e0b 100%);
  box-shadow: 0 16rpx 40rpx rgba(245, 158, 11, 0.26);
}

.primary-btn--disabled {
  opacity: 0.55;
}

.primary-hover {
  transform: scale(0.985);
  opacity: 0.92;
}

.primary-text {
  font-size: 31rpx;
  font-weight: 700;
  color: #1f2937;
  letter-spacing: 1rpx;
}

.footnote {
  margin-top: 20rpx;
  font-size: 19rpx;
  color: rgba(100, 116, 139, 0.7);
  text-align: center;
}

.success-card,
.existing-card {
  margin-top: 70rpx;
  padding: 50rpx 36rpx 40rpx;
  border-radius: 36rpx;
  background:
    radial-gradient(circle at 50% 0%, rgba(16, 185, 129, 0.12), transparent 55%),
    rgba(30, 41, 59, 0.55);
  border: 1rpx solid rgba(255, 255, 255, 0.08);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.success-icon {
  width: 130rpx;
  height: 130rpx;
  border-radius: 50%;
  background: rgba(16, 185, 129, 0.12);
  border: 1rpx solid rgba(16, 185, 129, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 40rpx rgba(16, 185, 129, 0.18);
}

.success-check {
  font-size: 60rpx;
  color: #34d399;
  font-weight: 700;
}

.success-title,
.existing-title {
  margin-top: 26rpx;
  font-size: 36rpx;
  font-weight: 700;
  color: #f8fafc;
}

.success-desc,
.existing-desc {
  margin-top: 16rpx;
  font-size: 23rpx;
  line-height: 1.7;
  color: #94a3b8;
}

.success-stats {
  width: 100%;
  margin-top: 32rpx;
  padding: 24rpx 0;
  border-radius: 22rpx;
  background: rgba(15, 23, 42, 0.5);
  display: flex;
  align-items: center;
  justify-content: space-around;
}

.success-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.success-stat-value {
  font-size: 32rpx;
  font-weight: 700;
  color: #fbbf24;
}

.success-stat-label {
  margin-top: 6rpx;
  font-size: 19rpx;
  color: #64748b;
}

.success-line {
  width: 1rpx;
  height: 44rpx;
  background: rgba(255, 255, 255, 0.06);
}

.success-card .primary-btn,
.existing-card .secondary-btn {
  margin-top: 36rpx;
  width: 100%;
}

.existing-icon {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  background: rgba(245, 158, 11, 0.1);
  border: 1rpx solid rgba(245, 158, 11, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
}

.existing-icon-text {
  font-size: 54rpx;
  color: #fbbf24;
  font-weight: 700;
}

.secondary-btn {
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
</style>
