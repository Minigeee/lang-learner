// Which practice formats the learner has been introduced to (brainstorm §4.3: a new format gets a
// one-line introduction the first time). In the app this is derived from format_intro events.
// The pilot keeps no event history across reloads, so it mirrors the set into localStorage.
import { record } from './events'
import type { PracticeFormat } from './lesson'

const KEY = 'pilot-seen-formats'

function read(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(KEY) ?? '[]') as string[]) } catch { return new Set() }
}

export function hasSeen(format: PracticeFormat): boolean {
  return read().has(format)
}

export function markSeen(format: PracticeFormat, lesson: string): void {
  const seen = read()
  if (seen.has(format)) return
  seen.add(format)
  try { localStorage.setItem(KEY, JSON.stringify([...seen])) } catch { /* private mode: intro shows again */ }
  record({ kind: 'format_intro', format, lesson })
}

export function resetSeen(): void {
  try { localStorage.removeItem(KEY) } catch { /* nothing stored */ }
}
