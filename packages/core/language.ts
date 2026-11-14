import type { Token } from './content.ts'
import type { Lang } from './ids.ts'

/** A language pack's logic half. It grows as phases need more of it (architecture §6). */
export interface LanguagePack {
  code: Lang
  name: string
  /** Applied after NFC. */
  normalize(s: string): string
  /** Item kinds this pack adds to the core kinds. */
  itemKinds: readonly string[]
  /** A stored citation reading as the learner sees it, such as tone marks for numbered pinyin. */
  displayReading(reading: string): string
  /**
   * How a word's reading sits over its text, as ruby: pieces that cover the token's text in order,
   * each with its displayed reading (empty when it has none). zh gives one piece per character.
   */
  rubySegments(token: Token): { s: string; r: string }[]
}
