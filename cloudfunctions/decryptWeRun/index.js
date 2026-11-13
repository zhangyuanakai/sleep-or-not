/**
 * 解密微信运动步数
 *
 * 前端通过 Taro.getWeRunData() 拿到 cloudID，云函数用 getOpenData 直接解密，
 * 无需自建服务器保存 session_key。
 */
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event = {}) => {
  const { cloudID } = event
  if (!cloudID) return { ok: false, message: '缺少微信运动 cloudID' }

  try {
    const result = await cloud.getOpenData({ list: [cloudID] })
    const item = result && result.list && result.list[0]
    if (!item || !item.data) {
      return { ok: false, message: '微信运动数据解密失败，请重新授权' }
    }

    const stepInfoList = item.data.stepInfoList || []
    const latest = stepInfoList[stepInfoList.length - 1]
    return {
      ok: true,
      steps: latest ? latest.step : 0,
      timestamp: latest ? latest.timestamp : Math.floor(Date.now() / 1000)
    }
  } catch (error) {
    console.error('[decryptWeRun] failed', error)
    return { ok: false, message: error.message || '微信运动数据解析失败' }
  }
}
