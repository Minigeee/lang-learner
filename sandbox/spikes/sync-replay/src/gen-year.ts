// Generates a realistic year of events for two devices (deterministic PRNG).
import { cardIdOf, dayClosedId, type Ev, type Rating } from './events.ts'

export interface YearSpec { reviews: number; trials: number; spans: number; exposures: number; days: number }
export const YEAR: YearSpec = { reviews: 40_000, trials: 70_000, spans: 15_000, exposures: 15_000, days: 365 }

const DAY = 86_400_000
const START = Date.UTC(2026, 0, 1, 9)

export function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function generateYear(spec: YearSpec = YEAR, seed = 1): Ev[] {
  const r = rng(seed)
  const out: Ev[] = []
  let n = 0
  const dev = () => (r() < 0.6 ? 'phone' : 'laptop')
  const at = (day: number) => START + day * DAY + Math.floor(r() * 14 * 3_600_000)
  const push = (occurredAt: number, p: Ev['p'], id?: string) => {
    const deviceId = dev()
    out.push({ id: id ?? `ev:${deviceId}:${++n}`, occurredAt, deviceId, deviceSeq: n, build: 'b1', p })
  }

  // Reviews: cards introduced evenly over the year; each card reviewed at growing intervals.
  // ~11 reviews per card, truncated at year end, cards introduced evenly until the review budget is spent.
  const reviewsPerCard = 11
  const estCards = Math.ceil((spec.reviews / reviewsPerCard) * 1.35)
  let made = 0
  for (let c = 0; made < spec.reviews; c++) {
    const cardId = cardIdOf(`zh:w:${c}`, 'recog')
    let day = Math.floor(((c % estCards) / estCards) * spec.days)
    let interval = 1
    for (let k = 0; k < reviewsPerCard && made < spec.reviews && day < spec.days; k++) {
      const rating = (r() < 0.12 ? 1 : r() < 0.1 ? 2 : r() < 0.9 ? 3 : 4) as Rating
      push(at(day), { kind: 'review', cardId, rating, durationMs: 6000 + Math.floor(r() * 10_000), dueAt: undefined, prevReviewId: null })
      made++
      interval = rating === 1 ? 1 : Math.ceil(interval * (2 + r()))
      day += interval
    }
  }
  for (let i = 0; i < spec.trials; i++) {
    const item = Math.floor(r() * 6000)
    push(at(Math.floor(r() * spec.days)), { kind: 'trial', itemId: `zh:w:${item}`, lessonId: `zh:les:${item % 300}`, correct: r() < 0.8, durationMs: 4000 + Math.floor(r() * 8000) })
  }
  for (let i = 0; i < spec.spans; i++) push(at(Math.floor(r() * spec.days)), { kind: 'span', mediaId: `media:${i % 2000}`, durationMs: 20_000 + Math.floor(r() * 60_000) })
  for (let i = 0; i < spec.exposures; i++) push(at(Math.floor(r() * spec.days)), { kind: 'exposure', mediaId: `media:${i % 2000}`, durationMs: 0 })
  for (let d = 0; d < spec.days; d++) {
    const date = new Date(START + d * DAY).toISOString().slice(0, 10)
    push(START + (d + 1) * DAY, { kind: 'day_closed', date, xp: 20, minutes: 20, credit: 'standard', rules: { xp: 'v1' } }, dayClosedId('u1', date))
  }
  // Shuffle into arrival order (what a pull would deliver).
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}
