/**
 * 每日自动结算（定时触发器：每天 08:35）
 *
 * 扫描所有 ACTIVE 挑战：
 * - 昨夜仍未完成晨间验证的记录 -> 自动请假 / 违约；
 * - 漏睡、未点击「我要睡了」的日期 -> 自动补记请假 / 违约；
 * - 22 天全部结算 -> 标记完赛并按资格发放 ¥6.66。
 */
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

const CHALLENGE_DAYS = 22
const DAILY_REFUND = 1
const BONUS_AMOUNT = 6.66
const OPEN_STATES = ['STATE_1_GUARDING', 'STATE_2_AWAITING_WAKE']
const TERMINAL_STATES = ['STATE_3_SUCCESS', 'STATE_3_LEAVE', 'STATE_3_FAIL']

function pad2(value) {
  return value < 10 ? `0${value}` : `${value}`
}

function beijingToday() {
  const date = new Date(Date.now() + 8 * 60 * 60 * 1000)
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`
}

function parseUTC(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number)
  return Date.UTC(year, month - 1, day)
}

function addDays(dateStr, days) {
  const date = new Date(parseUTC(dateStr) + days * 86400000)
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`
}

function diffDays(from, to) {
  return Math.round((parseUTC(to) - parseUTC(from)) / 86400000)
}

function isOpen(state) {
  return OPEN_STATES.includes(state)
}

function isTerminal(state) {
  return TERMINAL_STATES.includes(state)
}

async function getLogs(challengeId) {
  const result = await db
    .collection('daily_logs')
    .where({ challenge_id: challengeId })
    .orderBy('date', 'asc')
    .limit(100)
    .get()
  return result.data
}

async function createLog(challenge, date) {
  const log = {
    challenge_id: challenge._id,
    user_id: challenge.user_id,
    date,
    state: 'STATE_0_PENDING',
    sleep_start_time: null,
    start_steps: null,
    end_steps: null,
    screen_out_seconds: 0,
    refund_amount: 0,
    settled_at: null,
    note: ''
  }
  const result = await db.collection('daily_logs').add({ data: log })
  return { ...log, _id: result._id }
}

async function settleOne(challengeId, log, note) {
  // 每次结算前刷新，确保请假次数准确
  const challengeResult = await db.collection('challenges').doc(challengeId).get()
  const challenge = challengeResult.data
  if (!challenge || challenge.status !== 'ACTIVE') return false
  if (isTerminal(log.state)) return false

  const useLeave = (challenge.leave_remaining || 0) > 0
  const patch = {
    settled_at: Date.now(),
    note
  }
  const challengePatch = {}
  let refund = 0

  if (useLeave) {
    patch.state = 'STATE_3_LEAVE'
    patch.refund_amount = DAILY_REFUND
    refund = DAILY_REFUND
    challengePatch.leave_remaining = _.inc(-1)
    challengePatch.leave_days = _.inc(1)
  } else {
    patch.state = 'STATE_3_FAIL'
    patch.refund_amount = 0
    challengePatch.bonus_eligible = false
  }

  await db.collection('daily_logs').doc(log._id).update({ data: patch })
  await db.collection('challenges').doc(challengeId).update({ data: challengePatch })
  if (refund > 0) {
    await db
      .collection('users')
      .doc(challenge.user_id)
      .update({ data: { wallet_balance: _.inc(refund) } })
  }
  return true
}

async function maybeComplete(challengeId) {
  const challengeResult = await db.collection('challenges').doc(challengeId).get()
  const challenge = challengeResult.data
  if (!challenge || challenge.status !== 'ACTIVE' || !challenge.start_date) return false
  const logs = await getLogs(challengeId)
  const logByDate = new Map(logs.map((log) => [log.date, log]))

  for (let index = 0; index < CHALLENGE_DAYS; index += 1) {
    const date = addDays(challenge.start_date, index)
    const log = logByDate.get(date)
    if (!log || !isTerminal(log.state)) return false
  }

  const patch = { status: 'COMPLETED' }
  let bonus = 0
  if (challenge.bonus_eligible && !challenge.bonus_unlocked) {
    patch.bonus_unlocked = true
    bonus = BONUS_AMOUNT
  }
  await db.collection('challenges').doc(challengeId).update({ data: patch })
  if (bonus > 0) {
    await db
      .collection('users')
      .doc(challenge.user_id)
      .update({ data: { wallet_balance: _.inc(bonus) } })
  }
  return true
}

exports.main = async () => {
  const today = beijingToday()
  let settled = 0
  let completed = 0
  let scanned = 0

  try {
    const result = await db
      .collection('challenges')
      .where({ status: 'ACTIVE' })
      .limit(100)
      .get()

    for (const challenge of result.data) {
      scanned += 1
      if (!challenge.start_date) continue

      const logs = await getLogs(challenge._id)
      let changed = false

      // 从挑战第 1 天遍历到昨天，处理漏睡与未验证的记录
      const elapsed = Math.min(diffDays(challenge.start_date, today), CHALLENGE_DAYS)
      for (let day = 0; day < elapsed; day += 1) {
        const date = addDays(challenge.start_date, day)
        if (date >= today) break
        let log = logs.find((item) => item.date === date)
        if (!log) {
          log = await createLog(challenge, date)
          logs.push(log)
          if (await settleOne(challenge._id, log, 'AUTO_NO_SLEEP')) {
            settled += 1
            changed = true
          }
          continue
        }
        if (isOpen(log.state)) {
          if (await settleOne(challenge._id, log, 'AUTO_MISSED_WAKE')) {
            settled += 1
            changed = true
          }
        }
      }

      if (changed && (await maybeComplete(challenge._id))) {
        completed += 1
      }
    }
  } catch (error) {
    console.error('[dailyAutoSettle] failed', error)
    return { ok: false, message: error.message, scanned, settled, completed }
  }

  return { ok: true, date: today, scanned, settled, completed }
}
