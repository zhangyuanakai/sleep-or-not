/**
 * 睡了么 · 核心业务云函数
 *
 * 所有会改变押金 / 请假 / 打卡状态的写操作都在云端完成，前端只提交动作与必要参数。
 * 集合：users / challenges / daily_logs / withdrawals
 *
 * 时间统一按北京时间（UTC+8）计算，避免云函数运行时区不一致。
 */
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

const CHALLENGE_DAYS = 22
const DEPOSIT_AMOUNT = 22
const DAILY_REFUND = 1
const BONUS_AMOUNT = 6.66
const LEAVE_TOTAL = 3
const STEP_LIMIT = 50
const SCREEN_OUT_LIMIT_SEC = 90
const WAKE_START_MINUTES = 6 * 60 + 30
const WAKE_END_MINUTES = 8 * 60 + 30
const AUTO_SETTLE_MINUTES = 8 * 60 + 35
const DEFAULT_TARGET_TIME = '22:30'

const OPEN_STATES = ['STATE_1_GUARDING', 'STATE_2_AWAITING_WAKE']
const TERMINAL_STATES = ['STATE_3_SUCCESS', 'STATE_3_LEAVE', 'STATE_3_FAIL']

function ok(data) {
  return { ok: true, data }
}

function fail(message) {
  return { ok: false, message }
}

function pad2(value) {
  return value < 10 ? `0${value}` : `${value}`
}

/** 北京时间 */
function beijingNow() {
  const now = new Date(Date.now() + 8 * 60 * 60 * 1000)
  return {
    date: `${now.getUTCFullYear()}-${pad2(now.getUTCMonth() + 1)}-${pad2(now.getUTCDate())}`,
    minutes: now.getUTCHours() * 60 + now.getUTCMinutes()
  }
}

function todayStr() {
  return beijingNow().date
}

function parseDateUTC(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number)
  return Date.UTC(year, month - 1, day)
}

