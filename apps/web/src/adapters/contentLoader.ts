// The content loader (architecture §4): one build's content and media from the server, kept in the
// device's Cache Storage, so a file is fetched once and every later read is local. Every path is named
// by a hash or the build id, so a cached copy is never stale.
import { shallowRef } from 'vue'
import type {
  Clip, ClipId, CompiledItem, Credit, CompiledLesson, CurriculumLesson, CurriculumStage, FeedEntry, ItemId, LessonCredit, LessonId,
  Manifest, MediaBundle, MediaId, StrRef, VocabCard,
} from '@lang-learner/core'

const ROOT = '/content'
const CACHE = 'lang-learner-content'

/** A response for the path, from the device cache when it has one, else from the server (then cached). */
async function cachedFetch(path: string): Promise<Response> {
  const url = `${ROOT}/${path}`
  const cache = 'caches' in globalThis ? await caches.open(CACHE).catch(() => null) : null
  const hit = await cache?.match(url)
  if (hit) return hit
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Can't load ${url}: ${res.status}`)
  await cache?.put(url, res.clone()).catch(() => undefined)
  return res
}

const readJson = async <T>(path: string): Promise<T> => (await (await cachedFetch(path)).json()) as T

/** One build's content, loaded and indexed. Lookups of ids the build doesn't have throw. */
export interface ContentBundle {
  manifest: Manifest
  curriculum: CurriculumStage[]
  /** Authored lessons in curriculum order. */
  lessons: CompiledLesson[]
  lesson(id: LessonId): CompiledLesson
  /** The lesson's curriculum entry: its display label and minutes. */
  entry(id: LessonId): CurriculumLesson
  /** The manifest's hash of a compiled lesson, which events record. */
  hashOf(id: LessonId): string
  /** A support string's text in the current locale, falling back to English. Reactive. */
  text(ref: StrRef): string
  /**
   * Switches `text` to a locale's strings when the build has them (`strings.<locale>`), else back to
   * English. Never rejects: a locale that can't load leaves English in place.
   */
  useLocale(locale: string): Promise<void>
  /** The license records of this build's media and data, for the Credits page. */
  credits: readonly Credit[]
  /** Every clip in the build. */
  clips: readonly Clip[]
  item(id: ItemId): CompiledItem | undefined
  /** Every item the build's lessons and lines refer to. */
  itemList: readonly CompiledItem[]
  card(id: ItemId): VocabCard | undefined
  /** Prep and frequency-queue words, for the new-card feed. */
  feed: readonly FeedEntry[]
  /** A lesson's estimate and step count, which day minutes credit from. */
  lessonCredit: LessonCredit
  clip(id: ClipId): Clip
  /** The clip that plays a media file, as a card's word audio. */
  clipOfMedia(id: MediaId): Clip | undefined
  /** A playable URL for an audio file, from the device cache. */
  audioUrl(media: MediaId): Promise<string>
  /** Puts audio files in the device cache, so they play with the server unreachable. Never rejects. */
  prefetch(media: readonly MediaId[]): Promise<void>
  /**
   * Puts every audio file of the build in the device cache, a few at a time, so the whole build works
   * offline after the first load (architecture §10). Never rejects; a file that fails is fetched later.
   */
  prefetchAll(): Promise<void>
}

/** Opens the build this app was built against, so the app always reads the content it expects. */
export async function openContent(build: string): Promise<ContentBundle> {
  const manifest = await readJson<Manifest>(`builds/${build}.json`)
  const file = <T>(name: string) => {
    const hashed = manifest.files[name]
    if (!hashed) throw new Error(`Build ${build} has no ${name} file`)
    return readJson<T>(`files/${hashed}`)
  }
  const [english, curriculum, items, cards, media, feed, credits] = await Promise.all([
    file<Record<StrRef, string>>('strings.en'), file<CurriculumStage[]>('curriculum'), file<CompiledItem[]>('items'),
    file<VocabCard[]>('cards'), file<MediaBundle>('media'), file<FeedEntry[]>('feed'), file<Credit[]>('credits'),
  ])
  const strings = shallowRef<Record<StrRef, string>>({})
  const entries = new Map(curriculum.flatMap((s) => s.units.flatMap((u) => u.lessons)).map((l) => [l.id, l]))
  const order = [...entries.keys()].filter((id) => manifest.lessons[id])
  const lessons = await Promise.all(order.map((id) => readJson<CompiledLesson>(`files/${manifest.lessons[id]!.file}`)))
  const byId = new Map(lessons.map((l) => [l.id, l]))
  const itemMap = new Map(items.map((i) => [i.id, i]))
  const cardMap = new Map(cards.map((c) => [c.itemId, c]))
  const clips = new Map(media.clips.map((c) => [c.id, c]))
  const clipsOfMedia = new Map(media.clips.map((c) => [c.media, c]))
  const urls = new Map<MediaId, Promise<string>>()
  const must = <K, V>(map: Map<K, V>, key: K, what: string): V => {
    const value = map.get(key)
    if (value === undefined) throw new Error(`Build ${build} has no ${what} ${String(key)}`)
    return value
  }

  function audioUrl(id: MediaId): Promise<string> {
    let url = urls.get(id)
    if (!url) {
      const entry = media.files[id]
      if (!entry) throw new Error(`Build ${build} has no audio ${id}`)
      url = cachedFetch(entry.key).then(async (res) => URL.createObjectURL(await res.blob()))
      url.catch(() => urls.delete(id))
      urls.set(id, url)
    }
    return url
  }

  return {
    manifest,
    curriculum,
    lessons,
    lesson: (id) => must(byId, id, 'lesson'),
    entry: (id) => must(entries, id, 'curriculum lesson'),
    hashOf(id) {
      const entry = manifest.lessons[id]
      if (!entry) throw new Error(`Build ${build} has no lesson ${id}`)
      return entry.hash
    },
    text: (ref) => strings.value[ref] ?? english[ref] ?? ref,
    async useLocale(locale) {
      const name = `strings.${locale}`
      strings.value = locale !== 'en' && manifest.files[name] ? await file<Record<StrRef, string>>(name).catch(() => ({})) : {}
    },
    credits,
    clips: media.clips,
    item: (id) => itemMap.get(id),
    itemList: items,
    card: (id) => cardMap.get(id),
    clip: (id) => must(clips, id, 'clip'),
    clipOfMedia: (id) => clipsOfMedia.get(id),
    feed,
    lessonCredit(id) {
      const lesson = byId.get(id)
      return lesson && { estimateSec: lesson.estimateSec, steps: lesson.steps.length }
    },
    audioUrl,
    async prefetch(ids) {
      await Promise.all(ids.map((id) => Promise.resolve(id).then(audioUrl).catch(() => undefined)))
    },
    async prefetchAll() {
      const keys = Object.values(media.files).map((f) => f.key)
      const PARALLEL = 4
      let next = 0
      const worker = async () => {
        while (next < keys.length) await cachedFetch(keys[next++]!).then(() => undefined, () => undefined)
      }
      await Promise.all(Array.from({ length: PARALLEL }, worker))
    },
  }
}
