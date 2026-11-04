import type { Lang } from './ids.ts'

/** A language pack's logic half. It grows as phases need more of it (architecture §6). */
export interface LanguagePack {
  code: Lang
  name: string
  /** Applied after NFC. */
  normalize(s: string): string
  /** Item kinds this pack adds to the core kinds. */
  itemKinds: readonly string[]
}