function dateFromUTC(timestamp) {
  const date = new Date(timestamp)
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`
}

function addDays(dateStr, days) {
  return dateFromUTC(parseDateUTC(dateStr) + days * 86400000)
}

function diffDays(from, to) {
  return Math.round((parseDateUTC(to) - parseDateUTC(from)) / 86400000)
}

function round2(value) {
  return Math.round((Number(value) || 0) * 100) / 100
}

function isOpen(state) {
  return OPEN_STATES.includes(state)
}

function isTerminal(state) {
  return TERMINAL_STATES.includes(state)
}

function isValidTime(value) {
  return typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value)
}

function toMillis(value) {
  if (!value) return Date.now()
  if (typeof value === 'number') return value
  const parsed = new Date(value).getTime()
  return Number.isNaN(parsed) ? Date.now() : parsed
}

function mapUser(doc) {
  if (!doc) return null
  return {
    id: doc._id,
    nickname: doc.nickname || '早睡挑战者',
    avatarUrl: doc.avatar_url || '',
    walletBalance: round2(doc.wallet_balance),
    isBetaVerified: Boolean(doc.is_beta_verified),
    createdAt: toMillis(doc.created_at)
  }
}

function mapChallenge(doc) {
  if (!doc) return null
  return {
    id: doc._id,
    userId: doc.user_id,
    status: doc.status,
    depositAmount: doc.deposit_amount,
    targetSleepTime: doc.target_sleep_time,
    leaveRemaining: doc.leave_remaining,
    bonusEligible: Boolean(doc.bonus_eligible),
    bonusUnlocked: Boolean(doc.bonus_unlocked),
    successDays: doc.success_days || 0,
    leaveDays: doc.leave_days || 0,
    startDate: doc.start_date || '',
    endDate: doc.end_date || '',
    createdAt: toMillis(doc.created_at),
    wechatId: doc.wechat_id || ''
  }
}

function mapLog(doc) {
  if (!doc) return null
  return {
    id: doc._id,
    challengeId: doc.challenge_id,
    userId: doc.user_id,
    date: doc.date,
    state: doc.state,
    sleepStartTime: doc.sleep_start_time || null,
    startSteps: typeof doc.start_steps === 'number' ? doc.start_steps : null,
    endSteps: typeof doc.end_steps === 'number' ? doc.end_steps : null,
    screenOutSeconds: doc.screen_out_seconds || 0,
    refundAmount: round2(doc.refund_amount),
    settledAt: doc.settled_at || null,
    note: doc.note || ''
  }
}

async function getUser(openid, createIfMissing = false) {
  const result = await db.collection('users').where({ _id: openid }).limit(1).get()
  if (result.data.length) return result.data[0]
  if (!createIfMissing) return null
  const user = {
    _id: openid,
    nickname: '早睡挑战者',
    avatar_url: '',
    wallet_balance: 0,
    is_beta_verified: false,
    created_at: Date.now()
  }
  try {
    await db.collection('users').add({ data: user })
    return user
  } catch (error) {
    const retry = await db.collection('users').where({ _id: openid }).limit(1).get()
    if (retry.data.length) return retry.data[0]
    throw error
  }
}

async function getLatestChallenge(openid) {
  const result = await db
    .collection('challenges')
    .where({ user_id: openid })
    .orderBy('created_at', 'desc')
    .limit(1)
    .get()
  return result.data[0] || null
}

async function getChallengeById(challengeId) {
  const result = await db.collection('challenges').where({ _id: challengeId }).limit(1).get()
  return result.data[0] || null
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

async function getLogById(logId) {
  const result = await db.collection('daily_logs').where({ _id: logId }).limit(1).get()
  return result.data[0] || null
}

async function findLog(challengeId, date) {
  const result = await db
    .collection('daily_logs')
    .where({ challenge_id: challengeId, date })
    .limit(1)
    .get()
  return result.data[0] || null
}

async function createLog(openid, challenge, date) {
  const log = {
    challenge_id: challenge._id,
    user_id: openid,
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

/** 22 天全部有终态记录 -> 完赛，并按资格发放 ¥6.66 */
async function maybeComplete(openid, challengeId) {
  const challenge = await getChallengeById(challengeId)
  if (!challenge || challenge.status !== 'ACTIVE' || !challenge.start_date) return
  const logs = await getLogs(challengeId)
  const logByDate = new Map(logs.map((log) => [log.date, log]))
  for (let index = 0; index < CHALLENGE_DAYS; index += 1) {
    const date = addDays(challenge.start_date, index)
    const log = logByDate.get(date)
    if (!log || !isTerminal(log.state)) return
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
      .doc(openid)
      .update({ data: { wallet_balance: _.inc(bonus) } })
  }
}

/**
 * 结算单日。outcome = success | leave | fail。
 * leave 在请假次数耗尽时自动降级为 fail。
 */
async function settleLog(openid, challenge, log, outcome, note) {
  if (!log || isTerminal(log.state)) return log
  let finalOutcome = outcome
  if (finalOutcome === 'leave' && (challenge.leave_remaining || 0) <= 0) {
    finalOutcome = 'fail'
  }

  const patch = {
    settled_at: Date.now(),
    note: note || ''
  }
  const challengePatch = {}
  let refund = 0

  if (finalOutcome === 'success') {
    patch.state = 'STATE_3_SUCCESS'
    patch.refund_amount = DAILY_REFUND
    refund = DAILY_REFUND
    challengePatch.success_days = _.inc(1)
  } else if (finalOutcome === 'leave') {
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
  if (Object.keys(challengePatch).length) {
    await db.collection('challenges').doc(challenge._id).update({ data: challengePatch })
  }
  if (refund > 0) {
    await db
      .collection('users')
      .doc(openid)
      .update({ data: { wallet_balance: _.inc(refund) } })
  }

  await maybeComplete(openid, challenge._id)
  return { ...log, ...patch }
}

function chooseViolationOutcome(challenge) {
  return (challenge.leave_remaining || 0) > 0 ? 'leave' : 'fail'
}

async function buildResult(openid, logId, message) {
  const log = await getLogById(logId)
  const challenge = await getLatestChallenge(openid)
  let outcome = 'fail'
  if (log && log.state === 'STATE_3_SUCCESS') outcome = 'success'
  if (log && log.state === 'STATE_3_LEAVE') outcome = 'leave'
  return {
    outcome,
    refund: log ? round2(log.refund_amount) : 0,
    log: mapLog(log),
    challenge: mapChallenge(challenge),
    message
  }
}

async function requireActive(openid) {
  const challenge = await getLatestChallenge(openid)
  if (!challenge) throw new Error('请先报名 22 天挑战')
  if (challenge.status === 'PENDING_VERIFICATION') throw new Error('报名正在人工核验中，请稍候')
  if (challenge.status === 'COMPLETED') throw new Error('本期挑战已完成，可以开启新一期')
  if (challenge.status !== 'ACTIVE' || !challenge.start_date) throw new Error('当前挑战不可用')
  return challenge
}

/** 激活时补全周期日期：开发者在控制台把 status 改为 ACTIVE 即可 */
async function syncActivation(openid, challenge) {
  if (!challenge || challenge.status !== 'ACTIVE' || challenge.start_date) return challenge
  const today = todayStr()
  const patch = {
    start_date: today,
    end_date: addDays(today, CHALLENGE_DAYS - 1)
  }
  await db.collection('challenges').doc(challenge._id).update({ data: patch })
  await db
    .collection('users')
    .doc(openid)
    .update({ data: { is_beta_verified: true } })
  return { ...challenge, ...patch }
}

/** 打开小程序时补结算超过 08:35 仍未验证的守护记录 */
async function settleStaleLogs(openid, challenge) {
  if (!challenge || challenge.status !== 'ACTIVE' || !challenge.start_date) return
  const { date: today, minutes } = beijingNow()
  if (minutes < AUTO_SETTLE_MINUTES) return

  const logs = await getLogs(challenge._id)
  for (const log of logs) {
    if (!isOpen(log.state) || log.date >= today) continue
    const fresh = await getChallengeById(challenge._id)
    if (!fresh) return
    await settleLog(
      openid,
      fresh,
      log,
      chooseViolationOutcome(fresh),
      'AUTO_MISSED_WAKE'
    )
  }
}

async function snapshot(openid) {
  const user = await getUser(openid, true)
  let challenge = await getLatestChallenge(openid)
  challenge = await syncActivation(openid, challenge)
  await settleStaleLogs(openid, challenge)
  challenge = await getLatestChallenge(openid)
  const logs = challenge ? await getLogs(challenge._id) : []

  return {
    user: mapUser(user),
    challenge: mapChallenge(challenge),
    logs: logs.map(mapLog),
    serverNow: Date.now()
  }
}

async function enroll(openid, event) {
  const existing = await getLatestChallenge(openid)
  if (existing && (existing.status === 'ACTIVE' || existing.status === 'PENDING_VERIFICATION')) {
    throw new Error('你已有一期进行中的挑战')
  }

  const targetSleepTime = isValidTime(event.targetSleepTime)
    ? event.targetSleepTime
    : DEFAULT_TARGET_TIME

  await getUser(openid, true)
  const challenge = {
    user_id: openid,
    status: 'PENDING_VERIFICATION',
    deposit_amount: DEPOSIT_AMOUNT,
    target_sleep_time: targetSleepTime,
    leave_remaining: LEAVE_TOTAL,
    leave_days: 0,
    bonus_eligible: true,
    bonus_unlocked: false,
    success_days: 0,
    start_date: null,
    end_date: null,
    wechat_id: typeof event.wechatId === 'string' ? event.wechatId.slice(0, 64) : '',
    created_at: Date.now()
  }
  await db.collection('challenges').add({ data: challenge })
  return getUser(openid)
}

async function startSleep(openid, event) {
  const challenge = await requireActive(openid)
  const today = todayStr()
  const dayIndex = diffDays(challenge.start_date, today)
  if (dayIndex < 0 || dayIndex >= CHALLENGE_DAYS) throw new Error('当前不在挑战周期内')

  const existing = await findLog(challenge._id, today)
  if (existing && isTerminal(existing.state)) throw new Error('今日挑战已结算，好好休息吧')
  if (existing && isOpen(existing.state)) return mapLog(existing)

  // 先结算历史遗留的未验证记录
  const logs = await getLogs(challenge._id)
  for (const log of logs) {
    if (!isOpen(log.state) || log.date >= today) continue
    const fresh = await getChallengeById(challenge._id)
    if (!fresh) break
    await settleLog(openid, fresh, log, chooseViolationOutcome(fresh), 'AUTO_MISSED_WAKE')
  }

  const log = await createLog(openid, challenge, today)
  const patch = {
    state: 'STATE_1_GUARDING',
    sleep_start_time: Date.now(),
    start_steps: typeof event.startSteps === 'number' ? Math.round(event.startSteps) : null
  }
  await db.collection('daily_logs').doc(log._id).update({ data: patch })
  return mapLog({ ...log, ...patch })
}

async function beginWake(openid, event) {
  const log = await getLogById(event.logId)
  if (!log || log.user_id !== openid) throw new Error('未找到守护记录')
  if (log.state !== 'STATE_1_GUARDING') return mapLog(log)
  await db
    .collection('daily_logs')
    .doc(log._id)
    .update({ data: { state: 'STATE_2_AWAITING_WAKE' } })
  return mapLog({ ...log, state: 'STATE_2_AWAITING_WAKE' })
}

async function verifyWakeup(openid, event) {
  const challenge = await requireActive(openid)
  const log = await getLogById(event.logId)
  if (!log || log.user_id !== openid) throw new Error('未找到昨夜的守护记录')
  if (log.challenge_id !== challenge._id) throw new Error('这条记录不属于当前挑战')
  if (!isOpen(log.state)) throw new Error('这条记录已经结算过了')

  const { date: today, minutes } = beijingNow()
  if (minutes < WAKE_START_MINUTES || minutes > WAKE_END_MINUTES) {
    throw new Error('当前不在唤醒时段（06:30 - 08:30）')
  }
  if (log.date >= today) throw new Error('这条记录需要在次日晨间验证')

  if (typeof event.endSteps !== 'number' || Number.isNaN(event.endSteps)) {
    throw new Error('无法读取微信运动步数，请授权后重试')
  }
  const endSteps = Math.round(event.endSteps)
  await db
    .collection('daily_logs')
    .doc(log._id)
    .update({ data: { end_steps: endSteps } })

  const startSteps = typeof log.start_steps === 'number' ? log.start_steps : 0
  const delta = Math.max(0, endSteps - startSteps)
  const outcome = delta > STEP_LIMIT ? chooseViolationOutcome(challenge) : 'success'
  await settleLog(
    openid,
    challenge,
    log,
    outcome,
    delta > STEP_LIMIT ? `STEP_LIMIT_${delta}` : 'WAKE_VERIFIED'
  )

  const message =
    outcome === 'success'
      ? '早安验证成功，今日 ¥1.00 已退还至钱包'
      : outcome === 'leave'
        ? `夜间步数增加 ${delta} 步，已自动抵扣 1 次请假`
        : `夜间步数增加 ${delta} 步，本次违约已扣除 ¥1.00`
  return buildResult(openid, log._id, message)
}

async function requestLeave(openid) {
  const challenge = await requireActive(openid)
  const today = todayStr()
  const dayIndex = diffDays(challenge.start_date, today)
  if (dayIndex < 0 || dayIndex >= CHALLENGE_DAYS) throw new Error('当前不在挑战周期内')

  let log = await findLog(challenge._id, today)
  if (log && isTerminal(log.state)) throw new Error('今日已经结算，无法请假')
  if (!log) log = await createLog(openid, challenge, today)
  if ((challenge.leave_remaining || 0) <= 0) {
    throw new Error('请假次数已用完，今晚未能入睡将扣除 ¥1.00')
  }

  await settleLog(openid, challenge, log, 'leave', 'MANUAL_LEAVE')
  return buildResult(
    openid,
    log._id,
    '请假成功，今日仍可拿回 ¥1.00，剩余请假次数已更新'
  )
}

async function screenOutTick(openid, event) {
  const log = await getLogById(event.logId)
  if (!log || log.user_id !== openid || !isOpen(log.state)) return null
  const seconds = Math.max(0, Math.round(Number(event.seconds) || 0))
  if (!seconds) return mapLog(log)
  await db
    .collection('daily_logs')
    .doc(log._id)
    .update({ data: { screen_out_seconds: _.inc(seconds) } })
  return mapLog({ ...log, screen_out_seconds: (log.screen_out_seconds || 0) + seconds })
}

async function screenViolation(openid, event) {
  const challenge = await requireActive(openid)
  const log = await getLogById(event.logId)
  if (!log || log.user_id !== openid) throw new Error('未找到守护记录')
  if (log.challenge_id !== challenge._id) throw new Error('这条记录不属于当前挑战')
  if (!isOpen(log.state)) return buildResult(openid, log._id, '本次守护已经结算')
  if ((log.screen_out_seconds || 0) <= SCREEN_OUT_LIMIT_SEC) {
    return buildResult(openid, log._id, '仍在容错期内，继续守护吧')
  }

  const outcome = chooseViolationOutcome(challenge)
  await settleLog(openid, challenge, log, outcome, 'SCREEN_OUT')
  return buildResult(
    openid,
    log._id,
    outcome === 'leave'
      ? `切出小程序 ${log.screen_out_seconds} 秒，已自动抵扣 1 次请假，今日仍退 ¥1.00`
      : `切出小程序 ${log.screen_out_seconds} 秒，本次违约已扣除 ¥1.00`
  )
}

async function updateTarget(openid, event) {
  const challenge = await requireActive(openid)
  if (!isValidTime(event.targetSleepTime)) throw new Error('时间格式不正确')
  const today = todayStr()
  const todayLog = await findLog(challenge._id, today)
  if (todayLog && isOpen(todayLog.state)) {
    throw new Error('今晚已开始守护，明天再调整入睡时间吧')
  }
  await db
    .collection('challenges')
    .doc(challenge._id)
    .update({ data: { target_sleep_time: event.targetSleepTime } })
  return true
}

async function withdraw(openid) {
  const challenge = await getLatestChallenge(openid)
  if (!challenge || challenge.status !== 'COMPLETED') {
    throw new Error('22 天挑战结束后才能申请提现')
  }
  const user = await getUser(openid)
  const amount = round2(user && user.wallet_balance)
  if (amount <= 0) throw new Error('当前没有可提现余额')

  await db
    .collection('users')
    .doc(openid)
    .update({
      data: {
        wallet_balance: _.inc(-amount),
        last_withdraw_at: Date.now()
      }
    })
  await db.collection('withdrawals').add({
    data: {
      user_id: openid,
      challenge_id: challenge._id,
      amount,
      status: 'PENDING',
      created_at: Date.now()
    }
  })
  return amount
}

exports.main = async (event = {}) => {
  const { OPENID } = cloud.getWXContext()
  if (!OPENID) return fail('无法识别用户身份')

  try {
    switch (event.action) {
      case 'snapshot':
        return ok(await snapshot(OPENID))
      case 'enroll':
        return ok(await enroll(OPENID, event))
      case 'startSleep':
        return ok(await startSleep(OPENID, event))
      case 'beginWake':
        return ok(await beginWake(OPENID, event))
      case 'verifyWakeup':
        return ok(await verifyWakeup(OPENID, event))
      case 'requestLeave':
        return ok(await requestLeave(OPENID))
      case 'screenOutTick':
        return ok(await screenOutTick(OPENID, event))
      case 'screenViolation':
        return ok(await screenViolation(OPENID, event))
      case 'updateTarget':
        return ok(await updateTarget(OPENID, event))
      case 'withdraw':
        return ok(await withdraw(OPENID))
      default:
        return fail('未知操作')
    }
  } catch (error) {
    console.error('[challenge] action failed', event.action, error)
    return fail(error.message || '云端服务异常')
  }
}
