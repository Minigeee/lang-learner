// The session builder (architecture §4): turns "15 min" into blocks, from local state only. It hides
// how a session's time splits between reviews and lessons.
import type { FeedPlan } from './feed.ts'
import type { CardId, LessonId } from './ids.ts'
import type { DayQueue } from './srs.ts'

/** The lengths the time picker offers. */
export const SESSION_LENGTHS = [5, 15, 30, 60] as const

/** Seconds a first look at a new word takes, for planning. */
export const FIRST_LOOK_SEC = 20

export type Block =
  /** Reviews, then first looks at new words. Never empty. */
  | { kind: 'reviews'; cards: CardId[]; firstLooks: FeedPlan['next']; seconds: number }
  | { kind: 'lesson'; lesson: LessonId; seconds: number }

export interface SessionPlan {
  minutes: number
  /** Reviews first, then lessons. Empty when there's nothing to do. */
  blocks: Block[]
}

/** A lesson the builder may pick, in path order. */
export interface LessonChoice {
  id: LessonId
  estimateSec: number
  /** A run is open, so it resumes. Open lessons come first. */
  open: boolean
  /** Complete or known: never picked. */
  done: boolean
}

/** A 5-minute session is all reviews; longer ones give reviews at most this share. */
const REVIEW_SHARE = { short: 1, long: 0.5 } as const

/**
 * Reviews take their share of the session, within what today's queue holds; lessons fill the rest
 * in path order, an open one first, while each fits. A short session whose reviews leave room still
 * gets a lesson that fits.
 */
export function buildSession(o: { minutes: number; queue: DayQueue; feed: FeedPlan; lessons: readonly LessonChoice[] }): SessionPlan {
  const total = o.minutes * 60
  const share = o.minutes <= SESSION_LENGTHS[0] ? REVIEW_SHARE.short : REVIEW_SHARE.long
  const reviewBudget = total * share

  const cards: CardId[] = []
  let reviewSec = 0
  for (const c of o.queue.cards) {
    if (reviewSec + c.seconds > reviewBudget && cards.length > 0) break
    cards.push(c.id)
    reviewSec += c.seconds
  }
  const firstLooks: FeedPlan['next'] = []
  for (const f of o.feed.next) {
    if (reviewSec + FIRST_LOOK_SEC > reviewBudget) break
    firstLooks.push(f)
    reviewSec += FIRST_LOOK_SEC
  }

  const blocks: Block[] = cards.length || firstLooks.length ? [{ kind: 'reviews', cards, firstLooks, seconds: reviewSec }] : []
  let left = total - reviewSec
  const candidates = [...o.lessons.filter((l) => l.open && !l.done), ...o.lessons.filter((l) => !l.open && !l.done)]
  for (const l of candidates) {
    if (l.estimateSec > left) break
    blocks.push({ kind: 'lesson', lesson: l.id, seconds: l.estimateSec })
    left -= l.estimateSec
  }
  return { minutes: o.minutes, blocks }
}
