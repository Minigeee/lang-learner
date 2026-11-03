// Fixture curricula extend the real one: insert one lesson plan at the start or end of a unit.
import { curriculum } from '../content/zh/curriculum.ts'
import type { LessonPlan } from '../src/curriculum-dsl.ts'

export function withLessons(unitId: string, plans: LessonPlan[], at: 'start' | 'end' = 'end') {
  const copy = curriculum.map((s) => ({ ...s, units: s.units.map((u) => ({ ...u, lessons: [...u.lessons] })) }))
  const unit = copy.flatMap((s) => s.units).find((u) => u.id === unitId)
  if (!unit) throw new Error(`fixture: no unit ${unitId}`)
  if (at === 'start') unit.lessons.unshift(...plans)
  else unit.lessons.push(...plans)
  return copy
}
