// "This week" as Progress and the Weekly review read it: the study days from Monday through today,
// with their minutes split by bucket. A week has no target (README Motivation row).
import { studyDate, type Bucket, type Days } from '@lang-learner/core'

export interface Week {
  /** Monday's study date. */
  start: string
  /** Monday through today, oldest first. */
  dates: string[]
  split: Record<Bucket, number>
  total: number
  /** Days this week with any study. */
  studied: number
}

const DAY = 86_400_000

export function weekOf(days: Days, now: number): Week {
  const today = studyDate(now, days.clock)
  const at = Date.parse(`${today}T00:00:00Z`)
  const sinceMonday = (new Date(at).getUTCDay() + 6) % 7
  const dates = Array.from({ length: sinceMonday + 1 }, (_, i) => new Date(at - (sinceMonday - i) * DAY).toISOString().slice(0, 10))
  const split: Record<Bucket, number> = { lessons: 0, cards: 0, watching: 0 }
  for (const d of dates) {
    const s = days.split(d)
    split.lessons += s.lessons
    split.cards += s.cards
    split.watching += s.watching
  }
  return { start: dates[0]!, dates, split, total: split.lessons + split.cards + split.watching, studied: dates.filter((d) => days.day(d).minutes > 0).length }
}
