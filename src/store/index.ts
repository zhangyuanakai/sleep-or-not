import Taro from '@tarojs/taro'
import { computed, reactive } from 'vue'

import {
  CHALLENGE_DAYS,
  WAKE_START,
  isOpenState,
  isTerminalState
} from '@/constants'
import { api } from '@/services/api'
import type { ChallengeApi } from '@/services/types'
import {
  ensureWeRunAuth,
  fetchRunSteps,
  requestWakeupSubscription
} from '@/services/wechat'
import type {
  BonusStatus,
  CalendarCell,
  Challenge,
  DailyLog,
  EnrollInput,
  SettlementResult,
  UserProfile
} from '@/types'
import {
  addDays,
  clamp,
  countdownToTarget,
  diffDays,
  parseDateStr,
  sleepWindowProgress,
  toDateStr
} from '@/utils/date'
import { errorMessage } from '@/utils/system'

export interface AppStoreState {
  ready: boolean
  loading: boolean
  error: string
  mode: 'mock' | 'cloud'
  user: UserProfile | null
  challenge: Challenge | null
  logs: DailyLog[]
}

export const state = reactive<AppStoreState>({
  ready: false,
  loading: false,
  error: '',
  mode: api.mode,
  user: null,
  challenge: null,
  logs: []
})

export const clock = reactive({ now: Date.now() })

let clockTimer: ReturnType<typeof setInterval> | null = null
let inFlight: Promise<void> | null = null

export function startClock(): void {
  clock.now = Date.now()
  if (clockTimer) return
  clockTimer = setInterval(() => {
    clock.now = Date.now()
  }, 1000)
}

export const nowDate = computed(() => new Date(clock.now))
export const todayStr = computed(() => toDateStr(nowDate.value))

export const user = computed(() => state.user)
export const challenge = computed(() => state.challenge)
export const logs = computed(() => state.logs)
export const isCloud = computed(() => state.mode === 'cloud')

export const todayLog = computed<DailyLog | null>(() => {
  return state.logs.find((log) => log.date === todayStr.value) ?? null
})

/** 所有尚未结算的守护记录，取最新一条 */
export const openLog = computed<DailyLog | null>(() => {
  const open = state.logs
    .filter((log) => isOpenState(log.state))
    .sort((a, b) => b.date.localeCompare(a.date))
  return open[0] ?? null
})

/** 处于守护中、可以继续守护的记录 */
export const guardingLog = computed<DailyLog | null>(() => {
  if (openLog.value?.state === 'STATE_1_GUARDING') return openLog.value
  return null
})

/** 昨夜未验证、当前已进入晨间时段的记录 */
export const pendingWakeLog = computed<DailyLog | null>(() => {
  const candidate = state.logs
    .filter((log) => isOpenState(log.state) && log.date < todayStr.value)
    .sort((a, b) => b.date.localeCompare(a.date))[0]
  if (!candidate) return null
  const [hour, minute] = WAKE_START.split(':').map(Number)
  const wakeOpenAt = parseDateStr(candidate.date)
  wakeOpenAt.setDate(wakeOpenAt.getDate() + 1)
  wakeOpenAt.setHours(hour, minute, 0, 0)
  return clock.now >= wakeOpenAt.getTime() ? candidate : null
})

export const currentDay = computed(() => {
  const current = state.challenge
  if (!current || !current.startDate) return 0
  return clamp(diffDays(current.startDate, todayStr.value) + 1, 1, CHALLENGE_DAYS)
})

export const calendarCells = computed<CalendarCell[]>(() => {
  const current = state.challenge
  if (!current || !current.startDate) return []
  return Array.from({ length: CHALLENGE_DAYS }, (_, index) => {
    const day = index + 1
    const date = addDays(current.startDate, index)
    const log = state.logs.find((item) => item.date === date)
    return {
      day,
      date,
      state: log?.state ?? 'STATE_0_PENDING',
      refund: log?.refundAmount ?? 0,
      isToday: date === todayStr.value,
      isFuture: date > todayStr.value
    }
  })
})

export const settledCount = computed(
  () => calendarCells.value.filter((cell) => isTerminalState(cell.state)).length
)

export const progressPercent = computed(() => {
  if (!state.challenge) return 0
  return Math.round((settledCount.value / CHALLENGE_DAYS) * 100)
})

export const successCount = computed(
  () => state.logs.filter((log) => log.state === 'STATE_3_SUCCESS').length
)

export const leaveCount = computed(
  () => state.logs.filter((log) => log.state === 'STATE_3_LEAVE').length
)

export const refundedTotal = computed(() =>
  state.logs.reduce((total, log) => total + (log.refundAmount || 0), 0)
)

