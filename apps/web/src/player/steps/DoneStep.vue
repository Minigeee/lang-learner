<script setup lang="ts">
// The end card (brainstorm §4.1). A lesson shows its first-try count, the skill and words it added to
// the reviews (recorded here, as `card_added`), and the next lesson. A checkpoint shows what's solid
// and what's worth another look, never a score against a pass mark (README Motivation row), and the
// misses to hear again. Inside a session, one Continue moves on instead.
import { computed, onMounted } from 'vue'
import { IconArrowBackUp, IconBrain, IconCheck, IconVolume } from '@tabler/icons-vue'
import { checkpointAreas, type ClipId, type ItemId, type LessonId, type OpenRun } from '@lang-learner/core'
import { useApp } from '../../app.ts'
import { t } from '../../i18n/index.ts'
import { clipText, useLesson } from '../lessonView.ts'

const props = defineProps<{ trials: OpenRun['trials']; session?: boolean }>()
const emit = defineEmits<{ finish: []; open: [lesson: LessonId] }>()
const { content, daily, language: { pack } } = useApp()
const { lesson, play } = useLesson()
const checkpoint = lesson.shape === 'checkpoint'

const first = computed(() => props.trials.filter((x) => x.attempt === 1))
const right = computed(() => first.value.filter((x) => x.correct).length)
const nameOf = (id: ItemId) => {
  const name = content.item(id)?.name
  return name ? content.text(name) : id
}
const words = computed(() => lesson.cards.words.map((id) => {
  const card = content.card(id)
  return { id, surface: card?.word.map((w) => w.s).join('') ?? '', senses: (card?.senses ?? content.item(id)?.senses ?? []).join('; ') }
}))
const adds = computed(() => (lesson.skill && lesson.cards.skill ? 1 : 0) + lesson.cards.words.length)
onMounted(() => { void daily.addLessonCards(lesson) })

const next = computed(() => {
  if (props.session) return undefined
  const i = content.lessons.findIndex((l) => l.id === lesson.id)
  return content.lessons[i + 1]
})

const areas = computed(() => checkpointAreas(props.trials).map((a) => ({
  ...a, name: nameOf(a.item), lessons: content.lessons.filter((l) => l.skill === a.item),
})))
const solid = computed(() => areas.value.filter((a) => a.solid))
const another = computed(() => areas.value.filter((a) => !a.solid))
const misses = computed(() => {
  const keys = new Set(props.trials.filter((x) => !x.correct).map((x) => `${x.step}#${x.key}`))
  return lesson.steps.flatMap((s, step) => (s.kind === 'practice' ? s.items.filter((i) => keys.has(`${step}#${i.key}`)) : []))
    .map((i) => ({ key: i.key, clip: i.stimuli[0] as ClipId }))
})
</script>

<template>
  <div class="step">
    <template v-if="!checkpoint">
      <div class="score">
        <div class="t-display">{{ t('{right} of {n}', { right, n: first.length }) }}</div>
        <div class="t-meta">{{ t('right on the first try') }}</div>
      </div>
      <div class="list">
        <div v-if="adds" class="t-label">{{ t('In your reviews') }}</div>
        <div v-if="lesson.skill" class="row">
          <span class="ic act"><IconBrain :size="18" /></span>
          <span class="grow">{{ nameOf(lesson.skill) }}<span class="t-meta block">{{ lesson.cards.skill ? t('The idea you practiced, as a quick review') : t('The idea you practiced') }}</span></span>
        </div>
        <div v-for="w in words" :key="w.id" class="row">
          <span class="hz word">{{ w.surface }}</span>
          <span class="grow t-meta">{{ w.senses }}</span>
        </div>
      </div>
    </template>
    <template v-else>
      <div class="t-title">{{ t('Your check') }}</div>
      <div v-if="solid.length" class="list">
        <div class="t-label">{{ t('Solid') }}</div>
        <div v-for="a in solid" :key="a.item" class="row">
          <span class="ic jade"><IconCheck :size="18" /></span><span class="grow">{{ a.name }}</span>
        </div>
        <p class="t-meta">{{ t('These count as known, so the lessons that teach them are marked as known.') }}</p>
      </div>
      <div v-if="another.length" class="list">
        <div class="t-label">{{ t('Worth another look') }}</div>
        <div v-for="a in another" :key="a.item" class="row">
          <span class="ic slate"><IconArrowBackUp :size="18" /></span>
          <span class="grow">{{ a.name }}</span>
          <button v-for="l in a.lessons" :key="l.id" class="chip" @click="emit('open', l.id)">{{ t('Open lesson') }}</button>
        </div>
      </div>
      <div v-if="misses.length" class="list">
        <div class="t-label">{{ t('Hear these again') }}</div>
        <div class="chips">
          <button v-for="m in misses" :key="m.key + m.clip" class="chip" @click="play(m.clip)"><IconVolume :size="15" /><span class="zh">{{ clipText(content.clip(m.clip), pack) }}</span></button>
        </div>
      </div>
    </template>
    <div class="end">
      <button v-if="next" class="btn pri" @click="emit('open', next.id)">{{ t('Next: {x}', { x: content.text(next.title) }) }}</button>
      <button class="btn" :class="next ? 'sec' : 'pri'" @click="emit('finish')">{{ session ? t('Continue') : t('Done') }}</button>
    </div>
  </div>
</template>

<style scoped>
.step { display: flex; flex-direction: column; gap: 12px; flex: 1; }
.score { text-align: center; padding: 24px 0 10px; display: flex; flex-direction: column; gap: 4px; }
.list { display: flex; flex-direction: column; }
.word { font-size: 22px; min-width: 2.6em; }
.chips { display: flex; flex-wrap: wrap; gap: 8px; padding-top: 6px; }
.end { margin-top: auto; display: flex; flex-direction: column; gap: 10px; }
</style>
