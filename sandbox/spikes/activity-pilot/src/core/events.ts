// The only write path, as in the architecture's Event union. In the pilot, events stay in memory
// and show up in the dev drawer, so the contract can be checked by eye.
import { reactive } from 'vue'

export type PilotEvent =
  | { kind: 'trial'; itemId: string; lesson: string; widget: string; picked: string; correct: boolean; ms: number; policy: string; attempt: number }
  | { kind: 'exposure'; clipId: string; speaker: string; lesson: string }
  | { kind: 'card_added'; cardId: string; itemId: string; origin: 'lesson' | 'miss' }
  | { kind: 'span'; lesson: string; step: string; activeMs: number }
  | { kind: 'lesson_cursor'; lesson: string; step: number }
  | { kind: 'format_intro'; format: string; lesson: string }
  | { kind: 'lesson_complete'; lesson: string; via: 'full' | 'test-out' }

export interface StampedEvent { id: string; at: number; event: PilotEvent }

// Reactive only so the dev drawer can render the log; callers use record() and nothing else.
export const eventLog = reactive<StampedEvent[]>([])

export function record(event: PilotEvent): void {
  eventLog.unshift({ id: crypto.randomUUID(), at: Date.now(), event })
}

/** Deterministic card id, so two devices adding the same card produce one card. */
export function cardIdFor(itemId: string, template: string): string {
  let h = 2166136261
  for (const ch of `${itemId}|${template}`) h = Math.imul(h ^ ch.codePointAt(0)!, 16777619)
  return `card:${(h >>> 0).toString(16)}`
}
