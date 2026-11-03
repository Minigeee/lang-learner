import { describe, expect, it } from 'vitest'
import fc from 'fast-check'
import { DefaultScheduler } from 'ts-fsrs'
import { cardIdOf, type Ev } from '../src/events.ts'
import { replayCard, scheduler, SCHEDULER_CONFIG } from '../src/srs.ts'
import { derive, snapshot, defaultCfg } from '../src/derive.ts'

const DAY = 86_400_000
const T0 = Date.UTC(2026, 0, 1, 12)

/** A random review history for a handful of cards, with realistic gaps. */
const historyArb = fc
  .array(fc.record({ card: fc.integer({ min: 0, max: 4 }), rating: fc.constantFrom(1, 2, 3, 3, 3, 4), gapMin: fc.integer({ min: 1, max: 60 * 24 * 40 }) }), { minLength: 1, maxLength: 120 })
  .map((xs) => {
    let t = T0
    return xs.map((x, i): Ev => {
      t += x.gapMin * 60_000
      return { id: `ev:d:${i}`, occurredAt: t, deviceId: i % 2 ? 'phone' : 'laptop', deviceSeq: i, build: 'b1', p: { kind: 'review', cardId: cardIdOf(`zh:w:${x.card}`, 'recog'), rating: x.rating as 1 | 2 | 3 | 4, durationMs: 8000 } }
    })
  })

const shuffle = <T>(xs: T[], seed: number) => {
  const a = [...xs]
  let s = seed >>> 0
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) >>> 0
    const j = s % (i + 1)
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

describe('replay determinism', () => {
  it('ts-fsrs fuzz is seeded from `${cardId}${reps}`: same card, same history, same due dates', () => {
    const id = cardIdOf('zh:w:x', 'recog')
    const reviews: Ev[] = [0, 3, 10, 40].map((d, i) => ({ id: `r${i}`, occurredAt: T0 + d * DAY, deviceId: 'a', deviceSeq: i, build: 'b1', p: { kind: 'review', cardId: id, rating: 3, durationMs: 1 } }))
    const a = replayCard(id, reviews, 'seeded')
    const b = replayCard(id, reviews, 'seeded')
    expect(+a.card.dueAt).toBe(+b.card.dueAt)
    // and fuzz is really on: a different card id with the same history lands elsewhere for at least one of a few ids
    const dues = new Set([0, 1, 2, 3, 4, 5].map((k) => +replayCard(`card:${k}`, reviews, 'seeded').card.dueAt))
    expect(dues.size).toBeGreaterThan(1)
  })

  it('replaying twice, and on two devices that received events in different orders, gives identical state', () => {
    fc.assert(
      fc.property(historyArb, fc.integer(), (hist, seed) => {
        for (const mode of ['seeded', 'recorded'] as const) {
          const cfg = { ...defaultCfg, dueMode: mode }
          const one = snapshot(derive(hist, cfg))
          const two = snapshot(derive(hist, cfg))
          const other = snapshot(derive(shuffle(hist, seed), cfg))
          if (one !== two || one !== other) return false
        }
        return true
      }),
      { numRuns: 300 },
    )
  })

  it('COUNTEREXAMPLE: newCard() without cardId gets a random uuid, so fuzz (and dueAt) differ between replays', async () => {
    const s = await DefaultScheduler({ ...SCHEDULER_CONFIG })
    const run = () => {
      let c = s.newCard({ now: new Date(T0) })
      for (const d of [0, 3, 12, 40]) c = s.review({ card: c, grade: 3 as any, now: new Date(T0 + d * DAY) }).card
      return +c.dueAt
    }
    const dues = new Set(Array.from({ length: 12 }, run))
    expect(dues.size).toBeGreaterThan(1) // nondeterministic
  })

  it('the seeded scheduler is a pure function of (cardId, history): a fresh scheduler instance agrees', async () => {
    const s2 = await DefaultScheduler({ ...SCHEDULER_CONFIG })
    fc.assert(
      fc.property(historyArb, (hist) => {
        const byCard = new Map<string, Ev[]>()
        for (const e of hist) if (e.p.kind === 'review') byCard.set(e.p.cardId, [...(byCard.get(e.p.cardId) ?? []), e])
        for (const [id, evs] of byCard) {
          const a = replayCard(id, evs, 'seeded', scheduler).card
          const b = replayCard(id, evs, 'seeded', s2).card
          if (JSON.stringify(a) !== JSON.stringify(b)) return false
        }
        return true
      }),
      { numRuns: 100 },
    )
  })
})
