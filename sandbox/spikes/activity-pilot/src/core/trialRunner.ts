// Trial runner: owns item order, voice rotation, scoring, the feedback policy, retries and pacing,
// so widgets only render items and report picks (brainstorm §3 and §4.3, implemented once).
import type { ChoiceOption, Clip, FeedbackPolicy, ItemSpec, TrialItem, TrialResult, Verdict } from './types'
import { cardIdFor, record } from './events'

/** A miss comes back this many items later, in a new voice. */
const RETRY_GAP = { min: 3, max: 5 }

/**
 * How a drill paces itself. Without `climbRun` every item is served once (plus retries).
 * With it, items are served by rung: `climbRun` hits in a row move up a rung, and on the top rung
 * `masteryRun` hits in a row end the drill. Two misses in a row serve one item from the rung below.
 */
export interface Pacing {
  /** Retries the drill may add in total. A drill that grows as you struggle feels punishing. */
  maxRetries: number
  climbRun?: number
  masteryRun?: number
  /** Seconds after which the drill ends at the next item boundary. */
  maxSec?: number
}

/** Practice: climb the ladder, stop on mastery or about 3 minutes (brainstorm §4.3). */
export const PRACTICE_PACING: Pacing = { maxRetries: 4, climbRun: 3, masteryRun: 5, maxSec: 180 }

export interface DrillProgress {
  done: number
  /** 0..1, for the progress bar. On a ladder it measures the climb, not items served. */
  fraction: number
  /** Index of the current rung, and how many rungs there are (1 when items carry no rung). */
  rung: number
  rungs: number
  /** Items in the drill, known only when it isn't a ladder. */
  total?: number
}

export interface TrialRunner {
  next(): TrialItem | null
  respond(item: TrialItem, picked: string, ms: number): Verdict
  progress(): DrillProgress
  results(): readonly TrialResult[]
}

interface Deps {
  clip(id: string): Clip
  lesson: string
  widget: string
  /** Seed for a stable order per lesson, so a resumed lesson doesn't reshuffle. */
  seed: number
  /** Voice offset: practice starts from voices the examples step didn't use. */
  voiceOffset?: number
  pacing: Pacing
  now?: () => number
}

interface Entry { spec: ItemSpec; attempt: number; voiceIndex: number; dueIn?: number }

export function createTrialRunner(items: ItemSpec[], options: ChoiceOption[], policy: FeedbackPolicy, deps: Deps): TrialRunner {
  const rand = mulberry32(deps.seed)
  const now = deps.now ?? (() => Date.now())
  const { pacing } = deps
  const ladder = pacing.climbRun !== undefined
  const rungValues = [...new Set(items.map((s) => s.rung ?? 1))].sort((a, b) => a - b)
  const pools: Entry[][] = rungValues.map((r) =>
    shuffle(items.filter((s) => (s.rung ?? 1) === r), rand).map((spec, i) => ({ spec, attempt: 1, voiceIndex: (i + (deps.voiceOffset ?? 0)) % spec.stimuli.length })),
  )
  const served: Entry[][] = rungValues.map(() => [])
  const retries: Entry[] = []
  const results: TrialResult[] = []
  const missesByItem = new Map<string, number>()
  let rung = 0
  let run = 0
  let missStreak = 0
  let dropBack = false
  let retriesUsed = 0
  let ended = false
  let startedAt = 0
  let total = items.length

  function toTrial(entry: Entry): TrialItem {
    const stimulus = deps.clip(entry.spec.stimuli[entry.voiceIndex])
    return { key: entry.spec.key, target: entry.spec.target, answer: entry.spec.answer, stimulus, options, attempt: entry.attempt, voiceIndex: entry.voiceIndex }
  }
  const rungOf = (spec: ItemSpec) => rungValues.indexOf(spec.rung ?? 1)

  function take(): Entry | undefined {
    retries.forEach((e) => { e.dueIn = (e.dueIn ?? 0) - 1 })
    const due = retries.findIndex((e) => (e.dueIn ?? 0) <= 0)
    if (due >= 0) return retries.splice(due, 1)[0]
    if (dropBack && rung > 0) {
      dropBack = false
      const below = pools[rung - 1].shift()
      if (below) return below
      const again = served[rung - 1][Math.floor(rand() * served[rung - 1].length)]
      if (again) return { ...again, voiceIndex: (again.voiceIndex + 1) % again.spec.stimuli.length }
    }
    while (rung < pools.length) {
      const e = pools[rung].shift()
      if (e) return e
      if (rung === pools.length - 1) break
      rung++
      run = 0
    }
    return retries.shift()
  }

  return {
    next() {
      if (!startedAt) startedAt = now()
      if (ended || (pacing.maxSec && now() - startedAt > pacing.maxSec * 1000)) { ended = true; return null }
      const entry = take()
      if (!entry) { ended = true; return null }
      served[rungOf(entry.spec)].push(entry)
      return toTrial(entry)
    },
    respond(item, picked, ms) {
      const correct = picked === item.answer
      results.push({ item, picked, correct, ms })
      record({ kind: 'trial', itemId: item.target, lesson: deps.lesson, widget: deps.widget, picked, correct, ms, policy, attempt: item.attempt })
      const spec = items.find((s) => s.key === item.key)!
      const atRung = rungOf(spec) >= rung

      if (correct) {
        missStreak = 0
        if (ladder && atRung) {
          run++
          const top = rung === pools.length - 1
          if (top && run >= (pacing.masteryRun ?? pacing.climbRun!)) ended = true
          else if (!top && run >= pacing.climbRun!) { rung++; run = 0 }
        }
        return policy === 'deferred' ? { kind: 'deferred' } : { kind: 'instant', correct, picked, answer: item.answer }
      }

      run = 0
      missStreak++
      if (ladder && missStreak >= 2 && rung > 0) { dropBack = true; missStreak = 0 }
      const misses = (missesByItem.get(item.key) ?? 0) + 1
      missesByItem.set(item.key, misses)
      if (misses >= 2) {
        record({ kind: 'card_added', cardId: cardIdFor(item.target, 'audio-meaning'), itemId: item.target, origin: 'miss' })
      } else if (policy === 'instant' && retriesUsed < pacing.maxRetries) {
        retriesUsed++
        total++
        const gap = RETRY_GAP.min + Math.floor(rand() * (RETRY_GAP.max - RETRY_GAP.min + 1))
        retries.push({ spec, attempt: item.attempt + 1, voiceIndex: (item.voiceIndex + 1) % spec.stimuli.length, dueIn: gap })
      }
      if (policy === 'deferred') return { kind: 'deferred' }
      const sameVoice = (key: string) => {
        const ids = spec.optionStimuli?.[key]
        return ids ? deps.clip(ids[item.voiceIndex % ids.length]) : undefined
      }
      return { kind: 'instant', correct, picked, answer: item.answer, pickedClip: sameVoice(picked), answerClip: sameVoice(item.answer) ?? item.stimulus }
    },
    progress() {
      const rungs = pools.length
      if (!ladder) return { done: results.length, fraction: total ? results.length / total : 1, rung: 0, rungs, total }
      const need = rung === rungs - 1 ? (pacing.masteryRun ?? pacing.climbRun!) : pacing.climbRun!
      const fraction = ended ? 1 : Math.min(1, (rung + Math.min(run, need) / need) / rungs)
      return { done: results.length, fraction, rung, rungs }
    },
    results: () => results,
  }
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

function shuffle<T>(xs: T[], rand: () => number): T[] {
  const a = [...xs]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
