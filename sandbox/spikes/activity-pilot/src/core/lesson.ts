// Lesson model and widget definitions. Every lesson teaches one skill and runs the arc in
// brainstorm §4.1: opener → lesson (I do) → examples (we do) → practice (you do). Step labels are
// user-facing copy (app-ui-flow.md "UI copy"), so no internal terms like "we do" appear here.
import type { ChoiceOption, ClipId, ItemId, ItemSpec } from './types'

export interface ChoicePadConfig {
  prompt: string
  layout: 'grid' | 'pair'
  options: ChoiceOption[]
  items: ItemSpec[]
  /** User-facing name per ladder rung, in rung order. Omit when items carry no rung. */
  rungs?: string[]
  /** Start from later voices, so practice uses speakers the examples didn't. */
  voiceOffset?: number
}

export interface GlossEntry { pinyin: string; gloss: string; itemId: ItemId; inCards?: boolean }

export interface ClipStudyConfig {
  scene: 'cat-table'
  lines: ClipId[]
  /** stepper: line by line with text and tap-to-gloss. listen-check: no text, then a gist question. */
  mode: 'stepper' | 'listen-check'
  glossary: Record<string, GlossEntry>
  gist?: { prompt: string; options: ChoiceOption[]; answer: string; target: ItemId }
}

/** Four clips, one per speaker, so voice is never the cue. `odd` is the index of the one that differs. */
export interface OddSet { key: string; target: ItemId; clips: [ClipId, ClipId, ClipId, ClipId]; odd: number }
export interface OddOneOutConfig { prompt: string; sets: OddSet[] }

/** Lines that play with English under each. `shown` replaces the English of lines[wrong], flipped on the target. */
export interface MismatchSet { key: string; target: ItemId; lines: ClipId[]; wrong: number; shown: string }
export interface MismatchConfig { prompt: string; sets: MismatchSet[] }

export type WidgetUse =
  | { widget: 'choice-pad'; config: ChoicePadConfig }
  | { widget: 'clip-study'; config: ClipStudyConfig }
  | { widget: 'odd-one-out'; config: OddOneOutConfig }
  | { widget: 'mismatch'; config: MismatchConfig }

/** The opener's unscored hook question. Options are support-language strings. */
export interface Hook { prompt: string; options: string[] }

/** How the idea arrives (brainstorm §4.2). Each type has its own layout and step label. */
export type Opener =
  | { type: 'story'; clips: ClipId[]; scene?: 'cat-table'; hook: Hook }
  | { type: 'mystery'; clips: ClipId[]; hook: Hook }
  | { type: 'showdown'; a: ClipId; b: ClipId; hook: Hook }

/** Practice formats that rotate across lessons (brainstorm §4.3). The pilot builds four of the nine. */
export type PracticeFormat = 'pick' | 'odd-one-out' | 'mismatch' | 'new-clip'

export const FORMATS: Record<PracticeFormat, { name: string; how: string }> = {
  pick: { name: 'Pick one', how: 'Hear it, then tap the answer.' },
  'odd-one-out': { name: 'Odd one out', how: 'Four voices. Three say the same thing, one is different. Find it.' },
  mismatch: { name: 'Catch the mismatch', how: 'One English line says something the Chinese doesn\'t. Find it.' },
  'new-clip': { name: 'New clip', how: 'Hear the whole story once, then answer. No replays first.' },
}

export type Step =
  | { kind: 'opener'; opener: Opener }
  | { kind: 'explain'; title: string; body: string[]; figure?: 'tone-contours' | 'timeline-bu-mei' | 'cat-words'; wrong?: string; right?: ClipId; deeper?: { q: string; a: string } }
  /** The we do: the target in action in several native clips. `highlight` lights these characters. */
  | { kind: 'examples'; clips: ClipId[]; highlight?: string[] }
  /** The we do for Clip lessons: the story line by line, with text and glosses. */
  | { kind: 'read-along'; config: ClipStudyConfig }
  /** The you do: the skill in its practice format. The same format reviews the skill card later. */
  | { kind: 'practice'; format: PracticeFormat; use: WidgetUse }

