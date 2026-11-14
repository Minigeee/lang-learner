// The SRS (architecture §4): card state rebuilt by replaying review events through pinned ts-fsrs,
// device-side load balancing, and the daily queue policy from doc 02 with spike D's defaults. ts-fsrs
// stays behind this module, so its version and card shape can change without touching callers.
import { DefaultScheduler, getFuzzRange } from 'ts-fsrs'
import type { CardRecord } from './cards.ts'
import type { CardTemplate, EventEnvelope, EventOf, Rating } from './events.ts'
import type { CardId } from './ids.ts'

/** The pinned scheduler. Changing any of it is a new version, which recomputes every card. */
const CONFIG = { version: 'FSRS-7', desiredRetention: 0.9, enableFuzz: true } as const
export const SRS_VERSION = 'ts-fsrs@6.0.0/FSRS-7/r0.90/fuzz'

export const AGAIN: Rating = 1
export const GOOD: Rating = 3

const DAY = 86_400_000

type Scheduler = Awaited<ReturnType<typeof DefaultScheduler<'FSRS-7'>>>
type FsrsCard = ReturnType<Scheduler['newCard']>
/** The scheduler's card with its times as integer ms, so a state survives JSON. */
type FsrsJson = Omit<FsrsCard, 'dueAt' | 'lastReviewAt'> & { dueAt: number; lastReviewAt: number | null }

export type ReviewEvent = EventOf<'review'>

/** One card's schedule. Callers read the named fields; `fsrs` is this module's own. */
export interface CardState {
  readonly dueAt: number
  readonly lastReviewAt: number | null
  /** Never reviewed, or inside its (re)learning steps: served before reviews. */
  readonly learning: boolean
  readonly stability: number
  readonly reps: number
  /** The review this state last applied; null before the first. */
  readonly lastReviewId: string | null
  readonly fsrs: FsrsJson
}

export interface Srs {
  /** A new card, due at `at`. */
  initial(card: CardId, at: number): CardState
  /**
   * One replay step. The event's recorded `dueAt` is kept only when its `prevReviewId` is the review
   * this state last applied; otherwise ts-fsrs's fuzz, seeded from the card id and reps, decides.
   * Both branches are deterministic. Reviews must arrive in (occurredAt, id) order.
   */
  apply(state: CardState, review: ReviewEvent): CardState
  /** The state a live review at `at` would give, before load balancing, with its interval in days. */
  next(state: CardState, rating: Rating, at: number): { state: CardState; scheduledDays: number }
  /** The chance of recall at `at`: 0 for a card never reviewed. */
  retrievability(state: CardState, at: number): number
}

const toJson = (c: FsrsCard): FsrsJson => ({ ...c, dueAt: +c.dueAt, lastReviewAt: c.lastReviewAt ? +c.lastReviewAt : null })
const fromJson = (c: FsrsJson): FsrsCard => ({ ...c, dueAt: new Date(c.dueAt), lastReviewAt: c.lastReviewAt === null ? null : new Date(c.lastReviewAt) }) as FsrsCard

function stateOf(fsrs: FsrsJson, lastReviewId: string | null): CardState {
  return {
    dueAt: fsrs.dueAt, lastReviewAt: fsrs.lastReviewAt, learning: fsrs.state !== 2, stability: fsrs.stability,
    reps: fsrs.reps, lastReviewId, fsrs,
  }
}

/** The pinned scheduler. ts-fsrs builds it asynchronously, so the app awaits this once at start. */
export async function createSrs(): Promise<Srs> {
  const s = await DefaultScheduler({ ...CONFIG })
  const review = (state: CardState, rating: Rating, at: number) =>
    s.review({ card: fromJson(state.fsrs), grade: rating as never, now: new Date(at) }).card
  return {
    // ts-fsrs seeds its fuzz from the card id, so it must always be passed (spike D §1).
    initial: (card, at) => stateOf(toJson(s.newCard({ cardId: card, now: new Date(at) })), null),
    apply(state, e) {
      const next = toJson(review(state, e.payload.rating, e.occurredAt))
      const fsrs = e.payload.prevReviewId === state.lastReviewId ? { ...next, dueAt: e.payload.dueAt } : next
      return stateOf(fsrs, e.id)
    },
    next(state, rating, at) {
      const card = review(state, rating, at)
      return { state: stateOf(toJson(card), state.lastReviewId), scheduledDays: card.scheduledDays }
    },
    retrievability(state, at) {
      if (state.lastReviewAt === null) return 0
      return s.model.forgettingCurve(fromJson(state.fsrs) as never, Math.max(0, (at - state.lastReviewAt) / DAY))
    },
  }
}

/**
 * Picks a due date inside the fuzz window, weighted toward days with fewer cards due on this device
 * (Anki's load balancer, simplified). It reads local state, so it can't be replayed: the review
 * records the result. Intervals under 2.5 days or over 90 keep the scheduler's own date.
 */
export function loadBalancedDue(next: { state: CardState; scheduledDays: number }, at: number, dueOnDay: (day: number) => number): number {
  const interval = next.scheduledDays
  if (interval < 2.5 || interval > 90) return next.state.dueAt
  const { minInterval, maxInterval } = getFuzzRange(interval, 0, 36500)
  let best = minInterval
  let bestWeight = -1
  for (let d = minInterval; d <= maxInterval; d++) {
    const n = dueOnDay(Math.floor((at + d * DAY) / DAY))
    const weight = (n === 0 ? 1 : (1 / n) ** 2.15) * (1 / d) ** 3
    if (weight > bestWeight) {
      bestWeight = weight
      best = d
    }
  }
  return at + best * DAY
}

