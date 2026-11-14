<script setup lang="ts">
// The weekly review (app-ui-flow Screens): time by lessons, cards and watching; days studied; the
// lessons finished and cards added; listening hours and the next mark. No targets, projections or
// remarks on a gap (README Motivation row).
import { computed } from 'vue'
import { IconArrowLeft, IconCheck } from '@tabler/icons-vue'
import { CONSISTENCY_V1, inputHours, studyDate, type EventOf, type LessonId } from '@lang-learner/core'
import { useApp } from '../app.ts'
import { t } from '../i18n/index.ts'
import { useRouter } from '../router.ts'
import { dayLabel, hoursMinutes } from '../watching.ts'
import { weekOf } from '../week.ts'

const { content, daily, events } = useApp()
const router = useRouter(content.manifest.lang)
const week = computed(() => weekOf(daily.days.value, Date.now()))
const inWeek = (ms: number) => week.value.dates.includes(studyDate(ms, daily.days.value.clock))
const studied30 = computed(() => daily.days.value.recent(Date.now(), CONSISTENCY_V1.windowDays).filter((d) => d.minutes > 0).length)
const listening = computed(() => inputHours(events.value))
const finished = computed(() => {
  const ids = new Set<LessonId>()
  for (const e of events.value) {
    if (e.kind !== 'lesson_cursor' || !inWeek(e.occurredAt)) continue
    const p = (e as EventOf<'lesson_cursor'>).payload
    if (p.step === 'done') ids.add(p.lessonId)
  }
  return [...ids].flatMap((id) => (content.manifest.lessons[id] ? [content.entry(id)] : []))
})
const added = computed(() => events.value.filter((e) => e.kind === 'card_added' && inWeek(e.occurredAt)).length)
</script>

<template>
  <main class="screen tabbed">
    <header class="top">
      <button class="icon-btn" :aria-label="t('Back')" @click="router.back({ name: 'progress' })"><IconArrowLeft :size="20" /></button>
      <span class="t-meta">{{ t('Week of {d}', { d: dayLabel(week.start) }) }}</span>
      <span style="width: 34px" />
    </header>
    <div class="t-title">{{ t('Your week') }}</div>
    <div class="stats">
      <div class="stat"><b>{{ hoursMinutes(week.split.lessons) }}</b><span class="t-meta">{{ t('Lessons') }}</span></div>
      <div class="stat"><b>{{ hoursMinutes(week.split.cards) }}</b><span class="t-meta">{{ t('Cards') }}</span></div>
      <div class="stat"><b>{{ hoursMinutes(week.split.watching) }}</b><span class="t-meta">{{ t('Watching') }}</span></div>
    </div>
    <section class="list">
      <div class="row"><span class="grow">{{ t('Days studied this week') }}</span><b>{{ week.studied }}</b></div>
      <div class="row"><span class="grow">{{ t('Days in the last {d}', { d: CONSISTENCY_V1.windowDays }) }}</span><b>{{ studied30 }}</b></div>
      <div class="row"><span class="grow">{{ t('Cards added') }}</span><b>{{ added }}</b></div>
      <div class="row">
        <span class="grow">{{ t('Listening, all time') }}<span v-if="listening.nextMark" class="t-meta block">{{ t('Next mark: {n} h', { n: listening.nextMark }) }}</span></span>
        <b>{{ t('{n} h', { n: listening.hours }) }}</b>
      </div>
    </section>
    <section v-if="finished.length" class="list">
      <div class="t-label">{{ t('Lessons finished') }}</div>
      <div v-for="l in finished" :key="l.id" class="row">
        <span class="ic jade"><IconCheck :size="18" /></span><span class="grow">{{ l.label }} · {{ l.title }}</span>
      </div>
    </section>
  </main>
</template>
