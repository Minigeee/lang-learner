// Loads everything except lesson files into one Catalog, and owns id resolution (redirects included).
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join, relative } from 'node:path'
import { pathToFileURL } from 'node:url'
import { z } from 'zod'
import { parseYaml, type LocatedYaml } from './yaml-loc.ts'
import { parseId, type Kind } from './ids.ts'
import type { Stage, LessonPlan, Loc } from './curriculum-dsl.ts'
import { loadCedict, itemKey, type Lexicon } from './zh/cedict.ts'

export interface Diag { file: string; line: number; rule: string; severity: 'error' | 'warn'; message: string }

export function rel(p: string): string {
  return relative(process.cwd(), p).replace(/\\/g, '/')
}

// ---- schemas for the YAML content files -------------------------------------------------------
// Authored items: grammar points (g), sound contrasts (sc) and sound rules (sr). Words come from CC-CEDICT.
const itemsFile = z.array(z.object({
  id: z.string(), name: z.string(), pattern: z.string().optional(),
  prereqs: z.array(z.string()).default([]),
  confusableWith: z.array(z.string()).optional(),
}).strict())

const lineSchema = z.object({
  t: z.tuple([z.number(), z.number()]), zh: z.string(), en: z.string().optional(),
  speaker: z.string().optional(), tags: z.array(z.string()).default([]),
}).strict()
const gistSchema = z.object({
  ask: z.string(), choices: z.array(z.string()).min(2), answer: z.number().int(),
  tests: z.array(z.string()).default([]), line: z.number().int().optional(),
}).strict()
const mediaFile = z.object({
  id: z.string(), title: z.string(),
  context: z.enum(['ci-teacher', 'kids-show', 'vlog', 'interview', 'read-aloud', 'storybook', 'word-audio', 'sentence-audio']),
  durationSec: z.number().positive(), speakers: z.array(z.string()).min(1),
  source: z.union([
    z.object({ provider: z.literal('youtube'), videoId: z.string().length(11) }).strict(),
    z.object({ provider: z.literal('storage'), key: z.string() }).strict(),
  ]),
  rights: z.union([
    z.object({ kind: z.literal('embed') }).strict(),
    z.object({ kind: z.literal('open'), license: z.string(), author: z.string(), sourceUrl: z.string() }).strict(),
  ]),
  // README constraint: lesson clips need an automatically obtained transcript.
  transcript: z.enum(['youtube-captions', 'common-voice', 'source-text', 'asr-validated', 'none']),
  clips: z.array(z.object({
    id: z.string(), span: z.tuple([z.number(), z.number()]),
    lines: z.array(lineSchema).min(1), questions: z.array(gistSchema).default([]),
  }).strict()).default([]),
}).strict()
const redirectsFile = z.record(z.string(), z.string())
const templateFile = z.object({
  template: z.string(),
  slots: z.record(z.string(), z.object({ required: z.boolean(), widgets: z.array(z.string()).optional() }).strict()),
}).strict()

// ---- catalog types -----------------------------------------------------------------------------
export interface AuthoredItem { id: string; name: string; prereqs: string[]; confusableWith?: string[]; at: Loc }
export interface Line { t: [number, number]; zh: string; en?: string; tags: string[]; at: Loc }
export interface Gist { ask: string; choices: string[]; answer: number; tests: string[]; at: Loc }
export interface Clip { id: string; media: string; span: [number, number]; lines: Line[]; questions: Gist[]; at: Loc }
export interface Media extends Omit<z.infer<typeof mediaFile>, 'clips'> { at: Loc }
export interface Template { name: string; slots: Record<string, { required: boolean; widgets?: string[] }> }

export interface Catalog {
  lang: string
  root: string
  stages: Stage[]
  lessons: LessonPlan[] // curriculum order
  stageOf: Map<string, Stage>
  items: Map<string, AuthoredItem> // authored g / sc / sr items
  media: Map<string, Media>
  clips: Map<string, Clip>
  redirects: Map<string, { to: string; at: Loc }>
  templates: Map<string, Template>
  lexicon: Lexicon
  wordKeys: Set<string> // `zh:w:<itemKey>` for every CC-CEDICT entry
  diags: Diag[]
}

function readYaml(file: string, diags: Diag[]): LocatedYaml | undefined {
  const y = parseYaml(readFileSync(file, 'utf8'))
  for (const e of y.errors) diags.push({ file: rel(file), line: e.line, rule: 'PARSE', severity: 'error', message: e.message })
  return y.errors.length ? undefined : y
}

/** Validate located YAML against a schema; schema issues become SCHEMA diagnostics at the offending line. */
export function validate<T>(schema: z.ZodType<T>, y: LocatedYaml, file: string, diags: Diag[], rule = 'SCHEMA'): T | undefined {
  const r = schema.safeParse(y.data)
  if (r.success) return r.data
  for (const issue of r.error.issues) {
    const path = [...(issue.path as (string | number)[]), ...(issue.code === 'unrecognized_keys' ? issue.keys.slice(0, 1) : [])]
    diags.push({ file, line: y.lineOf(path), rule, severity: 'error', message: `${path.join('.') || '(root)'}: ${issue.message}` })
  }
  return undefined
}

let lexiconCache: { lex: Lexicon; keys: Set<string> } | undefined
function lexicon(lang: string) {
  if (!lexiconCache) {
    const lex = loadCedict()
    const keys = new Set<string>()
    for (const e of lex.entries) { const k = itemKey(e); if (k) keys.add(`${lang}:w:${k}`) }
    lexiconCache = { lex, keys }
  }
  return lexiconCache
}

