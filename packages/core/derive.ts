// Derive v1: pure folds over the event log for lesson status, mastery, claims, resume and format intros.
// Rules are versioned (architecture §6): a change ships as v2 beside v1, never as an edit.
// These folds are cheap and recompute per change; card state, the costly part, has its own per-card
// cache (cards.ts). Day minutes, XP and credit live in days.ts.
import { byTime, type ClaimTarget, type EventDraft, type EventEnvelope, type EventOf } from './events.ts'
import type { ClipId, CompiledLesson, CurriculumStage } from './content.ts'
import type { ItemId, LessonId } from './ids.ts'

export const RULES = { mastery: 'v1', lessonStatus: 'v1', minutes: 'v1', xp: 'v1', credit: 'v1' } as const

/** Doc 04's named states, lowest first. v1 reaches Familiar at most: Solid and Mastered need SRS stability. */
export const MASTERY_STATES = ['new', 'learning', 'familiar', 'solid', 'mastered'] as const
export type MasteryState = (typeof MASTERY_STATES)[number]

export type LessonStatus = 'not_started' | 'in_progress' | 'complete' | 'known'

/** mastery@v1's checkpoint rule (README Completion & test-out). */
export const CHECKPOINT_RULE_V1 = {
  /** First tries an item needs in one checkpoint run before its share says anything. */
  minTries: 3,
  /** The first-try share that makes an item solid: sound contrasts and rules, then everything else. */
  soundShare: 0.85,
  otherShare: 0.8,
} as const

const SOUND_KINDS: readonly string[] = ['sc', 'sr']

type TrialPayload = Extract<EventDraft, { kind: 'trial' }>['payload']
type CursorPayload = Extract<EventDraft, { kind: 'lesson_cursor' }>['payload']

export interface CheckpointArea {
  item: ItemId
  right: number
  tries: number
  /** True when the item counts as known: enough first tries at or above its share. */
  solid: boolean
}

/** One checkpoint run's result per item, from first tries only. Every area is solid or worth another look. */
export function checkpointAreas(trials: readonly Pick<TrialPayload, 'itemId' | 'attempt' | 'correct'>[]): CheckpointArea[] {
  const areas = new Map<ItemId, CheckpointArea>()
  for (const t of trials) {
    if (t.attempt !== 1) continue
    const a = areas.get(t.itemId) ?? { item: t.itemId, right: 0, tries: 0, solid: false }
    a.tries++
    if (t.correct) a.right++
    areas.set(t.itemId, a)
  }
  for (const a of areas.values()) {
    const share = SOUND_KINDS.includes(a.item.split(':')[1] ?? '') ? CHECKPOINT_RULE_V1.soundShare : CHECKPOINT_RULE_V1.otherShare
    a.solid = a.tries >= CHECKPOINT_RULE_V1.minTries && a.right / a.tries >= share
  }
  return [...areas.values()]
}

/** A run with no `done` cursor yet, so the player can pick it up where it stopped. */
export interface OpenRun {
  run: string
  lessonHash: string
  /** The last step reached. */
  step: number
  /** The run's trials in time order. */
  trials: Pick<TrialPayload, 'step' | 'key' | 'correct' | 'attempt' | 'itemId'>[]
}

export interface Progress {
  /** The highest state the item has reached. Nothing shown ever falls (README Motivation row). */
  mastery(item: ItemId): MasteryState
  /** Every item above New, with its highest state. */
  reached(): ReadonlyMap<ItemId, MasteryState>
  /**
   * lessonStatus@v1: a run that reached `done`, or a `done` claim, is complete; a `known` claim is
   * known; then a started run is in progress, and a Familiar skill is known. A lesson's claim is the
   * latest one on the lesson, its unit or its stage.
   */
  lessonStatus(lesson: Pick<CompiledLesson, 'id' | 'skill'>): LessonStatus
  /** The latest claim on exactly this target, or null when there's none or it was withdrawn. */
  claim(target: ClaimTarget): 'done' | 'known' | null
  /** First tries on the item, in lessons and checks. */
  evidence(item: ItemId): { tries: number; right: number }
  /** The lesson's latest run, unless it reached `done`. */
  openRun(lesson: LessonId): OpenRun | null
  /** A run's trials in time order, done or not. */
  trialsOf(run: string): OpenRun['trials']
  /** True once a practice format's widget has a trial, so its introduction has been seen. */
  introduced(widget: string): boolean
  /** When a clip last played, or undefined if it never has. */
  heardAt(clip: ClipId): number | undefined
  /** Lessons with a run, the learner's footprint on the path. */
  startedLessons(): ReadonlySet<LessonId>
}

interface Run {
  run: string
  lessonId: LessonId
  lessonHash: string
  step: number
  done: boolean
  trials: OpenRun['trials']
}

const atLeast = (a: MasteryState, b: MasteryState) => MASTERY_STATES.indexOf(a) >= MASTERY_STATES.indexOf(b)

type ClaimAs = EventOf<'claim'>['payload']['as']
const claimKey = (t: ClaimTarget) => `${t.scope}:${t.id}`

