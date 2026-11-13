import type { DailyState } from '@/types'

/** 一个完整习惯养成周期 */
export const CHALLENGE_DAYS = 22
/** 契约押金 */
export const DEPOSIT_AMOUNT = 22
/** 每日返还 */
export const DAILY_REFUND = 1
/** 完赛红包 */
export const BONUS_AMOUNT = 6.66
/** 初始请假次数 */
export const LEAVE_TOTAL = 3
/** 默认目标入睡时间 */
export const DEFAULT_TARGET_TIME = '22:30'
/** 晨间验证时段 */
export const WAKE_START = '06:30'
export const WAKE_END = '08:30'
/** 定时结算时间 */
export const AUTO_SETTLE_TIME = '08:35'
/** 切屏容错秒数 */
export const SCREEN_OUT_LIMIT_SEC = 90
/** 夜间步数增量上限 */
export const STEP_LIMIT = 50
/** 超过该时长未回到小程序，视为锁屏睡觉，不计入切屏违规 */
export const MAX_ABSENCE_SEC = 2 * 60 * 60

/** 微信云开发环境，留空时启用本地演示模式 */
export const CLOUD_ENV = process.env.TARO_APP_CLOUD_ENV || ''
export const WAKEUP_TEMPLATE_ID = process.env.TARO_APP_WAKEUP_TEMPLATE_ID || ''
export const IS_CLOUD_MODE = Boolean(CLOUD_ENV) && process.env.TARO_ENV === 'weapp'

export const STORAGE_KEYS = {
  mockDb: 'sleep-or-not:mock-db:v1',
  mockStepBase: 'sleep-or-not:mock-step-base:v1',
  autoWakeDate: 'sleep-or-not:auto-wake:v1',
  sheetSeen: 'sleep-or-not:sheet-seen:v1',
  guardHiddenAt: 'sleep-or-not:guard-hidden-at:v1'
}

export const DAILY_STATE_LABEL: Record<DailyState, string> = {
  STATE_0_PENDING: '待入睡',
  STATE_1_GUARDING: '守护中',
  STATE_2_AWAITING_WAKE: '待唤醒',
  STATE_3_SUCCESS: '已达标',
  STATE_3_LEAVE: '已请假',
  STATE_3_FAIL: '未达标'
}

export const OPEN_DAILY_STATES: DailyState[] = ['STATE_1_GUARDING', 'STATE_2_AWAITING_WAKE']
export const TERMINAL_DAILY_STATES: DailyState[] = [
  'STATE_3_SUCCESS',
  'STATE_3_LEAVE',
  'STATE_3_FAIL'
]

export function isOpenState(state?: DailyState | null): boolean {
  return Boolean(state && OPEN_DAILY_STATES.includes(state))
}

export function isTerminalState(state?: DailyState | null): boolean {
  return Boolean(state && TERMINAL_DAILY_STATES.includes(state))
}

export const SOUND_OPTIONS = [
  { key: 'mute', label: '静音' },
  { key: 'rain', label: '雨声' },
  { key: 'fire', label: '篝火' }
] as const

export type SoundKey = (typeof SOUND_OPTIONS)[number]['key']
