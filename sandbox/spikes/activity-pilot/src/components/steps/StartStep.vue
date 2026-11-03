<script setup lang="ts">
import { t } from '../../i18n'
// Lesson start (brainstorm §4.1): what this lesson is, how it will go, and a test-out that jumps to practice.
import { computed } from 'vue'
import { IconChevronRight, IconClock, IconX } from '@tabler/icons-vue'
import { FORMATS, stepLabel, type Lesson } from '../../core/lesson'
import { hasSeen } from '../../core/unlocks'

const props = defineProps<{ lesson: Lesson }>()
const emit = defineEmits<{ start: []; testOut: []; close: [] }>()
const arc = computed(() =>
  props.lesson.steps.map((s) => ({
    label: stepLabel(s),
    detail: s.kind === 'practice' ? FORMATS[s.format].name : null,
    isNew: s.kind === 'practice' && !hasSeen(s.format),
  })),
)
</script>

<template>
  <div class="start">
    <div class="top">
      <button class="x" :aria-label="t('Close lesson')" @click="emit('close')"><IconX :size="22" :stroke-width="1.75" /></button>
    </div>
    <div class="t-label">{{ t(lesson.kindLabel) }} · {{ lesson.unit }}</div>
    <div class="t-display zh">{{ t(lesson.title) }}</div>
    <p class="idea zh">{{ t(lesson.idea) }}</p>
    <div class="t-meta mins"><IconClock :size="14" />{{ t('~{n} min', { n: lesson.minutes }) }}</div>
    <ol class="arc">
      <li v-for="(s, i) in arc" :key="i">
        <span class="n">{{ i + 1 }}</span>
        <span class="grow">{{ t(s.label) }}<template v-if="s.detail"> · {{ t(s.detail) }}</template></span>
        <span v-if="s.isNew" class="new">{{ t('New') }}</span>
      </li>
    </ol>
    <div class="end">
      <button class="btn pri" @click="emit('start')">{{ t('Start') }}</button>
      <button class="know" @click="emit('testOut')">
        <span class="grow">{{ t('I already know this') }}<span class="t-meta block">{{ t('Skip to practice. Pass it to mark the lesson done.') }}</span></span>
        <IconChevronRight :size="18" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.start { display: flex; flex-direction: column; gap: 10px; flex: 1; }
.top { display: flex; }
.x { width: 32px; height: 32px; display: grid; place-items: center; color: var(--text-secondary); }
.idea { margin: 0; color: var(--text-secondary); }
.mins { display: inline-flex; align-items: center; gap: 5px; }
.arc { list-style: none; padding: 0; margin: 12px 0 0; display: flex; flex-direction: column; gap: 2px; }
.arc li { display: flex; align-items: center; gap: 12px; padding: 8px 0; }
.n { width: 24px; height: 24px; border-radius: 50%; background: var(--surface-3); color: var(--text-secondary); display: grid; place-items: center; font-size: 12px; }
.new { font-size: 11px; font-weight: 600; color: var(--act-text); background: var(--act-soft); border-radius: 6px; padding: 2px 7px; }
.end { margin-top: auto; display: flex; flex-direction: column; gap: 8px; }
.know { display: flex; align-items: center; gap: 10px; text-align: left; padding: 12px 4px; color: var(--text-secondary); }
.block { display: block; }
</style>
