// Event model for the spike. Mirrors architecture §5/§6, plus the fields this spike proposes
// (deviceSeq, review.dueAt, review.prevReviewId). See FINDINGS.md.
import { createHash } from 'node:crypto'

export type Rating = 1 | 2 | 3 | 4

export type Payload =
  | { kind: 'review'; cardId: string; rating: Rating; durationMs: number; dueAt?: number; prevReviewId?: string | null }
  | { kind: 'trial'; itemId: string; lessonId: string; correct: boolean; durationMs: number }
  | { kind: 'span' | 'exposure'; mediaId: string; durationMs: number }
  | { kind: 'setting'; key: string; value: unknown }
  | { kind: 'void'; target: string }
  | { kind: 'mark' } // "I have flushed everything up to here" (proposed, see day close)
  | { kind: 'day_closed'; date: string; xp: number; minutes: number; credit: Credit; rules: Record<string, string> }

export type Credit = 'none' | 'floor' | 'standard' | 'stretch'

export interface Ev {
  id: string
  seq?: number // server-assigned; absent until pulled back
  occurredAt: number // device clock, ms
  deviceId: string
  deviceSeq: number // per-device record order (proposed)
  build: string
  p: Payload
}

export const hashId = (...parts: string[]) =>
  createHash('sha1').update(parts.join('\u0000')).digest('hex').slice(0, 32)

export const cardIdOf = (itemId: string, template: string) => `card:${hashId(itemId, template)}`
export const dayClosedId = (userId: string, date: string) => `dc:${hashId(userId, date)}`

/** Total order used by derive: occurredAt, then id. Never seq. */
export const byTime = (a: Ev, b: Ev) => a.occurredAt - b.occurredAt || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
