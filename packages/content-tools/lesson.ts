// Parses one lesson file into frontmatter and slots, keeping source lines. content/AUTHORING.md owns
// the syntax. `authoredLines` and `supportTexts` are the two views rules read, so no rule knows slots.
import { readFileSync } from 'node:fs'
import { basename } from 'node:path'
import type { Format, OpenerType } from '@lang-learner/core'
import type { Root, RootContent } from 'mdast'
import remarkDirective from 'remark-directive'
import remarkFrontmatter from 'remark-frontmatter'
import remarkParse from 'remark-parse'
import { unified } from 'unified'
import { z } from 'zod'
import { error, rel, validate, type Diag, type Loc } from './diag.ts'
import { parseYaml, type LocatedYaml, type Path } from './yaml-loc.ts'

export const SLOTS = ['opener', 'lesson', 'examples', 'practice'] as const
export type SlotName = (typeof SLOTS)[number]

const OPENER_TYPES: readonly string[] = ['story', 'showdown', 'mystery', 'discover'] satisfies OpenerType[]

/** The formats the toolchain can compile. `graded` formats have answers; `output` is the output level. */
export const FORMATS: Partial<Record<Format, { output: 0 | 1; graded: boolean }>> = {
  C0: { output: 0, graded: true },
  C1: { output: 1, graded: false },
}

/** YAML reads `key: 1` as a number; a key is always a string. */
const key = z.union([z.string(), z.number()]).transform(String)
const option = z.strictObject({ key, label: z.string(), target: z.boolean().optional() })
export type OptionSource = z.output<typeof option>

const item = z.strictObject({
  line: z.string().optional(),
  clip: z.string().optional(),
  syllable: z.string().optional(),
  answer: key.optional(),
  target: z.string().optional(),
  rung: z.number().int().min(1).max(5),
  en: z.string().optional(),
  options: z.array(option).min(2).max(4).optional(),
}).refine((i) => [i.line, i.clip, i.syllable].filter(Boolean).length === 1, 'an item takes exactly one of line, clip or syllable')
export type ItemSource = z.output<typeof item>

const video = z.strictObject({ youtubeId: z.string().length(11), role: z.enum(['main', 'supplemental']), durationSec: z.number().positive() })

const frontmatter = z.strictObject({
  idea: z.string(),
  cards: z.array(z.string()).default([]),
  skill: z.strictObject({ pool: z.array(item).min(1) }).optional(),
  chunks: z.array(z.string()).default([]),
  names: z.array(z.string()).default([]),
  deeper: z.array(z.strictObject({ question: z.string(), answer: z.string() })).default([]),
})
export type Frontmatter = z.output<typeof frontmatter>

const openerFence = z.strictObject({
  video: video.optional(),
  hook: z.strictObject({ prompt: z.string(), options: z.array(z.string()).min(2).max(4) }).optional(),
})
const lessonFence = z.strictObject({ figure: z.string().optional(), video: video.optional(), wrong: z.string().optional(), right: z.string().optional() })
const examplesFence = z.strictObject({ words: z.array(z.string()).min(1).optional(), highlight: z.array(z.string()).min(1).optional() })
const practiceFence = z.strictObject({ prompt: z.string(), options: z.array(option).min(2).max(4).optional(), items: z.array(item).min(1) })

export const INLINE_DIRECTIVES = ['ex', 'm', 'w', 'k'] as const
type InlineName = (typeof INLINE_DIRECTIVES)[number]

export interface Inline {
  kind: InlineName
  text: string
  /** `id` from `{#…}`, plus `clip`, `syllable` and `en` on `:ex`. */
  attrs: Record<string, string>
  line: number
}

export interface Paragraph {
  line: number
  /** The canonical string: directives with attributes dropped, soft breaks as spaces. */
  text: string
  inlines: Inline[]
  /** The text outside directives, which is support text. */
  plain: string
}

interface SlotCommon {
  line: number
  paragraphs: Paragraph[]
  y?: LocatedYaml
}

