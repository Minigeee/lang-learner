import { describe, expect, it } from 'vitest'
import fc from 'fast-check'
import {
  buildQueue, cardAdded, cardIdOf, createCardIndex, createSrs, loadBalancedDue, QUEUE_POLICY, reviewOf, secondsPerCard,
  type CardId, type EventDraft, type EventEnvelope, type ItemId, type Rating,
} from '../index.ts'

const srs = await createSrs()
const DAY = 86_400_000
const T0 = Date.UTC(2026, 10, 1, 12)
const item = (k: number) => `xx:w:w${k}` as ItemId
const card = (k: number) => cardIdOf(item(k), 'vocab')

let n = 0
const env = (draft: EventDraft, at: number, id = `e${++n}`): EventEnvelope =>
  ({ ...draft, id, lang: 'xx', occurredAt: at, deviceId: 'd', deviceSeq: n, build: 'b' }) as EventEnvelope
const added = (k: number, at = T0) => env(cardAdded({ item: item(k), template: 'vocab', via: 'queue' }).draft, at, `add-${k}`)
const review = (k: number, rating: Rating, at: number, prevReviewId: string | null = null, dueAt = at + DAY): EventEnvelope =>
  env({ kind: 'review', v: 1, payload: { cardId: card(k), rating, durationMs: 8000, dueAt, prevReviewId } }, at)

/** A random review history over a few cards, with realistic gaps. */
const historyArb = fc.array(fc.record({ k: fc.integer({ min: 0, max: 4 }), rating: fc.constantFrom<Rating>(1, 3, 3, 3), gapMin: fc.integer({ min: 1, max: 60 * 24 * 40 }) }), { minLength: 1, maxLength: 80 })
  .map((xs) => {
    let t = T0
    const out: EventEnvelope[] = [0, 1, 2, 3, 4].map((k) => added(k))
    for (const [i, x] of xs.entries()) {
      t += x.gapMin * 60_000
      out.push({ ...review(x.k, x.rating, t), id: `r${i.toString().padStart(3, '0')}` })
    }
    return out
  })

const states = (events: readonly EventEnvelope[]) => {
  const index = createCardIndex(srs)
  index.update(events)
  return JSON.stringify([...index.all()].sort((a, b) => (a.id < b.id ? -1 : 1)))
}

const shuffle = <T>(xs: readonly T[], seed: number): T[] => {
  const a = [...xs]
  let s = seed >>> 0
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) >>> 0
    const j = s % (i + 1)
    ;[a[i], a[j]] = [a[j]!, a[i]!]
  }
  return a
}

describe('replay', () => {
  it('is deterministic: twice, in any arrival order, and with a fresh scheduler', async () => {
    const other = await createSrs()
    fc.assert(fc.property(historyArb, fc.integer(), (hist, seed) => {
      const fresh = createCardIndex(other)
      fresh.update(shuffle(hist, seed))
      const a = states(hist)
      return a === states(hist) && a === states(shuffle(hist, seed)) && a === JSON.stringify([...fresh.all()].sort((x, y) => (x.id < y.id ? -1 : 1)))
    }), { numRuns: 150 })
  })

  it('seeds fuzz from the card id, so it is really on', () => {
    const dues = new Set([0, 1, 2, 3, 4, 5, 6, 7].map((k) => {
      let s = srs.initial(card(k), T0)
      for (const d of [0, 3, 10, 40]) s = srs.next(s, 3, T0 + d * DAY).state
      return s.dueAt
    }))
    expect(dues.size).toBeGreaterThan(1)
  })

  it("keeps a review's recorded dueAt only when its prevReviewId matches the replayed previous review", () => {
    const first = review(0, 3, T0 + DAY, null, T0 + 9 * DAY)
    const kept = createCardIndex(srs)
    kept.update([added(0), first])
    expect(kept.get(card(0))!.state.dueAt).toBe(T0 + 9 * DAY)
    // Two devices reviewed the card offline from the same state: the later one's guard no longer holds.
    const concurrent = review(0, 3, T0 + 2 * DAY, null, T0 + 30 * DAY)
    const both = createCardIndex(srs)
    both.update([added(0), first, concurrent])
    const after = both.get(card(0))!.state
    expect(after.dueAt).not.toBe(T0 + 30 * DAY)
    expect(after.reps).toBe(2)
  })
})

