/**
 * 本地演示数据层
 *
 * 未配置 TARO_APP_CLOUD_ENV 时启用，完整复刻 22 天契约的状态机：
 * 入睡守护 → 晨间验证 → 成功 / 请假 / 违约，数据保存在本地 Storage。
 */
import Taro from '@tarojs/taro'

import {
  AUTO_SETTLE_TIME,
  BONUS_AMOUNT,
  CHALLENGE_DAYS,
  DAILY_REFUND,
  DEFAULT_TARGET_TIME,
  DEPOSIT_AMOUNT,
  LEAVE_TOTAL,
  SCREEN_OUT_LIMIT_SEC,
  STEP_LIMIT,
  STORAGE_KEYS,
  isOpenState,
  isTerminalState
} from '@/constants'
import type {
  Challenge,
  DailyLog,
  EnrollInput,
  SettlementResult,
  Snapshot,
  StartSleepInput,
  UserProfile
} from '@/types'
import { addDays, diffDays, parseDateStr, toDateStr } from '@/utils/date'
import type { ChallengeApi, VerifyWakeupInput } from './types'

interface MockDB {
  schema: 1
  user: UserProfile
  challenge: Challenge | null
  logs: DailyLog[]
  seq: number
}

const USER_ID = 'demo_user'
let memoryDb: MockDB | null = null

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

function delay(ms = 160): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function makeId(prefix: string, db: MockDB): string {
  db.seq += 1
  return `${prefix}_${Date.now()}_${db.seq}`
}

function seedDB(): MockDB {
  const today = toDateStr()
  const startDate = addDays(today, -13) // 演示数据：已完成 13 天，今天是第 14 天
  const challenge: Challenge = {
    id: 'chal_demo_001',
    userId: USER_ID,
    status: 'ACTIVE',
    depositAmount: DEPOSIT_AMOUNT,
    targetSleepTime: DEFAULT_TARGET_TIME,
    leaveRemaining: LEAVE_TOTAL - 1,
    bonusEligible: true,
    bonusUnlocked: false,
    successDays: 12,
    leaveDays: 1,
    startDate,
    endDate: addDays(startDate, CHALLENGE_DAYS - 1),
    createdAt: Date.now() - 14 * 86400000,
    wechatId: 'demo_wechat'
  }

  const logs: DailyLog[] = []
  for (let day = 1; day <= 13; day += 1) {
    const date = addDays(startDate, day - 1)
    const sleepDate = parseDateStr(date)
    sleepDate.setHours(22, 30, 0, 0)
    const isLeave = day === 9
    logs.push({
      id: `log_seed_${day}`,
      challengeId: challenge.id,
      userId: USER_ID,
      date,
      state: isLeave ? 'STATE_3_LEAVE' : 'STATE_3_SUCCESS',
      sleepStartTime: sleepDate.getTime(),
      startSteps: 4200 + day * 23,
      endSteps: 4210 + day * 23,
      screenOutSeconds: 0,
      refundAmount: DAILY_REFUND,
      settledAt: sleepDate.getTime() + 9 * 3600 * 1000,
      note: isLeave ? '主动请假' : ''
    })
  }

  return {
    schema: 1,
    user: {
      id: USER_ID,
      nickname: '早睡挑战者',
      avatarUrl: '',
      walletBalance: 13,
      isBetaVerified: true,
      createdAt: Date.now() - 14 * 86400000
    },
    challenge,
    logs,
    seq: 0
  }
}

function persist(): void {
  if (!memoryDb) return
  try {
    Taro.setStorageSync(STORAGE_KEYS.mockDb, memoryDb)
  } catch (error) {
    console.warn('[mock] 持久化失败', error)
  }
}

function loadDB(): MockDB {
  if (memoryDb) return memoryDb
  try {
    const stored = Taro.getStorageSync(STORAGE_KEYS.mockDb) as MockDB | ''
    if (stored && stored.schema === 1 && stored.user && Array.isArray(stored.logs)) {
      memoryDb = stored
      return stored
    }
  } catch (error) {
    console.warn('[mock] 读取失败，重新初始化', error)
  }
  memoryDb = seedDB()
  persist()
  return memoryDb
}

