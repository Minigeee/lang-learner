// The synced settings (architecture §5): each is a `setting` event, and the latest of each key by
// (occurredAt, id) wins on every device. This module owns their defaults.
import { byTime, type EventEnvelope, type EventOf } from './events.ts'
import { QUEUE_POLICY } from './srs.ts'

/** When study days start: an IANA zone and a local hour. */
export interface StudyClock {
  tz: string
  dayStartHour: number
}

export interface Settings {
  clock: StudyClock
  /** The support-language column the app and lessons are explained in. */
  supportLocale: string
  /** The daily review time the queue fills. */
  reviewBudgetMin: number
  /** Empty until the owner writes one. */
  intention: string
  setupDone: boolean
}

/** Until a device records a setting. The app records the zone on first launch. */
export const DEFAULT_SETTINGS: Settings = {
  clock: { tz: 'UTC', dayStartHour: 4 },
  supportLocale: 'en',
  reviewBudgetMin: QUEUE_POLICY.dailyReviewSec / 60,
  intention: '',
  setupDone: false,
}

export function settingsOf(events: readonly EventEnvelope[]): Settings {
  const s: Settings = { ...DEFAULT_SETTINGS, clock: { ...DEFAULT_SETTINGS.clock } }
  for (const e of events.filter((x) => x.kind === 'setting' && x.v === 1).sort(byTime)) {
    const p = (e as EventOf<'setting'>).payload
    switch (p.key) {
      case 'studyTz': s.clock.tz = p.value; break
      case 'dayStartHour': s.clock.dayStartHour = p.value; break
      case 'supportLocale': s.supportLocale = p.value; break
      case 'reviewBudgetMin': s.reviewBudgetMin = p.value; break
      case 'intention': s.intention = p.value; break
      case 'setupDone': s.setupDone = p.value; break
    }
  }
  return s
}
