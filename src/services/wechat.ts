import Taro from '@tarojs/taro'

import { IS_CLOUD_MODE, WAKEUP_TEMPLATE_ID } from '@/constants'
import { mockRunSteps } from './mock'

export type StepSource = 'werun' | 'mock'

export interface StepResult {
  steps: number
  source: StepSource
}

/**
 * 确认微信运动授权。开发者工具或无微信运动数据时会返回 false，
 * 由调用方给出引导提示。
 */
export async function ensureWeRunAuth(): Promise<boolean> {
  if (!IS_CLOUD_MODE) return true
  try {
    const setting = await Taro.getSetting()
    const status = setting.authSetting?.['scope.werun']
    if (status === true) return true
    if (status === undefined) {
      try {
        await Taro.authorize({ scope: 'scope.werun' })
      } catch {
        // 部分基础库不支持主动 authorize，交给 getWeRunData 首次调用时弹窗
      }
      return true
    }
  } catch (error) {
    console.warn('[wechat] 读取授权状态失败', error)
    return true
  }

  const modal = await Taro.showModal({
    title: '需要微信运动权限',
    content: '夜间步数校验需要读取你的微信运动数据，仅用于判断是否熬夜外出，不会用于其他用途。',
    confirmText: '去授权',
    cancelText: '暂不'
  })
  if (!modal.confirm) return false
  try {
    const opened = await Taro.openSetting()
    return Boolean(opened.authSetting?.['scope.werun'])
  } catch {
    return false
  }
}

/** 读取当前微信运动步数（云端通过 cloudID 解密） */
export async function fetchRunSteps(): Promise<StepResult> {
  if (!IS_CLOUD_MODE) {
    return { steps: await mockRunSteps(), source: 'mock' }
  }

  let cloudID = ''
  try {
    const result = await Taro.getWeRunData()
    cloudID = result.cloudID || ''
  } catch (error) {
    console.warn('[wechat] getWeRunData 失败', error)
    throw new Error('未读取到微信运动步数，请确认已开启微信运动并允许授权')
  }
  if (!cloudID) throw new Error('微信运动数据为空，请稍后重试')

  const response = await Taro.cloud.callFunction({
    name: 'decryptWeRun',
    data: { cloudID }
  })
  const payload = response.result as
    | { ok: boolean; steps?: number; message?: string }
    | undefined
  if (!payload?.ok || typeof payload.steps !== 'number') {
    throw new Error(payload?.message || '微信运动步数解析失败')
  }
  return { steps: payload.steps, source: 'werun' }
}

/** 请求晨间唤醒订阅消息；模板 ID 未配置时静默跳过 */
export async function requestWakeupSubscription(): Promise<'accepted' | 'rejected' | 'skipped'> {
  if (!IS_CLOUD_MODE || !WAKEUP_TEMPLATE_ID) return 'skipped'
  try {
    const result = await Taro.requestSubscribeMessage({
      tmplIds: [WAKEUP_TEMPLATE_ID]
    } as Taro.requestSubscribeMessage.Option)
    return result[WAKEUP_TEMPLATE_ID] === 'accept' ? 'accepted' : 'rejected'
  } catch (error) {
    console.warn('[wechat] 订阅消息授权失败', error)
    return 'rejected'
  }
}

/** 播放/停止本地白噪音 */
let audioContext: Taro.InnerAudioContext | null = null

const SOUND_SRC: Record<'rain' | 'fire', string> = {
  rain: '/assets/audio/rain.m4a',
  fire: '/assets/audio/fire.m4a'
}

export function playAmbient(mode: 'mute' | 'rain' | 'fire'): void {
  stopAmbient()
  if (mode === 'mute') return
  try {
    const context = Taro.createInnerAudioContext()
    context.src = SOUND_SRC[mode]
    context.loop = true
    context.volume = 0.55
    context.onError((error) => {
      console.warn('[ambient] 播放失败', error)
      void Taro.showToast({ title: '白噪音加载失败', icon: 'none' })
    })
    context.play()
    audioContext = context
  } catch (error) {
    console.warn('[ambient] 创建音频失败', error)
  }
}

export function stopAmbient(): void {
  if (!audioContext) return
  try {
    audioContext.stop()
    audioContext.destroy()
  } catch {
    // ignore
  }
  audioContext = null
}