const OPENER_LABEL: Record<Opener['type'], string> = { story: 'Listen', mystery: 'Puzzle', showdown: 'Compare' }

export function stepLabel(step: Step): string {
  switch (step.kind) {
    case 'opener': return OPENER_LABEL[step.opener.type]
    case 'explain': return 'How it works'
    case 'examples': return 'Examples'
    case 'read-along': return 'Read along'
    case 'practice': return 'Practice'
  }
}

export interface Lesson {
  id: string
  unit: string
  /** The knowledge item this lesson teaches. Its skill card reviews it in the lesson's practice format. */
  skill: ItemId
  title: string
  /** User-facing kind, from the UI copy table: "Sound practice", "Lesson", "Video lesson". */
  kindLabel: string
  idea: string
  minutes: number
  steps: Step[]
}

export function openerOf(lesson: Lesson): Opener {
  const s = lesson.steps.find((x) => x.kind === 'opener')
  if (!s || s.kind !== 'opener') throw new Error(`Lesson ${lesson.id} has no opener`)
  return s.opener
}

export function practiceOf(lesson: Lesson): Extract<Step, { kind: 'practice' }> {
  const s = lesson.steps.find((x) => x.kind === 'practice')
  if (!s || s.kind !== 'practice') throw new Error(`Lesson ${lesson.id} has no practice`)
  return s
}

// Framework-neutral widget definitions (the contract). Views are registered separately in the app.
interface ActivityDefinition<C> {
  role: 'activity'
  version: number
  outputLevel: 0 | 1
  activityType(config: C): string
  estimateSec(config: C): number
  evidenceTargets(config: C): ItemId[]
}

export const WIDGETS: { [K in WidgetUse['widget']]: ActivityDefinition<Extract<WidgetUse, { widget: K }>['config']> } = {
  'choice-pad': {
    role: 'activity', version: 2, outputLevel: 0,
    // A choice pad on sounds is tone identification (T1); on grammar it's a confusable contrast (T7).
    activityType: (c) => (c.items.every((i) => i.target.includes(':sc:')) ? 'T1' : 'T7'),
    // A ladder ends on mastery, so it rarely serves every item.
    estimateSec: (c) => Math.min(c.items.length, c.rungs ? 10 : Infinity) * 8,
    evidenceTargets: (c) => [...new Set(c.items.map((i) => i.target))],
  },
  'clip-study': {
    role: 'activity', version: 1, outputLevel: 0,
    activityType: (c) => (c.mode === 'stepper' ? 'T11' : 'T14'),
    estimateSec: (c) => c.lines.length * (c.mode === 'stepper' ? 14 : 6) + (c.gist ? 10 : 0),
    evidenceTargets: (c) => (c.gist ? [c.gist.target] : []),
  },
  'odd-one-out': {
    role: 'activity', version: 1, outputLevel: 0,
    activityType: () => 'T1',
    estimateSec: (c) => c.sets.length * 14,
    evidenceTargets: (c) => [...new Set(c.sets.map((s) => s.target))],
  },
  mismatch: {
    role: 'activity', version: 1, outputLevel: 0,
    activityType: () => 'T5',
    estimateSec: (c) => c.sets.length * 18,
    evidenceTargets: (c) => [...new Set(c.sets.map((s) => s.target))],
  },
}

function estimateWidgetSec(use: WidgetUse): number {
  // The union is keyed by widget, so each definition receives its own config type.
  const def = WIDGETS[use.widget] as ActivityDefinition<WidgetUse['config']>
  return def.estimateSec(use.config)
}

export function estimateLessonMinutes(lesson: Lesson): number {
  const sec = lesson.steps.reduce((t, s) => {
    if (s.kind === 'practice') return t + estimateWidgetSec(s.use)
    if (s.kind === 'read-along') return t + estimateWidgetSec({ widget: 'clip-study', config: s.config })
    if (s.kind === 'examples') return t + s.clips.length * 8
    return t + 40
  }, 0)
  return Math.max(1, Math.round(sec / 60))
}
