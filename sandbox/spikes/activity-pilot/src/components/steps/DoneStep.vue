<script setup lang="ts">
import { t } from '../../i18n'
// Lesson end: the practice result, what was added to reviews, and where to go next. The skill card
// is added here (brainstorm §4.4). After a failed test-out it offers the full lesson instead.
import { computed, onMounted } from 'vue'
import { IconBrain, IconCards } from '@tabler/icons-vue'
import type { TrialResult } from '../../core/types'
import { cardIdFor, eventLog, record } from '../../core/events'
import { useMedia } from '../useMedia'

/** First-try share needed to pass a test-out (README: Completion & test-out). */
const TEST_OUT_PASS = 0.8

const props = defineProps<{ results: readonly TrialResult[]; startedAt: number; testOut: boolean; skill: string; skillName: string; next?: string }>()
const emit = defineEmits<{ finish: []; next: []; fullLesson: [] }>()
const { lesson } = useMedia()
/** Retries don't count: the score is first tries only. */
const firstTries = computed(() => props.results.filter((r) => r.item.attempt === 1))
const right = computed(() => firstTries.value.filter((r) => r.correct).length)
const passed = computed(() => !props.testOut || (firstTries.value.length > 0 && right.value / firstTries.value.length >= TEST_OUT_PASS))
const wordCards = computed(() =>
  new Set(eventLog.flatMap((e) => (e.at >= props.startedAt && e.event.kind === 'card_added' && e.event.itemId !== props.skill ? [e.event.cardId] : []))).size,
)

onMounted(() => {
  if (!passed.value) return
  record({ kind: 'card_added', cardId: cardIdFor(props.skill, 'skill'), itemId: props.skill, origin: 'lesson' })
  record({ kind: 'lesson_complete', lesson, via: props.testOut ? 'test-out' : 'full' })
})
</script>

<template>
  <div class="step">
    <div class="score">
      <div class="t-display">{{ right }} / {{ firstTries.length }}</div>
      <div class="t-meta">{{ t('right on the first try') }}</div>
      <div v-if="testOut" class="t-meta">{{ passed ? t('Lesson marked done.') : t('Not quite yet. The full lesson takes a few minutes.') }}</div>
    </div>
    <div v-if="passed" class="list">
      <div class="row">
        <span class="ic act"><IconBrain :size="18" /></span>
        <span class="grow">{{ t(skillName) }}<span class="t-meta block">{{ t('Added to your reviews as a skill. It comes back in this same format.') }}</span></span>
      </div>
      <div v-if="wordCards" class="row">
        <span class="ic"><IconCards :size="18" /></span>
        <span class="grow">{{ wordCards === 1 ? t('1 new card') : t('{n} new cards', { n: wordCards }) }}<span class="t-meta block">{{ t("They'll mix into your reviews") }}</span></span>
      </div>
    </div>
    <div class="end">
      <button v-if="!passed" class="btn pri" @click="emit('fullLesson')">{{ t('Do the full lesson') }}</button>
      <button v-else-if="next" class="btn pri" @click="emit('next')">{{ t('Next: {x}', { x: t(next) }) }}</button>
      <button class="btn" :class="passed && !next ? 'pri' : 'sec'" @click="emit('finish')">{{ t('Finish lesson') }}</button>
    </div>
  </div>
</template>

<style scoped>
.step { display: flex; flex-direction: column; gap: 12px; flex: 1; }
.score { text-align: center; padding: 24px 0 10px; display: flex; flex-direction: column; gap: 4px; }
.list { display: flex; flex-direction: column; }
.block { display: block; }
.end { margin-top: auto; display: flex; flex-direction: column; gap: 10px; }
</style>