export type Slot =
  | (SlotCommon & { name: 'opener'; type?: OpenerType; data?: z.output<typeof openerFence> })
  | (SlotCommon & { name: 'lesson'; data?: z.output<typeof lessonFence> })
  | (SlotCommon & { name: 'examples'; readAlong: boolean; data?: z.output<typeof examplesFence> })
  | (SlotCommon & { name: 'practice'; format?: Format; data?: z.output<typeof practiceFence> })

export interface LessonDoc {
  file: string
  /** The file name. The lesson id is `<lang>:les:<key>`. */
  key: string
  /** Undefined when the frontmatter failed to parse or validate. */
  fm?: Frontmatter
  fmY?: LocatedYaml
  slots: Slot[]
  diags: Diag[]
}

export function parseLesson(path: string): LessonDoc {
  const file = rel(path)
  const source = readFileSync(path, 'utf8').replace(/\r\n/g, '\n')
  const diags: Diag[] = []
  const err = (line: number, message: string, rule = 'PARSE') => diags.push(error({ file, line }, rule, message))
  const tree = unified().use(remarkParse).use(remarkFrontmatter, ['yaml']).use(remarkDirective).parse(source) as Root

  const doc: LessonDoc = { file, key: basename(path, '.md'), slots: [], diags }
  for (const node of tree.children) {
    const line = node.position?.start.line ?? 0
    if (node.type === 'yaml') {
      doc.fmY = parseYaml(node.value, line + 1)
      doc.fmY.errors.forEach((e) => err(e.line, e.message))
      if (!doc.fmY.errors.length) {
        const fm = validate(frontmatter, doc.fmY, file, diags)
        if (fm) doc.fm = fm
      }
    } else if (node.type !== 'containerDirective') {
      if (node.type !== 'html') err(line, `content outside a slot; wrap it in one of ${SLOTS.map((s) => `:::${s}`).join(' ')}`)
    } else if (!(SLOTS as readonly string[]).includes(node.name)) {
      err(line, `unknown slot ":::${node.name}"; slots are ${SLOTS.join(', ')}`)
    } else {
      doc.slots.push(parseSlot(node.name as SlotName, node.attributes ?? {}, node.children, line, file, diags))
    }
  }
  if (!doc.fmY) err(1, 'a lesson needs frontmatter with at least "idea:"')
  return doc
}

function parseSlot(name: SlotName, attrs: Record<string, string | null | undefined>, children: RootContent[], line: number, file: string, diags: Diag[]): Slot {
  const err = (l: number, message: string, rule = 'PARSE') => diags.push(error({ file, line: l }, rule, message))
  const common: SlotCommon = { line, paragraphs: [] }
  for (const child of children) {
    const at = child.position?.start.line ?? line
    if (child.type === 'paragraph') common.paragraphs.push(parseParagraph(child, at, err))
    else if (child.type === 'code' && child.lang === 'yaml') {
      if (common.y) err(at, `a slot takes one yaml fence; ":::${name}" has two`)
      common.y = parseYaml(child.value, at + 1)
      common.y.errors.forEach((e) => err(e.line, e.message))
    } else if (child.type === 'code') err(at, `a code fence inside a slot must be \`\`\`yaml; got "${child.lang ?? ''}"`)
    else err(at, `a slot holds paragraphs and one yaml fence, not a ${child.type}`)
  }
  const fence = <S extends z.ZodType>(schema: S) => (common.y && !common.y.errors.length ? validate(schema, common.y, file, diags, 'STR002') : undefined)
  const optional = <T>(data: T | undefined) => (data === undefined ? {} : { data })
  switch (name) {
    case 'opener': {
      const type = attrs.type ?? ''
      if (!OPENER_TYPES.includes(type)) err(line, `:::opener needs {type=…}, one of ${OPENER_TYPES.join(', ')}`, 'STR002')
      return { ...common, name, ...(OPENER_TYPES.includes(type) ? { type: type as OpenerType } : {}), ...optional(fence(openerFence)) }
    }
    case 'lesson':
      return { ...common, name, ...optional(fence(lessonFence)) }
    case 'examples': {
      const type = attrs.type
      if (type && type !== 'read-along') err(line, `:::examples takes no {type=${type}}; the only type is read-along`, 'STR002')
      return { ...common, name, readAlong: type === 'read-along', ...optional(fence(examplesFence)) }
    }
    case 'practice': {
      const format = attrs.format ?? ''
      if (!(format in FORMATS)) err(line, `:::practice needs {format=…}, one of ${Object.keys(FORMATS).join(', ')}`, 'STR002')
      const data = fence(practiceFence)
      if (!common.y) err(line, ':::practice needs a yaml fence with prompt and items', 'STR002')
      return { ...common, name, ...(format in FORMATS ? { format: format as Format } : {}), ...optional(data) }
    }
  }
}

