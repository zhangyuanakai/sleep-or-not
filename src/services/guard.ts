/**
 * 夜间切屏守护
 *
 * 小程序进入后台（切出微信、打开其他 App）时开始计时，回到前台后：
 * - 小于 90 秒：计入累计切屏时长，不判定破戒；
 * - 90 秒 ~ 2 小时，且尚未到次日 06:30：判定守护中断，自动结算请假/违约；
 * - 超过 2 小时或已到晨间时段：视为锁屏睡觉，不计入违规。
 * 计时点会写入 Storage，避免小程序被系统回收后丢失。
 */
import Taro from '@tarojs/taro'

import {
  MAX_ABSENCE_SEC,
  SCREEN_OUT_LIMIT_SEC,
  STORAGE_KEYS,
  WAKE_START
} from '@/constants'
import {
  addScreenOut,
  guardingLog,
  refresh,
  reportScreenViolation
} from '@/store'
import { parseDateStr } from '@/utils/date'

let installed = false
let hiddenAt = 0
let handling = false

function wakeOpenTimestamp(logDate: string): number {
  const [hour, minute] = WAKE_START.split(':').map(Number)
  const date = parseDateStr(logDate)
  date.setDate(date.getDate() + 1)
  date.setHours(hour, minute, 0, 0)
  return date.getTime()
}

async function handleViolation(seconds: number, logId: string): Promise<void> {
  if (handling) return
  handling = true
  try {
    await Taro.showModal({
      title: '守护中断提醒',
      content: `检测到你切出小程序 ${seconds} 秒，已超过 ${SCREEN_OUT_LIMIT_SEC} 秒容错期。本次守护将按契约规则自动结算。`,
      showCancel: false,
      confirmText: '查看结果'
    })
    const result = await reportScreenViolation(logId)
    const title =
      result.outcome === 'leave'
        ? '已自动使用 1 次请假'
        : result.outcome === 'fail'
          ? '今日挑战未达标'
          : '守护已结算'
    await Taro.showModal({
      title,
      content: result.message,
      showCancel: false,
      confirmText: '知道了'
    })
  } catch (error) {
    console.warn('[guard] 处理切屏违规失败', error)
    void Taro.showToast({ title: '守护结算失败，请重新打开小程序', icon: 'none' })
  } finally {
    handling = false
  }
}

export function installGuardTracker(): void {
  if (installed) return
  installed = true

  Taro.onAppHide(() => {
    hiddenAt = Date.now()
    try {
      Taro.setStorageSync(STORAGE_KEYS.guardHiddenAt, hiddenAt)
    } catch {
      // ignore
    }
  })

  Taro.onAppShow(() => {
    let start = hiddenAt
    if (!start) {
      try {
        start = Number(Taro.getStorageSync(STORAGE_KEYS.guardHiddenAt)) || 0
      } catch {
        start = 0
      }
    }
    hiddenAt = 0
    try {
      Taro.removeStorageSync(STORAGE_KEYS.guardHiddenAt)
    } catch {
      // ignore
    }

    const awayMs = start ? Date.now() - start : 0
    void (async () => {
      await refresh().catch(() => undefined)
      if (!start) return

      const seconds = Math.round(awayMs / 1000)
      const log = guardingLog.value
      if (!log || seconds <= 0) return

      // 已到晨间验证时段，或离开时间过长（视为锁屏睡觉），不计入违规
      if (Date.now() >= wakeOpenTimestamp(log.date)) return
      if (seconds >= MAX_ABSENCE_SEC) return

      await addScreenOut(log.id, seconds).catch(() => undefined)

      if (seconds > SCREEN_OUT_LIMIT_SEC) {
        await handleViolation(seconds, log.id)
      }
    })()
  })
}
