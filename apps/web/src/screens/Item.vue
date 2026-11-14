<script setup lang="ts">
// Item detail (app-ui-flow Screens): a word, grammar point or sound. Its highest state, its next
// review, three stat tiles, lines that use it with audio, and the lessons that teach it. Nothing here
// counts from a miss (README Motivation row).
import { computed } from 'vue'
import { IconArrowLeft, IconBook2, IconChevronRight, IconVolume } from '@tabler/icons-vue'
import type { ClipId, CurriculumLesson, ItemId, MasteryState } from '@lang-learner/core'
import { useApp } from '../app.ts'
import { t } from '../i18n/index.ts'
import { itemTitle, KIND_LABEL, layerOf } from '../items.ts'
import { clipText, providePlayback } from '../player/lessonView.ts'
import { useRouter } from '../router.ts'

const props = defineProps<{ id: ItemId }>()
const { content, daily, progress, clips, language: { pack } } = useApp()
const router = useRouter(content.manifest.lang)
const { play } = providePlayback(null)

const item = computed(() => content.item(props.id))
const title = computed(() => itemTitle(content, props.id))
const layer = computed(() => layerOf(props.id))
const reading = computed(() => (item.value?.reading ? pack.displayReading(item.value.reading) : ''))
const state = computed(() => progress.value.mastery(props.id))
const STATE: Record<MasteryState, { label: string; cls: string }> = {
  new: { label: 'Not met yet', cls: '' }, learning: { label: 'Learning', cls: 'act' }, familiar: { label: 'Familiar', cls: 'jade' },
  solid: { label: 'Solid', cls: 'jade' }, mastered: { label: 'Mastered', cls: 'jade' },
}

const cards = computed(() => daily.cards.value.filter((c) => c.itemId === props.id))
const reviews = computed(() => cards.value.reduce((n, c) => n + c.reviews, 0))
const nextDue = computed(() => (cards.value.length ? Math.min(...cards.value.map((c) => c.state.dueAt)) : null))
const dueText = computed(() => {
  if (nextDue.value === null) return ''
  const days = Math.ceil((nextDue.value - Date.now()) / 86_400_000)
  return days <= 0 ? t('Up for review') : days === 1 ? t('Next review tomorrow') : t('Next review in {n} days', { n: days })
})
const evidence = computed(() => progress.value.evidence(props.id))

/** Lessons that teach it: as their skill, their card words, or their examples' words. */
const taught = computed((): CurriculumLesson[] => content.curriculum.flatMap((s) => s.units.flatMap((u) => u.lessons)).filter((l) => {
  if (l.skill === props.id) return true
  if (!l.authored) return false
  const lesson = content.lesson(l.id)
  return lesson.cards.words.includes(props.id) || lesson.steps.some((st) => st.kind === 'examples' && st.words?.includes(props.id))
}))
/** Lines that use it: clips whose words include it, then practice stimuli aimed at it. */
const heard = computed((): ClipId[] => {
  const out = new Set<ClipId>()
  for (const c of content.clips) if (c.tokens.some((tok) => tok.id === props.id)) out.add(c.id)
  for (const l of content.lessons) for (const st of l.steps) if (st.kind === 'practice') for (const i of st.items) if (i.target === props.id && i.stimuli[0]) out.add(i.stimuli[0])
  return [...out].slice(0, 4)
})
const next = computed(() => taught.value.find((l) => l.authored && !['complete', 'known'].includes(progress.value.lessonStatus(l))) ?? taught.value.find((l) => l.authored))
</script>

<template>
  <main class="screen tabbed">
    <header class="top">
      <button class="icon-btn" :aria-label="t('Back')" @click="router.back({ name: 'path', view: 'items' })"><IconArrowLeft :size="20" /></button>
      <span class="t-meta">{{ layer ? t(KIND_LABEL[layer]) : '' }}</span>
      <span style="width: 34px" />
    </header>
    <div>
      <div :class="title.isTarget ? 'hz big' : 't-title'">{{ title.text }}</div>
      <div v-if="reading || item?.senses?.length" class="t-meta">{{ [reading, item?.senses?.join('; ')].filter(Boolean).join(' · ') }}</div>
    </div>
    <div class="hstack"><span class="tag" :class="STATE[state].cls">{{ t(STATE[state].label) }}</span><span v-if="dueText" class="t-meta">{{ dueText }}</span></div>
    <div class="stats">
      <div class="stat"><b>{{ evidence.right }}/{{ evidence.tries }}</b><span class="t-meta">{{ t('first tries right') }}</span></div>
      <div class="stat"><b>{{ reviews }}</b><span class="t-meta">{{ t('reviews') }}</span></div>
      <div class="stat"><b>{{ taught.length }}</b><span class="t-meta">{{ t('lessons') }}</span></div>
    </div>
    <section v-if="heard.length" class="list">
      <div class="t-label">{{ t('Heard in') }}</div>
      <button v-for="c in heard" :key="c" class="row tap" @click="play(c)">
        <span class="ic" :class="{ act: clips.playing.value === c }"><IconVolume :size="18" /></span>
        <span class="grow zh">{{ clipText(content.clip(c), pack) }}<span v-if="content.clip(c).en" class="t-meta block">{{ content.text(content.clip(c).en!) }}</span></span>
      </button>
    </section>
    <section v-if="taught.length" class="list">
      <div class="t-label">{{ t('Taught in') }}</div>
      <button v-for="l in taught" :key="l.id" class="row tap" :disabled="!l.authored" @click="router.go({ name: 'lesson', id: l.id })">
        <span class="ic"><IconBook2 :size="18" /></span>
        <span class="grow">{{ l.label }} · {{ l.title }}<span v-if="!l.authored" class="t-meta block">{{ t('Not yet available') }}</span></span>
        <IconChevronRight v-if="l.authored" :size="18" class="muted" />
      </button>
    </section>
    <button v-if="next" class="btn pri end" @click="router.go({ name: 'lesson', id: next.id })">{{ t('Open {x}', { x: next.label }) }}</button>
  </main>
</template>

<style scoped>
.big { font-size: 40px; line-height: 1.2; }
.end { margin-top: auto; }
</style>
