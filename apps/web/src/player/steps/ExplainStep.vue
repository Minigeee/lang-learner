<script setup lang="ts">
// How it works, the I do (brainstorm §4.1): the claim, its figure, a few lines, a ✗/✓ pair, the
// lesson's video, and Go deeper.
import { computed, ref } from 'vue'
import { IconCheck, IconChevronDown, IconVolume, IconX } from '@tabler/icons-vue'
import type { Step } from '@lang-learner/core'
import { useApp } from '../../app.ts'
import { t } from '../../i18n/index.ts'
import { clipText, useLesson } from '../lessonView.ts'
import RichText from '../parts/RichText.vue'
import VideoBlock from '../parts/VideoBlock.vue'
import { figure } from '../figures/index.ts'

const props = defineProps<{ step: Extract<Step, { kind: 'lesson' }> }>()
const emit = defineEmits<{ next: [] }>()
const { content, language } = useApp()
const { lesson, play } = useLesson()
const right = computed(() => (props.step.right ? content.clip(props.step.right) : null))
const figureView = computed(() => (props.step.figure ? figure(props.step.figure, language.views) : undefined))
const open = ref(new Set<number>())
const toggle = (i: number) => {
  const next = new Set(open.value)
  if (!next.delete(i)) next.add(i)
  open.value = next
}
</script>

<template>
  <div class="step">
    <div class="t-title">{{ content.text(lesson.idea) }}</div>
    <component :is="figureView" v-if="figureView" :t="t" :step="step" />
    <p v-for="(b, i) in step.body" :key="i" class="body"><RichText :text="content.text(b)" :refs="step.refs ?? {}" /></p>
    <div v-if="step.wrong || right" class="list">
      <div v-if="step.wrong" class="row"><span class="ic slate"><IconX :size="18" /></span><span class="grow zh strike">{{ step.wrong }}</span></div>
      <button v-if="right" class="row tap" @click="play(right.id)">
        <span class="ic jade"><IconCheck :size="18" /></span>
        <span class="grow"><span class="zh">{{ clipText(right, language.pack) }}</span><span v-if="right.en" class="t-meta block">{{ content.text(right.en) }}</span></span>
        <IconVolume :size="18" class="muted" />
      </button>
    </div>
    <VideoBlock v-if="step.video" :video="step.video" />
    <div v-if="lesson.deeper?.length" class="deeper">
      <div class="t-label">{{ t('Go deeper') }}</div>
      <div v-for="(d, i) in lesson.deeper" :key="i">
        <button class="t-meta dq" @click="toggle(i)"><IconChevronDown :size="16" :class="{ flip: open.has(i) }" /><span>{{ content.text(d.question) }}</span></button>
        <Transition name="fade"><p v-if="open.has(i)" class="t-meta da">{{ content.text(d.answer) }}</p></Transition>
      </div>
    </div>
    <button class="btn pri end" @click="emit('next')">{{ t('Continue') }}</button>
  </div>
</template>

<style scoped>
.step { display: flex; flex-direction: column; gap: 12px; flex: 1; }
.body { margin: 0; line-height: 1.7; }
.list { display: flex; flex-direction: column; }
.tap { width: 100%; text-align: left; }
.strike { text-decoration: line-through; color: var(--text-muted); }
.deeper { display: flex; flex-direction: column; gap: 2px; }
.dq { display: flex; align-items: center; gap: 6px; padding: 6px 0; text-align: left; }
.da { margin: 0 0 6px 22px; }
.flip { transform: rotate(180deg); }
.end { margin-top: auto; }
</style>
