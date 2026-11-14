<script setup lang="ts">
// The session runner (app-ui-flow): the session builder's blocks for the minutes picked, one after
// another, then a short summary of today. It's planned from local state and its audio is cached up
// front, so it runs with the server unreachable. Stop anytime: everything is already recorded.
import { computed, onMounted, ref } from 'vue'
import { IconBrain, IconCheck, IconX } from '@tabler/icons-vue'
import type { DayCredit } from '@lang-learner/core'
import { useApp } from '../app.ts'
import { t } from '../i18n/index.ts'
import LessonPlayer from '../player/LessonPlayer.vue'
import { providePlayback } from '../player/lessonView.ts'
import ReviewBatch from '../review/ReviewBatch.vue'

const props = defineProps<{ minutes: number }>()
const emit = defineEmits<{ close: [] }>()
const { content, daily, flush } = useApp()
providePlayback(null)

const { plan, waiting } = daily.plan(props.minutes)
const at = ref(0)
const block = computed(() => plan.blocks[at.value])
const today = computed(() => daily.days.value.today(Date.now()))

/** What a reached credit is called. A day short of the floor names nothing (README Motivation row). */
const CREDIT: Record<DayCredit, string> = { none: '', floor: 'Tonight counts', standard: 'A full day', stretch: 'A big day' }

function next() {
  at.value++
  window.scrollTo({ top: 0 })
  if (at.value >= plan.blocks.length) void flush()
}

onMounted(() => { void content.prefetch(daily.mediaFor(plan)) })
</script>

<template>
  <main v-if="block?.kind === 'lesson'" class="session">
    <LessonPlayer :key="block.lesson" :lesson-id="block.lesson" :session="true" @close="next" @open="next" />
  </main>
  <main v-else class="screen">
    <header class="bar">
      <button class="x" :aria-label="t('Close')" @click="emit('close')"><IconX :size="22" :stroke-width="1.75" /></button>
      <div class="t-meta">{{ t('{n} min', { n: minutes }) }}</div>
      <span />
    </header>
    <div v-if="plan.blocks.length > 1" class="strip">
      <div v-for="(b, i) in plan.blocks" :key="i" :class="{ d: i < at, c: i === at }" />
    </div>
    <ReviewBatch v-if="block?.kind === 'reviews'" :block="block" @done="next" />
    <div v-else class="summary">
      <span class="ic" :class="today.credit === 'none' ? 'act' : 'jade'">
        <IconCheck v-if="today.credit !== 'none'" :size="18" /><IconBrain v-else :size="18" />
      </span>
      <div class="t-title">{{ plan.blocks.length ? t('That’s the session') : t('Nothing planned for now') }}</div>
      <div v-if="!plan.blocks.length" class="t-meta">{{ t('No reviews are due, and no lesson fits {n} minutes.', { n: minutes }) }}</div>
      <div class="t-display">{{ t('{n} min today', { n: Math.floor(today.minutes) }) }}</div>
      <div v-if="CREDIT[today.credit]" class="t-head">{{ t(CREDIT[today.credit]) }}</div>
      <div v-if="waiting" class="t-meta">{{ t('More words from the word list arrive with a later update.') }}</div>
      <button class="btn pri end" @click="emit('close')">{{ t('Done') }}</button>
    </div>
  </main>
</template>

<style scoped>
.session { display: contents; }
.bar { display: grid; grid-template-columns: 32px 1fr 32px; align-items: center; text-align: center; }
.x { width: 32px; height: 32px; display: grid; place-items: center; color: var(--text-secondary); }
.strip { display: flex; gap: 5px; }
.strip div { flex: 1; height: 4px; border-radius: 2px; background: var(--surface-3); }
.strip .d { background: var(--jade); }
.strip .c { background: var(--act); }
.summary { display: flex; flex-direction: column; align-items: center; gap: 10px; text-align: center; flex: 1; padding-top: 32px; }
.end { margin-top: auto; }
</style>
