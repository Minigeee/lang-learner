// Loads a content root into one Project: everything rules and the compiler read. The Project owns id
// resolution and line matching, so every rule resolves and matches the same way.
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, resolve as absolute } from 'node:path'
import { pathToFileURL } from 'node:url'
import { createIdParser, CORE_ITEM_KINDS, type ClipId, type ItemId, type MediaId } from '@lang-learner/core'
import { z } from 'zod'
import { makeCurriculum, type Curriculum, type CurriculumSource, type LessonNode } from './curriculum.ts'
import { rel, validate, type Diag, type Loc } from './diag.ts'
import { parseLesson, type LessonDoc } from './lesson.ts'
import type { BuildPack, Placement } from './pack.ts'
import { parseYaml, type LocatedYaml } from './yaml-loc.ts'

const itemsFile = z.array(z.strictObject({ id: z.string(), name: z.string() }))

const wordsFile = z.array(z.strictObject({
  id: z.string(),
  senses: z.array(z.string()).min(1).max(3),
  word: z.string(),
  sentence: z.string(),
  en: z.string(),
  target: z.string().optional(),
  image: z.strictObject({ none: z.enum(['pending', 'no_candidate', 'gate_failed', 'hazard']) }).default({ none: 'pending' }),
}))

const SOURCES = ['aishell3', 'aishell1', 'audio-cmn', 'yoyo', 'elevenlabs'] as const
/** Machine output of tools/media-ingest. Only the fields the toolchain reads are checked. */
const mediaFile = z.array(z.looseObject({
  id: z.string(),
  source: z.enum(SOURCES),
  zh: z.string().optional(),
  syllable: z.string().optional(),
  speaker: z.string(),
  media: z.string(),
  file: z.looseObject({ key: z.string(), sha256: z.string(), bytes: z.number().int().positive(), durationSec: z.number().positive() }),
  lufs: z.number(),
  rights: z.looseObject({ license: z.string(), source: z.string(), changes: z.string(), restriction: z.string().optional() }),
}))

const licensesFile = z.array(z.strictObject({
  id: z.string(),
  name: z.string(),
  kind: z.enum(['open', 'tts', 'personal']),
  url: z.string(),
  author: z.string(),
  sources: z.array(z.string()),
  always: z.boolean().optional(),
  restriction: z.string().optional(),
}))

const speakersFile = z.array(z.union([
  z.strictObject({ id: z.string(), name: z.string(), native: z.boolean() }),
  z.strictObject({ family: z.string(), name: z.string(), native: z.boolean() }),
]))

const redirectsFile = z.record(z.string(), z.string())

export type WordEntry = z.output<typeof wordsFile>[number] & { at: Loc }
export interface MediaRecord {
  id: ClipId
  source: (typeof SOURCES)[number]
  zh?: string
  syllable?: string
  speaker: string
  media: MediaId
  file: { key: string; sha256: string; bytes: number; durationSec: number }
  lufs: number
  rights: { license: string; source: string; changes: string; restriction?: string }
  at: Loc
}
export type License = z.output<typeof licensesFile>[number] & { at: Loc }
export interface AuthoredItem { id: ItemId; name: string; at: Loc }

export interface ContentPaths {
  curriculum: string
  items: string
  words: string
  redirects: string
  lessons: string
  media: string
  vocab: string
  strings: string
  licenses: string
  speakers: string
}

export interface ProjectOptions {
  root: string
  /** A folder laid out like `root`. Any path it has replaces the same path under `root`. */
  overlay?: string
  lang?: string
  /** The pack to use; defaults to the one under languages/<lang>/build. */
  pack?: BuildPack
}

export function contentPaths(root: string, lang: string, overlay?: string): ContentPaths {
  const at = (...parts: string[]) => {
    const over = overlay && join(overlay, ...parts)
    return over && existsSync(over) ? over : join(root, ...parts)
  }
  return {
    curriculum: at(lang, 'curriculum.ts'),
    items: at(lang, 'items', 'items.yaml'),
    words: at(lang, 'items', 'overrides', 'words.yaml'),
    redirects: at(lang, 'redirects.yaml'),
    lessons: at(lang, 'lessons'),
    media: at(lang, 'media', 'media.yaml'),
    vocab: at(lang, 'vocab'),
    strings: at(lang, 'l10n', 'lessons.tsv'),
    licenses: at('shared', 'licenses.yaml'),
    speakers: at('shared', 'speakers.yaml'),
  }
}

