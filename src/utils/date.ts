import { AUTO_SETTLE_TIME, WAKE_END, WAKE_START } from '@/constants'

const DAY_MS = 24 * 60 * 60 * 1000

export function pad2(value: number): string {
  return value < 10 ? `0${value}` : `${value}`
}

/** 本地时区 YYYY-MM-DD */
export function toDateStr(date: Date = new Date()): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

export function parseDateStr(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function addDays(dateStr: string, days: number): string {
  const date = parseDateStr(dateStr)
  date.setDate(date.getDate() + days)
  return toDateStr(date)
}

/** to - from 的天数差（本地自然日） */
export function diffDays(from: string, to: string): number {
  return Math.round((parseDateStr(to).getTime() - parseDateStr(from).getTime()) / DAY_MS)
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

export function timeToMinutes(time: string): number {
  const [hour, minute] = time.split(':').map(Number)
  return hour * 60 + minute
}

export function nowMinutes(date: Date = new Date()): number {
  return date.getHours() * 60 + date.getMinutes()
}

export function formatClock(timestamp: number): string {
  const date = new Date(timestamp)
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`
}

/** 毫秒 -> HH:MM:SS（小时可超过 24） */
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const hour = Math.floor(total / 3600)
  const minute = Math.floor((total % 3600) / 60)
  const second = total % 60
  return `${pad2(hour)}:${pad2(minute)}:${pad2(second)}`
}

export function formatMoney(value: number): string {
  return value.toFixed(2)
}

/** 当天入睡目标时间戳 */
export function targetTimestamp(time: string, base: Date = new Date()): number {
  const [hour, minute] = time.split(':').map(Number)
  const target = new Date(base)
  target.setHours(hour, minute, 0, 0)
  return target.getTime()
}

export function isInWakeWindow(date: Date = new Date()): boolean {
  const minutes = nowMinutes(date)
  return minutes >= timeToMinutes(WAKE_START) && minutes <= timeToMinutes(WAKE_END)
}

export function isPastWakeDeadline(date: Date = new Date()): boolean {
  return nowMinutes(date) > timeToMinutes(AUTO_SETTLE_TIME)
}

export function getWeekdayCN(dateStr: string): string {
  const names = ['日', '一', '二', '三', '四', '五', '六']
  return names[parseDateStr(dateStr).getDay()]
}

/** 周一为 0 的星期索引，用于日历对齐 */
export function getMondayIndex(dateStr: string): number {
  return (parseDateStr(dateStr).getDay() + 6) % 7
}

export function formatDateCN(dateStr: string): string {
  const date = parseDateStr(dateStr)
  return `${date.getMonth() + 1}月${date.getDate()}日`
}

/** 距离入睡目标的时段进度：18:00 -> target 之间填充 */
export function sleepWindowProgress(targetTime: string, now: Date = new Date()): number {
  const target = targetTimestamp(targetTime, now)
  const start = new Date(now)
  start.setHours(18, 0, 0, 0)
  if (now.getTime() >= target) return 1
  if (now.getTime() <= start.getTime()) return 0.04
  return clamp((now.getTime() - start.getTime()) / (target - start.getTime()), 0, 1)
}

export function countdownToTarget(targetTime: string, now: Date = new Date()): number {
  return Math.max(0, targetTimestamp(targetTime, now) - now.getTime())
}
