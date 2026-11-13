<template>
  <view class="captcha">
    <view class="captcha-head">
      <text class="captcha-title">4 位随机验证码</text>
      <text class="captcha-refresh" @tap="refresh">换一张</text>
    </view>

    <canvas
      id="captcha-canvas"
      canvas-id="captcha-canvas"
      class="captcha-canvas"
      @tap="refresh"
    />

    <input
      class="captcha-input"
      :value="modelValue"
      type="text"
      :maxlength="4"
      placeholder="输入图中 4 位验证码"
      placeholder-class="captcha-placeholder"
      @input="onInput"
    />
  </view>
</template>

<script setup lang="ts">
import Taro from '@tarojs/taro'
import { onMounted } from 'vue'

defineProps<{ modelValue: string }>()
const emit = defineEmits<{
  (event: 'update:modelValue', value: string): void
  (event: 'change', code: string): void
}>()

const CODE_CHARS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'
const CHAR_COLORS = ['#F8FAFC', '#FDE68A', '#C7D2FE', '#FCA5A5']
const CANVAS_ID = 'captcha-canvas'

let answer = ''
let retry = 0

interface InputEvent {
  detail: { value: string }
}

function onInput(event: InputEvent): void {
  const value = (event.detail.value || '').toUpperCase().replace(/[^0-9A-Z]/g, '')
  emit('update:modelValue', value.slice(0, 4))
}

function createCode(): string {
  return Array.from(
    { length: 4 },
    () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
  ).join('')
}

function roundedRect(
  ctx: Taro.CanvasContext,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void {
  const r = Math.min(radius, width / 2, height / 2)
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + width - r, y)
  ctx.arcTo(x + width, y, x + width, y + r, r)
  ctx.lineTo(x + width, y + height - r)
  ctx.arcTo(x + width, y + height, x + width - r, y + height, r)
  ctx.lineTo(x + r, y + height)
  ctx.arcTo(x, y + height, x, y + height - r, r)
  ctx.lineTo(x, y + r)
  ctx.arcTo(x, y, x + r, y, r)
  ctx.closePath()
}

function render(width: number, height: number, code: string): void {
  // 页面内只有一个验证码 canvas，使用页面级作用域即可，避免组件实例在
  // 不同平台（Vue3 Proxy / 原生小程序实例）之间的兼容问题。
  const ctx = Taro.createCanvasContext(CANVAS_ID)
  const gap = width * 0.03
  const boxWidth = (width - gap * 3) / 4
  const boxHeight = height * 0.84
  const top = (height - boxHeight) / 2

  ctx.clearRect(0, 0, width, height)

  for (let index = 0; index < 4; index += 1) {
    roundedRect(ctx, index * (boxWidth + gap), top, boxWidth, boxHeight, 16)
    ctx.setFillStyle('rgba(255, 255, 255, 0.09)')
    ctx.fill()
    ctx.setStrokeStyle('rgba(255, 255, 255, 0.14)')
    ctx.setLineWidth(1)
    ctx.stroke()
  }

  // 干扰点
  for (let index = 0; index < 26; index += 1) {
    ctx.beginPath()
    ctx.setFillStyle(
      index % 3 === 0 ? 'rgba(253, 230, 138, 0.35)' : 'rgba(248, 250, 252, 0.22)'
    )
    ctx.arc(Math.random() * width, Math.random() * height, Math.random() * 1.8, 0, Math.PI * 2)
    ctx.fill()
  }

  // 干扰线（字符下方）
  for (let index = 0; index < 2; index += 1) {
    ctx.beginPath()
    ctx.setStrokeStyle('rgba(255, 255, 255, 0.16)')
    ctx.setLineWidth(1.4)
    ctx.moveTo(Math.random() * width, Math.random() * height)
    ctx.bezierCurveTo(
      Math.random() * width,
      Math.random() * height,
      Math.random() * width,
      Math.random() * height,
      Math.random() * width,
      Math.random() * height
    )
    ctx.stroke()
  }

  // 图形字符。
  // 注意：Taro H5 的 CanvasContext 中 translate/rotate 是延迟执行的，save/restore 却是立即执行，
  // 直接混用会导致变换叠加、字符飞出画布。这里用 setTransform 显式绘制并重置。
  ctx.setFontSize(boxHeight * 0.56)
  ctx.setTextAlign('center')
  ctx.setTextBaseline('middle')
  for (let index = 0; index < 4; index += 1) {
    const char = code[index]
    const centerX = index * (boxWidth + gap) + boxWidth / 2
    const centerY = top + boxHeight / 2 + (Math.random() - 0.5) * 8
    const angle = (Math.random() - 0.5) * 0.42
    const cos = Math.cos(angle)
    const sin = Math.sin(angle)

    // 等价于 translate(centerX, centerY) + rotate(angle) 后以 (0, 0) 为字符中心绘制
    ctx.setTransform(cos, sin, -sin, cos, centerX, centerY)
    ctx.setFillStyle(CHAR_COLORS[index % CHAR_COLORS.length])
    ctx.fillText(char, 0, 0)
    ctx.setTransform(1, 0, 0, 1, 0, 0)
  }

  // 顶部再压一条干扰线
  ctx.beginPath()
  ctx.setStrokeStyle('rgba(253, 230, 138, 0.28)')
  ctx.setLineWidth(1.6)
  ctx.moveTo(0, Math.random() * height)
  ctx.bezierCurveTo(
    width * 0.3,
    Math.random() * height,
    width * 0.7,
    Math.random() * height,
    width,
    Math.random() * height
  )
  ctx.stroke()

  ctx.draw()
}

function queryAndDraw(code: string): void {
  Taro.createSelectorQuery()
    .select(`#${CANVAS_ID}`)
    .boundingClientRect((rect) => {
      const layout = rect as { width?: number; height?: number } | null
      if (!layout || !layout.width || !layout.height) {
        if (retry < 8) {
          retry += 1
          setTimeout(() => queryAndDraw(code), 120)
        }
        return
      }
      render(layout.width, layout.height, code)
    })
    .exec()
}

function refresh(): void {
  retry = 0
  const code = createCode()
  answer = code
  emit('update:modelValue', '')
  emit('change', code)
  setTimeout(() => queryAndDraw(code), 40)
}

function validate(input: string): boolean {
  return input.trim().toUpperCase() === answer
}

function getAnswer(): string {
  return answer
}

onMounted(() => {
  refresh()
})

defineExpose({ refresh, validate, getAnswer })
</script>

<style>
.captcha {
  width: 100%;
}

.captcha-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 18rpx;
}

.captcha-title {
  font-size: 24rpx;
  color: rgba(226, 232, 240, 0.75);
  letter-spacing: 1rpx;
}

.captcha-refresh {
  font-size: 24rpx;
  color: #fbbf24;
  padding: 4rpx 0 4rpx 20rpx;
}

.captcha-canvas {
  width: 100%;
  height: 132rpx;
  display: block;
}

.captcha-input {
  margin-top: 22rpx;
  width: 100%;
  height: 88rpx;
  box-sizing: border-box;
  padding: 0 28rpx;
  border-radius: 18rpx;
  background: rgba(15, 23, 42, 0.55);
  border: 1rpx solid rgba(255, 255, 255, 0.12);
  color: #f8fafc;
  font-size: 30rpx;
  letter-spacing: 14rpx;
  text-align: center;
}

.captcha-input input {
  text-align: center;
  letter-spacing: 14rpx;
}

.captcha-placeholder {
  color: rgba(148, 163, 184, 0.7);
  font-size: 26rpx;
  letter-spacing: 1rpx;
}
</style>
