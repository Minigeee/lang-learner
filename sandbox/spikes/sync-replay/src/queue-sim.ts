// Queue-policy simulator for doc 02's buildQueue. Run: npm run queue-sim
// Ground truth = the FSRS-7 default model itself (recall ~ Bernoulli(R)), the standard FSRS-simulator assumption.
import { scheduler, type FsrsCard } from './srs.ts'
import { rng } from './gen-year.ts'

const DAY = 86_400_000
const START = Date.UTC(2026, 0, 1, 2) // 21:00 at UTC-5: bedtime session
const DAYS = 365
const GAPS: Array<[number, number]> = [[100, 107], [220, 234]] // a 1-week and a 2-week break (end exclusive)

export interface Policy {
  reviewCap: number
  tailShare: number
  newCostInReviews: number
  newPerDay: number
  retentionFloor: number
  order: 'r-desc' | 'due-asc' // doc 02 vs Anki's default "due date" order (baseline)
}
export interface UserModel {
  sessionMin: [number, number] // daily session length
  srsShare: number // part of the session spent on cards
  skipProb: number // random missed days
  secPass: number
  secFail: number
  secNew: number
}
const USER: UserModel = { sessionMin: [15, 30], srsShare: 0.5, skipProb: 0.05, secPass: 8, secFail: 15, secNew: 20 }
const BASE: Policy = { reviewCap: 100, tailShare: 0.15, newCostInReviews: 8, newPerDay: 10, retentionFloor: 0.8, order: 'r-desc' }

interface SimCard { id: number; c: FsrsCard }

const R = (c: FsrsCard, at: number) => (c.lastReviewAt ? scheduler.model.forgettingCurve(c, Math.max(0, (at - +c.lastReviewAt) / DAY)) : 0)

export function simulate(P: Policy, U: UserModel, seed: number) {
  const rand = rng(seed)
  const cards: SimCard[] = []
  let nextId = 0
  const recent: Array<{ day: number; ok: number; n: number }> = []
  let reviewsOk = 0, reviewsN = 0, minutesTotal = 0, studyDays = 0
  const backlogLeft: number[] = []
  const meanR: number[] = []
  const recovery: Array<{ gapDays: number; returnDay: number; daysToClear: number | null; retentionDuring: number }> = []

  const answer = (sc: SimCard, at: number, isNew: boolean): { sec: number; ok: boolean } => {
    let ok: boolean
    let grade: 1 | 2 | 3 | 4
    if (isNew) { ok = rand() < 0.75; grade = ok ? 3 : 1 } else {
      ok = rand() < R(sc.c, at)
      grade = ok ? (rand() < 0.08 ? 4 : rand() < 0.08 ? 2 : 3) : 1
    }
    sc.c = scheduler.review({ card: sc.c, grade, now: new Date(at) }).card
    return { sec: isNew ? U.secNew : ok ? U.secPass : U.secFail, ok }
  }

  for (let d = 0; d < DAYS; d++) {
    const now = START + d * DAY
    const inGap = GAPS.some(([a, b]) => d >= a && d < b)
    if (d % 7 === 0 && cards.length) meanR.push(cards.reduce((s, x) => s + R(x.c, now), 0) / cards.length)
    if (inGap || rand() < U.skipProb) { backlogLeft.push(NaN); continue }
    studyDays++
    const endOfStudyDay = now + 7 * 3_600_000 // next 04:00 local
    const budgetSec = (U.sessionMin[0] + rand() * (U.sessionMin[1] - U.sessionMin[0])) * 60 * U.srsShare

    // --- buildQueue (doc 02) ---
    const learning = cards.filter((x) => (x.c.state === 1 || x.c.state === 3) && +x.c.dueAt <= now)
    const due = cards.filter((x) => x.c.state === 2 && +x.c.dueAt < endOfStudyDay).map((x) => ({ x, r: R(x.c, now) }))
    const budget = Math.max(0, P.reviewCap - learning.length)
    const byRdesc = P.order === 'r-desc' ? due.sort((a, b) => b.r - a.r || a.x.c.stability - b.x.c.stability) : due.sort((a, b) => +a.x.c.dueAt - +b.x.c.dueAt)
    const tailN = due.length > budget ? Math.floor(budget * P.tailShare) : 0
    const head = byRdesc.slice(0, budget - tailN)
    const tail = tailN > 0 ? byRdesc.slice(-tailN) : []
    const reviews = [...head, ...tail].map((y) => y.x)
    const carriedOver = due.length - reviews.length
    let newQuota = P.newPerDay
    if (carriedOver > 0) newQuota = 0
    else newQuota = Math.min(newQuota, Math.floor(Math.max(0, P.reviewCap - learning.length - reviews.length) / P.newCostInReviews))
    const last7 = recent.filter((x) => x.day > d - 7)
    const n7 = last7.reduce((s, x) => s + x.n, 0)
    if (n7 >= 20 && last7.reduce((s, x) => s + x.ok, 0) / n7 < P.retentionFloor) newQuota = Math.floor(newQuota / 2)

    // --- run the session until the queue or the time runs out ---
    let t = now, spent = 0, ok = 0, n = 0, doneReviews = 0
    const intraday: SimCard[] = []
    const queue: Array<{ sc: SimCard; isNew: boolean }> = [...learning.map((sc) => ({ sc, isNew: false })), ...reviews.map((sc) => ({ sc, isNew: false }))]
    for (let k = 0; k < newQuota; k++) queue.push({ sc: { id: nextId++, c: scheduler.newCard({ cardId: `card:${seed}:${nextId}`, now: new Date(now) }) }, isNew: true })
    const step = (sc: SimCard, isNew: boolean) => {
      if (isNew) cards.push(sc)
      const wasReview = sc.c.state === 2
      const res = answer(sc, t, isNew)
      if (wasReview) { n++; if (res.ok) ok++; doneReviews++ }
      spent += res.sec
      t += res.sec * 1000
      if (sc.c.state !== 2 && +sc.c.dueAt < now + budgetSec * 1000 + 600_000) intraday.push(sc)
    }
    while (spent < budgetSec && (queue.length || intraday.length)) {
      intraday.sort((a, b) => +a.c.dueAt - +b.c.dueAt)
      if (intraday.length && (+intraday[0].c.dueAt <= t || !queue.length)) {
        const sc = intraday.shift()!
        t = Math.max(t, +sc.c.dueAt)
        step(sc, false)
      } else {
        const q = queue.shift()!
        step(q.sc, q.isNew)
      }
    }
    minutesTotal += spent / 60
    reviewsOk += ok
    reviewsN += n
    recent.push({ day: d, ok, n })
    const left = carriedOver + (reviews.length - Math.min(doneReviews, reviews.length))
    backlogLeft.push(left)
  }

  for (const [a, b] of GAPS) {
    let clear: number | null = null
    let okN = 0, nN = 0
    for (let d = b; d < DAYS; d++) {
      const r = recent.find((x) => x.day === d)
      if (r) { okN += r.ok; nN += r.n }
      if (backlogLeft[d] === 0) { clear = d - b; break }
    }
    recovery.push({ gapDays: b - a, returnDay: b, daysToClear: clear, retentionDuring: nN ? okN / nN : NaN })
  }
  const end = START + DAYS * DAY
  return {
    learned: cards.length,
    trueRetention: reviewsOk / reviewsN,
    meanR: meanR.reduce((s, x) => s + x, 0) / meanR.length,
    endMeanR: cards.reduce((s, x) => s + R(x.c, end), 0) / cards.length,
    endBelow50: cards.filter((x) => R(x.c, end) < 0.5).length,
    minPerStudyDay: minutesTotal / studyDays,
    recovery,
    steadyBacklogDays: backlogLeft.filter((x, d) => d < 100 && x > 0).length,
  }
}