/** `contentRoot` holds `<lang>/` (curriculum, items, lessons, templates, redirects) and `media/`. */
export async function loadCatalog(contentRoot: string, lang = 'zh', curriculumFile?: string): Promise<Catalog> {
  const diags: Diag[] = []
  const langDir = join(contentRoot, lang)
  const mod = await import(pathToFileURL(curriculumFile ?? join(langDir, 'curriculum.ts')).href)
  const stages: Stage[] = mod.curriculum
  const lessons = stages.flatMap((s) => s.units.flatMap((u) => u.lessons))
  const stageOf = new Map<string, Stage>()
  for (const s of stages) for (const u of s.units) for (const l of u.lessons) stageOf.set(l.id, s)

  const items = new Map<string, AuthoredItem>()
  const iFile = join(langDir, 'items.yaml')
  const iy = readYaml(iFile, diags)
  const iData = iy && validate(itemsFile, iy, rel(iFile), diags)
  iData?.forEach((g, i) => items.set(g.id, { ...g, at: { file: rel(iFile), line: iy!.lineOf([i, 'id']) } }))

  const media = new Map<string, Media>()
  const clips = new Map<string, Clip>()
  const mediaDir = join(contentRoot, 'media')
  for (const f of existsSync(mediaDir) ? readdirSync(mediaDir).filter((n) => n.endsWith('.yaml')).sort() : []) {
    const file = join(mediaDir, f)
    const y = readYaml(file, diags)
    const list = y && validate(z.union([mediaFile, z.array(mediaFile)]), y, rel(file), diags)
    if (!list || !y) continue
    ;(Array.isArray(list) ? list : [list]).forEach((m, mi) => {
      const base = Array.isArray(list) ? [mi] : []
      const at = (p: (string | number)[]) => ({ file: rel(file), line: y.lineOf([...base, ...p]) })
      const { clips: cl, ...rest } = m
      media.set(m.id, { ...rest, at: at(['id']) })
      cl.forEach((c, ci) => clips.set(c.id, {
        id: c.id, media: m.id, span: c.span, at: at(['clips', ci, 'id']),
        lines: c.lines.map((l, li) => ({ ...l, at: at(['clips', ci, 'lines', li, 'zh']) })),
        questions: c.questions.map((q, qi) => ({ ...q, at: at(['clips', ci, 'questions', qi, 'ask']) })),
      }))
    })
  }

  const redirects = new Map<string, { to: string; at: Loc }>()
  const rFile = join(langDir, 'redirects.yaml')
  if (existsSync(rFile)) {
    const y = readYaml(rFile, diags)
    const r = y && validate(redirectsFile, y, rel(rFile), diags)
    for (const [from, to] of Object.entries(r ?? {})) redirects.set(from, { to, at: { file: rel(rFile), line: y!.lineOf([from]) } })
  }

  const templates = new Map<string, Template>()
  const tDir = join(langDir, 'templates')
  for (const f of existsSync(tDir) ? readdirSync(tDir).filter((n) => n.endsWith('.yaml')) : []) {
    const file = join(tDir, f)
    const y = readYaml(file, diags)
    const t = y && validate(templateFile, y, rel(file), diags)
    if (t) templates.set(t.template, { name: t.template, slots: t.slots })
  }

  const { lex, keys } = lexicon(lang)
  return { lang, root: contentRoot, stages, lessons, stageOf, items, media, clips, redirects, templates, lexicon: lex, wordKeys: keys, diags }
}

export type Resolution =
  | { ok: true; id: string; redirectedFrom?: string }
  | { ok: false; error: string }

/** Parse, follow one redirect hop, and check existence. The single resolver every rule uses. */
export function resolve(cat: Catalog, raw: string, expect: readonly Kind[]): Resolution {
  const p = parseId(raw, expect)
  if (!p.ok) return p
  let id = raw
  const r = cat.redirects.get(id)
  if (r) id = r.to
  const exists = existsIn(cat, id)
  if (!exists) {
    const hint = suggest(cat, id)
    return { ok: false, error: `${r ? `"${raw}" redirects to "${id}", which` : `"${raw}"`} does not exist${hint}` }
  }
  return r ? { ok: true, id, redirectedFrom: raw } : { ok: true, id }
}

function existsIn(cat: Catalog, id: string): boolean {
  const p = parseId(id)
  if (!p.ok) return false
  switch (p.value.kind) {
    case 'w': return cat.wordKeys.has(id)
    case 'g': case 'sc': case 'sr': return cat.items.has(id)
    case 'les': return cat.lessons.some((l) => l.id === id)
    case 'clip': return cat.clips.has(id)
    case 'media': return cat.media.has(id)
    default: return false // kinds the spike doesn't model (c, cmp, sc, sr, spk, lic)
  }
}

function suggest(cat: Catalog, id: string): string {
  const p = parseId(id)
  if (!p.ok) return ''
  if (p.value.kind === 'w') {
    const lemma = p.value.key.split(':')[0]
    const alts = [...(cat.lexicon.bySimp.get(lemma) ?? [])].map((e) => itemKey(e)).filter(Boolean).map((k) => `${cat.lang}:w:${k}`)
    return alts.length ? `; CC-CEDICT has ${[...new Set(alts)].join(', ')}` : `; "${lemma}" is not in CC-CEDICT`
  }
  const pool = ['g', 'sc', 'sr'].includes(p.value.kind) ? [...cat.items.keys()] : p.value.kind === 'clip' ? [...cat.clips.keys()] : p.value.kind === 'les' ? cat.lessons.map((l) => l.id) : []
  const close = pool.filter((c) => editDistance(c, id) <= Math.max(2, Math.floor(id.length / 5))).slice(0, 3)
  return close.length ? `; did you mean ${close.join(', ')}?` : ''
}

function editDistance(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)])
  for (let j = 1; j <= b.length; j++) d[0][j] = j
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
  return d[a.length][b.length]
}
