// Card replay through pinned ts-fsrs. The scheduler config is part of the "rules" a derive pins.
import { DefaultScheduler, getFuzzRange } from 'ts-fsrs'
import type { Ev } from './events.ts'

export const SCHEDULER_CONFIG = { version: 'FSRS-7', desiredRetention: 0.9, enableFuzz: true } as const
export const scheduler = await DefaultScheduler({ ...SCHEDULER_CONFIG })
export type Scheduler = typeof scheduler
export type FsrsCard = ReturnType<Scheduler['newCard']>

/**
 * 'seeded'   - dueAt is whatever ts-fsrs computes; its fuzz is seeded from `${cardId}${reps}`.
 * 'recorded' - the review event carries the dueAt the device chose (e.g. load-balanced). Replay
 *              uses it only when the event's prevReviewId matches the replayed previous review,
 *              otherwise it falls back to the seeded value. Deterministic either way.
 */
export type DueMode = 'seeded' | 'recorded'

export interface CardState { card: FsrsCard; lastReviewId: string | null }

const DAY = 86_400_000

export function newCardState(cardId: string, now: number, s: Scheduler = scheduler): CardState {
  return { card: s.newCard({ cardId, now: new Date(now) }), lastReviewId: null }
}

/** One review step. Pure: same inputs give the same output on every device. */
export function applyReview(st: CardState, e: Ev, mode: DueMode, s: Scheduler = scheduler): CardState {
  if (e.p.kind !== 'review') throw new Error('not a review')
  const res = s.review({ card: st.card, grade: e.p.rating as any, now: new Date(e.occurredAt) })
  let card = res.card
  if (mode === 'recorded' && e.p.dueAt != null && e.p.prevReviewId === st.lastReviewId) {
    card = { ...card, dueAt: new Date(e.p.dueAt) }
  }
  return { card, lastReviewId: e.id }
}

/** Replays one card's (sorted, non-voided) reviews. */
export function replayCard(cardId: string, reviews: Ev[], mode: DueMode, s: Scheduler = scheduler): CardState {
  let st = newCardState(cardId, reviews[0]?.occurredAt ?? 0, s)
  for (const e of reviews) st = applyReview(st, e, mode, s)
  return st
}

/**
 * Device-side load balancing (doc 02, simplified): pick a due day inside the fuzz window,
 * weighted by how many cards this device already has due that day. Depends on local state,
 * so it is NOT replayable; the result must be recorded in the event.
 */
export function loadBalancedDue(card: FsrsCard, reviewedAt: number, dueCountByDay: (day: number) => number): number {
  const interval = card.scheduledDays
  if (interval < 2.5 || interval > 90) return +card.dueAt
  const { minInterval, maxInterval } = getFuzzRange(interval, 0, 36500)
  let best = minInterval
  let bestW = -1
  for (let d = minInterval; d <= maxInterval; d++) {
    const day = Math.floor((reviewedAt + d * DAY) / DAY)
    const n = dueCountByDay(day)
    const w = (n === 0 ? 1 : (1 / n) ** 2.15) * (1 / d) ** 3
    if (w > bestW) { bestW = w; best = d }
  }
  return reviewedAt + best * DAY
}
