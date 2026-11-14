// The daily loop on this device: card states from the per-card cache, the queue, the new-card feed,
// study days and the session builder, composed from core over the local log. Screens reach it as
// `app.daily`; everything it writes goes through `record`.
import { computed, watch, type ComputedRef, type ShallowRef } from 'vue'
import {
  buildQueue, buildSession, cardAdded, createCardIndex, dayBounds, deriveDays, planFeed, reviewOf, secondsPerCard, studyDate,
  type CardId, type CardRecord, type ClipId, type CompiledLesson, type Days, type EventDraft, type EventEnvelope, type ItemId,
  type MediaId, type Progress, type Rating, type SessionPlan, type Settings, type SkillCardSpec, type Srs,
} from '@lang-learner/core'
import type { ContentBundle } from './adapters/contentLoader.ts'
import type { DerivedCache } from './adapters/idbStore.ts'

/** The cache key for card states. */
export const CARDS_CACHE = 'cards'
const SAVE_DELAY_MS = 1000

export type RecordFn = (draft: EventDraft | ((occurredAt: number) => EventDraft), o?: { id?: string; notBefore?: number }) => Promise<EventEnvelope>

export interface Daily {
  /** Card states, current with the log. */
  cards: ComputedRef<readonly CardRecord[]>
  card(id: CardId): CardRecord | undefined
  days: ComputedRef<Days>
  /** A session of `minutes` from local state now, and how many feed words have no card in this build yet. */
  plan(minutes: number): { plan: SessionPlan; waiting: number }
  /** Every audio file a plan will play, so it can be cached before the session starts. */
  mediaFor(plan: SessionPlan): MediaId[]
  /** The pool and format a skill card reviews in: its lesson's. */
  skillSpec(item: ItemId): SkillCardSpec | undefined
  /** Records an answer to a card. */
  review(card: CardId, rating: Rating, durationMs: number): Promise<void>
  /** Adds a lesson's skill card and word cards (its end card). Repeats add nothing. */
  addLessonCards(lesson: CompiledLesson): Promise<void>
  /** Adds a feed word's card after its first look. */
  firstLook(item: ItemId, via: 'prep' | 'queue'): Promise<void>
}

export function createDaily(o: {
  events: ShallowRef<readonly EventEnvelope[]>
  progress: ComputedRef<Progress>
  settings: ComputedRef<Settings>
  content: ContentBundle
  srs: Srs
  cache: DerivedCache
  cached: unknown
  record: RecordFn
}): Daily {
  const { content, srs, record } = o
  const index = createCardIndex(srs, o.cached)
  const cards = computed(() => {
    index.update(o.events.value)
    return index.all()
  })
  let saving: ReturnType<typeof setTimeout> | undefined
  watch(cards, () => {
    clearTimeout(saving)
    saving = setTimeout(() => void o.cache.save(CARDS_CACHE, index.snapshot()).catch(() => undefined), SAVE_DELAY_MS)
  })
  const days = computed(() => deriveDays(o.events.value, content.lessonCredit))
  const skills = new Map(content.lessons.flatMap((l) => (l.cards.skill ? [[l.cards.skill.item, l.cards.skill] as const] : [])))

  function plan(minutes: number) {
    const now = Date.now()
    const events = o.events.value
    const all = cards.value
    const clock = days.value.clock
    const queue = buildQueue({
      cards: all.filter((c) => c.template === 'vocab' ? content.card(c.itemId) : skills.has(c.itemId)), // only cards this build can show
      srs, events, now, day: dayBounds(studyDate(now, clock), clock), secPerCard: secondsPerCard(index, events),
      budgetSec: o.settings.value.reviewBudgetMin * 60,
    })
    const feed = planFeed({
      feed: content.feed, curriculum: content.curriculum, quota: queue.newQuota,
      carded: new Set(all.filter((c) => c.template === 'vocab').map((c) => c.itemId)), started: o.progress.value.startedLessons(),
    })
    const lessons = content.lessons.map((l) => {
      const status = o.progress.value.lessonStatus(l)
      return { id: l.id, estimateSec: l.estimateSec, open: o.progress.value.openRun(l.id) !== null, done: status === 'complete' || status === 'known' }
    })
    return { plan: buildSession({ minutes, queue, feed, lessons }), waiting: feed.waiting }
  }

  function cardMedia(item: ItemId): MediaId[] {
    const card = content.card(item)
    return card ? [card.audio.word, card.audio.sentence] : []
  }

  function mediaFor(p: SessionPlan): MediaId[] {
    const clips = new Set<ClipId>()
    const media = new Set<MediaId>()
    for (const block of p.blocks) {
      if (block.kind === 'reviews') {
        for (const id of block.cards) {
          const c = index.get(id)
          if (!c) continue
          if (c.template === 'vocab') cardMedia(c.itemId).forEach((m) => media.add(m))
          else skills.get(c.itemId)?.pool.forEach((i) => i.stimuli.forEach((s) => clips.add(s)))
        }
        for (const f of block.firstLooks) cardMedia(f.item).forEach((m) => media.add(m))
      } else {
        const lesson = content.lesson(block.lesson)
        clipsIn(lesson.steps, clips)
        lesson.cards.words.forEach((w) => cardMedia(w).forEach((m) => media.add(m)))
      }
    }
    for (const clip of clips) media.add(content.clip(clip).media)
    return [...media]
  }

  return {
    cards,
    card: (id) => {
      void cards.value
      return index.get(id)
    },
    days,
    plan,
    mediaFor,
    skillSpec: (item) => skills.get(item),
    async review(card, rating, durationMs) {
      void cards.value // the index must hold every review this device knows before it stamps a new one
      const { draft, notBefore } = reviewOf(index, srs, { card, rating, durationMs })
      await record(draft, { notBefore })
    },
    async addLessonCards(lesson) {
      const adds = [
        ...(lesson.cards.skill ? [cardAdded({ item: lesson.cards.skill.item, template: 'skill', via: 'lesson', lesson: lesson.id })] : []),
        ...lesson.cards.words.map((item) => cardAdded({ item, template: 'vocab', via: 'lesson', lesson: lesson.id })),
      ]
      for (const a of adds) await record(a.draft, { id: a.id })
    },
    async firstLook(item, via) {
      const a = cardAdded({ item, template: 'vocab', via })
      await record(a.draft, { id: a.id })
    },
  }
}

/** Every clip a lesson's steps name, wherever the compiled shape keeps it. */
function clipsIn(value: unknown, out: Set<ClipId>): void {
  if (typeof value === 'string') {
    if (value.startsWith('clip:')) out.add(value as ClipId)
  } else if (Array.isArray(value)) value.forEach((v) => clipsIn(v, out))
  else if (value && typeof value === 'object') Object.values(value).forEach((v) => clipsIn(v, out))
}
