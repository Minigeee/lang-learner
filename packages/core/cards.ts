// Cards: deterministic ids, the per-card cache (architecture §5) and the events a live review or a new
// card records. Each card is a pure fold of its own reviews, so keeping one card's result while its
// reviews only grow, and replaying just that card otherwise, gives what a full replay would.
import { byTime, type CardTemplate, type EventDraft, type EventEnvelope, type EventOf, type Rating } from './events.ts'
import { deterministicUuid, type CardId, type ItemId, type LessonId } from './ids.ts'
import { dueDay, loadBalancedDue, SRS_VERSION, type CardState, type ReviewEvent, type Srs } from './srs.ts'

/** Frozen like `deterministicUuid`: two devices adding one item's card name it the same. */
export const cardIdOf = (item: ItemId, template: CardTemplate): CardId => `card:${deterministicUuid('card', item, template)}`

export interface CardRecord {
  id: CardId
  itemId: ItemId
  template: CardTemplate
  /** When the card was first added. */
  addedAt: number
  state: CardState
  /** Reviews applied to `state`. */
  reviews: number
}

export interface CardIndex {
  /**
   * Folds the whole log into card states. A card whose reviews only grew since the last fold (or the
   * cache it was created from) applies the new ones; any other change replays that card alone.
   */
  update(events: readonly EventEnvelope[]): void
  get(id: CardId): CardRecord | undefined
  all(): readonly CardRecord[]
  /** A JSON-safe copy for the device cache, tagged with the SRS version. */
  snapshot(): CardCache
}

/** What `snapshot` returns. A cache from another SRS version is ignored, so every card replays. */
export interface CardCache {
  version: string
  cards: CardRecord[]
}

interface Entry { record: CardRecord; reviewIds: string[] }

export function createCardIndex(srs: Srs, cached?: unknown): CardIndex {
  const entries = new Map<CardId, Entry>()
  const cache = cached as Partial<CardCache> | undefined
  // A cached card doesn't know its review ids, only how many it applied and the last one's id.
  const restored = new Map<CardId, CardRecord>(cache?.version === SRS_VERSION && Array.isArray(cache.cards) ? cache.cards.map((c) => [c.id, c]) : [])
  let records: CardRecord[] = []

  function fold(added: EventOf<'card_added'> | undefined, reviews: ReviewEvent[], prior: Entry | undefined): Entry | null {
    const first = added?.payload
    const base = prior?.record
    const itemId = first?.itemId ?? base?.itemId
    const template = first?.template ?? base?.template
    if (!itemId || !template) return null // a review of a card this log doesn't know yet
    const id = (first?.cardId ?? base?.id)!
    const addedAt = Math.min(added?.occurredAt ?? Infinity, reviews[0]?.occurredAt ?? Infinity)
    const ids = reviews.map((r) => r.id)
    // Reuse the prior state when its reviews are a prefix of these, in the same order.
    const n = base?.reviews ?? 0
    const reusable = base && base.addedAt === addedAt && n <= ids.length && (n === 0 || ids[n - 1] === base.state.lastReviewId)
      && (prior.reviewIds.length === 0 || prior.reviewIds.every((x, i) => ids[i] === x))
    let state = reusable ? base.state : srs.initial(id, addedAt)
    for (const r of reviews.slice(reusable ? n : 0)) state = srs.apply(state, r)
    return { record: { id, itemId, template, addedAt, state, reviews: ids.length }, reviewIds: ids }
  }

  return {
    update(events) {
      const added = new Map<CardId, EventOf<'card_added'>>()
      const reviews = new Map<CardId, ReviewEvent[]>()
      for (const e of events.filter((x) => x.v === 1 && (x.kind === 'card_added' || x.kind === 'review')).sort(byTime)) {
        if (e.kind === 'card_added') {
          const a = e as EventOf<'card_added'>
          if (!added.has(a.payload.cardId)) added.set(a.payload.cardId, a)
        } else if (e.kind === 'review') {
          const r = e as ReviewEvent
          const list = reviews.get(r.payload.cardId) ?? []
          list.push(r)
          reviews.set(r.payload.cardId, list)
        }
      }
      for (const id of new Set([...added.keys(), ...reviews.keys()])) {
        const prior = entries.get(id) ?? (restored.has(id) ? { record: restored.get(id)!, reviewIds: [] } : undefined)
        const entry = fold(added.get(id), reviews.get(id) ?? [], prior)
        if (entry) entries.set(id, entry)
      }
      restored.clear()
      records = [...entries.values()].map((e) => e.record)
    },
    get: (id) => entries.get(id)?.record,
    all: () => records,
    snapshot: () => ({ version: SRS_VERSION, cards: records }),
  }
}

/**
 * The event a live answer records: stamped no earlier than the card's last known review, so elapsed
 * time is never negative (spike D C6), and computed at its final stamp, with a load-balanced due date.
 */
export function reviewOf(index: CardIndex, srs: Srs, o: { card: CardId; rating: Rating; durationMs: number }): {
  draft: (occurredAt: number) => EventDraft
  notBefore: number
} {
  const record = index.get(o.card)
  if (!record) throw new Error(`No card ${o.card}`)
  const dueOn = new Map<number, number>()
  for (const c of index.all()) dueOn.set(dueDay(c.state.dueAt), (dueOn.get(dueDay(c.state.dueAt)) ?? 0) + 1)
  return {
    notBefore: record.state.lastReviewAt ?? -Infinity,
    draft: (at) => {
      const next = srs.next(record.state, o.rating, at)
      return {
        kind: 'review', v: 1, payload: {
          cardId: o.card, rating: o.rating, durationMs: Math.max(0, Math.round(o.durationMs)),
          dueAt: Math.round(loadBalancedDue(next, at, (day) => dueOn.get(day) ?? 0)), prevReviewId: record.state.lastReviewId,
        },
      }
    },
  }
}

/** The `card_added` for an item's card, with the id that makes a repeat add nothing. */
export function cardAdded(o: { item: ItemId; template: CardTemplate } & ({ via: 'lesson'; lesson: LessonId } | { via: 'prep' | 'queue' })): { id: string; draft: EventDraft } {
  const cardId = cardIdOf(o.item, o.template)
  return {
    id: deterministicUuid('card-added', cardId),
    draft: { kind: 'card_added', v: 1, payload: { cardId, itemId: o.item, template: o.template, via: o.via, lessonId: o.via === 'lesson' ? o.lesson : null } },
  }
}
