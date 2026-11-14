<script setup lang="ts">
// Start (brainstorm §4.1): what the lesson is, how it will go, and "I already know this", which skips
// to practice, or one tap marks the lesson known without it. A format the learner hasn't met is
// marked New.
import { computed } from 'vue'
import { IconChevronRight, IconClock } from '@tabler/icons-vue'
import { FORMATS } from '@lang-learner/core'
import { useApp } from '../../app.ts'
import { t } from '../../i18n/index.ts'
import { FORMAT_INFO, SHAPE_LABEL, stepLabel, useLesson } from '../lessonView.ts'

const emit = defineEmits<{ start: []; skip: []; known: [] }>()
const { content, progress } = useApp()
const { lesson } = useLesson()
const entry = content.entry(lesson.id)
const arc = computed(() => lesson.steps.map((s) => {
  const widget = s.kind === 'practice' ? FORMATS[s.format]?.widget : undefined
  return {
    label: stepLabel(s, lesson.shape),
    detail: s.kind === 'practice' ? FORMAT_INFO[s.format]?.name : undefined,
    isNew: widget !== undefined && !progress.value.introduced(widget),
  }
}))
</script>

<template>
  <div class="start">
    <div class="t-label">{{ t(SHAPE_LABEL[lesson.shape]) }} · {{ entry.label }}</div>
    <div class="t-display">{{ content.text(lesson.title) }}</div>
    <p class="idea">{{ content.text(lesson.idea) }}</p>
    <div class="t-meta mins"><IconClock :size="14" />{{ t('About {n} min', { n: entry.minutes }) }}</div>
    <ol class="arc">
      <li v-for="(s, i) in arc" :key="i">
        <span class="n">{{ i + 1 }}</span>
        <span class="grow">{{ t(s.label) }}<template v-if="s.detail"> · {{ t(s.detail) }}</template></span>
        <span v-if="s.isNew" class="new">{{ t('New') }}</span>
      </li>
    </ol>
    <div class="end">
      <button class="btn pri" @click="emit('start')">{{ t('Start') }}</button>
      <button v-if="lesson.shape !== 'checkpoint'" class="know" @click="emit('skip')">
        <span class="grow">{{ t('I already know this') }}<span class="t-meta block">{{ t('Go straight to practice.') }}</span></span>
        <IconChevronRight :size="18" />
      </button>
      <button class="mark t-meta" @click="emit('known')">{{ t('Or just mark it as known') }}</button>
    </div>
  </div>
</template>

<style scoped>
.start { display: flex; flex-direction: column; gap: 10px; flex: 1; }
.idea { margin: 0; color: var(--text-secondary); }
.mins { display: inline-flex; align-items: center; gap: 5px; }
.arc { list-style: none; padding: 0; margin: 12px 0 0; display: flex; flex-direction: column; gap: 2px; }
.arc li { display: flex; align-items: center; gap: 12px; padding: 8px 0; }
.n { width: 24px; height: 24px; border-radius: 50%; background: var(--surface-3); color: var(--text-secondary); display: grid; place-items: center; font-size: 12px; }
.new { font-size: 11px; font-weight: 600; color: var(--act-text); background: var(--act-soft); border-radius: 6px; padding: 2px 7px; }
.end { margin-top: auto; display: flex; flex-direction: column; gap: 8px; }
.mark { align-self: center; padding: 4px 8px; text-decoration: underline; text-underline-offset: 3px; }
.know { display: flex; align-items: center; gap: 10px; text-align: left; padding: 12px 4px; color: var(--text-secondary); }
</style>
