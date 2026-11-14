// Input hours (README Progress meters): a meter of its own, separate from minutes and mastery. It
// only rises, and the next mark is a milestone to pass, never a date to meet (README Pacing row).
import type { EventEnvelope, EventOf, WatchPayload } from './events.ts'

/**
 * input@v1. Watching with English subtitles counts at half (build-phases §8, open decision 6). The
 * marks are doc 04's hour roadmap, provisional until the owner rescales them for Mandarin.
 */
export const INPUT_V1 = {
  weight: { none: 1, zh: 1, dual: 1, en: 0.5 } satisfies Record<WatchPayload['subtitles'], number>,
  marksH: [50, 150, 300, 600, 1000, 1500],
} as const

/** Hours of listening: watch logs by subtitle weight, plus every video started, at its full length. */
export function inputHours(events: readonly EventEnvelope[]): { hours: number; nextMark: number | null } {
  let sec = 0
  for (const e of events) {
    if (e.v !== 1) continue
    if (e.kind === 'watch') {
      const p = (e as EventOf<'watch'>).payload
      sec += p.minutes * 60 * INPUT_V1.weight[p.subtitles]
    } else if (e.kind === 'exposure') {
      const p = (e as EventOf<'exposure'>).payload
      if (p.type === 'video') sec += p.durationSec
    }
  }
  const hours = Math.round((sec / 3600) * 10) / 10
  return { hours, nextMark: INPUT_V1.marksH.find((m) => m > hours) ?? null }
}
