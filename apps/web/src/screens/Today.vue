<script setup lang="ts">
// Today (app-ui-flow): how long you have, then a session. The hero card names what's next and the
// plan for the picked length; a continue row picks up an open lesson; the rings fill with today's
// minutes, and only a reached one is named. Nothing here counts what's left or what was missed.
import { computed, ref } from 'vue'
import { IconCalendarStats, IconCards, IconChevronRight, IconPlayerPlay, IconRefresh, IconSettings, IconTimeline } from '@tabler/icons-vue'
import { CONSISTENCY_V1, SESSION_LENGTHS, type DayCredit } from '@lang-learner/core'
import { useApp } from '../app.ts'
import { t } from '../i18n/index.ts'
import Rings from '../parts/Rings.vue'
import WatchSheet from '../parts/WatchSheet.vue'
import { pathModel } from '../path/model.ts'
import { useRouter } from '../router.ts'

const { content, daily, progress, settings } = useApp()
const router = useRouter(content.manifest.lang)
const path = computed(() => pathModel(content.curriculum, progress.value))
const minutes = ref<number>(15)
const planned = computed(() => daily.plan(minutes.value).plan)
const reviewMin = computed(() => {
  const r = planned.value.blocks.find((b) => b.kind === 'reviews')
  return r ? Math.max(1, Math.round(r.seconds / 60)) : 0
})
const lessonsPlanned = computed(() => planned.value.blocks.flatMap((b) => (b.kind === 'lesson' ? [content.entry(b.lesson)] : [])))
const today = computed(() => daily.days.value.today(Date.now()))
const studied = computed(() => daily.days.value.recent(Date.now(), CONSISTENCY_V1.windowDays).filter((d) => d.minutes > 0).length)
const logging = ref(false)

const next = computed(() => path.value.next)
const unit = computed(() => path.value.current)
const position = computed(() => {
  const u = unit.value
  const n = next.value
  return u && n ? { i: u.lessons.findIndex((l) => l.id === n.id) + 1, of: u.lessons.length } : null
})
const resumeStep = computed(() => {
  const n = next.value
  if (!n?.resume) return null
  const run = progress.value.openRun(n.id)
  return run ? { step: run.step + 1, of: content.lesson(n.id).steps.length } : null
})

const CREDIT: Record<DayCredit, string> = { none: '', floor: 'Tonight counts', standard: 'A full day', stretch: 'A big day' }
const others = computed(() => SESSION_LENGTHS.filter((m) => m !== minutes.value))
const start = (m: number) => router.go({ name: 'session', minutes: m })
</script>

<template>
  <main class="screen tabbed">
    <header class="top">
      <div class="hstack"><span class="seal">学</span><span class="t-title">{{ t('Today') }}</span></div>
      <div class="hstack">
        <span class="t-meta">{{ t('{n} min today', { n: Math.floor(today.minutes) }) }}</span>
        <Rings :minutes="today.minutes" :size="34" />
        <button class="icon-btn" :aria-label="t('Settings')" @click="router.go({ name: 'settings' })"><IconSettings :size="20" /></button>
      </div>
    </header>
    <p v-if="settings.intention" class="t-meta intent">{{ settings.intention }}</p>

    <section class="card hero">
      <template v-if="next && unit">
        <div class="t-label">{{ t('Up next · unit {u}', { u: unit.id }) }}</div>
        <div class="t-title">{{ unit.title }}</div>
      </template>
      <div v-else class="t-title">{{ t('How long do you have?') }}</div>
      <div class="plan t-meta">
        <span v-if="reviewMin"><IconCards :size="14" />{{ t('{n} min reviews', { n: reviewMin }) }}</span>
        <span v-for="l in lessonsPlanned" :key="l.id"><IconPlayerPlay :size="14" />{{ l.label }} · {{ l.title }}</span>
        <span v-if="!planned.blocks.length">{{ t('Nothing is due right now. Pick a longer time for a lesson.') }}</span>
      </div>
      <button class="btn pri" @click="start(minutes)">{{ t('Start {n} min', { n: minutes }) }}</button>
      <div class="lengths">
        <button v-for="m in others" :key="m" class="len" @click="minutes = m">{{ t('{n} min', { n: m }) }}</button>
      </div>
    </section>

    <section class="list">
      <button v-if="next?.resume" class="row tap" @click="router.go({ name: 'lesson', id: next.id })">
        <span class="ic act"><IconRefresh :size="18" /></span>
        <span class="grow">{{ t('Continue: {x}', { x: next.title }) }}<span v-if="resumeStep" class="t-meta block">{{ next.label }} · {{ t('Step {i} of {n}', { i: resumeStep.step, n: resumeStep.of }) }}</span></span>
        <IconChevronRight :size="18" class="muted" />
      </button>
      <button v-else-if="next" class="row tap" @click="router.go({ name: 'lesson', id: next.id })">
        <span class="ic act"><IconPlayerPlay :size="18" /></span>
        <span class="grow">{{ next.title }}<span class="t-meta block">{{ next.label }}<template v-if="position"> · {{ t('Lesson {i} of {n}', { i: position.i, n: position.of }) }}</template> · {{ t('About {n} min', { n: next.minutes }) }}</span></span>
        <IconChevronRight :size="18" class="muted" />
      </button>
    </section>

    <section class="list">
      <div class="t-label">{{ t('Also today') }}</div>
      <button class="row tap" @click="logging = true">
        <span class="ic ink"><IconTimeline :size="18" /></span>
        <span class="grow">{{ t('Log something you watched') }}</span>
        <IconChevronRight :size="18" class="muted" />
      </button>
      <button class="row tap" @click="router.go({ name: 'week' })">
        <span class="ic" :class="today.credit !== 'none' ? 'jade' : ''"><IconCalendarStats :size="18" /></span>
        <span class="grow">
          {{ CREDIT[today.credit] ? t(CREDIT[today.credit]) : t('Your week') }}
          <span class="t-meta block">{{ t('{n} of the last {d} days', { n: studied, d: CONSISTENCY_V1.windowDays }) }}</span>
        </span>
        <IconChevronRight :size="18" class="muted" />
      </button>
    </section>
    <WatchSheet v-if="logging" @close="logging = false" />
  </main>
</template>

<style scoped>
.intent { margin: -8px 0 0; }
.hero { display: flex; flex-direction: column; gap: 8px; padding: 16px; }
.plan { display: flex; flex-direction: column; gap: 3px; margin-bottom: 6px; }
.plan span { display: inline-flex; align-items: center; gap: 6px; }
.lengths { display: grid; grid-template-columns: repeat(3, 1fr); }
.len { padding: 9px 0; font-size: 13px; color: var(--text-secondary); }
.ic.ink { background: var(--ink-soft); color: var(--ink-text); }
</style>
