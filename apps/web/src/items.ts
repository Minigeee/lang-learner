// How items read on screen: which progress layer an item counts in, and its title.
import type { ItemId } from '@lang-learner/core'
import type { ContentBundle } from './adapters/contentLoader.ts'

/** The "What you know" layers (app-ui-flow Progress), in display order. */
export const LAYERS = ['words', 'grammar', 'characters', 'sounds'] as const
export type Layer = (typeof LAYERS)[number]

export const LAYER_LABEL: Record<Layer, string> = { words: 'Words', grammar: 'Grammar', characters: 'Characters', sounds: 'Sounds' }
/** One item of each layer, as a kind label on item detail. */
export const KIND_LABEL: Record<Layer, string> = { words: 'Word', grammar: 'Grammar point', characters: 'Character', sounds: 'Sound' }

const KINDS: Record<string, Layer> = { w: 'words', g: 'grammar', c: 'characters', sc: 'sounds', sr: 'sounds' }

/** The layer an item counts in, from its id's kind; null for kinds no layer shows. */
export const layerOf = (id: ItemId): Layer | null => KINDS[id.split(':')[1] ?? ''] ?? null

/** A word's written form, else a skill's name, else the id. `isTarget` says the title is target text. */
export function itemTitle(content: ContentBundle, id: ItemId): { text: string; isTarget: boolean } {
  const item = content.item(id)
  if (item?.text) return { text: item.text, isTarget: true }
  if (item?.name) return { text: content.text(item.name), isTarget: false }
  return { text: id.split(':').slice(2).join(':'), isTarget: false }
}
