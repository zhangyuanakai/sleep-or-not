import type {
  Challenge,
  DailyLog,
  EnrollInput,
  SettlementResult,
  Snapshot,
  StartSleepInput,
  UserProfile
} from '@/types'

export interface VerifyWakeupInput {
  logId: string
  endSteps: number | null
}

/** 前端与「本地演示 / 微信云开发」之间的统一接口 */
export interface ChallengeApi {
  mode: 'mock' | 'cloud'
  getSnapshot(): Promise<Snapshot>
  enroll(input: EnrollInput): Promise<Snapshot>
  startSleep(input: StartSleepInput): Promise<DailyLog>
  beginWake(logId: string): Promise<DailyLog | null>
  verifyWakeup(input: VerifyWakeupInput): Promise<SettlementResult>
  requestLeave(): Promise<SettlementResult>
  addScreenOut(logId: string, seconds: number): Promise<void>
  reportScreenViolation(logId: string): Promise<SettlementResult>
  updateTargetTime(time: string): Promise<void>
  withdraw(): Promise<number>
  resetDemo?(): Promise<void>
  clearDemo?(): Promise<void>
}

export interface CloudSnapshotPayload {
  user: UserProfile
  challenge: Challenge | null
  logs: DailyLog[]
  serverNow: number
}
