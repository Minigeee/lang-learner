// Parses one lesson file into slots, prose and widget blocks, keeping source lines.
// Syntax (TDD §6.2, as revised by this spike; see FINDINGS.md):
//   :::<slot> … :::            skeleton slots, in skeleton order
//   ```@<widget> … ```         an interactable; the body is YAML config
//   :ex[…]{clip=…}             a native example (clip optional: resolved by transcript match)
//   :bad[…]                    a wrong form (no audio)
//   :m[…]                      a mention of target-language text (no audio, no item link); the zh pack
//                              also treats a short unmarked Han run (≤ 4 characters, no sentence punctuation) as one
//   :w[…]{#id}                 a word chip; :k{#id} a chip for any item
import { readFileSync } from 'node:fs'
import { basename } from 'node:path'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkDirective from 'remark-directive'
import remarkFrontmatter from 'remark-frontmatter'
import type { Root, RootContent, PhrasingContent } from 'mdast'
import { z } from 'zod'
import { parseYaml, type LocatedYaml } from './yaml-loc.ts'
import { SLOTS, type SlotName } from './widgets.ts'
import { validate, rel, type Diag } from './catalog.ts'

export const INLINE_DIRECTIVES = ['ex', 'bad', 'm', 'w', 'k'] as const
type InlineName = (typeof INLINE_DIRECTIVES)[number]

export interface Inline { kind: InlineName; text: string; attrs: Record<string, string>; line: number }
export interface TextRun { text: string; line: number }
export interface ProseBlock { kind: 'prose'; line: number; node: RootContent; inlines: Inline[]; english: TextRun[]; unmarkedHan: TextRun[] }
export interface Instance { key?: string; optional?: boolean; reason?: string }
/** `config` is the YAML body minus the instance fields (key, optional, reason), which every widget shares. */
export interface WidgetBlock { kind: 'widget'; widget: string; line: number; y: LocatedYaml; instance: Instance; config: unknown }
export type Block = ProseBlock | WidgetBlock
export interface SlotSection { name: SlotName; line: number; blocks: Block[] }

const want = z.object({
  exemplifies: z.array(z.string()).default([]), minSec: z.number().optional(), maxSec: z.number().optional(),
  novelty: z.enum(['any', 'unseen', 'studied']).optional(), hasQuestions: z.boolean().optional(),
  speaker: z.object({ notIn: z.array(z.string()) }).strict().optional(),
}).strict()
const frontmatter = z.object({
  clips: z.record(z.string(), z.object({ want: want.default({ exemplifies: [] }), candidates: z.array(z.string()).min(1) }).strict()).default({}),
  cards: z.array(z.object({ kind: z.literal('sentence'), clip: z.string(), note: z.string() }).strict()).default([]),
}).strict()
export type Frontmatter = z.infer<typeof frontmatter>

export interface LessonDoc {
  file: string
  key: string // from the file name; the lesson id is <lang>:les:<key>
  fm: Frontmatter
  /** False when the frontmatter failed to parse or validate; rules then skip checks that depend on it. */
  fmValid: boolean
  fmY?: LocatedYaml
  slots: SlotSection[]
  diags: Diag[]
}

const HAN = /\p{Script=Han}/u

export function parseLesson(path: string): LessonDoc {
  const file = rel(path)
  const src = readFileSync(path, 'utf8')
  const diags: Diag[] = []
  const err = (line: number, message: string, rule = 'PARSE') => diags.push({ file, line, rule, severity: 'error', message })
  const tree = unified().use(remarkParse).use(remarkFrontmatter, ['yaml']).use(remarkDirective).parse(src) as Root

  let fm: Frontmatter = { clips: {}, cards: [] }
  let fmY: LocatedYaml | undefined
  let fmValid = true
  const slots: SlotSection[] = []
  let lastSlotIdx = -1

  for (const node of tree.children) {
    const line = node.position?.start.line ?? 0
    if (node.type === 'yaml') {
      fmY = parseYaml(node.value, line + 1)
      fmY.errors.forEach((e) => err(e.line, e.message))
      const v = fmY.errors.length ? undefined : validate(frontmatter, fmY, file, diags, 'SCHEMA')
      fmValid = !!v
      fm = v ?? fm
      continue
    }
    if (node.type !== 'containerDirective') {
      if (node.type !== 'html') err(line, `content outside a slot; wrap it in one of ${SLOTS.map((s) => ':::' + s).join(' ')}`)
      continue
    }
    const idx = (SLOTS as readonly string[]).indexOf(node.name)
    if (idx < 0) { err(line, `unknown slot ":::${node.name}"; slots are ${SLOTS.join(', ')}`); continue }
    if (idx <= lastSlotIdx) err(line, `slot ":::${node.name}" is out of skeleton order (${SLOTS.join(' → ')}) or repeated`)
    lastSlotIdx = Math.max(lastSlotIdx, idx)
    const section: SlotSection = { name: node.name as SlotName, line, blocks: [] }
    for (const child of node.children) {
      const cl = child.position?.start.line ?? line
      if (child.type === 'code') {
        if (!child.lang?.startsWith('@')) { err(cl, `a code fence inside a slot must be a widget (\`\`\`@<widget>); got "${child.lang ?? ''}"`); continue }
        const y = parseYaml(child.value, cl + 1)
        y.errors.forEach((e) => err(e.line, `in @${child.lang!.slice(1)}: ${e.message}`))
        const { key, optional, reason, ...config } = (y.data && typeof y.data === 'object' ? y.data : {}) as Record<string, unknown>
        const instance = { key, optional, reason } as Instance
        section.blocks.push({ kind: 'widget', widget: child.lang!.slice(1), line: cl, y, instance, config })
      } else if (child.type === 'containerDirective' || child.type === 'leafDirective') {
        err(cl, `directive "${child.type === 'leafDirective' ? '::' : ':::'}${child.name}" can't sit inside a slot`)
      } else {
        section.blocks.push(proseBlock(child, cl, err))
      }
    }
    slots.push(section)
  }
  return { file, key: basename(path, '.md'), fm, fmValid, fmY, slots, diags }
}

function proseBlock(node: RootContent, line: number, err: (l: number, m: string) => void): ProseBlock {
  const block: ProseBlock = { kind: 'prose', line, node, inlines: [], english: [], unmarkedHan: [] }
  const walk = (n: any) => {
    const l = n.position?.start.line ?? line
    if (n.type === 'textDirective') {
      if (!(INLINE_DIRECTIVES as readonly string[]).includes(n.name)) {
        err(l, `":${n.name}" was read as a directive. If it is part of an id, put the id in an attribute (:k{#zh:g:…}); in prose, escape the colon as "\\:"`)
        return
      }
      const nested = (n.children ?? []).find((c: any) => c.type === 'textDirective')
      if (nested) { err(l, `":${n.name}[…]" contains ":${nested.name}"; ids belong in an attribute: :${n.name}{#…}`); return }
      block.inlines.push({ kind: n.name, text: textOf(n), attrs: n.attributes ?? {}, line: l })
      return
    }
    if (n.type === 'leafDirective' || n.type === 'containerDirective') { err(l, `":${n.name}" must be an inline directive here`); return }
    if (n.type === 'text' || n.type === 'inlineCode') {
      const run = { text: n.value, line: l }
      if (HAN.test(n.value)) block.unmarkedHan.push(run)
      block.english.push(run)
      return
    }
    for (const c of n.children ?? []) walk(c)
  }
  walk(node)
  return block
}

function textOf(n: { children?: PhrasingContent[] }): string {
  return (n.children ?? []).map((c: any) => (c.type === 'text' ? c.value : textOf(c))).join('')
}