const fmt = (x: number, k = 3) => (Number.isFinite(x) ? x.toFixed(k) : '-')
function runGrid(label: string, U: UserModel, policies: Policy[], seeds = [1, 2, 3]) {
  console.log(`\n=== ${label}: SRS time ${U.sessionMin[0] * U.srsShare}-${U.sessionMin[1] * U.srsShare} min/day, ${U.skipProb * 100}% random skips, gaps ${GAPS.map(([a, b]) => `${b - a}d@${a}`).join(', ')}; mean of ${seeds.length} seeds ===`)
  console.log('cap  tail newCost order | learned  trueRet  meanR  endR  R<.5 | min/day | 1wk: clear days, ret | 2wk: clear days, ret')
  for (const P of policies) {
    const rs = seeds.map((s) => simulate(P, U, s))
    const avg = (f: (r: (typeof rs)[number]) => number) => rs.reduce((s, r) => s + f(r), 0) / rs.length
    const clear = (i: number) => {
      const xs = rs.map((r) => r.recovery[i].daysToClear)
      return xs.every((x) => x !== null) ? fmt(xs.reduce((s, x) => s + x!, 0) / xs.length, 1) : `${xs.filter((x) => x === null).length}/${xs.length} never`
    }
    console.log(
      `${String(P.reviewCap).padStart(3)}  ${P.tailShare.toFixed(2)} ${String(P.newCostInReviews).padStart(4)} ${P.order.padEnd(7)} | ${fmt(avg((r) => r.learned), 0).padStart(6)}   ${fmt(avg((r) => r.trueRetention))}  ${fmt(avg((r) => r.meanR))}  ${fmt(avg((r) => r.endMeanR))} ${fmt(avg((r) => r.endBelow50), 0).padStart(4)} | ${fmt(avg((r) => r.minPerStudyDay), 1).padStart(6)}  | ${clear(0).padStart(10)}, ${fmt(avg((r) => r.recovery[0].retentionDuring))} | ${clear(1).padStart(10)}, ${fmt(avg((r) => r.recovery[1].retentionDuring))}`,
    )
  }
}

const grid: Policy[] = []
for (const reviewCap of [60, 100, 150]) for (const tailShare of [0, 0.15, 0.3]) for (const newCostInReviews of [4, 8, 12]) grid.push({ ...BASE, reviewCap, tailShare, newCostInReviews })
const t0 = performance.now()
runGrid('bedtime user (half the session on cards)', USER, grid)
runGrid('card-heavy user (whole session on cards)', { ...USER, srsShare: 1 }, grid.filter((p) => p.tailShare === 0.15 || p.newCostInReviews === 8))
// A user whose card time is below the steady load: a permanent backlog, where tailShare and order matter.
const over: UserModel = { ...USER, sessionMin: [5, 8], srsShare: 1, skipProb: 0.15 }
const overGrid: Policy[] = []
for (const order of ['r-desc', 'due-asc'] as const) for (const tailShare of [0, 0.15, 0.3]) overGrid.push({ ...BASE, newPerDay: 20, newCostInReviews: 4, reviewCap: 60, tailShare, order })
runGrid('overloaded user (5-8 min/day, 15% skips, aggressive new cards)', over, overGrid)
// Baseline order for the normal user.
runGrid('bedtime user, due-date order baseline', USER, [{ ...BASE }, { ...BASE, order: 'due-asc' }, { ...BASE, reviewCap: 60 }, { ...BASE, reviewCap: 60, order: 'due-asc' }])
console.log(`\n(${((performance.now() - t0) / 1000).toFixed(0)} s)`)
