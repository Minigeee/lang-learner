// What every check rule receives: the catalog, the parsed lessons, and shared lookups.
import { join } from 'node:path'
import { readdirSync, existsSync } from 'node:fs'
import type { Catalog, Diag } from '../catalog.ts'
import type { LessonDoc } from '../lesson.ts'
import { parseLesson } from '../lesson.ts'
import type { LessonPlan } from '../curriculum-dsl.ts'

export interface Ctx {
  cat: Catalog
  docs: LessonDoc[]
  planOf(doc: LessonDoc): LessonPlan | undefined
  /** Transcript lines of lesson-eligible clips (media with an automatic transcript), for example matching. */
  lines: { clip: string; zh: string; norm: string }[]
}

export interface Rule { id: string; summary: string; run(ctx: Ctx): Diag[] }

/** Matching ignores whitespace and punctuation, so 我没喝咖啡 matches 我没喝咖啡。 */
export function norm(s: string): string {
  return s.normalize('NFC').replace(/[\s\p{P}\p{S}]/gu, '')
}

export function lessonEligible(cat: Catalog, clipId: string): boolean {
  const c = cat.clips.get(clipId)
  const m = c && cat.media.get(c.media)
  return !!m && m.transcript !== 'none'
}

export function makeCtx(cat: Catalog, lessonDirs: string[]): Ctx {
  const docs: LessonDoc[] = []
  for (const dir of lessonDirs) {
    if (!existsSync(dir)) continue
    for (const f of readdirSync(dir).filter((n) => n.endsWith('.md')).sort()) docs.push(parseLesson(join(dir, f)))
  }
  const byId = new Map(cat.lessons.map((l) => [l.id, l]))
  const lines = [...cat.clips.values()]
    .filter((c) => lessonEligible(cat, c.id))
    .flatMap((c) => c.lines.map((l) => ({ clip: c.id, zh: l.zh, norm: norm(l.zh) })))
  return { cat, docs, planOf: (d) => byId.get(`${cat.lang}:les:${d.key}`), lines }
}

/** Clips whose transcript contains the example (a whole line, or part of one). */
export function matchLines(ctx: Ctx, zh: string, clip?: string) {
  const n = norm(zh)
  return ctx.lines.filter((l) => (!clip || l.clip === clip) && n.length > 0 && l.norm.includes(n))
}

export function nearestLines(ctx: Ctx, zh: string, k = 2): string[] {
  const bigrams = (s: string) => new Set([...s].map((c, i, a) => c + (a[i + 1] ?? '')))
  const q = bigrams(norm(zh))
  return ctx.lines
    .map((l) => ({ l, score: [...bigrams(l.norm)].filter((b) => q.has(b)).length }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map((x) => `${x.l.zh} (${x.l.clip})`)
}
