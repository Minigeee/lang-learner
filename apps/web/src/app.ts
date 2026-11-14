// The app's wiring: the event log, sync, content, the clip player, derived progress and the daily
// loop. Screens reach it through useApp(); events are their only write path.
import { computed, inject, ref, shallowRef, watch, type ComputedRef, type InjectionKey, type Ref, type ShallowRef } from 'vue'
import {
  createEventLog, createSrs, deriveProgress, settingsOf, syncAndClose, type EventEnvelope, type Progress, type Rejection, type Settings,
} from '@lang-learner/core'
import { readBackup, restore } from './adapters/backup.ts'
import { httpRemote } from './adapters/httpRemote.ts'
import { openIdbCache, openIdbStore } from './adapters/idbStore.ts'
import { openContent, type ContentBundle } from './adapters/contentLoader.ts'
import { createClipPlayer, type ClipPlayer } from './adapters/media.ts'
import { CARDS_CACHE, createDaily, type Daily, type RecordFn } from './daily.ts'
import { locale, type Locale } from './i18n/index.ts'
import { language, type RegisteredLanguage } from './languages.ts'

export interface SyncState {
  /** Null before the first flush ends. */
  ok: boolean | null
  /** Events recorded here that the server hasn't confirmed. */
  pending: number
}

export interface App {
  content: ContentBundle
  language: RegisteredLanguage
  clips: ClipPlayer
  /** Every event on this device. */
  events: ShallowRef<readonly EventEnvelope[]>
  progress: ComputedRef<Progress>
  /** The synced settings, current with the log. */
  settings: ComputedRef<Settings>
  sync: Ref<SyncState>
  /** Events the server refused for good (architecture §5), shown in Settings. */
  deadLetters(): Promise<Rejection[]>
  daily: Daily
  /**
   * Records an event, resolving once it's durable on this device. Events about the build's items
   * carry its language. A repeat of a known `id` records nothing and resolves to the stored event.
   */
  record: RecordFn
  /** Pushes, pulls and closes settled days now. Never rejects. */
  flush(): Promise<void>
  /**
   * Pushes a backup file's events to the server, then pulls them in. Rejects with a readable message
   * when the file isn't a valid backup or the server can't be reached.
   */
  restore(text: string): Promise<{ sent: number; rejected: number }>
}

export const APP: InjectionKey<App> = Symbol('app')

export function useApp(): App {
  const app = inject(APP)
  if (!app) throw new Error('useApp() needs startApp() provided at the root')
  return app
}

const GLOBAL_KINDS: readonly string[] = ['device', 'flag', 'setting', 'day_closed']
const LOCALES: readonly string[] = ['en', 'zh-Hans'] satisfies Locale[]
/** Lets the first screen's own requests go first. */
const PREFETCH_DELAY_MS = 3000

/** Opens the device log and this build's content, then keeps sync running (architecture §5 triggers). */
export async function startApp(): Promise<App> {
  const build = import.meta.env.VITE_CONTENT_BUILD
  if (!build) throw new Error('No content build. Run pnpm content:build.')
  const [store, content, cache, srs] = await Promise.all([openIdbStore(), openContent(build), openIdbCache(), createSrs()])
  const remote = httpRemote()
  const log = createEventLog({ store, remote, clock: Date.now, build: `${__BUILD__}+${build}` })
  const events = shallowRef<readonly EventEnvelope[]>(await store.events())
  const sync = ref<SyncState>({ ok: null, pending: (await store.outbox(100_000)).length })
  const known = new Set(events.value.map((e) => e.id))

  const record: RecordFn = async (draft, o = {}) => {
    const lang = typeof draft !== 'function' && GLOBAL_KINDS.includes(draft.kind) ? null : content.manifest.lang
    const event = await log.record(draft, { ...o, lang })
    if (!known.has(event.id)) {
      known.add(event.id)
      events.value = [...events.value, event]
      sync.value = { ...sync.value, pending: sync.value.pending + 1 }
    }
    return event
  }

  async function flush() {
    const result = await syncAndClose({ log, store, clock: Date.now, lessons: content.lessonCredit })
    events.value = await store.events()
    for (const e of events.value) known.add(e.id)
    sync.value = { ok: result.ok, pending: (await store.outbox(100_000)).length }
  }

  const progress = computed(() => deriveProgress(events.value, content.curriculum))
  const settings = computed(() => settingsOf(events.value))
  watch(() => settings.value.supportLocale, (l) => {
    locale.value = (LOCALES.includes(l) ? l : 'en') as Locale
    void content.useLocale(l)
  }, { immediate: true })

  const app: App = {
    content,
    language: language(content.manifest.lang),
    clips: createClipPlayer(content, (draft) => void record(draft)),
    events,
    progress,
    settings,
    sync,
    deadLetters: () => store.deadLetters(),
    daily: createDaily({ events, progress, settings, content, srs, cache, cached: await cache.load(CARDS_CACHE), record }),
    record,
    flush,
    async restore(text) {
      const result = await restore(readBackup(text), remote)
      await flush()
      return { sent: result.sent, rejected: result.rejected.length }
    },
  }
  await log.hello()
  // The study clock is a synced setting (architecture §5): after the first sync, so a device joining
  // an existing log keeps its settings, the first device records its own zone. The day start hour
  // keeps its default until the owner changes it.
  void flush().then(async () => {
    if (events.value.some((e) => e.kind === 'setting' && (e.payload as { key?: string }).key === 'studyTz')) return
    await record({ kind: 'setting', v: 1, payload: { key: 'studyTz', value: Intl.DateTimeFormat().resolvedOptions().timeZone } })
  })
  document.addEventListener('visibilitychange', () => void flush())
  window.addEventListener('online', () => void flush())
  // Offline after the first load (architecture §10): ask the browser to keep this origin's storage,
  // then cache the rest of the build's audio in the background.
  void navigator.storage?.persist?.().catch(() => false)
  setTimeout(() => void content.prefetchAll(), PREFETCH_DELAY_MS)
  return app
}