export const walletBalance = computed(() => state.user?.walletBalance ?? 0)

export const bonusStatus = computed<BonusStatus>(() => {
  const current = state.challenge
  if (!current) return 'LOCKED'
  if (!current.bonusEligible) return 'LOST'
  if (current.bonusUnlocked) return 'UNLOCKED'
  return 'LOCKED'
})

export const bonusLabel = computed(() => {
  if (bonusStatus.value === 'LOST') return '资格已失效'
  if (bonusStatus.value === 'UNLOCKED') return '红包已解锁'
  return '红包待解锁'
})

export const todayResult = computed<SettlementResult['outcome'] | null>(() => {
  const log = todayLog.value
  if (!log || !isTerminalState(log.state)) return null
  if (log.state === 'STATE_3_SUCCESS') return 'success'
  if (log.state === 'STATE_3_LEAVE') return 'leave'
  return 'fail'
})

export const countdownMs = computed(() => {
  const current = state.challenge
  if (!current) return 0
  return countdownToTarget(current.targetSleepTime, nowDate.value)
})

export const ringProgress = computed(() => {
  const current = state.challenge
  if (!current) return 0
  return sleepWindowProgress(current.targetSleepTime, nowDate.value)
})

export const phase = computed<'loading' | 'none' | 'pending' | 'active' | 'completed'>(() => {
  if (!state.ready && state.loading) return 'loading'
  if (!state.challenge) return 'none'
  if (state.challenge.status === 'PENDING_VERIFICATION') return 'pending'
  if (state.challenge.status === 'COMPLETED') return 'completed'
  return 'active'
})

export function findLog(logId: string): DailyLog | null {
  return state.logs.find((log) => log.id === logId) ?? null
}

export function refresh(): Promise<void> {
  if (inFlight) return inFlight
  if (!state.ready) state.loading = true
  inFlight = api
    .getSnapshot()
    .then((snapshot) => {
      state.user = snapshot.user
      state.challenge = snapshot.challenge
      state.logs = snapshot.logs
      state.mode = snapshot.mode
      state.error = ''
      state.ready = true
    })
    .catch((error) => {
      state.error = errorMessage(error, '数据加载失败')
      throw error
    })
    .finally(() => {
      state.loading = false
      inFlight = null
    })
  return inFlight
}

export async function initStore(): Promise<void> {
  try {
    await refresh()
  } catch (error) {
    console.warn('[store] 初始化失败', error)
  }
}

export async function enroll(input: EnrollInput): Promise<void> {
  await api.enroll(input)
  await refresh()
}

export async function startSleep(): Promise<DailyLog> {
  // 订阅授权需要尽量贴近用户点击，先发起再等待授权流程
  const subscription = requestWakeupSubscription()
  const authorized = await ensureWeRunAuth()
  if (!authorized) throw new Error('需要开启微信运动授权才能开始睡眠守护')
  const stepResult = await fetchRunSteps()
  await subscription
  const log = await api.startSleep({ startSteps: stepResult.steps })
  await refresh()
  return log
}

export async function beginWake(logId: string): Promise<DailyLog | null> {
  const log = await api.beginWake(logId)
  if (log) await refresh()
  return log
}

export async function verifyWakeup(
  logId: string,
  endSteps: number | null
): Promise<SettlementResult> {
  const result = await api.verifyWakeup({ logId, endSteps })
  await refresh()
  return result
}

export async function requestLeave(): Promise<SettlementResult> {
  const result = await api.requestLeave()
  await refresh()
  return result
}

export async function addScreenOut(logId: string, seconds: number): Promise<void> {
  const log = state.logs.find((item) => item.id === logId)
  if (log) log.screenOutSeconds += Math.max(0, Math.round(seconds))
  await api.addScreenOut(logId, seconds)
}

export async function reportScreenViolation(logId: string): Promise<SettlementResult> {
  const result = await api.reportScreenViolation(logId)
  await refresh()
  return result
}

export async function updateTargetTime(time: string): Promise<void> {
  await api.updateTargetTime(time)
  await refresh()
}

export async function withdraw(): Promise<number> {
  const amount = await api.withdraw()
  await refresh()
  return amount
}

export async function resetDemo(): Promise<void> {
  if (!api.resetDemo) return
  await api.resetDemo()
  await refresh()
}

export async function clearDemo(): Promise<void> {
  if (!api.clearDemo) return
  await api.clearDemo()
  await refresh()
}

export function notifyError(error: unknown, fallback?: string): void {
  void Taro.showToast({
    title: errorMessage(error, fallback),
    icon: 'none',
    duration: 2200
  })
}

export type { ChallengeApi }
