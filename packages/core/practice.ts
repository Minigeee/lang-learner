// The trial runner (architecture §4, Domain): item order, voice rotation, the rung ladder, retries and
// pacing for one practice step. It's pure and seeded, so replaying a run's recorded responses rebuilds
// its exact state. Recording trials is the caller's job, so a replay can't record twice.
import type { ClipId, Format, PracticeItem, PracticeOption, SkillCardSpec } from './content.ts'
import type { Rating } from './events.ts'
import type { ItemId } from './ids.ts'

/** How a practice format scores a response, and the widget name its trials record. */
export interface FormatDef {
  format: Format
  widget: `${string}@${number}`
  /** True when `response` answers the item correctly. */
  score(item: Pick<PracticeItem, 'answer'>, response: string): boolean
}

/** The C1 responses: the learner grades their own recall. */
export const RECALL = { knew: 'good', missed: 'again' } as const

/** The formats this build can play. A format with no entry can't be practiced yet. */
export const FORMATS: Partial<Record<Format, FormatDef>> = {
  C0: { format: 'C0', widget: 'pick@1', score: (item, response) => response === item.answer },
  C1: { format: 'C1', widget: 'recall@1', score: (_item, response) => response === RECALL.knew },
}

/**
 * How a drill paces itself. Without `climbRun` every item is served once, plus retries. With it,
 * items are served by rung: `climbRun` hits in a row move up a rung, `masteryRun` hits in a row on
 * the top rung end the drill, and two misses in a row serve one item from the rung below.
 */
export interface Pacing {
  /** Extra tries the drill may add in total, so it can't grow without end as you struggle. */
  maxRetries: number
  climbRun?: number
  masteryRun?: number
  /** The drill ends at the next item after this many seconds, counted from its first item in this sitting. */
  maxSec?: number
}

/** Lesson practice: climb the ladder, stop on mastery or about 3 minutes (brainstorm §4.3). */
export const PRACTICE_PACING: Pacing = { maxRetries: 4, climbRun: 3, masteryRun: 5, maxSec: 180 }
/** A checkpoint: every item once, no retries, feedback held to the end (brainstorm §2 Checkpoint). */
export const CHECK_PACING: Pacing = { maxRetries: 0 }

/** A miss comes back this many items later, in the next voice. */
const RETRY_GAP = { min: 3, max: 5 }

export interface Trial {
  key: string
  target: ItemId
  answer?: string
  stimulus: ClipId
  options: PracticeOption[]
  /** 1 the first time this item is served in the drill, 2 and up after that. */
  attempt: number
}

export interface DrillProgress {
  done: number
  /** 0 to 1. On a ladder it measures the climb, not items served. */
  fraction: number
  /** The current rung's index, and how many rungs there are. */
  rung: number
  rungs: number
  /** Items in the drill, known only when it isn't a ladder. */
  total?: number
}

export interface TrialRunner {
  /** The next trial, or null once the drill is over. */
  next(): Trial | null
  /** Scores the trial last served. `retry` is true when a miss will come back later. */
  respond(trial: Trial, correct: boolean): { retry: boolean }
  progress(): DrillProgress
  results(): readonly { trial: Trial; correct: boolean }[]
}

interface Entry { item: PracticeItem; attempt: number; voice: number; dueIn: number }

