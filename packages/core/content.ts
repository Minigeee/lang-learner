import type { ItemId, Lang, LessonId, MediaId } from './ids.ts'

// The compiled content contract. The toolchain writes these shapes and the app reads them, so the
// app never sees authoring syntax.

export type Shape = 'sound' | 'pattern' | 'clip' | 'checkpoint'
export type OpenerType = 'story' | 'showdown' | 'mystery' | 'discover'
export type Format = 'C0' | 'C1' | 'C2' | 'C3' | 'C4' | 'C5' | 'C6' | 'C7' | 'C8'

/** A support-language string: the key into strings.<locale>.json. */
export type StrRef = string
export type ClipId = `clip:${string}`

/** One analyzed word in a line. `id` is present when the word is a lexicon item. */
export interface Token {
  s: string
  /** Citation-form reading. Display applies sandhi. */
  r?: string
  id?: ItemId
}

export interface Clip {
  id: ClipId
  media: MediaId
  speaker: string
  /** The transcript with display punctuation, or for a bare syllable its toned spelling. */
  zh: string
  tokens: Token[]
  en?: StrRef
  durationSec: number
}

/** The `media` bundle file. */
export interface MediaBundle {
  clips: Clip[]
  /** Where each audio file sits in the private bucket. */
  files: Record<MediaId, { key: string; bytes: number }>
}

export interface VideoRef {
  youtubeId: string
  role: 'main' | 'supplemental'
  durationSec: number
}

export interface PracticeOption {
  key: string
  label: StrRef
  /** True when the label is target text, which is never translated. */
  target?: boolean
}

export interface PracticeItem {
  key: string
  target: ItemId
  /** Absent in self-graded formats. */
  answer?: string
  /** The same content in different voices. */
  stimuli: ClipId[]
  /** Context-ladder rung, 1 being the most isolated. */
  rung: number
  /** This item's own buttons, in place of the step's. */
  options?: PracticeOption[]
}

/**
 * A lesson body string keeps its target text as inline markup: `:ex[...]`, `:w[...]`, `:m[...]` and
 * `:k{#id}`. `refs` maps the text of each `:ex` to the clip it plays and of each `:w` to its word.
 */
export type Step =
  | { kind: 'opener'; type: OpenerType; clips: ClipId[]; video?: VideoRef; hook?: { prompt: StrRef; options: StrRef[] } }
  | { kind: 'lesson'; body: StrRef[]; refs?: Record<string, ClipId | ItemId>; figure?: string; video?: VideoRef; wrong?: string; right?: ClipId }
  | { kind: 'examples'; clips: ClipId[]; words?: ItemId[]; highlight?: string[] }
  | { kind: 'read-along'; clips: ClipId[] }
  | { kind: 'practice'; format: Format; prompt: StrRef; options: PracticeOption[]; items: PracticeItem[] }

/** A skill card reviews the lesson's skill in the lesson's format, on stimuli drawn from `pool`. */
export interface SkillCardSpec {
  item: ItemId
  format: Format
  prompt: StrRef
  options: PracticeOption[]
  pool: PracticeItem[]
}

export interface GoDeeper {
  question: StrRef
  answer: StrRef
}

export interface CompiledLesson {
  id: LessonId
  unit: string
  shape: Shape
  /** Null when the lesson teaches no skill of its own, as in a checkpoint. It then adds no skill card. */
  skill: ItemId | null
  title: StrRef
  idea: StrRef
  estimateSec: number
  steps: Step[]
  deeper?: GoDeeper[]
  /** `skill` is absent until the lesson has a pool of review stimuli. */
  cards: { skill?: SkillCardSpec; words: ItemId[] }
}

/** The back of a word's card. `target` is the half-open token range of the word in the sentence. */
export interface VocabCard {
  itemId: ItemId
  word: Token[]
  /** One to three, only those that apply where the word is learned. */
  senses: string[]
  sentence: { tokens: Token[]; target: [start: number, end: number]; translation: StrRef }
  /** One voice per card, so a two-voice card can't be expressed. */
  audio: { voice: string; word: MediaId; sentence: MediaId }
  /** `pending` means the image step hasn't run yet. */
  image: { media: MediaId } | { none: 'pending' | 'no_candidate' | 'gate_failed' | 'hazard' }
}

/** An entry in the `items` bundle file: every item the bundle's lessons and lines refer to. */
export interface CompiledItem {
  id: ItemId
  /** A skill's display name. */
  name?: StrRef
  /** A word's glosses: its chosen senses when it has a card, else the dictionary's. */
  senses?: string[]
}

/** An entry in the `credits` bundle file. */
export interface Credit {
  id: string
  name: string
  url: string
  author: string
  /** How many of this build's audio files fall under this record. */
  files: number
}

export interface CurriculumLesson {
  id: LessonId
  /** The display number, such as 1.4a. Display only: `id` is the stable one. */
  label: string
  title: string
  shape: Shape
  minutes: number
  /** False until the lesson has a file. An unauthored lesson still resolves in the graph. */
  authored: boolean
}

export interface CurriculumUnit {
  /** The display number, such as 1.4. */
  id: string
  title: string
  /** Direct prerequisite unit ids. */
  prereqs: string[]
  lessons: CurriculumLesson[]
}

export interface CurriculumStage {
  id: string
  title: string
  units: CurriculumUnit[]
}

/** A build's table of contents. Each app build pins exactly one. */
export interface Manifest {
  build: string
  lang: Lang
  /** Logical name to hash-named file, such as `media` or `strings.en`. */
  files: Record<string, string>
  lessons: Record<LessonId, { file: string; hash: string }>
}
