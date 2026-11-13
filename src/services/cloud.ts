/**
 * 微信云开发数据层
 *
 * 所有业务写操作都在 challenge 云函数内完成，前端只负责展示与交互。
 */
import Taro from '@tarojs/taro'

import type {
  DailyLog,
  EnrollInput,
  SettlementResult,
  Snapshot,
  StartSleepInput
} from '@/types'
import type { ChallengeApi, CloudSnapshotPayload, VerifyWakeupInput } from './types'

interface CloudEnvelope<T> {
  ok: boolean
  data?: T
  message?: string
}

async function call<T>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  const response = await Taro.cloud.callFunction({
    name: 'challenge',
    data: { action, ...payload }
  })
  const envelope = response.result as CloudEnvelope<T> | undefined
  if (!envelope || envelope.ok !== true) {
    throw new Error(envelope?.message || '云端服务暂时不可用')
  }
  return envelope.data as T
}

export const cloudApi: ChallengeApi = {
  mode: 'cloud',

  async getSnapshot() {
    const payload = await call<CloudSnapshotPayload>('snapshot')
    const snapshot: Snapshot = {
      mode: 'cloud',
      now: payload.serverNow || Date.now(),
      user: payload.user,
      challenge: payload.challenge,
      logs: payload.logs || []
    }
    return snapshot
  },

  async enroll(input: EnrollInput) {
    await call('enroll', {
      targetSleepTime: input.targetSleepTime,
      wechatId: input.wechatId
    })
    const payload = await call<CloudSnapshotPayload>('snapshot')
    return {
      mode: 'cloud' as const,
      now: payload.serverNow || Date.now(),
      user: payload.user,
      challenge: payload.challenge,
      logs: payload.logs || []
    }
  },

  startSleep(input: StartSleepInput) {
    return call<DailyLog>('startSleep', { startSteps: input.startSteps })
  },

  async beginWake(logId: string) {
    return call<DailyLog | null>('beginWake', { logId })
  },

  verifyWakeup(input: VerifyWakeupInput) {
    return call<SettlementResult>('verifyWakeup', {
      logId: input.logId,
      endSteps: input.endSteps
    })
  },

  requestLeave() {
    return call<SettlementResult>('requestLeave')
  },

  async addScreenOut(logId: string, seconds: number) {
    await call('screenOutTick', { logId, seconds })
  },

  reportScreenViolation(logId: string) {
    return call<SettlementResult>('screenViolation', { logId })
  },

  async updateTargetTime(time: string) {
    await call('updateTarget', { targetSleepTime: time })
  },

  withdraw() {
    return call<number>('withdraw')
  }
}