export function createTrialRunner(o: {
  items: readonly PracticeItem[]
  /** The step's buttons, for items with none of their own. */
  options: readonly PracticeOption[]
  pacing: Pacing
  seed: number
  now?: () => number
}): TrialRunner {
  const { pacing } = o
  const rand = mulberry32(o.seed)
  const now = o.now ?? Date.now
  const ladder = pacing.climbRun !== undefined
  const rungValues = [...new Set(o.items.map((i) => i.rung))].sort((a, b) => a - b)
  const rungOf = (item: PracticeItem) => rungValues.indexOf(item.rung)
  const pools: Entry[][] = rungValues.map((r) => shuffle(o.items.filter((i) => i.rung === r), rand)
    .map((item, i) => ({ item, attempt: 1, voice: i % Math.max(1, item.stimuli.length), dueIn: 0 })))
  const served: Entry[][] = rungValues.map(() => [])
  const retries: Entry[] = []
  const results: { trial: Trial; correct: boolean }[] = []
  const misses = new Map<string, number>()
  let current: Entry | null = null
  let rung = 0
  let run = 0
  let missStreak = 0
  let dropBack = false
  let retriesUsed = 0
  let ended = o.items.length === 0
  let startedAt: number | null = null
  let total = o.items.length

  function take(): Entry | undefined {
    for (const e of retries) e.dueIn--
    const due = retries.findIndex((e) => e.dueIn <= 0)
    if (due >= 0) return retries.splice(due, 1)[0]
    if (dropBack && rung > 0) {
      dropBack = false
      const below = pools[rung - 1]!.shift()
      if (below) return below
      // An item already served comes back as one more try, so it counts against the retry cap.
      const again = served[rung - 1]![Math.floor(rand() * served[rung - 1]!.length)]
      if (again && retriesUsed < pacing.maxRetries) {
        retriesUsed++
        return { ...again, attempt: again.attempt + 1, voice: (again.voice + 1) % again.item.stimuli.length }
      }
    }
    while (rung < pools.length) {
      const e = pools[rung]!.shift()
      if (e) return e
      if (rung === pools.length - 1) break
      rung++
      run = 0
    }
    return retries.shift()
  }

  const toTrial = (e: Entry): Trial => ({
    key: e.item.key, target: e.item.target, stimulus: e.item.stimuli[e.voice]!,
    options: e.item.options ?? [...o.options], attempt: e.attempt,
    ...(e.item.answer === undefined ? {} : { answer: e.item.answer }),
  })

  return {
    next() {
      startedAt ??= now()
      if (pacing.maxSec !== undefined && now() - startedAt > pacing.maxSec * 1000) ended = true
      const entry = ended ? undefined : take()
      if (!entry) {
        ended = true
        current = null
        return null
      }
      served[rungOf(entry.item)]!.push(entry)
      current = entry
      return toTrial(entry)
    },
    respond(trial, correct) {
      const entry = current
      if (!entry || entry.item.key !== trial.key || entry.attempt !== trial.attempt) throw new Error(`respond() to ${trial.key}, which isn't the trial being served`)
      current = null
      results.push({ trial, correct })
      const atRung = rungOf(entry.item) >= rung
      if (correct) {
        missStreak = 0
        if (ladder && atRung) {
          run++
          const top = rung === pools.length - 1
          if (top && run >= (pacing.masteryRun ?? pacing.climbRun!)) ended = true
          else if (!top && run >= pacing.climbRun!) {
            rung++
            run = 0
          }
        }
        return { retry: false }
      }
      run = 0
      missStreak++
      if (ladder && missStreak >= 2 && rung > 0) {
        dropBack = true
        missStreak = 0
      }
      const count = (misses.get(entry.item.key) ?? 0) + 1
      misses.set(entry.item.key, count)
      if (count >= 2 || retriesUsed >= pacing.maxRetries) return { retry: false }
      retriesUsed++
      total++
      const gap = RETRY_GAP.min + Math.floor(rand() * (RETRY_GAP.max - RETRY_GAP.min + 1))
      retries.push({ item: entry.item, attempt: entry.attempt + 1, voice: (entry.voice + 1) % entry.item.stimuli.length, dueIn: gap })
      return { retry: true }
    },
    progress() {
      const rungs = pools.length
      if (!ladder) return { done: results.length, fraction: total ? Math.min(1, results.length / total) : 1, rung: 0, rungs, total }
      const need = rung === rungs - 1 ? (pacing.masteryRun ?? pacing.climbRun!) : pacing.climbRun!
      const fraction = ended ? 1 : Math.min(1, (rung + Math.min(run, need) / need) / rungs)
      return { done: results.length, fraction, rung, rungs }
    },
    results: () => results,
  }
}

/**
 * Feeds recorded responses back into a fresh runner built with the same items, pacing and seed, in
 * order, leaving it ready for `next()`. Returns how many it applied, fewer when the drill ended first.
 * Throws `ReplayMismatch` when a response's key isn't the trial the runner serves, as when the history
 * belongs to other items.
 */
export function replay(runner: TrialRunner, history: readonly { key: string; correct: boolean }[]): number {
  let applied = 0
  for (const h of history) {
    const trial = runner.next()
    if (!trial) break
    if (trial.key !== h.key) throw new ReplayMismatch(applied)
    runner.respond(trial, h.correct)
    applied++
  }
  return applied
}

/** Thrown by `replay` when the history doesn't fit the runner, as when the lesson changed under it. */
export class ReplayMismatch extends Error {
  readonly applied: number
  constructor(applied: number) {
    super(`replay stopped after ${applied} responses`)
    this.applied = applied
  }
}

/** A skill review serves this many pool items at most (brainstorm §4.4: a burst of 1–3). */
export const SKILL_BURST = 3

/**
 * The items one skill review serves, each with the one stimulus it plays: a voice never heard if the
 * item has one, else its least recently heard (brainstorm §4.4). Items with an unheard voice come
 * first, then the rest by how long ago they were heard; ties break by `seed`. A recording is never
 * served twice in a row while the pool has another.
 */
export function skillBurst(spec: SkillCardSpec, heardAt: (clip: ClipId) => number | undefined, seed: number): PracticeItem[] {
  const rand = mulberry32(seed)
  const scored = shuffle(spec.pool, rand).map((item) => {
    const voices = item.stimuli.map((clip) => ({ clip, at: heardAt(clip) ?? -Infinity }))
    const pick = voices.reduce((a, b) => (b.at < a.at ? b : a))
    return { item: { ...item, stimuli: [pick.clip] }, at: pick.at }
  })
  return scored.sort((a, b) => a.at - b.at).slice(0, SKILL_BURST).map((c) => c.item)
}

/** A skill review's grade (brainstorm §4.4): Good when every item was right on its first try, else Again. */
export function burstRating(results: readonly { trial: Pick<Trial, 'attempt'>; correct: boolean }[]): Rating {
  return results.every((r) => r.trial.attempt > 1 || r.correct) && results.length > 0 ? 3 : 1
}

/** A stable seed for one run's step, so a resumed drill serves the same order. */
export function seedOf(run: string, step: number): number {
  let h = 2166136261
  for (const ch of `${run}#${step}`) h = Math.imul(h ^ ch.codePointAt(0)!, 16777619)
  return h >>> 0
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function shuffle<T>(xs: readonly T[], rand: () => number): T[] {
  const a = [...xs]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[a[i], a[j]] = [a[j]!, a[i]!]
  }
  return a
}