function requireActive(db: MockDB): Challenge {
  const challenge = db.challenge
  if (!challenge) throw new Error('请先报名 22 天挑战')
  if (challenge.status === 'PENDING_VERIFICATION') throw new Error('报名正在人工核验中，请稍候')
  if (challenge.status === 'COMPLETED') throw new Error('本期挑战已完成，可以开启新一期')
  if (challenge.status !== 'ACTIVE') throw new Error('当前挑战不可用')
  return challenge
}

function settleDeadline(logDate: string): number {
  const [hour, minute] = AUTO_SETTLE_TIME.split(':').map(Number)
  const deadline = parseDateStr(logDate)
  deadline.setDate(deadline.getDate() + 1)
  deadline.setHours(hour, minute, 0, 0)
  return deadline.getTime()
}

function createLog(db: MockDB, challenge: Challenge, date: string): DailyLog {
  return {
    id: makeId('log', db),
    challengeId: challenge.id,
    userId: USER_ID,
    date,
    state: 'STATE_0_PENDING',
    sleepStartTime: null,
    startSteps: null,
    endSteps: null,
    screenOutSeconds: 0,
    refundAmount: 0,
    settledAt: null
  }
}

/** 22 天全部结束（每一天都有终态记录）即视为完赛 */
function maybeComplete(db: MockDB): void {
  const challenge = db.challenge
  if (!challenge || challenge.status !== 'ACTIVE') return
  let allSettled = true
  for (let index = 0; index < CHALLENGE_DAYS; index += 1) {
    const date = addDays(challenge.startDate, index)
    const log = db.logs.find((item) => item.date === date)
    if (!log || !isTerminalState(log.state)) {
      allSettled = false
      break
    }
  }
  if (!allSettled) return
  challenge.status = 'COMPLETED'
  if (challenge.bonusEligible && !challenge.bonusUnlocked) {
    challenge.bonusUnlocked = true
    db.user.walletBalance = round2(db.user.walletBalance + BONUS_AMOUNT)
  }
}

function settle(
  db: MockDB,
  log: DailyLog,
  outcome: 'success' | 'leave' | 'fail',
  note = ''
): void {
  if (isTerminalState(log.state)) return
  const challenge = db.challenge
  if (!challenge) return

  log.settledAt = Date.now()
  log.note = note

  if (outcome === 'success') {
    log.state = 'STATE_3_SUCCESS'
    log.refundAmount = DAILY_REFUND
    challenge.successDays += 1
    db.user.walletBalance = round2(db.user.walletBalance + DAILY_REFUND)
  } else if (outcome === 'leave' && challenge.leaveRemaining > 0) {
    log.state = 'STATE_3_LEAVE'
    log.refundAmount = DAILY_REFUND
    challenge.leaveRemaining -= 1
    challenge.leaveDays += 1
    db.user.walletBalance = round2(db.user.walletBalance + DAILY_REFUND)
  } else {
    log.state = 'STATE_3_FAIL'
    log.refundAmount = 0
    // 第 4 次违约（请假已用尽）永久失去完赛红包资格
    challenge.bonusEligible = false
  }

  maybeComplete(db)
}

/** 未入睡 / 步数超标 / 切屏超时等违约：优先自动抵扣请假 */
function settleViolation(db: MockDB, log: DailyLog, note: string): void {
  const challenge = db.challenge
  if (!challenge) return
  settle(db, log, challenge.leaveRemaining > 0 ? 'leave' : 'fail', note)
}

function autoSettle(db: MockDB): void {
  const challenge = db.challenge
  if (!challenge || challenge.status !== 'ACTIVE') return

  const today = toDateStr()
  let changed = false

  // 1. 昨夜及更早仍未验证的守护记录，超过 08:35 自动结算
  db.logs.forEach((log) => {
    if (!isOpenState(log.state) || log.date >= today) return
    if (Date.now() >= settleDeadline(log.date)) {
      settleViolation(db, log, 'AUTO_MISSED_WAKE')
      changed = true
    }
  })

  // 2. 补齐历史缺失日：未点击「我要睡了」直接按违约处理
  const elapsedDays = Math.min(Math.max(diffDays(challenge.startDate, today), 0), CHALLENGE_DAYS)
  for (let day = 1; day <= elapsedDays; day += 1) {
    const date = addDays(challenge.startDate, day - 1)
    if (db.logs.some((item) => item.date === date)) continue
    const log = createLog(db, challenge, date)
    db.logs.push(log)
    settleViolation(db, log, 'AUTO_NO_SLEEP')
    changed = true
  }

  // 3. 周期结束且 22 天均有终态记录，标记完赛
  if (today > challenge.endDate) {
    const before = challenge.status
    maybeComplete(db)
    if (before !== challenge.status) changed = true
  }

  if (changed) persist()
}

