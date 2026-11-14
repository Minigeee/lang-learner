// The new-card feed (README Vocabulary placement): which prep and frequency-queue words to bring into
// the reviews now. Lesson and unit words don't pass through here: a lesson's end card adds them.
import type { CurriculumStage, FeedEntry } from './content.ts'
import type { ItemId, LessonId } from './ids.ts'

export interface FeedPlan {
  /** Words to introduce now, each with a first look, in this order. */
  next: { item: ItemId; via: 'prep' | 'queue' }[]
  /** Words the feed could bring in now but this build has no card for yet. */
  waiting: number
}

/**
 * Prep words become eligible once a lesson of their feed unit has started, nearest deadline first;
 * one whose deadline unit has started is overdue and comes in even when the budget is spent, since a
 * lesson already needs it. Queue words follow in rank order once a lesson of their stage has started.
 * Everything else waits for `quota`, which is zero while reviews are carried over.
 */
export function planFeed(o: {
  feed: readonly FeedEntry[]
  curriculum: readonly CurriculumStage[]
  /** Items that already have a card. */
  carded: ReadonlySet<ItemId>
  started: ReadonlySet<LessonId>
  quota: number
}): FeedPlan {
  const units = new Set<string>()
  const stages = new Set<string>()
  const unitOrder = new Map<string, number>()
  for (const stage of o.curriculum) {
    for (const unit of stage.units) {
      unitOrder.set(unit.id, unitOrder.size)
      if (unit.lessons.some((l) => o.started.has(l.id))) {
        units.add(unit.id)
        stages.add(stage.id)
      }
    }
  }
  const order = (unit: string) => unitOrder.get(unit) ?? Infinity
  const eligible = o.feed.filter((f) => (f.tier === 'prep' ? units.has(f.during) : stages.has(f.stage)) && !(f.card && o.carded.has(f.card)))
  const prep = eligible.filter((f) => f.tier === 'prep').sort((a, b) => order(a.dueBy) - order(b.dueBy))
  const queue = eligible.filter((f) => f.tier === 'queue').sort((a, b) => a.rank - b.rank)
  const ready = (f: FeedEntry) => f.card !== undefined

  const overdue = prep.filter((f) => ready(f) && units.has(f.dueBy))
  const budgeted = [...prep.filter((f) => ready(f) && !units.has(f.dueBy)), ...queue.filter(ready)].slice(0, Math.max(0, o.quota))
  return {
    next: [...overdue, ...budgeted].map((f) => ({ item: f.card!, via: f.tier })),
    waiting: eligible.filter((f) => !ready(f)).length,
  }
}
