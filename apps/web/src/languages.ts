// The one place language packs are registered: each pack's logic and its views.
import type { Component } from 'vue'
import type { Lang, LanguagePack } from '@lang-learner/core'
import { zh } from '@lang-learner/lang-zh'
import { zhViews } from '@lang-learner/lang-zh-views'

/** A pack's Vue half. */
export interface PackViews {
  /** Lesson figures the pack draws, by the name lessons use. */
  figures: Record<string, Component>
}

export interface RegisteredLanguage {
  pack: LanguagePack
  views: PackViews
}

const LANGUAGES: readonly RegisteredLanguage[] = [{ pack: zh, views: zhViews }]

export function language(code: Lang): RegisteredLanguage {
  const found = LANGUAGES.find((l) => l.pack.code === code)
  if (!found) throw new Error(`No language pack for "${code}"`)
  return found
}