/** The day index `loadBalancedDue` counts by. */
export const dueDay = (ms: number): number => Math.floor(ms / DAY)

// ---- the daily queue ----------------------------------------------------------------------------

/** Doc 02's policy with spike D's defaults (FINDINGS §6). There's no low-R tail share: it measured as noise. */
export const QUEUE_POLICY = {
  /** The review cap, as time: about 10 minutes of cards a day. */
  dailyReviewSec: 600,
  newPerDay: 10,
  /** Future review load a new card adds while it matures, in reviews. */
  newCostInReviews: 8,
  /** Seven-day true retention under this halves new cards, once there are enough reviews to say. */
  retentionFloor: 0.8,
  retentionMinReviews: 20,
} as const

/** Seconds a review takes before there are enough logged ones to measure (brainstorm §4.4). */
export const CARD_SEC: Record<CardTemplate, number> = { vocab: 8, skill: 20 }
const MEASURE = { min: 10, last: 200, floorSec: 3, ceilSec: 60 }

/** Today's reviews. What's carried over is never exposed: it only closes the new-card gate. */
export interface DayQueue {
  /** In serving order: first reviews and (re)learning cards, then reviews by retrievability, highest first. */
  cards: { id: CardId; seconds: number }[]
  /** New cards the feed may introduce now: zero while any due review doesn't fit today's budget. */
  newQuota: number
}

/**
 * The median logged seconds per review of each template, from the latest reviews, or `CARD_SEC`
 * until there are enough. Used to size the queue, never to credit time.
 */
export function secondsPerCard(cards: { get(id: CardId): Pick<CardRecord, 'template'> | undefined }, events: readonly EventEnvelope[]): Record<CardTemplate, number> {
  const samples: Record<CardTemplate, number[]> = { vocab: [], skill: [] }
  for (const e of events) {
    if (e.kind !== 'review' || e.v !== 1) continue
    const r = e as ReviewEvent
    const template = cards.get(r.payload.cardId)?.template
    if (template) samples[template].push(r.payload.durationMs / 1000)
  }
  const out = { ...CARD_SEC }
  for (const template of ['vocab', 'skill'] as const) {
    const xs = samples[template].slice(-MEASURE.last).sort((a, b) => a - b)
    if (xs.length < MEASURE.min) continue
    const median = xs[Math.floor(xs.length / 2)]!
    out[template] = Math.min(MEASURE.ceilSec, Math.max(MEASURE.floorSec, Math.round(median)))
  }
  return out
}

/**
 * Builds the queue for the rest of the study day ending at `day.end`: today's budget less the
 * reviews already done since `dayStart`. First reviews and (re)learning cards due now always come
 * first. Reviews due by the day's end follow by retrievability, while they fit.
 */
export function buildQueue(o: {
  cards: readonly CardRecord[]
  srs: Srs
  /** The whole log: today's reviews, the week's retention and today's new cards come from it. */
  events: readonly EventEnvelope[]
  now: number
  day: { start: number; end: number }
  secPerCard: Record<CardTemplate, number>
  /** The day's review time: the owner's setting, else `QUEUE_POLICY.dailyReviewSec`. */
  budgetSec?: number
}): DayQueue {
  const { srs, now, day, secPerCard } = o
  const budget = o.budgetSec ?? QUEUE_POLICY.dailyReviewSec
  const cost = (c: Pick<CardRecord, 'template'>) => secPerCard[c.template]
  const byId = new Map(o.cards.map((c) => [c.id, c]))
  let spent = 0
  let fedToday = 0
  let weekRight = 0
  let weekCount = 0
  for (const e of o.events) {
    if (e.v !== 1) continue
    if (e.kind === 'review') {
      const r = e as ReviewEvent
      const card = byId.get(r.payload.cardId)
      if (e.occurredAt >= day.start && card) spent += cost(card)
      if (e.occurredAt >= now - 7 * DAY && r.payload.prevReviewId !== null) {
        weekCount++
        if (r.payload.rating > AGAIN) weekRight++
      }
    } else if (e.kind === 'card_added' && e.occurredAt >= day.start && (e as EventOf<'card_added'>).payload.via !== 'lesson') {
      fedToday++
    }
  }

  const first = o.cards.filter((c) => c.state.learning && c.state.dueAt <= now).sort((a, b) => a.state.dueAt - b.state.dueAt || (a.id < b.id ? -1 : 1))
  const due = o.cards
    .filter((c) => !c.state.learning && c.state.dueAt < day.end)
    .map((c) => ({ c, r: srs.retrievability(c.state, now) }))
    .sort((a, b) => b.r - a.r || a.c.state.stability - b.c.state.stability || (a.c.id < b.c.id ? -1 : 1))

  const cards = first.map((c) => ({ id: c.id, seconds: cost(c) }))
  let used = spent + cards.reduce((sum, c) => sum + c.seconds, 0)
  let carried = 0
  for (const { c } of due) {
    if (carried === 0 && used + cost(c) <= budget) {
      cards.push({ id: c.id, seconds: cost(c) })
      used += cost(c)
    } else carried++
  }

  let newQuota = 0
  if (carried === 0) {
    const headroom = Math.max(0, budget - used)
    newQuota = Math.min(Math.max(0, QUEUE_POLICY.newPerDay - fedToday), Math.floor(headroom / (QUEUE_POLICY.newCostInReviews * secPerCard.vocab)))
    if (weekCount >= QUEUE_POLICY.retentionMinReviews && weekRight / weekCount < QUEUE_POLICY.retentionFloor) newQuota = Math.floor(newQuota / 2)
  }
  return { cards, newQuota }
}
