<script setup lang="ts">
import { t } from '../i18n'
// Runs one lesson through its arc (brainstorm §4.1): opener → lesson → examples → practice, then the
// end card. Owns the step cursor, step timing and the test-out route; widgets own their items.
import { computed, onBeforeUnmount, provide, ref, watch } from 'vue'
import { stepLabel, type Lesson } from '../core/lesson'
import type { TrialResult } from '../core/types'
import { record } from '../core/events'
import LessonHeader from './LessonHeader.vue'
import StartStep from './steps/StartStep.vue'
import OpenerStep from './steps/OpenerStep.vue'
import ExplainStep from './steps/ExplainStep.vue'
import ExamplesStep from './steps/ExamplesStep.vue'
import PracticeStep from './steps/PracticeStep.vue'
import DoneStep from './steps/DoneStep.vue'
import ClipStudy from './widgets/ClipStudy.vue'
import { LESSON_ID, useMedia } from './useMedia'

const props = defineProps<{ lesson: Lesson; nextLesson?: Lesson }>()
const emit = defineEmits<{ exit: []; next: [] }>()
provide(LESSON_ID, props.lesson.id)
const { media } = useMedia()

/** -1 is the start card and steps.length the end card; neither is a step. */
const idx = ref(-1)
const testOut = ref(false)
const startedAt = ref(Date.now())
const results = ref<readonly TrialResult[]>([])
const step = computed(() => props.lesson.steps[idx.value])
const done = computed(() => idx.value >= props.lesson.steps.length)
const labels = computed(() => props.lesson.steps.map((s) => ({ label: stepLabel(s) })))
const meta = computed(() => `${props.lesson.unit} · ${done.value ? t('Done') : t(stepLabel(step.value))}`)
const seed = computed(() => idx.value * 7919 + props.lesson.id.length)

// Active time per step: only while the page is visible.
let stepStart = performance.now()
let hiddenMs = 0
let hiddenAt = 0
function onVis() {
  if (document.hidden) hiddenAt = performance.now()
  else if (hiddenAt) { hiddenMs += performance.now() - hiddenAt; hiddenAt = 0 }
}
document.addEventListener('visibilitychange', onVis)
onBeforeUnmount(() => document.removeEventListener('visibilitychange', onVis))

function closeSpan() {
  if (step.value) record({ kind: 'span', lesson: props.lesson.id, step: stepLabel(step.value), activeMs: Math.round(performance.now() - stepStart - hiddenMs) })
  stepStart = performance.now()
  hiddenMs = 0
}
function go(i: number) {
  closeSpan()
  media.stop()
  idx.value = i
}
const next = () => go(idx.value + 1)
function start(asTestOut: boolean) {
  testOut.value = asTestOut
  startedAt.value = Date.now()
  results.value = []
  stepStart = performance.now()
  go(asTestOut ? props.lesson.steps.findIndex((s) => s.kind === 'practice') : 0)
}
function onPracticeDone(r: readonly TrialResult[]) {
  results.value = r
  go(props.lesson.steps.length)
}
watch(idx, (i) => {
  if (step.value) record({ kind: 'lesson_cursor', lesson: props.lesson.id, step: i })
  window.scrollTo({ top: 0 })
})
</script>

<template>
  <div class="player">
    <Transition name="rise" mode="out-in">
      <StartStep v-if="idx < 0" :lesson="lesson" @start="start(false)" @test-out="start(true)" @close="emit('exit')" />
      <div v-else :key="idx" class="body">
        <LessonHeader :title="t(lesson.title)" :meta="meta" :steps="labels" :current="idx" @close="emit('exit')" />
        <DoneStep
          v-if="done" :results="results" :started-at="startedAt" :test-out="testOut" :skill="lesson.skill" :skill-name="lesson.title" :next="nextLesson?.title"
          @finish="emit('exit')" @next="emit('next')" @full-lesson="start(false)"
        />
        <OpenerStep v-else-if="step.kind === 'opener'" :opener="step.opener" @next="next" />
        <ExplainStep
          v-else-if="step.kind === 'explain'"
          :title="step.title" :body="step.body" :figure="step.figure" :wrong="step.wrong" :right="step.right" :deeper="step.deeper" @next="next"
        />
        <ExamplesStep v-else-if="step.kind === 'examples'" :clips="step.clips" :highlight="step.highlight" @next="next" />
        <ClipStudy v-else-if="step.kind === 'read-along'" :config="step.config" policy="instant" @complete="next" />
        <PracticeStep v-else :format="step.format" :use="step.use" :seed="seed" @complete="onPracticeDone" />
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.player { display: flex; flex-direction: column; min-height: 100%; flex: 1; }
.body { display: flex; flex-direction: column; gap: 16px; flex: 1; }
</style>
