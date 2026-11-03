// The interactable registry (TDD §7), cut down to what the spike's checks need.
// Each definition exposes its references, its Chinese lines and its user-facing copy through
// accessor functions, so the check rules need no per-widget knowledge.
import { z } from 'zod'
import type { Path } from './yaml-loc.ts'

export const SLOTS = ['hear', 'explain', 'we-do', 'you-do', 'recap', 'cards', 'deeper'] as const
export type SlotName = (typeof SLOTS)[number]

export interface Ref { id: string; path: Path }
export interface SlotRef { slot: string; path: Path }
export interface Text { text: string; path: Path }

interface Common<C> {
  version: number
  config: z.ZodType<C>
  refs(c: C): Ref[]
  slotRefs(c: C): SlotRef[]
  /** Chinese example lines the widget plays; each must match a native clip line (MED001). */
  lines(c: C): Text[]
  /** English strings shown to the learner (COPY001). */
  copy(c: C): Text[]
}
export interface ActivityDef<C> extends Common<C> {
  role: 'activity'
  slots: readonly SlotName[]
  outputLevel: 0 | 1 | 2
}
export interface FigureDef<C> extends Common<C> { role: 'figure' }
export type WidgetDef = ActivityDef<any> | FigureDef<any>

const id = z.string()
const clipRef = z.union([z.string().startsWith('clip:'), z.object({ slot: z.string() }).strict()])
const none = () => [] as never[]

function clipRefs(c: { clip: string | { slot: string } }, path: Path = ['clip']): { refs: Ref[]; slots: SlotRef[] } {
  return typeof c.clip === 'string' ? { refs: [{ id: c.clip, path }], slots: [] } : { refs: [], slots: [{ slot: c.clip.slot, path }] }
}

const pool = z.object({ exemplifies: id, count: z.number().int().min(1), novelty: z.enum(['any', 'unseen']).optional() }).strict()
const pickItem = z.union([
  z.object({ line: z.string(), answer: z.string(), target: id.optional() }).strict(),
  z.object({ pool, answer: z.string(), target: id.optional() }).strict(),
])
type PickItem = z.infer<typeof pickItem>

const meaningPick = z.object({
  target: id,
  ask: z.string().optional(),
  options: z.array(z.object({ key: z.string(), label: z.string() }).strict()).min(2),
  items: z.array(pickItem).min(1),
}).strict().superRefine((c, ctx) => {
  const keys = new Set(c.options.map((o) => o.key))
  c.items.forEach((it, i) => {
    if (!keys.has(it.answer)) ctx.addIssue({ code: 'custom', path: ['items', i, 'answer'], message: `"${it.answer}" is not an option key (${[...keys].join(', ')})` })
  })
})

const confusableSorter = z.object({
  set: z.array(id).min(2),
  labels: z.record(z.string(), z.string()),
  count: z.number().int().min(4),
  oldShare: z.number().min(0).max(1).optional(),
}).strict()

const contrastTable = z.object({
  columns: z.array(z.string()).min(2),
  rows: z.array(z.object({ label: z.string(), cells: z.array(z.string().nullable()) }).strict()).min(1),
}).strict()

