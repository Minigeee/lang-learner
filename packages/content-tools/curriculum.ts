// The shape of content/<lang>/curriculum.ts, and the graph questions asked of it.
import type { CurriculumLesson, CurriculumUnit, LessonId } from '@lang-learner/core'

/** `authored` isn't stored: it's derived from the lesson's file existing. */
export type SourceLesson = Omit<CurriculumLesson, 'authored'>

export interface SourceUnit extends Omit<CurriculumUnit, 'lessons'> {
  lessons: SourceLesson[]
  /** The unit's words are one closed set that stays whole, so the per-lesson word cap doesn't apply. */
  closedSet?: true
}

export interface SourceStage {
  id: string
  title: string
  /** The highest output level practice may ask for here: 0 is perceive only, 1 is scaffolded output. */
  maxOutput: 0 | 1
  /** The stage trains perception, so its stimuli may use words the learner hasn't met. */
  perception?: true
  /** Earlier stages every unit here assumes in full, queue words included. */
  assumes?: string[]
  units: SourceUnit[]
}

export type CurriculumSource = SourceStage[]

export interface LessonNode extends SourceLesson {
  unit: SourceUnit
  stage: SourceStage
  /** Position within the unit. */
  index: number
}

export interface Curriculum {
  stages: CurriculumSource
  units: Map<string, SourceUnit>
  stageOf: Map<string, SourceStage>
  lessons: Map<LessonId, LessonNode>
  byLabel: Map<string, LessonNode>
  /** A unit's direct prereqs, with the units of every stage its stage assumes. */
  prereqsOf(unitId: string): string[]
  /** Every unit a unit transitively relies on, not counting itself unless the graph has a cycle. */
  closure(unitId: string): Set<string>
  /** A checkpoint unit holds only checkpoint lessons. */
  isCheckpoint(unit: SourceUnit): boolean
  /** True when every unit of the stage is on the unit's path. */
  stageComplete(stageId: string, unitId: string): boolean
}

export function makeCurriculum(stages: CurriculumSource): Curriculum {
  const units = new Map<string, SourceUnit>()
  const stageOf = new Map<string, SourceStage>()
  const lessons = new Map<LessonId, LessonNode>()
  const byLabel = new Map<string, LessonNode>()
  for (const stage of stages) {
    for (const unit of stage.units) {
      units.set(unit.id, unit)
      stageOf.set(unit.id, stage)
      unit.lessons.forEach((l, index) => {
        const node = { ...l, unit, stage, index }
        lessons.set(l.id, node)
        byLabel.set(l.label, node)
      })
    }
  }
  const prereqsOf = (unitId: string) => {
    const assumed = (stageOf.get(unitId)?.assumes ?? []).flatMap((id) => stages.find((s) => s.id === id)?.units.map((u) => u.id) ?? [])
    return [...new Set([...(units.get(unitId)?.prereqs ?? []), ...assumed])]
  }
  const closures = new Map<string, Set<string>>()
  const closure = (unitId: string) => {
    const cached = closures.get(unitId)
    if (cached) return cached
    const seen = new Set<string>()
    const stack = prereqsOf(unitId)
    while (stack.length) {
      const next = stack.pop()!
      if (seen.has(next)) continue
      seen.add(next)
      stack.push(...prereqsOf(next))
    }
    closures.set(unitId, seen)
    return seen
  }
  return {
    stages, units, stageOf, lessons, byLabel, prereqsOf, closure,
    isCheckpoint: (unit) => unit.lessons.length > 0 && unit.lessons.every((l) => l.shape === 'checkpoint'),
    stageComplete(stageId, unitId) {
      const on = closure(unitId)
      return stages.find((s) => s.id === stageId)?.units.every((u) => on.has(u.id)) ?? false
    },
  }
}
