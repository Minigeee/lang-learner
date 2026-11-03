<script setup lang="ts">
import { provide, ref } from 'vue'
import { IconChevronRight, IconLanguage, IconListDetails, IconMoon, IconRotate, IconSun } from '@tabler/icons-vue'
import type { Lesson } from './core/lesson'
import { createMediaHandle } from './core/media'
import { LESSONS } from './content/lessons'
import { SPEAKERS } from './content/clips'
import { LOCALES, locale, setLocale, t } from './i18n'
import { resetSeen } from './core/unlocks'
import { MEDIA } from './components/useMedia'
import LessonPlayer from './components/LessonPlayer.vue'
import EventDrawer from './components/EventDrawer.vue'

const media = createMediaHandle(SPEAKERS)
provide(MEDIA, media)

const active = ref<Lesson | null>(null)
const showEvents = ref(false)
const theme = ref<'dark' | 'light'>((() => { try { return localStorage.getItem('pilot-theme') === 'light' ? 'light' : 'dark' } catch { return 'dark' } })())
document.documentElement.dataset.theme = theme.value
setLocale(locale.value)

function toggleTheme() {
  theme.value = theme.value === 'dark' ? 'light' : 'dark'
  document.documentElement.dataset.theme = theme.value
  try { localStorage.setItem('pilot-theme', theme.value) } catch { /* private mode */ }
}
function toggleLocale() {
  const i = LOCALES.findIndex((l) => l.id === locale.value)
  setLocale(LOCALES[(i + 1) % LOCALES.length].id)
}
function exit() { media.stop(); active.value = null }
// By id: `active` holds a reactive proxy, not the array element itself.
const nextOf = (l: Lesson) => LESSONS[LESSONS.findIndex((x) => x.id === l.id) + 1]
function goNext() {
  media.stop()
  if (active.value) active.value = nextOf(active.value) ?? null
}
const resetDone = ref(false)
function resetIntros() { resetSeen(); resetDone.value = true; setTimeout(() => (resetDone.value = false), 1500) }
</script>

<template>
  <div class="frame">
    <LessonPlayer v-if="active" :key="active.id" :lesson="active" :next-lesson="nextOf(active)" @exit="exit" @next="goNext" />
    <div v-else class="home">
      <div class="brand"><span class="seal">学</span><span class="t-title">{{ t('Activity pilot') }}</span></div>
      <p class="t-meta">{{ t('Three lessons, one per shape. Each runs the full arc, with a different opener and practice format.') }}</p>
      <div class="list">
        <button v-for="l in LESSONS" :key="l.id" class="row lesson" @click="active = l">
          <div class="grow">
            <div class="t-label">{{ t(l.kindLabel) }} · {{ l.unit }}</div>
            <div class="t-head zh">{{ t(l.title) }}</div>
            <div class="t-meta zh">{{ t(l.idea) }}</div>
          </div>
          <span class="t-meta">{{ t('~{n} min', { n: l.minutes }) }}</span>
          <IconChevronRight :size="18" class="muted" />
        </button>
      </div>
      <div class="foot">
        <button class="chip" @click="toggleLocale"><IconLanguage :size="15" />{{ t('Instructions') }}: {{ LOCALES.find((l) => l.id === locale)?.name }}</button>
        <button class="chip" @click="toggleTheme"><component :is="theme === 'dark' ? IconSun : IconMoon" :size="15" />{{ theme === 'dark' ? t('Light') : t('Dark') }}</button>
        <button class="chip" @click="showEvents = true"><IconListDetails :size="15" />{{ t('Events') }}</button>
        <button class="chip" @click="resetIntros"><IconRotate :size="15" />{{ resetDone ? t('Done') : t('Reset format intros') }}</button>
      </div>
      <p class="t-meta note">Dev note: audio is a placeholder synth (pitch contours in four synthetic voices) until real native clips from the media-ingest spike are mapped in. Strings come from src/i18n/strings.tsv; add a locale by adding a column.</p>
    </div>
  </div>
  <button v-if="active && !showEvents" class="ev-fab" :aria-label="t('Show events')" @click="showEvents = true"><IconListDetails :size="18" /></button>
  <EventDrawer v-if="showEvents" @close="showEvents = false" />
</template>

<style scoped>
.frame {
  max-width: 430px; margin: 0 auto; min-height: 100dvh; display: flex; flex-direction: column;
  padding: calc(16px + env(safe-area-inset-top)) 16px calc(18px + env(safe-area-inset-bottom));
}
.home { display: flex; flex-direction: column; gap: 14px; }
.brand { display: flex; align-items: center; gap: 10px; margin-top: 8px; }
.seal {
  width: 30px; height: 30px; border-radius: 9px; background: var(--act); color: var(--on-act); display: grid; place-items: center;
  font-family: "Noto Serif SC", serif; font-weight: 600;
}
.lesson { width: 100%; text-align: left; padding: 14px 0; }
.muted { color: var(--text-muted); }
.foot { display: flex; gap: 8px; flex-wrap: wrap; }
.note { color: var(--text-muted); }
.ev-fab {
  position: fixed; right: 14px; bottom: calc(90px + env(safe-area-inset-bottom)); width: 38px; height: 38px; border-radius: 50%;
  background: var(--surface-3); color: var(--text-secondary); display: grid; place-items: center; opacity: .7; z-index: 4;
}
</style>
