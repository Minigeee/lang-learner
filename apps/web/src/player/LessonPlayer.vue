<script setup lang="ts">
// Runs one lesson through its arc (brainstorm §4.1): Start, its steps, then the end card. Each step
// reached is a `lesson_cursor` event, so closing the tab loses nothing: reopening the lesson resumes
// its open run at that step, and a practice step replays its recorded trials.
import { computed, ref } from 'vue'
import { newEventId, type LessonId } from '@lang-learner/core'
import { useApp } from '../app.ts'
import { useClaims } from '../claims.ts'
import { t } from '../i18n/index.ts'
import { provideLesson, stepLabel } from './lessonView.ts'
import LessonHeader from './parts/LessonHeader.vue'
import NoteSheet from './parts/NoteSheet.vue'
import DoneStep from './steps/DoneStep.vue'
import ExamplesStep from './steps/ExamplesStep.vue'
import ExplainStep from './steps/ExplainStep.vue'
import OpenerStep from './steps/OpenerStep.vue'
import PracticeStep from './steps/PracticeStep.vue'
import ReadAlongStep from './steps/ReadAlongStep.vue'
import StartStep from './steps/StartStep.vue'

const props = defineProps<{ lessonId: LessonId; /** Played as a session block: the end card moves on. */ session?: boolean }>()
const emit = defineEmits<{ close: []; open: [lesson: LessonId] }>()
const app = useApp()
const claims = useClaims()
const { content, progress } = app
const lesson = content.lesson(props.lessonId)
const hash = content.hashOf(lesson.id)
const entry = content.entry(lesson.id)
provideLesson(lesson)

// A run recorded against another version of the lesson can't be placed in this one, so it starts over.
const open = progress.value.openRun(lesson.id)
const resumed = open && open.lessonHash === hash ? open : null
const run = ref(resumed?.run ?? '')
const history = ref(resumed?.trials ?? [])
/** -1 is the start card and steps.length the end card; neither is a step. */
const idx = ref(resumed ? Math.min(resumed.step, lesson.steps.length - 1) : -1)
const noting = ref(false)
const saved = ref(false)

const step = computed(() => lesson.steps[idx.value])
const done = computed(() => idx.value >= lesson.steps.length)
const meta = computed(() => {
  const where = idx.value < 0 ? '' : done.value ? t('Done') : t(stepLabel(step.value!, lesson.shape))
  return where ? `${entry.label} · ${where}` : entry.label
})
const target = computed(() => `${lesson.id}@${hash}#${idx.value < 0 ? 'start' : done.value ? 'done' : idx.value}`)

function go(i: number) {
  app.clips.stop()
  idx.value = i
  void app.record({ kind: 'lesson_cursor', v: 1, payload: { lessonId: lesson.id, lessonHash: hash, run: run.value, step: i < lesson.steps.length ? i : 'done' } })
  window.scrollTo({ top: 0 })
}

function begin(skip: boolean) {
  run.value = newEventId(Date.now())
  history.value = []
  go(skip ? Math.max(0, lesson.steps.findIndex((s) => s.kind === 'practice')) : 0)
}

const next = () => go(idx.value + 1)

async function markKnown() {
  await claims.mark({ scope: 'lesson', id: lesson.id }, 'known')
  emit('close')
}

function closeNote(didSave: boolean) {
  noting.value = false
  if (!didSave) return
  saved.value = true
  setTimeout(() => { saved.value = false }, 1800)
}
</script>

<template>
  <main class="screen player">
    <LessonHeader
      :title="content.text(lesson.title)" :meta="meta" :steps="idx < 0 ? 0 : lesson.steps.length" :current="idx"
      @close="emit('close')" @note="noting = true"
    />
    <Transition name="rise" mode="out-in">
      <StartStep v-if="idx < 0" @start="begin(false)" @skip="begin(true)" @known="markKnown" />
      <div v-else :key="run + idx" class="body">
        <DoneStep v-if="done" :trials="progress.trialsOf(run)" :session="session" @finish="emit('close')" @open="(id) => emit('open', id)" />
        <OpenerStep v-else-if="step?.kind === 'opener'" :step="step" @next="next" />
        <ExplainStep v-else-if="step?.kind === 'lesson'" :step="step" @next="next" />
        <ExamplesStep v-else-if="step?.kind === 'examples'" :step="step" @next="next" />
        <ReadAlongStep v-else-if="step?.kind === 'read-along'" :step="step" @next="next" />
        <PracticeStep v-else-if="step?.kind === 'practice'" :step="step" :index="idx" :run="run" :lesson-hash="hash" :history="history" @complete="next" />
      </div>
    </Transition>
    <NoteSheet v-if="noting" :target="target" @close="closeNote" />
    <Transition name="fade"><div v-if="saved" class="toast t-meta">{{ t('Note saved') }}</div></Transition>
  </main>
</template>

<style scoped>
.player { gap: 16px; }
.body { display: flex; flex-direction: column; gap: 16px; flex: 1; }
.toast {
  position: fixed; left: 50%; bottom: 24px; transform: translateX(-50%); background: var(--surface-3);
  color: var(--text-primary); border-radius: 999px; padding: 8px 16px;
}
</style>