type AnyNode = { type: string; value?: string; name?: string; attributes?: Record<string, string | null | undefined>; children?: AnyNode[]; position?: { start: { line: number } } }

function parseParagraph(node: RootContent, line: number, err: (l: number, m: string) => void): Paragraph {
  const inlines: Inline[] = []
  let plain = ''
  const walk = (n: AnyNode): string => {
    const at = n.position?.start.line ?? line
    switch (n.type) {
      case 'text': {
        const value = (n.value ?? '').replace(/\s*\n\s*/g, ' ')
        plain += value
        return value
      }
      case 'emphasis': return `*${(n.children ?? []).map(walk).join('')}*`
      case 'strong': return `**${(n.children ?? []).map(walk).join('')}**`
      case 'break': return ' '
      case 'textDirective': return directive(n, at)
      case 'leafDirective':
      case 'containerDirective':
        err(at, `":${n.name}" must be an inline directive here`)
        return ''
      default: return n.children ? n.children.map(walk).join('') : (n.value ?? '')
    }
  }
  const directive = (n: AnyNode, at: number): string => {
    const name = n.name ?? ''
    if (!(INLINE_DIRECTIVES as readonly string[]).includes(name)) {
      err(at, `":${name}" was read as a directive. If it's part of an id, put the id in an attribute (:k{#zh:g:…}); in prose, escape the colon as "\\:"`)
      return ''
    }
    const nested = (n.children ?? []).find((c) => c.type === 'textDirective')
    if (nested) {
      err(at, `":${name}[…]" contains ":${nested.name}"; ids belong in an attribute: :${name}{#…}`)
      return ''
    }
    const text = (n.children ?? []).map((c) => c.value ?? '').join('')
    const attrs = Object.fromEntries(Object.entries(n.attributes ?? {}).filter((e): e is [string, string] => typeof e[1] === 'string'))
    inlines.push({ kind: name as InlineName, text, attrs, line: at })
    return name === 'k' ? `:k{#${attrs.id ?? ''}}` : `:${name}[${text}]`
  }
  const text = ((node as AnyNode).children ?? []).map(walk).join('').trim()
  return { line, text, inlines, plain: plain.trim() }
}

// ---- views for the rules and the compiler -----------------------------------------------------

export interface LocatedItem {
  item: ItemSource
  /** Where it sits: a practice slot, or the skill pool. */
  where: 'practice' | 'pool'
  at(path: Path): Loc
}

/** Every practice and pool item in the lesson, in file order. */
export function practiceItems(doc: LessonDoc): LocatedItem[] {
  const practice = doc.slots.flatMap((s) => (s.name === 'practice' && s.data && s.y ? s.data.items.map((item, i) => {
    const y = s.y!
    return { item, where: 'practice' as const, at: (p: Path) => ({ file: doc.file, line: y.lineOf(['items', i, ...p]) }) }
  }) : []))
  const pool = (doc.fm?.skill?.pool ?? []).map((item, i) => ({
    item, where: 'pool' as const, at: (p: Path) => ({ file: doc.file, line: doc.fmY?.lineOf(['skill', 'pool', i, ...p]) ?? 1 }),
  }))
  return [...practice, ...pool]
}

export interface AuthoredLine {
  /** Target text, absent on a bare clip reference. */
  zh?: string
  clip?: string
  syllable?: string
  en?: string
  at: Loc
  /** False for lines shown but never played: a ✗ form or a button label. */
  played: boolean
  /** True for an opener line, which is heard for the hook and needn't be on the path. */
  listenOnly?: boolean
  /** True when the slot requires a translation. */
  needsEn: boolean
}

const defined = <T extends object>(o: T) => Object.fromEntries(Object.entries(o).filter((e) => e[1] !== undefined)) as { [K in keyof T]: Exclude<T[K], undefined> }