describe('the per-card cache', () => {
  it('folds incrementally, from late events and from a snapshot, to what a full replay gives', () => {
    fc.assert(fc.property(historyArb, fc.integer(), fc.integer({ min: 1, max: 6 }), (hist, seed, parts) => {
      // Events arrive in batches, in any order, as pulls deliver them.
      const arrival = shuffle(hist, seed)
      const index = createCardIndex(srs)
      const size = Math.ceil(arrival.length / parts)
      for (let i = 0; i < arrival.length; i += size) index.update(arrival.slice(0, i + size))
      const restored = createCardIndex(srs, JSON.parse(JSON.stringify(createCardIndexAt(arrival.slice(0, size)).snapshot())))
      restored.update(arrival)
      const full = states(hist)
      return JSON.stringify([...index.all()].sort((a, b) => (a.id < b.id ? -1 : 1))) === full
        && JSON.stringify([...restored.all()].sort((a, b) => (a.id < b.id ? -1 : 1))) === full
    }), { numRuns: 150 })
  })

  it('ignores a cache from another SRS version', () => {
    const index = createCardIndexAt([added(0), review(0, 3, T0 + DAY)])
    const stale = { ...index.snapshot(), version: 'old' }
    const fresh = createCardIndex(srs, stale)
    expect(fresh.all()).toEqual([])
  })
})

function createCardIndexAt(events: EventEnvelope[]) {
  const index = createCardIndex(srs)
  index.update(events)
  return index
}

describe('a live review', () => {
  it('is stamped no earlier than the last review and records an integer, load-balanced dueAt', () => {
    const index = createCardIndexAt([added(0), review(0, 3, T0 + DAY)])
    const { notBefore, draft } = reviewOf(index, srs, { card: card(0), rating: 3, durationMs: 7300.4 })
    expect(notBefore).toBe(T0 + DAY)
    const p = (draft(T0 + 9 * DAY) as Extract<EventDraft, { kind: 'review' }>).payload
    expect(Number.isInteger(p.dueAt)).toBe(true)
    expect(p.durationMs).toBe(7300)
    expect(p.prevReviewId).toBe(index.get(card(0))!.state.lastReviewId)
  })

  it('load-balances toward emptier days inside the fuzz window', () => {
    const state = srs.initial(card(0), T0)
    const next = { state: { ...state, dueAt: T0 + 10 * DAY }, scheduledDays: 10 }
    const busy = (day: number) => (day === Math.floor((T0 + 8 * DAY) / DAY) ? 0 : 50)
    expect(loadBalancedDue(next, T0, busy)).toBe(T0 + 8 * DAY)
    expect(loadBalancedDue({ ...next, scheduledDays: 1 }, T0, busy)).toBe(T0 + 10 * DAY)
  })
})

