import { join } from 'node:path'
import { loadCatalog, type Diag } from '../catalog.ts'
import { makeCtx, type Ctx } from './context.ts'
import { RULES } from './rules.ts'

export interface CheckOptions {
  /** Replaces <root>/<lang>/curriculum.ts (fixtures extend the base curriculum this way). */
  curriculumFile?: string
  /** Lesson folders to check; defaults to <root>/<lang>/lessons. */
  lessonDirs?: string[]
}

export async function runCheck(root: string, opts: CheckOptions = {}, lang = 'zh'): Promise<{ ctx: Ctx; diags: Diag[] }> {
  const cat = await loadCatalog(root, lang, opts.curriculumFile)
  const ctx = makeCtx(cat, opts.lessonDirs ?? [join(root, lang, 'lessons')])
  const diags = [...cat.diags, ...ctx.docs.flatMap((d) => d.diags), ...RULES.flatMap((r) => r.run(ctx))]
  const seen = new Set<string>()
  return {
    ctx,
    diags: diags
      .filter((d) => { const k = format(d); if (seen.has(k)) return false; seen.add(k); return true })
      .sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line || a.rule.localeCompare(b.rule)),
  }
}

export function format(d: Diag): string {
  return `${d.file}:${d.line} ${d.rule}${d.severity === 'warn' ? ' (warn)' : ''} ${d.message}`
}