/** Every target-language line the lesson shows or plays. */
export function authoredLines(doc: LessonDoc): AuthoredLine[] {
  const out: AuthoredLine[] = []
  const at = (line: number) => ({ file: doc.file, line })
  const labels = (options: OptionSource[] | undefined, loc: (i: number) => Loc) => options?.forEach((o, i) => {
    if (o.target) out.push({ zh: o.label, at: loc(i), played: false, needsEn: false })
  })
  for (const s of doc.slots) {
    for (const p of s.paragraphs) for (const i of p.inlines) {
      if (i.kind !== 'ex') continue
      const { clip, syllable, en } = i.attrs
      out.push(defined({ zh: syllable ? undefined : i.text, clip, syllable, en, at: at(i.line), played: true, listenOnly: s.name === 'opener', needsEn: s.name === 'examples' && !syllable }))
    }
    if (s.name === 'lesson' && s.data && s.y) {
      const { wrong, right } = s.data
      if (wrong) out.push({ zh: wrong, at: at(s.y.lineOf(['wrong'])), played: false, needsEn: false })
      if (right) out.push({ ...(right.startsWith('clip:') ? { clip: right } : { zh: right }), at: at(s.y.lineOf(['right'])), played: true, needsEn: false })
    }
    if (s.name === 'practice' && s.data && s.y) {
      const y = s.y
      labels(s.data.options, (i) => at(y.lineOf(['options', i, 'label'])))
    }
  }
  for (const { item, at: loc } of practiceItems(doc)) {
    const { line, clip, syllable, en } = item
    out.push(defined({ zh: line, clip, syllable, en, at: loc([]), played: true, needsEn: false }))
    labels(item.options, (i) => loc(['options', i, 'label']))
  }
  return out
}

export type SupportKind = 'idea' | 'body' | 'prompt' | 'option' | 'hook-option' | 'deeper-question' | 'deeper-answer' | 'translation'

export interface SupportText {
  text: string
  kind: SupportKind
  at: Loc
}

/** Every support-language string the lesson file holds. The lesson's title lives in the curriculum. */
export function supportTexts(doc: LessonDoc): SupportText[] {
  const out: SupportText[] = []
  const fm = (p: Path) => ({ file: doc.file, line: doc.fmY?.lineOf(p) ?? 1 })
  if (doc.fm) {
    out.push({ text: doc.fm.idea, kind: 'idea', at: fm(['idea']) })
    doc.fm.deeper.forEach((d, i) => {
      out.push({ text: d.question, kind: 'deeper-question', at: fm(['deeper', i, 'question']) })
      out.push({ text: d.answer, kind: 'deeper-answer', at: fm(['deeper', i, 'answer']) })
    })
  }
  const options = (list: OptionSource[] | undefined, at: (i: number) => Loc) => list?.forEach((o, i) => {
    if (!o.target) out.push({ text: o.label, kind: 'option', at: at(i) })
  })
  for (const s of doc.slots) {
    const y = (p: Path) => ({ file: doc.file, line: s.y?.lineOf(p) ?? s.line })
    for (const p of s.paragraphs) {
      if (p.plain) out.push({ text: p.plain, kind: 'body', at: { file: doc.file, line: p.line } })
      for (const i of p.inlines) if (i.attrs.en) out.push({ text: i.attrs.en, kind: 'translation', at: { file: doc.file, line: i.line } })
    }
    if (s.name === 'opener' && s.data?.hook) {
      out.push({ text: s.data.hook.prompt, kind: 'prompt', at: y(['hook', 'prompt']) })
      s.data.hook.options.forEach((o, i) => out.push({ text: o, kind: 'hook-option', at: y(['hook', 'options', i]) }))
    }
    if (s.name === 'practice' && s.data) {
      out.push({ text: s.data.prompt, kind: 'prompt', at: y(['prompt']) })
      options(s.data.options, (i) => y(['options', i, 'label']))
    }
  }
  for (const { item, at } of practiceItems(doc)) {
    if (item.en) out.push({ text: item.en, kind: 'translation', at: at(['en']) })
    options(item.options, (i) => at(['options', i, 'label']))
  }
  return out
}
