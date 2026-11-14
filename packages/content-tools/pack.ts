// What a language's build half gives the toolchain. The toolchain knows nothing about a language
// except through this, and finds the pack at languages/<lang>/build.
import type { ItemId, Lang, Token } from '@lang-learner/core'
import type { Diag, Loc } from './diag.ts'
import type { Project } from './project.ts'

export interface Rule {
  id: string
  summary: string
  run(project: Project): Diag[]
}

/** One row of a vocabulary placement table. */
export interface Placement {
  word: string
  tier: 'lesson' | 'unit' | 'prep' | 'queue'
  /** A lesson label, a unit id, `prep:<unit>` or `queue:<stage>`, by tier. */
  place: string
  /** Unit ids, optionally with a lesson letter, plus free words such as "pervasive". */
  neededBy: string[]
  /** A queue word's place in its stage's frequency order, lowest first. */
  rank?: number
  at: Loc
}

export interface BuildPack {
  code: Lang
  /** Item kinds this pack adds to the core kinds. */
  itemKinds: readonly string[]
  /** Null when a `w` key is well-formed, else what's wrong with it. */
  wordKeyError(key: string): string | null
  /** True when the id is a lexicon key. */
  wordExists(id: ItemId): boolean
  /** Every word item a surface form can be. */
  wordIds(surface: string): ItemId[]
  /** A word id as a token, with its citation reading. */
  wordToken(id: ItemId): Token
  /** The lexicon's senses for a word id, in dictionary order. */
  dictionarySenses(id: ItemId): string[]
  /**
   * Tokens cover the line exactly, in order. A token has `r` when it's a word of the language, and
   * `id` only when it's a lexicon key: analysis never mints an id.
   */
  analyze(line: string): Token[]
  /** Folds text variants the language's corpora mix, before matching. */
  simplify(text: string): string
  loadVocab(dir: string): Placement[]
  /** The pack's own lint rules, run after the core rules. */
  rules: Rule[]
}
