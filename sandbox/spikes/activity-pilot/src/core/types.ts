// Content and runtime types shared by the trial runner, media and widget definitions.
// src/core uses no Vue components or SFCs (mirrors packages/core in docs/design/architecture.html).
// Pilot shortcut: events.ts and media.ts use Vue's reactivity primitives so the views can watch them.

export type ItemId = string // knowledge item, e.g. zh:sc:tone2-tone3, zh:g:mei-vs-bu
export type ClipId = string

export interface Speaker {
  id: string
  label: string
  /** Base pitch in Hz for the placeholder synth. Real clips ignore it. */
  basePitch: number
}

/** How the placeholder synth renders a clip until a real recording exists. */
export type Synth =
  | { kind: 'syllable'; tone: 1 | 2 | 3 | 4 | 5 }
  | { kind: 'phrase'; tones: number[] }

export interface Clip {
  id: ClipId
  text: string
  pinyin?: string
  gloss?: string
  speaker: string
  /** Word tokens for tap-to-gloss. In the real app these come from the language pack's analyze(). */
  tokens?: string[]
  /** Real audio file. When absent, the media handle synthesizes a placeholder. */
  src?: string
  synth: Synth
}

export interface ChoiceOption {
  key: string
  label: string
  /** True when the label is target-language text (e.g. 没), which is never translated. */
  target?: boolean
  sub?: string
  /** Optional figure drawn on the button, e.g. a tone contour. */
  glyph?: 'tone1' | 'tone2' | 'tone3' | 'tone4'
}

/** One authored practice item. Each stimulus is the same content in a different voice. */
export interface ItemSpec {
  key: string
  target: ItemId
  answer: string
  stimuli: ClipId[]
  /** Per-option recordings in the same voice order, so a miss can replay "yours, then the answer". */
  optionStimuli?: Record<string, ClipId[]>
  /** Context-ladder rung (1 = most isolated). Practice climbs rungs in order; see Pacing. */
  rung?: number
}

export type FeedbackPolicy = 'instant' | 'deferred'

export interface TrialItem {
  key: string
  target: ItemId
  answer: string
  stimulus: Clip
  options: ChoiceOption[]
  attempt: number
  voiceIndex: number
}

export type Verdict =
  | { kind: 'instant'; correct: boolean; picked: string; answer: string; pickedClip?: Clip; answerClip?: Clip }
  | { kind: 'deferred' }

export interface TrialResult {
  item: TrialItem
  picked: string
  correct: boolean
  ms: number
}
