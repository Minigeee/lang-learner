import { describe, expect, it } from 'vitest'
import fc from 'fast-check'
import {
  CHECK_PACING, FORMATS, PRACTICE_PACING, RECALL, ReplayMismatch, SKILL_BURST, burstRating, createTrialRunner, replay, seedOf, skillBurst,
  type ClipId, type ItemId, type Pacing, type PracticeItem, type TrialRunner,
} from '../index.ts'

const skill = 'xx:g:order' as ItemId
const item = (key: string, rung: number, voices = 2): PracticeItem => ({
  key, target: skill, answer: 'a', rung, stimuli: Array.from({ length: voices }, (_, i) => `clip:${key}-${i}` as const),
})
const ladderItems = [1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3].map((r, i) => item(String(i + 1), r))
const options = [{ key: 'a', label: 'A' }, { key: 'b', label: 'B' }]
const runner = (items: PracticeItem[], pacing: Pacing = PRACTICE_PACING, seed = 1, now = () => 0) =>
  createTrialRunner({ items, options, pacing, seed, now })

/** Plays the drill to its end, answering from `answers` in turn (true when it runs out). */
function drain(r: TrialRunner, answers: boolean[] = []) {
  const served: { key: string; attempt: number; stimulus: string }[] = []
  for (let t = r.next(), i = 0; t; t = r.next(), i++) {
    served.push({ key: t.key, attempt: t.attempt, stimulus: t.stimulus })
    r.respond(t, answers[i] ?? true)
    if (served.length > 200) throw new Error('drill never ended')
  }
  return served
}

describe('formats', () => {
  it('scores a pick by its answer and a recall by the self-grade', () => {
    expect(FORMATS.C0!.score({ answer: 'a' }, 'a')).toBe(true)
    expect(FORMATS.C0!.score({ answer: 'a' }, 'b')).toBe(false)
    expect(FORMATS.C1!.score({}, RECALL.knew)).toBe(true)
    expect(FORMATS.C1!.score({}, RECALL.missed)).toBe(false)
  })
})

describe('trial runner', () => {
  it('climbs the rungs in order and ends on a run of hits at the top', () => {
    const served = drain(runner(ladderItems))
    const rungs = served.map((s) => ladderItems.find((i) => i.key === s.key)!.rung)
    expect(rungs).toEqual([1, 1, 1, 2, 2, 2, 3, 3, 3, 3, 3])
  })

  it('brings a miss back 3 to 5 items later in the next voice, once', () => {
    const r = runner(ladderItems.filter((i) => i.rung === 3), { maxRetries: 4 })
    const first = r.next()!
    expect(r.respond(first, false)).toEqual({ retry: true })
    const later: { key: string; attempt: number; stimulus: string }[] = []
    for (let t = r.next(); t; t = r.next()) {
      later.push({ key: t.key, attempt: t.attempt, stimulus: t.stimulus })
      r.respond(t, t.key !== first.key)
    }
    const back = later.findIndex((t) => t.key === first.key)
    expect(back).toBeGreaterThanOrEqual(2)
    expect(back).toBeLessThanOrEqual(4)
    expect(later[back]).toMatchObject({ attempt: 2 })
    expect(later[back]!.stimulus).not.toBe(first.stimulus)
    expect(later.filter((t) => t.key === first.key)).toHaveLength(1)
  })

  it('serves every item once with no retries in a checkpoint', () => {
    const items = ladderItems.slice(0, 6)
    const served = drain(runner(items, CHECK_PACING), items.map(() => false))
    expect(served.map((s) => s.key).sort()).toEqual(items.map((i) => i.key).sort())
  })

  it('ends at the time cap', () => {
    let t = 0
    const r = runner(ladderItems, { maxRetries: 0, maxSec: 10 }, 1, () => t)
    const first = r.next()!
    r.respond(first, true)
    t = 11_000
    expect(r.next()).toBeNull()
    expect(r.progress().done).toBe(1)
  })

  it('refuses a response to a trial it is not serving', () => {
    const r = runner(ladderItems)
    const t = r.next()!
    r.respond(t, true)
    expect(() => r.respond(t, true)).toThrow()
  })

  it('never serves more than the items plus the retry cap', () => {
    fc.assert(fc.property(fc.array(fc.boolean(), { maxLength: 60 }), fc.integer(), (answers, seed) => {
      const served = drain(runner(ladderItems, PRACTICE_PACING, seed, () => 0), answers)
      return served.filter((s) => s.attempt > 1).length <= PRACTICE_PACING.maxRetries
    }))
  })
})

describe('replay', () => {
  it('rebuilds the exact state, so a resumed drill serves what the original would have', () => {
    fc.assert(fc.property(fc.array(fc.boolean(), { maxLength: 40 }), fc.nat(30), fc.string(), (answers, cut, run) => {
      const seed = seedOf(run, 3)
      const original = runner(ladderItems, PRACTICE_PACING, seed)
      const history: { key: string; correct: boolean }[] = []
      for (let i = 0; i < cut; i++) {
        const t = original.next()
        if (!t) break
        const correct = answers[i] ?? true
        original.respond(t, correct)
        history.push({ key: t.key, correct })
      }
      const resumed = runner(ladderItems, PRACTICE_PACING, seed)
      replay(resumed, history)
      const rest = answers.slice(history.length)
      return JSON.stringify(drain(resumed, rest)) === JSON.stringify(drain(original, rest))
        && JSON.stringify(resumed.progress()) === JSON.stringify(original.progress())
    }))
  })

  it('throws when the history belongs to other items', () => {
    expect(() => replay(runner(ladderItems), [{ key: 'nope', correct: true }])).toThrow(ReplayMismatch)
  })
})

describe('a skill review burst', () => {
  const spec = { item: skill, format: 'C0' as const, prompt: 'p', options, pool: [1, 2, 3, 4, 5].map((k) => item(String(k), 1, 3)) }

  it('serves at most SKILL_BURST items, each on one unheard voice while any is left', () => {
    const heard = new Map<ClipId, number>(spec.pool.flatMap((i) => [[i.stimuli[0]!, 10], [i.stimuli[1]!, 20]] as [ClipId, number][]))
    const burst = skillBurst(spec, (c) => heard.get(c), 7)
    expect(burst).toHaveLength(SKILL_BURST)
    for (const i of burst) expect(i.stimuli).toEqual([`clip:${i.key}-2`])
  })

  it('falls back to the least recently heard recording, oldest items first', () => {
    const heard = new Map<ClipId, number>(spec.pool.flatMap((i) => i.stimuli.map((c, v) => [c, Number(i.key) * 100 + v] as [ClipId, number])))
    const burst = skillBurst(spec, (c) => heard.get(c), 7)
    expect(burst.map((i) => i.stimuli[0])).toEqual(['clip:1-0', 'clip:2-0', 'clip:3-0'])
  })

  it('is Good only when every item was right on its first try', () => {
    const r = (attempt: number, correct: boolean) => ({ trial: { attempt }, correct })
    expect(burstRating([r(1, true), r(1, true)])).toBe(3)
    expect(burstRating([r(1, true), r(1, false)])).toBe(1)
    expect(burstRating([])).toBe(1)
  })
})