/**
 * Folds the log. Kinds and versions this build doesn't know are skipped, never misread. The
 * curriculum places each lesson in its unit and stage, so a unit or stage claim reaches every lesson
 * in it, authored or not. A `known` claim makes the skills it covers Familiar at most (self-report
 * is capped there); a withdrawn claim counts as never made.
 */
export function deriveProgress(events: readonly EventEnvelope[], curriculum: readonly CurriculumStage[]): Progress {
  const runs = new Map<string, Run>()
  const latestRun = new Map<LessonId, Run>()
  const widgets = new Set<string>()
  const mastery = new Map<ItemId, MasteryState>()
  const checkpointTrials = new Map<string, TrialPayload[]>()
  const heard = new Map<ClipId, number>()
  const firstTries = new Map<ItemId, { tries: number; right: number }>()
  /** The latest claim per target, with its place in time order. */
  const claims = new Map<string, { as: ClaimAs; order: number }>()
  let order = 0
  const raise = (item: ItemId, to: MasteryState) => {
    if (!atLeast(mastery.get(item) ?? 'new', to)) mastery.set(item, to)
  }

  for (const e of [...events].sort(byTime)) {
    if (e.v !== 1) continue
    if (e.kind === 'lesson_cursor') {
      const p = e.payload as CursorPayload
      let r = runs.get(p.run)
      if (!r) {
        r = { run: p.run, lessonId: p.lessonId, lessonHash: p.lessonHash, step: 0, done: false, trials: [] }
        runs.set(p.run, r)
        latestRun.set(p.lessonId, r)
      }
      if (p.step === 'done') r.done = true
      else r.step = p.step
    } else if (e.kind === 'exposure') {
      const p = e.payload as Extract<EventDraft, { kind: 'exposure' }>['payload']
      if (p.type === 'clip') heard.set(p.clipId, e.occurredAt)
    } else if (e.kind === 'claim') {
      const p = (e as EventOf<'claim'>).payload
      claims.set(claimKey(p), { as: p.as, order: order++ })
    } else if (e.kind === 'trial') {
      const p = e.payload as TrialPayload
      widgets.add(p.widget.split('@')[0]!)
      if (p.attempt === 1) {
        const f = firstTries.get(p.itemId) ?? { tries: 0, right: 0 }
        f.tries++
        if (p.correct) f.right++
        firstTries.set(p.itemId, f)
      }
      runs.get(p.run)?.trials.push({ step: p.step, key: p.key, correct: p.correct, attempt: p.attempt, itemId: p.itemId })
      raise(p.itemId, 'learning')
      if (p.mode === 'checkpoint' && !p.recycled) {
        const list = checkpointTrials.get(p.run) ?? []
        list.push(p)
        checkpointTrials.set(p.run, list)
      }
    }
  }
  for (const trials of checkpointTrials.values()) {
    for (const a of checkpointAreas(trials)) if (a.solid) raise(a.item, 'familiar')
  }
  const place = new Map<LessonId, { unit: string; stage: string }>()
  for (const stage of curriculum) for (const unit of stage.units) for (const l of unit.lessons) place.set(l.id, { unit: unit.id, stage: stage.id })
  const claimOn = (lesson: LessonId): ClaimAs | null => {
    const where = place.get(lesson)
    const found = [claims.get(`lesson:${lesson}`), where && claims.get(`unit:${where.unit}`), where && claims.get(`stage:${where.stage}`)]
      .filter((c) => c !== undefined)
      .sort((a, b) => b.order - a.order)[0]
    return found && found.as !== 'none' ? found.as : null
  }
  for (const stage of curriculum) {
    for (const unit of stage.units) for (const l of unit.lessons) if (l.skill && claimOn(l.id) === 'known') raise(l.skill, 'familiar')
  }

  return {
    mastery: (item) => mastery.get(item) ?? 'new',
    reached: () => mastery,
    lessonStatus(lesson) {
      const mine = [...runs.values()].filter((r) => r.lessonId === lesson.id)
      const claimed = claimOn(lesson.id)
      if (mine.some((r) => r.done) || claimed === 'done') return 'complete'
      if (claimed === 'known') return 'known'
      if (mine.length) return 'in_progress'
      if (lesson.skill && atLeast(mastery.get(lesson.skill) ?? 'new', 'familiar')) return 'known'
      return 'not_started'
    },
    openRun(lesson) {
      const r = latestRun.get(lesson)
      return r && !r.done ? { run: r.run, lessonHash: r.lessonHash, step: r.step, trials: r.trials } : null
    },
    claim(target) {
      const c = claims.get(claimKey(target))
      return c && c.as !== 'none' ? c.as : null
    },
    evidence: (item) => ({ ...(firstTries.get(item) ?? { tries: 0, right: 0 }) }),
    trialsOf: (run) => runs.get(run)?.trials ?? [],
    introduced: (widget) => widgets.has(widget.split('@')[0]!),
    heardAt: (clip) => heard.get(clip),
    startedLessons: () => new Set(latestRun.keys()),
  }
}
