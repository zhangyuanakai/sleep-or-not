import Taro from '@tarojs/taro'

import { STORAGE_KEYS } from '@/constants'
import { pendingWakeLog, refresh } from '@/store'
import { isInWakeWindow } from '@/utils/date'

let prompting = false

/**
 * 打开首页 / 战绩页时自动进入晨间验证。
 * 每个守护记录每天只自动弹出一次，避免用户从验证页返回时被反复打扰。
 */
export async function maybeAutoOpenWake(): Promise<void> {
  if (prompting) return
  await refresh().catch(() => undefined)

  const log = pendingWakeLog.value
  if (!log || !isInWakeWindow()) return

  try {
    if (Taro.getStorageSync(STORAGE_KEYS.autoWakeDate) === log.date) return
    Taro.setStorageSync(STORAGE_KEYS.autoWakeDate, log.date)
  } catch {
    // Storage 不可用时仍允许跳转
  }

  prompting = true
  setTimeout(() => {
    void Taro.navigateTo({ url: `/pages/wake/index?logId=${log.id}` })
      .catch(() => undefined)
      .finally(() => {
        prompting = false
      })
  }, 700)
}