describe('the daily queue', () => {
  const day = { start: T0 - 8 * 3_600_000, end: T0 + 16 * 3_600_000 }
  const sec = { vocab: 10, skill: 20 }
  const queueOf = (events: EventEnvelope[], now = T0) => {
    const index = createCardIndexAt(events)
    return buildQueue({ cards: index.all(), srs, events, now, day, secPerCard: sec })
  }
  /** A card reviewed once, so it's due `dueIn` from now with the given stability. */
  const matured = (k: number, reviewedAt: number, dueAt: number) => [added(k, reviewedAt - 1), review(k, 3, reviewedAt, null, dueAt)]

  it('serves first reviews first, then reviews by retrievability, highest first', () => {
    const events = [...matured(1, T0 - 20 * DAY, T0 - DAY), ...matured(2, T0 - 4 * DAY, T0 - 3_600_000), added(3, T0 - 60_000)]
    const ids = queueOf(events).cards.map((c) => c.id)
    expect(ids[0]).toBe(card(3))
    expect(ids.slice(1)).toEqual([card(2), card(1)])
  })

  it('gives new cards only the room left in the budget, and none while a due review is carried over', () => {
    expect(queueOf([]).newQuota).toBe(Math.min(QUEUE_POLICY.newPerDay, Math.floor(QUEUE_POLICY.dailyReviewSec / (QUEUE_POLICY.newCostInReviews * sec.vocab))))
    const many = Array.from({ length: 70 }, (_, k) => matured(k + 10, T0 - 10 * DAY, T0 - DAY)).flat()
    const q = queueOf(many)
    expect(q.cards.length).toBe(QUEUE_POLICY.dailyReviewSec / sec.vocab)
    expect(q.newQuota).toBe(0)
    expect(Object.keys(q)).toEqual(['cards', 'newQuota'])
  })

  it("fills the owner's review time in place of the default", () => {
    const many = Array.from({ length: 200 }, (_, k) => matured(k + 10, T0 - 10 * DAY, T0 - DAY)).flat()
    const index = createCardIndexAt(many)
    expect(buildQueue({ cards: index.all(), srs, events: many, now: T0, day, secPerCard: sec, budgetSec: 20 * 60 }).cards.length).toBe(120)
  })

  it("counts today's reviews against the budget", () => {
    const done = Array.from({ length: 30 }, (_, k) => [added(k + 100, day.start), review(k + 100, 3, day.start + 1000 + k)]).flat()
    const due = Array.from({ length: 40 }, (_, k) => matured(k + 10, T0 - 10 * DAY, T0 - DAY)).flat()
    expect(queueOf([...done, ...due]).cards.length).toBe((QUEUE_POLICY.dailyReviewSec - 30 * sec.vocab) / sec.vocab)
  })

  it('halves new cards when the week’s true retention is under the floor', () => {
    // Each card lapsed this week, with its relearning due later, so none of them is in today's queue.
    const lapses = Array.from({ length: 25 }, (_, k) => [
      added(k + 200, T0 - 6 * DAY), { ...review(k + 200, 3, T0 - 6 * DAY + 1), id: `good-${k}` }, review(k + 200, 1, T0 - 2 * DAY + k, `good-${k}`, T0 + 5 * DAY),
    ]).flat()
    const q = queueOf(lapses)
    const base = Math.floor(QUEUE_POLICY.dailyReviewSec / (QUEUE_POLICY.newCostInReviews * sec.vocab))
    expect(q.newQuota).toBe(Math.floor(Math.min(QUEUE_POLICY.newPerDay, base) / 2))
  })

  it('measures seconds per card from logged reviews once there are enough', () => {
    const events = [added(0), ...Array.from({ length: 12 }, (_, k) => env({ kind: 'review', v: 1, payload: { cardId: card(0), rating: 3, durationMs: 5000 + k * 100, dueAt: T0, prevReviewId: null } }, T0 + k))]
    const index = createCardIndexAt(events)
    expect(secondsPerCard(index, events)).toEqual({ vocab: 6, skill: 20 })
    expect(secondsPerCard(index, events.slice(0, 5))).toEqual({ vocab: 8, skill: 20 })
  })
})

it('names a card the same from any device', () => {
  const id: CardId = cardIdOf('xx:g:order' as ItemId, 'skill')
  expect(id).toBe(cardIdOf('xx:g:order' as ItemId, 'skill'))
  expect(id).not.toBe(cardIdOf('xx:g:order' as ItemId, 'vocab'))
  expect(cardAdded({ item: 'xx:g:order' as ItemId, template: 'skill', via: 'queue' }).id).toBe(cardAdded({ item: 'xx:g:order' as ItemId, template: 'skill', via: 'queue' }).id)
})
