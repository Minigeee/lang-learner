<script setup lang="ts">
// Temporary screen for Phase 0's done criteria. Today replaces it in Phase 4.
import { computed, onMounted, ref, shallowRef } from 'vue'
import { byTime, type ClipId, type EventEnvelope, type LessonId } from '@lang-learner/core'
import { startEventLog, type AppLog } from '../app.ts'
import { supabase } from '../adapters/auth.ts'
import { openContent, type ContentBundle } from '../adapters/contentLoader.ts'
import { t } from '../i18n/index.ts'

const CLIP_PATH = 'media/cmn-ma3.mp3'
const VIDEO_ID = 'uvtZpiQs4sI'

const app = shallowRef<AppLog | null>(null)
const deviceId = ref('')
const deviceSeq = ref(0)
const outbox = ref(0)
const cursor = ref(0)
const deadLetters = ref(0)
const events = ref<EventEnvelope[]>([])
const note = ref('')
const status = ref('')
const clipError = ref('')
const content = shallowRef<ContentBundle | null>(null)
const lessons = ref<{ id: LessonId; title: string }[]>([])
const contentError = ref('')
let pilotClip: ClipId | undefined

const videoUrl = computed(() => `https://www.youtube.com/embed/${VIDEO_ID}?playsinline=1&origin=${encodeURIComponent(location.origin)}`)
const newestFirst = computed(() => [...events.value].sort(byTime).reverse())

async function refresh() {
  const store = app.value?.store
  if (!store) return
  const meta = await store.meta()
  deviceId.value = meta.deviceId
  deviceSeq.value = meta.deviceSeq
  outbox.value = (await store.outbox(100_000)).length
  cursor.value = await store.cursor()
  deadLetters.value = (await store.deadLetters()).length
  events.value = await store.events()
}

async function sync() {
  const result = await app.value?.log.flush()
  status.value = result?.ok ? t('Synced') : t('Offline: will sync later')
  await refresh()
}

async function record() {
  if (!note.value.trim()) return
  await app.value?.log.record({ kind: 'flag', v: 1, payload: { note: note.value.trim() } })
  note.value = ''
  await refresh()
  await sync()
}

async function playClip() {
  clipError.value = ''
  const { data, error } = await supabase.storage.from('private').download(CLIP_PATH)
  if (error) {
    clipError.value = error.message
    return
  }
  await new Audio(URL.createObjectURL(data)).play()
}

const payloadText = (e: EventEnvelope) => JSON.stringify(e.payload)

async function loadContent() {
  const build = import.meta.env.VITE_CONTENT_BUILD
  if (!build) return
  try {
    const bundle = await openContent(build)
    const strings = await bundle.strings()
    const loaded = await Promise.all((Object.keys(bundle.manifest.lessons) as LessonId[]).map((id) => bundle.lesson(id)))
    content.value = bundle
    lessons.value = loaded.map((l) => ({ id: l.id, title: strings[l.title] ?? l.title }))
    pilotClip = loaded.flatMap((l) => l.steps).flatMap((step): ClipId[] => (step.kind === 'examples' ? step.clips : []))[0]
  } catch (e) {
    contentError.value = e instanceof Error ? e.message : String(e)
  }
}

async function playPilotClip() {
  clipError.value = ''
  try {
    if (!content.value || !pilotClip) return
    await new Audio(URL.createObjectURL(await content.value.audio(pilotClip))).play()
  } catch (e) {
    clipError.value = e instanceof Error ? e.message : String(e)
  }
}

onMounted(async () => {
  app.value = await startEventLog(() => void refresh())
  await app.value.log.flush()
  await refresh()
  await loadContent()
})
</script>

<template>
  <main class="screen">
    <h1 class="t-title">{{ t('Foundation check') }}</h1>
    <p class="t-meta">
      {{ t('Device') }}: {{ deviceId.slice(0, 8) }} (#{{ deviceSeq }}) ·
      {{ t('Outbox') }}: {{ outbox }} · {{ t('Cursor') }}: {{ cursor }} · {{ t('Dead letters') }}: {{ deadLetters }}
    </p>

    <form @submit.prevent="record">
      <label class="field">
        {{ t('Record note') }}
        <input v-model="note" />
      </label>
      <br />
      <button class="btn pri">{{ t('Record note') }}</button>
    </form>
    <button class="btn sec" @click="sync">{{ t('Sync now') }}</button>
    <p v-if="status" class="t-meta">{{ status }}</p>

    <button class="btn sec" @click="playClip">{{ t('Play clip') }}</button>
    <button v-if="content" class="btn sec" @click="playPilotClip">{{ t('Play pilot clip') }}</button>
    <p v-if="clipError" class="error">{{ clipError }}</p>

    <iframe
      :src="videoUrl"
      title="YouTube"
      style="width: 100%; aspect-ratio: 16 / 9; border: 0; border-radius: 12px"
      referrerpolicy="strict-origin-when-cross-origin"
      allow="autoplay; encrypted-media; picture-in-picture"
      allowfullscreen
    />

    <h2 class="t-meta">{{ t('Lessons') }}</h2>
    <p v-if="contentError" class="error">{{ contentError }}</p>
    <ul class="t-meta" style="margin: 0; padding-left: 16px">
      <li v-for="l in lessons" :key="l.id">{{ l.title }}</li>
    </ul>

    <h2 class="t-meta">{{ t('Events') }}</h2>
    <ul class="t-meta" style="margin: 0; padding-left: 16px">
      <li v-for="e in newestFirst" :key="e.id">
        {{ e.kind }} #{{ e.deviceSeq }} · {{ e.deviceId.slice(0, 8) }} · seq {{ e.seq ?? '-' }} · {{ payloadText(e) }}
      </li>
    </ul>

    <button class="btn sec" @click="supabase.auth.signOut()">{{ t('Sign out') }}</button>
  </main>
</template>
