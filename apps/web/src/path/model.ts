// Where the learner stands on the path, from the curriculum and derived progress: each lesson's and
// unit's state, and what comes next. Nothing here is locked: `ready` and `later` only order
// suggestions (app-ui-flow design goal 5).
import type { CurriculumLesson, CurriculumStage, CurriculumUnit, LessonStatus, Progress } from '@lang-learner/core'

export type UnitState = 'done' | 'current' | 'ready' | 'later'

export interface LessonView extends CurriculumLesson {
  status: LessonStatus
  /** An open run to pick up. */
  resume: boolean
}

export interface UnitView extends Omit<CurriculumUnit, 'lessons'> {
  stage: string
  lessons: LessonView[]
  state: UnitState
  /** Lessons complete or known. */
  done: number
  /** Units that list this one as a prerequisite. */
  unlocks: string[]
}

export interface StageView extends Omit<CurriculumStage, 'units'> {
  units: UnitView[]
  /** Every lesson complete or known: the path draws the stage as one node. */
  done: boolean
}

export interface PathModel {
  stages: StageView[]
  unit(id: string): UnitView | undefined
  /** The lesson to suggest: an open run first, else the first authored lesson not yet done. */
  next: LessonView | null
  /** The unit the next lesson sits in. */
  current: UnitView | null
}

const finished = (s: LessonStatus) => s === 'complete' || s === 'known'

export function pathModel(curriculum: readonly CurriculumStage[], progress: Progress): PathModel {
  const unlocks = new Map<string, string[]>()
  for (const s of curriculum) for (const u of s.units) for (const p of u.prereqs) unlocks.set(p, [...(unlocks.get(p) ?? []), u.id])

  const stages: StageView[] = curriculum.map((s) => {
    const units = s.units.map((u): UnitView => {
      const lessons = u.lessons.map((l) => ({ ...l, status: progress.lessonStatus(l), resume: l.authored && progress.openRun(l.id) !== null }))
      const done = lessons.filter((l) => finished(l.status)).length
      return { ...u, stage: s.id, lessons, done, state: done === lessons.length ? 'done' : 'later', unlocks: unlocks.get(u.id) ?? [] }
    })
    return { ...s, units, done: units.every((u) => u.state === 'done') }
  })
  const byId = new Map(stages.flatMap((s) => s.units.map((u) => [u.id, u] as const)))
  const all = stages.flatMap((s) => s.units.flatMap((u) => u.lessons.map((l) => ({ l, u }))))
  const pick = all.find(({ l }) => l.resume) ?? all.find(({ l }) => l.authored && !finished(l.status))

  for (const u of byId.values()) {
    if (u.state === 'done') continue
    const started = u.lessons.some((l) => l.status === 'in_progress' || finished(l.status))
    u.state = pick?.u === u || started ? 'current' : u.prereqs.every((p) => byId.get(p)?.state === 'done') ? 'ready' : 'later'
  }
  return { stages, unit: (id) => byId.get(id), next: pick?.l ?? null, current: pick?.u ?? null }
}
