import Taro from '@tarojs/taro'

interface WindowMetrics {
  statusBarHeight: number
  windowHeight: number
}

function getMetrics(): WindowMetrics {
  try {
    const info = Taro.getWindowInfo()
    return {
      statusBarHeight: info.statusBarHeight || 20,
      windowHeight: info.windowHeight || 667
    }
  } catch (error) {
    const info = Taro.getSystemInfoSync()
    return {
      statusBarHeight: info.statusBarHeight || 20,
      windowHeight: info.windowHeight || 667
    }
  }
}

const metrics = getMetrics()

export const statusBarHeight = metrics.statusBarHeight
export const windowHeight = metrics.windowHeight
export const windowWidth = (() => {
  try {
    return Taro.getWindowInfo().windowWidth || 375
  } catch {
    return Taro.getSystemInfoSync().windowWidth || 375
  }
})()

/**
 * 行内样式里的 rpx 在 H5 端不会被 PostCSS 转换，统一换算成 px，
 * 保证小程序与 H5 预览的尺寸一致（750 设计稿，宽屏按 750 封顶）。
 */
export function rpx2px(value: number): number {
  if (process.env.TARO_ENV === 'h5') {
    // 与 Taro H5 的 rem 脚本保持一致：按视口短边换算，并限制在 0.5 ~ 1 倍
    const scale = Math.min(
      1,
      Math.max(0.5, Math.min(windowWidth, windowHeight) / 750)
    )
    return value * scale
  }
  // 小程序端 rpx：750rpx 始终等于屏幕宽度
  return (windowWidth / 750) * value
}

interface MenuButtonRect {
  left: number
  right: number
  top: number
  bottom: number
  width: number
  height: number
}

function getMenuButtonRect(): MenuButtonRect {
  try {
    const rect = Taro.getMenuButtonBoundingClientRect()
    if (rect && rect.left > 0) return rect
  } catch {
    // H5 等环境不支持胶囊信息
  }
  return { left: 0, right: 0, top: 0, bottom: 0, width: 0, height: 0 }
}

export const menuButtonRect = getMenuButtonRect()

/** 自定义导航栏右上角需要给微信胶囊让出的宽度（px） */
export const menuSafeRight = menuButtonRect.left
  ? Math.max(rpx2px(28), windowWidth - menuButtonRect.left + 8)
  : rpx2px(28)

export function toast(title: string, icon: 'none' | 'success' | 'error' = 'none'): void {
  void Taro.showToast({ title, icon, duration: 2000 })
}

export function errorMessage(error: unknown, fallback = '操作失败，请稍后再试'): string {
  if (error instanceof Error && error.message) return error.message
  if (typeof error === 'string' && error) return error
  return fallback
}
