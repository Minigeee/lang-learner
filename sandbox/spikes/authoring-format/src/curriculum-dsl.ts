// Helper constructors for content/<lang>/curriculum.ts (TDD §5.3). Array order is THE ordering source.
// Each constructor records its call site so the check can report curriculum errors as file:line.
import { relative } from 'node:path'
import { fileURLToPath } from 'node:url'

export interface Loc { file: string; line: number }

/** Output levels a stage allows: 0 = perceive only, 1 = scaffolded output (shadowing, single-word recall), 2 = free production. */
export interface OutputPolicy { required: 0 | 1 | 2; optional: 0 | 1 | 2 }

export interface LessonPlan {
  id: string
  title: string
  idea: string
  template: string
  teaches: string[]
  assumes: string[]
  at: Loc
}
export interface Unit { id: string; title: string; lessons: LessonPlan[]; at: Loc }
export interface Stage { id: string; title: string; output: OutputPolicy; units: Unit[]; at: Loc }

function callSite(): Loc {
  const frames = (new Error().stack ?? '').split('\n').slice(3)
  for (const f of frames) {
    const m = /\(?((?:file:\/\/\/)?[A-Za-z]:[\\/][^()]*?|\/[^()]*?):(\d+):\d+\)?$/.exec(f.trim())
    if (m && !m[1].includes('curriculum-dsl')) {
      const path = m[1].startsWith('file:') ? fileURLToPath(m[1]) : m[1]
      return { file: relative(process.cwd(), path).replace(/\\/g, '/'), line: Number(m[2]) }
    }
  }
  return { file: '<curriculum>', line: 0 }
}

export function stage(id: string, title: string, output: OutputPolicy, units: Unit[]): Stage {
  return { id, title, output, units, at: callSite() }
}
export function unit(id: string, title: string, lessons: LessonPlan[]): Unit {
  return { id, title, lessons, at: callSite() }
}
export function lesson(p: Omit<LessonPlan, 'at' | 'assumes'> & { assumes?: string[] }): LessonPlan {
  return { assumes: [], ...p, at: callSite() }
}