export const definitions = {
  'clip-stage': {
    role: 'activity', version: 1, slots: ['hear', 'you-do'], outputLevel: 0,
    config: z.object({ clip: clipRef, prompt: z.string().optional(), passes: z.number().int().min(1).max(3).optional() }).strict(),
    refs: (c) => clipRefs(c).refs, slotRefs: (c) => clipRefs(c).slots, lines: none,
    copy: (c) => (c.prompt ? [{ text: c.prompt, path: ['prompt'] }] : []),
  } satisfies ActivityDef<{ clip: string | { slot: string }; prompt?: string; passes?: number }>,

  'meaning-pick': {
    role: 'activity', version: 1, slots: ['we-do', 'you-do'], outputLevel: 0, config: meaningPick,
    refs: (c) => [
      { id: c.target, path: ['target'] },
      ...c.items.flatMap((it: PickItem, i: number) => [
        ...(it.target ? [{ id: it.target, path: ['items', i, 'target'] }] : []),
        ...('pool' in it ? [{ id: it.pool.exemplifies, path: ['items', i, 'pool', 'exemplifies'] }] : []),
      ]),
    ],
    slotRefs: none,
    lines: (c) => c.items.flatMap((it: PickItem, i: number) => ('line' in it ? [{ text: it.line, path: ['items', i, 'line'] }] : [])),
    copy: (c) => [
      ...(c.ask ? [{ text: c.ask, path: ['ask'] }] : []),
      ...c.options.map((o, i) => ({ text: o.label, path: ['options', i, 'label'] })),
    ],
  } satisfies ActivityDef<z.infer<typeof meaningPick>>,

  'confusable-sorter': {
    role: 'activity', version: 1, slots: ['we-do', 'you-do'], outputLevel: 0, config: confusableSorter,
    refs: (c) => c.set.map((s, i) => ({ id: s, path: ['set', i] })),
    slotRefs: none, lines: none,
    copy: (c) => Object.entries(c.labels).map(([k, v]) => ({ text: v, path: ['labels', k] })),
  } satisfies ActivityDef<z.infer<typeof confusableSorter>>,

  'gist-question': {
    role: 'activity', version: 1, slots: ['you-do'], outputLevel: 0,
    config: z.object({ clip: clipRef }).strict(),
    refs: (c) => clipRefs(c).refs, slotRefs: (c) => clipRefs(c).slots, lines: none, copy: none,
  } satisfies ActivityDef<{ clip: string | { slot: string } }>,

  'tap-when-you-hear': {
    role: 'activity', version: 1, slots: ['we-do', 'you-do'], outputLevel: 0,
    config: z.object({ clip: clipRef, targets: z.array(z.object({ item: id, label: z.string() }).strict()).min(1) }).strict(),
    refs: (c) => [...clipRefs(c).refs, ...c.targets.map((t, i) => ({ id: t.item, path: ['targets', i, 'item'] }))],
    slotRefs: (c) => clipRefs(c).slots, lines: none,
    copy: (c) => c.targets.map((t, i) => ({ text: t.label, path: ['targets', i, 'label'] })),
  } satisfies ActivityDef<{ clip: string | { slot: string }; targets: { item: string; label: string }[] }>,

  shadow: {
    role: 'activity', version: 1, slots: ['we-do'], outputLevel: 1,
    config: z.object({ clip: clipRef }).strict(),
    refs: (c) => clipRefs(c).refs, slotRefs: (c) => clipRefs(c).slots, lines: none, copy: none,
  } satisfies ActivityDef<{ clip: string | { slot: string } }>,

  // Free production. Registered so the output-level rule has something to reject in v1 stages.
  'free-write': {
    role: 'activity', version: 1, slots: ['you-do'], outputLevel: 2,
    config: z.object({ target: id, prompt: z.string() }).strict(),
    refs: (c) => [{ id: c.target, path: ['target'] }], slotRefs: none, lines: none,
    copy: (c) => [{ text: c.prompt, path: ['prompt'] }],
  } satisfies ActivityDef<{ target: string; prompt: string }>,

  'contrast-table': {
    role: 'figure', version: 1, config: contrastTable, refs: none, slotRefs: none,
    lines: (c) => c.rows.flatMap((r, i) => r.cells.flatMap((cell, j) => (cell ? [{ text: cell, path: ['rows', i, 'cells', j] }] : []))),
    copy: (c) => [
      ...c.columns.map((t, i) => ({ text: t, path: ['columns', i] })),
      ...c.rows.map((r, i) => ({ text: r.label, path: ['rows', i, 'label'] })),
    ],
  } satisfies FigureDef<z.infer<typeof contrastTable>>,
} as const satisfies Record<string, WidgetDef>

export type WidgetName = keyof typeof definitions
export function getWidget(name: string): WidgetDef | undefined {
  return (definitions as Record<string, WidgetDef>)[name]
}
