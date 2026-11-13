/** 挑战周期状态 */
export type ChallengeStatus =
  | 'PENDING_VERIFICATION' // 已提交押金，等待发起人人工核验
  | 'ACTIVE'
  | 'COMPLETED'
  | 'FAILED'

/** 单日打卡状态（与云数据库 daily_logs.state 保持一致） */
export type DailyState =
  | 'STATE_0_PENDING'
  | 'STATE_1_GUARDING'
  | 'STATE_2_AWAITING_WAKE'
  | 'STATE_3_SUCCESS'
  | 'STATE_3_LEAVE'
  | 'STATE_3_FAIL'

export interface UserProfile {
  id: string
  nickname: string
  avatarUrl: string
  /** 可提现余额（元），包含每日返还与已解锁的完赛红包 */
  walletBalance: number
  /** 内测期人工核验激活状态 */
  isBetaVerified: boolean
  createdAt: number
}

export interface Challenge {
  id: string
  userId: string
  status: ChallengeStatus
  /** 初始押金 */
  depositAmount: number
  /** 约定入睡时间 HH:mm */
  targetSleepTime: string
  /** 剩余请假次数，初始 3 */
  leaveRemaining: number
  /** 是否仍具备 ¥6.66 完赛红包资格 */
  bonusEligible: boolean
  /** 完赛红包是否已解锁并入账 */
  bonusUnlocked: boolean
  /** 达标天数 */
  successDays: number
  /** 请假天数 */
  leaveDays: number
  startDate: string
  endDate: string
  createdAt: number
  /** 内测期填写的微信号，便于人工核对转账 */
  wechatId?: string
}

export interface DailyLog {
  id: string
  challengeId: string
  userId: string
  /** 入睡当晚日期 YYYY-MM-DD，晨间验证发生在其次日 */
  date: string
  state: DailyState
  /** 点击「我要睡了」的时间戳 */
  sleepStartTime: number | null
  /** 睡前微信运动基准步数 */
  startSteps: number | null
  /** 晨间微信运动步数 */
  endSteps: number | null
  /** 夜间累计切出小程序秒数 */
  screenOutSeconds: number
  /** 当日退还金额 */
  refundAmount: number
  settledAt: number | null
  /** 结算备注：AUTO_LEAVE / AUTO_FAIL / SCREEN_OUT / STEP_LIMIT 等 */
  note?: string
}

export interface Snapshot {
  mode: 'mock' | 'cloud'
  now: number
  user: UserProfile | null
  challenge: Challenge | null
  logs: DailyLog[]
}

export interface CalendarCell {
  day: number
  date: string
  state: DailyState
  refund: number
  isToday: boolean
  isFuture: boolean
}

export type BonusStatus = 'LOCKED' | 'UNLOCKED' | 'LOST'

export interface SettlementResult {
  /** success=按时完成, leave=消耗请假（仍退 ¥1）, fail=扣款 */
  outcome: 'success' | 'leave' | 'fail'
  refund: number
  log: DailyLog | null
  challenge: Challenge | null
  message: string
}

export interface EnrollInput {
  targetSleepTime: string
  wechatId: string
}

export interface StartSleepInput {
  startSteps: number | null
}