export interface Project {
  lang: string
  paths: ContentPaths
  pack: BuildPack
  curriculum: Curriculum
  /** Where curriculum.ts first says `needle`, so curriculum diagnostics point at a line. */
  curriculumLine(needle: string): Loc
  items: Map<string, AuthoredItem>
  words: Map<string, WordEntry>
  redirects: Map<string, { to: string; at: Loc }>
  clips: Map<string, MediaRecord>
  licenses: Map<string, License>
  speakers: { ids: Set<string>; families: string[] }
  vocab: Placement[]
  docs: LessonDoc[]
  diags: Diag[]
  /** The curriculum entry a lesson file belongs to. */
  lessonOf(doc: LessonDoc): LessonNode | undefined
  /** Clips whose transcript equals the line, ignoring punctuation and spacing. Ordered by id. */
  clipsForLine(zh: string): MediaRecord[]
  clipsForSyllable(syllable: string): MediaRecord[]
  /** Transcript lines closest to a line that has no clip, for MED001's suggestion. */
  nearestLines(zh: string, k?: number): string[]
}

export function groupBy<T>(list: T[], key: (t: T) => string): Map<string, T[]> {
  const out = new Map<string, T[]>()
  for (const t of list) out.set(key(t), [...(out.get(key(t)) ?? []), t])
  return out
}

/** Matching ignores whitespace and punctuation, so 我是学生 matches 我是学生。 */
export function norm(s: string): string {
  return s.normalize('NFC').replace(/[\s\p{P}\p{S}]/gu, '')
}

function readYaml(file: string, diags: Diag[]): LocatedYaml | undefined {
  if (!existsSync(file)) return undefined
  const y = parseYaml(readFileSync(file, 'utf8').replace(/\r\n/g, '\n'))
  for (const e of y.errors) diags.push({ file: rel(file), line: e.line, rule: 'PARSE', severity: 'error', message: e.message })
  return y.errors.length ? undefined : y
}

function load<S extends z.ZodType>(file: string, schema: S, diags: Diag[]): { data: z.output<S>; at(path: (string | number)[]): Loc } | undefined {
  const y = readYaml(file, diags)
  const data = y && validate(schema, y, rel(file), diags)
  return data === undefined ? undefined : { data, at: (path) => ({ file: rel(file), line: y!.lineOf(path) }) }
}

async function defaultPack(lang: string): Promise<BuildPack> {
  const url = new URL(`../../languages/${lang}/build/index.ts`, import.meta.url)
  return ((await import(url.href)) as { pack: BuildPack }).pack
}

export async function loadProject(options: ProjectOptions): Promise<Project> {
  const lang = options.lang ?? 'zh'
  const paths = contentPaths(options.root, lang, options.overlay)
  const pack = options.pack ?? (await defaultPack(lang))
  const diags: Diag[] = []

  const stages = ((await import(pathToFileURL(absolute(paths.curriculum)).href)) as { curriculum: CurriculumSource }).curriculum
  const curriculum = makeCurriculum(stages)
  const curriculumText = readFileSync(paths.curriculum, 'utf8').split(/\r?\n/)
  const curriculumLine = (needle: string) => ({ file: rel(paths.curriculum), line: curriculumText.findIndex((l) => l.includes(needle)) + 1 || 1 })

  const items = new Map<string, AuthoredItem>()
  const itemData = load(paths.items, itemsFile, diags)
  itemData?.data.forEach((it, i) => items.set(it.id, { id: it.id as ItemId, name: it.name, at: itemData.at([i, 'id']) }))

  const words = new Map<string, WordEntry>()
  const wordData = load(paths.words, wordsFile, diags)
  wordData?.data.forEach((w, i) => words.set(w.id, { ...w, at: wordData.at([i, 'id']) }))

  const redirects = new Map<string, { to: string; at: Loc }>()
  const redirectData = load(paths.redirects, redirectsFile, diags)
  for (const [from, to] of Object.entries(redirectData?.data ?? {})) redirects.set(from, { to, at: redirectData!.at([from]) })

  const clips = new Map<string, MediaRecord>()
  const mediaData = load(paths.media, mediaFile, diags)
  mediaData?.data.forEach((m, i) => clips.set(m.id, { ...m, at: mediaData.at([i, 'id']) } as MediaRecord))

  const licenses = new Map<string, License>()
  const licenseData = load(paths.licenses, licensesFile, diags)
  licenseData?.data.forEach((l, i) => licenses.set(l.id, { ...l, at: licenseData.at([i, 'id']) }))

  const speakers = { ids: new Set<string>(), families: [] as string[] }
  for (const s of load(paths.speakers, speakersFile, diags)?.data ?? []) {
    if ('id' in s) speakers.ids.add(s.id)
    else speakers.families.push(`${s.family}-`)
  }

  const docs = existsSync(paths.lessons)
    ? readdirSync(paths.lessons).filter((n) => n.endsWith('.md')).sort().map((n) => parseLesson(join(paths.lessons, n)))
    : []

  const ordered = [...clips.values()].sort((a, b) => (a.id < b.id ? -1 : 1))
  const byLine = groupBy(ordered.filter((c) => c.zh), (c) => norm(c.zh!))
  const bySyllable = groupBy(ordered.filter((c) => c.syllable), (c) => c.syllable!)

  return {
    lang, paths, pack, curriculum, curriculumLine, items, words, redirects, clips, licenses, speakers,
    vocab: pack.loadVocab(paths.vocab),
    docs, diags,
    lessonOf: (doc) => curriculum.lessons.get(`${lang}:les:${doc.key}`),
    clipsForLine: (zh) => byLine.get(norm(zh)) ?? [],
    clipsForSyllable: (syllable) => bySyllable.get(syllable) ?? [],
    nearestLines(zh, k = 2) {
      const bigrams = (s: string) => new Set([...s].map((c, i, a) => c + (a[i + 1] ?? '')))
      const query = bigrams(norm(zh))
      return [...byLine.entries()]
        .map(([n, [clip]]) => ({ zh: clip!.zh!, score: [...bigrams(n)].filter((b) => query.has(b)).length }))
        .filter((x) => x.score > 0)
        .sort((a, b) => b.score - a.score || (a.zh < b.zh ? -1 : 1))
        .slice(0, k)
        .map((x) => x.zh)
    },
  }
}

