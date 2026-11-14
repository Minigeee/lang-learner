// The watch log as screens read it: every log, latest first, and the shows watched recently.
import type { EventEnvelope, EventOf, WatchPayload } from '@lang-learner/core'

export interface WatchLog extends WatchPayload {
  id: string
  at: number
}

/** Every watch log, the latest recorded first. */
export function watchLogs(events: readonly EventEnvelope[]): WatchLog[] {
  return events
    .filter((e): e is EventOf<'watch'> => e.kind === 'watch' && e.v === 1)
    .map((e) => ({ ...e.payload, id: e.id, at: e.occurredAt }))
    .sort((a, b) => b.at - a.at || (a.id < b.id ? 1 : -1))
}

/** The latest log of each show, the most recent show first, so logging it again is one tap. */
export function recentShows(events: readonly EventEnvelope[], limit = 5): WatchLog[] {
  const seen = new Set<string>()
  return watchLogs(events).filter((l) => !seen.has(l.title.toLowerCase()) && seen.add(l.title.toLowerCase())).slice(0, limit)
}

/** Minutes as "1 h 20 m" or "45 m". */
export function hoursMinutes(minutes: number): string {
  const m = Math.floor(minutes)
  return m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} m` : `${m} m`
}

/** A study date (YYYY-MM-DD) as a short local label, such as "Thu, Nov 12". */
export function dayLabel(date: string): string {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' })
}