function snapshot(db: MockDB): Snapshot {
  return {
    mode: 'mock',
    now: Date.now(),
    user: clone(db.user),
    challenge: db.challenge ? clone(db.challenge) : null,
    logs: clone(db.logs)
  }
}

function resultOf(
  db: MockDB,
  log: DailyLog | null,
  message: string
): SettlementResult {
  let outcome: SettlementResult['outcome'] = 'fail'
  if (log?.state === 'STATE_3_SUCCESS') outcome = 'success'
  if (log?.state === 'STATE_3_LEAVE') outcome = 'leave'
  return {
    outcome,
    refund: log?.refundAmount ?? 0,
    log: log ? clone(log) : null,
    challenge: db.challenge ? clone(db.challenge) : null,
    message
  }
}

function mockStepBase(): number {
  const today = toDateStr()
  try {
    const stored = Taro.getStorageSync(STORAGE_KEYS.mockStepBase) as
      | { date: string; steps: number }
      | ''
    if (stored && stored.date === today) return stored.steps
  } catch {
    // ignore
  }
  const steps = 3200 + Math.floor(Math.random() * 3200)
  try {
    Taro.setStorageSync(STORAGE_KEYS.mockStepBase, { date: today, steps })
  } catch {
    // ignore
  }
  return steps
}

