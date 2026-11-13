/**
 * 晨间唤醒订阅消息（定时触发器：每天 06:30）
 *
 * 前置条件：
 * 1. 微信公众平台「订阅消息」中申请早安提醒模板；
 * 2. 在云开发控制台给本云函数配置环境变量 WAKEUP_TEMPLATE_ID；
 * 3. 模板字段与下方 data 保持一致，或按你的模板修改 data。
 */
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

const TEMPLATE_ID = process.env.WAKEUP_TEMPLATE_ID || ''
const MINIPROGRAM_STATE = process.env.MINIPROGRAM_STATE || 'formal'
const OPEN_STATES = ['STATE_1_GUARDING', 'STATE_2_AWAITING_WAKE']

function pad2(value) {
  return value < 10 ? `0${value}` : `${value}`
}

function beijingDate(offsetDays = 0) {
  const date = new Date(Date.now() + 8 * 60 * 60 * 1000 + offsetDays * 86400000)
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`
}

exports.main = async () => {
  if (!TEMPLATE_ID) {
    console.warn('[pushWakeupNotice] 未配置 WAKEUP_TEMPLATE_ID，跳过推送')
    return { ok: true, skipped: true, message: '未配置订阅消息模板 ID' }
  }

  const targetDate = beijingDate(-1)
  let sent = 0
  let failed = 0

  try {
    const result = await db
      .collection('daily_logs')
      .where({
        date: targetDate,
        state: _.in(OPEN_STATES)
      })
      .limit(100)
      .get()

    for (const log of result.data) {
      try {
        await cloud.openapi.subscribeMessage.send({
          touser: log.user_id,
          templateId: TEMPLATE_ID,
          page: `pages/wake/index?logId=${log._id}`,
          miniprogramState: MINIPROGRAM_STATE,
          lang: 'zh_CN',
          // 字段名需与微信公众平台中申请的模板一致
          data: {
            thing1: { value: '早安，来领取今日 ¥1.00 契约返还' },
            time2: { value: '06:30 - 08:30' },
            thing3: { value: '完成 4 位图形验证即可结算' }
          }
        })
        sent += 1
      } catch (error) {
        failed += 1
        console.error('[pushWakeupNotice] send failed', log.user_id, error.errCode, error.errMsg)
      }
    }
  } catch (error) {
    console.error('[pushWakeupNotice] query failed', error)
    return { ok: false, message: error.message }
  }

  return { ok: true, date: targetDate, sent, failed }
}