// ---- id resolution ----------------------------------------------------------------------------

export type Resolution = { ok: true; id: string; redirectedFrom?: string } | { ok: false; grammar: boolean; error: string }

/** Parses an id, follows one redirect and checks existence. `kinds` limits what the field accepts. */
export function resolve(project: Project, raw: string, kinds: readonly string[]): Resolution {
  const { pack, redirects } = project
  const parsed = createIdParser(pack.itemKinds)(raw)
  if (!parsed.ok) return { ok: false, grammar: true, error: parsed.error }
  const { kind, key } = parsed.value
  if (!kinds.includes(kind)) return { ok: false, grammar: true, error: `"${raw}" is a ${kind} id; expected ${kinds.join(' or ')}` }
  const keyError = kind === 'w' ? pack.wordKeyError(key) : null
  if (keyError) return { ok: false, grammar: true, error: keyError }
  const redirect = redirects.get(raw)
  const id = redirect?.to ?? raw
  if (!exists(project, id)) {
    const subject = redirect ? `"${raw}" redirects to "${id}", which` : `"${raw}"`
    return { ok: false, grammar: false, error: `${subject} doesn't exist${suggestion(project, id)}` }
  }
  return redirect ? { ok: true, id, redirectedFrom: raw } : { ok: true, id }
}

/** Every item kind an id can name in this project. */
export const itemKinds = (project: Project): readonly string[] => [...CORE_ITEM_KINDS, ...project.pack.itemKinds]

function exists(project: Project, id: string): boolean {
  const kind = id.startsWith('clip:') ? 'clip' : id.split(':')[1]
  if (kind === 'clip') return project.clips.has(id)
  if (kind === 'w') return project.pack.wordExists(id as ItemId)
  return project.items.has(id)
}

function suggestions(project: Project, id: string): string[] {
  const kind = id.startsWith('clip:') ? 'clip' : id.split(':')[1]
  if (kind === 'w') return project.pack.wordIds(id.split(':')[2] ?? '')
  const pool = kind === 'clip' ? [...project.clips.keys()] : [...project.items.keys()]
  return pool.filter((c) => editDistance(c, id) <= Math.max(2, Math.floor(id.length / 5))).slice(0, 3)
}

function suggestion(project: Project, id: string): string {
  const close = suggestions(project, id)
  return close.length ? `; did you mean ${close.join(', ')}?` : ''
}

function editDistance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    let diagonal = row[0]!
    row[0] = i
    for (let j = 1; j <= b.length; j++) {
      const above = row[j]!
      row[j] = Math.min(above + 1, row[j - 1]! + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1))
      diagonal = above
    }
  }
  return row[b.length]!
}