export const mockApi: ChallengeApi = {
  mode: 'mock',

  async getSnapshot() {
    await delay(120)
    const db = loadDB()
    autoSettle(db)
    return snapshot(db)
  },

  async enroll(input: EnrollInput) {
    await delay(260)
    const db = loadDB()
    if (db.challenge && (db.challenge.status === 'ACTIVE' || db.challenge.status === 'PENDING_VERIFICATION')) {
      throw new Error('你已有一期进行中的挑战')
    }
    const today = toDateStr()
    const challenge: Challenge = {
      id: makeId('chal', db),
      userId: USER_ID,
      status: 'ACTIVE',
      depositAmount: DEPOSIT_AMOUNT,
      targetSleepTime: input.targetSleepTime || DEFAULT_TARGET_TIME,
      leaveRemaining: LEAVE_TOTAL,
      bonusEligible: true,
      bonusUnlocked: false,
      successDays: 0,
      leaveDays: 0,
      startDate: today,
      endDate: addDays(today, CHALLENGE_DAYS - 1),
      createdAt: Date.now(),
      wechatId: input.wechatId || ''
    }
    db.challenge = challenge
    db.logs = []
    db.user.isBetaVerified = true
    // 保留上一期已结算但尚未提现的钱包余额
    persist()
    return snapshot(db)
  },

  async startSleep(input: StartSleepInput) {
    await delay(200)
    const db = loadDB()
    autoSettle(db)
    const challenge = requireActive(db)
    const today = toDateStr()
    const dayIndex = diffDays(challenge.startDate, today)
    if (dayIndex < 0 || dayIndex >= CHALLENGE_DAYS) {
      throw new Error('当前不在挑战周期内')
    }

    const existing = db.logs.find((log) => log.date === today)
    if (existing && isTerminalState(existing.state)) {
      throw new Error('今日挑战已结算，好好休息吧')
    }
    if (existing && isOpenState(existing.state)) return clone(existing)

    const log = createLog(db, challenge, today)
    log.state = 'STATE_1_GUARDING'
    log.sleepStartTime = Date.now()
    log.startSteps = input.startSteps
    db.logs.push(log)
    persist()
    return clone(log)
  },

  async beginWake(logId: string) {
    await delay(80)
    const db = loadDB()
    const log = db.logs.find((item) => item.id === logId)
    if (!log || !isOpenState(log.state)) return null
    if (log.state === 'STATE_1_GUARDING') {
      log.state = 'STATE_2_AWAITING_WAKE'
      persist()
    }
    return clone(log)
  },

  async verifyWakeup(input: VerifyWakeupInput) {
    await delay(260)
    const db = loadDB()
    autoSettle(db)
    requireActive(db)
    const log = db.logs.find((item) => item.id === input.logId)
    if (!log) throw new Error('未找到昨夜的守护记录')
    if (!isOpenState(log.state)) throw new Error('这条记录已经结算过了')
    if (input.endSteps == null) throw new Error('无法读取微信运动步数，请授权后重试')

    log.endSteps = input.endSteps
    const startSteps = log.startSteps ?? 0
    const delta = Math.max(0, input.endSteps - startSteps)

    if (delta > STEP_LIMIT) {
      settleViolation(db, log, `STEP_LIMIT_${delta}`)
      persist()
      return resultOf(
        db,
        log,
        log.state === 'STATE_3_LEAVE'
          ? `夜间步数增加 ${delta} 步，已自动抵扣 1 次请假`
          : `夜间步数增加 ${delta} 步，本次违约已扣除 ¥1.00`
      )
    }

    settle(db, log, 'success', 'WAKE_VERIFIED')
    persist()
    return resultOf(db, log, '早安验证成功，今日 ¥1.00 已退还至钱包')
  },

  async requestLeave() {
    await delay(200)
    const db = loadDB()
    autoSettle(db)
    const challenge = requireActive(db)
    const today = toDateStr()
    let log = db.logs.find((item) => item.date === today)
    if (log && isTerminalState(log.state)) throw new Error('今日已经结算，无法请假')
    if (challenge.leaveRemaining <= 0) {
      throw new Error('请假次数已用完，今晚未能入睡将扣除 ¥1.00')
    }
    if (!log) {
      log = createLog(db, challenge, today)
      db.logs.push(log)
    }
    settle(db, log, 'leave', 'MANUAL_LEAVE')
    persist()
    return resultOf(db, log, '请假成功，今日仍可拿回 ¥1.00，剩余请假次数已更新')
  },

  async addScreenOut(logId: string, seconds: number) {
    const db = loadDB()
    const log = db.logs.find((item) => item.id === logId)
    if (!log || !isOpenState(log.state)) return
    log.screenOutSeconds += Math.max(0, Math.round(seconds))
    persist()
  },

  async reportScreenViolation(logId: string) {
    await delay(120)
    const db = loadDB()
    const log = db.logs.find((item) => item.id === logId)
    if (!log) throw new Error('未找到守护记录')
    if (!isOpenState(log.state)) {
      return resultOf(db, log, '本次守护已经结算')
    }
    if (log.screenOutSeconds <= SCREEN_OUT_LIMIT_SEC) {
      return resultOf(db, log, '仍在容错期内，继续守护吧')
    }
    settleViolation(db, log, 'SCREEN_OUT')
    persist()
    return resultOf(
      db,
      log,
      log.state === 'STATE_3_LEAVE'
        ? `切出小程序 ${log.screenOutSeconds} 秒，已自动抵扣 1 次请假，今日仍退 ¥1.00`
        : `切出小程序 ${log.screenOutSeconds} 秒，本次违约已扣除 ¥1.00`
    )
  },

  async updateTargetTime(time: string) {
    await delay(100)
    const db = loadDB()
    const challenge = requireActive(db)
    const todayLog = db.logs.find((log) => log.date === toDateStr())
    if (todayLog && isOpenState(todayLog.state)) throw new Error('今晚已开始守护，明天再调整入睡时间吧')
    challenge.targetSleepTime = time
    persist()
  },

  async withdraw() {
    await delay(300)
    const db = loadDB()
    const challenge = db.challenge
    if (!challenge || challenge.status !== 'COMPLETED') {
      throw new Error('22 天挑战结束后才能申请提现')
    }
    const amount = db.user.walletBalance
    if (amount <= 0) throw new Error('当前没有可提现余额')
    db.user.walletBalance = 0
    persist()
    return amount
  },

  async resetDemo() {
    memoryDb = null
    try {
      Taro.removeStorageSync(STORAGE_KEYS.mockDb)
      Taro.removeStorageSync(STORAGE_KEYS.mockStepBase)
    } catch {
      // ignore
    }
    loadDB()
  },

  async clearDemo() {
    memoryDb = {
      schema: 1,
      user: {
        id: USER_ID,
        nickname: '早睡挑战者',
        avatarUrl: '',
        walletBalance: 0,
        isBetaVerified: false,
        createdAt: Date.now()
      },
      challenge: null,
      logs: [],
      seq: 0
    }
    persist()
  }
}

/** 演示模式下的微信运动步数 */
export async function mockRunSteps(): Promise<number> {
  await delay(180)
  return mockStepBase() + Math.floor(Math.random() * 32)
}
