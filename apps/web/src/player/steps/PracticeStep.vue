<script setup lang="ts">
// Practice, the you do (brainstorm §4.1), or one part of a checkpoint. The first time a format appears,
// one line says how it works.
import { ref } from 'vue'
import { IconSparkles } from '@tabler/icons-vue'
import type { OpenRun } from '@lang-learner/core'
import { useApp } from '../../app.ts'
import { t } from '../../i18n/index.ts'
import { useDrill, type PracticeStep } from '../drill.ts'
import { FORMAT_INFO } from '../lessonView.ts'
import { WIDGET_VIEWS } from '../widgets/index.ts'

const props = defineProps<{ step: PracticeStep; index: number; run: string; lessonHash: string; history: OpenRun['trials'] }>()
const emit = defineEmits<{ complete: [] }>()
const { content, progress } = useApp()
const drill = useDrill({ practice: props.step, step: props.index, run: props.run, lessonHash: props.lessonHash, history: props.history, onEnd: () => emit('complete') })
const view = WIDGET_VIEWS[drill.format.widget.split('@')[0]!]
const info = FORMAT_INFO[props.step.format]
const intro = ref(!progress.value.introduced(drill.format.widget) && !props.history.some((h) => h.step === props.index))
</script>

<template>
  <div v-if="intro && info" class="intro">
    <span class="ic act badge"><IconSparkles :size="20" /></span>
    <div class="t-label">{{ t('New way to practice') }}</div>
    <div class="t-title">{{ t(info.name) }}</div>
    <p class="how">{{ t(info.how) }}</p>
    <button class="btn pri end" @click="intro = false">{{ t('Start') }}</button>
  </div>
  <component :is="view" v-else :drill="drill" :prompt="content.text(step.prompt)" />
</template>

<style scoped>
.intro { display: flex; flex-direction: column; gap: 10px; flex: 1; padding-top: 28px; }
.badge { width: 44px; height: 44px; border-radius: 14px; }
.how { margin: 0; color: var(--text-secondary); }
.end { margin-top: auto; }
</style>
