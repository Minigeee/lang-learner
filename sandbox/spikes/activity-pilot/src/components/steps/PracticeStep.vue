<script setup lang="ts">
import { t } from '../../i18n'
// Practice, the you do (brainstorm §4.1): the skill in the lesson's practice format, with instant
// feedback. The first time a format appears on the path, one line says how it works.
import { ref } from 'vue'
import { IconSparkles } from '@tabler/icons-vue'
import { FORMATS, type PracticeFormat, type WidgetUse } from '../../core/lesson'
import type { TrialResult } from '../../core/types'
import { hasSeen, markSeen } from '../../core/unlocks'
import { WIDGET_VIEWS } from '../widgetViews'
import { useMedia } from '../useMedia'

const props = defineProps<{ format: PracticeFormat; use: WidgetUse; seed: number }>()
const emit = defineEmits<{ complete: [results: readonly TrialResult[]] }>()
const { lesson } = useMedia()
const intro = ref(!hasSeen(props.format))
const info = FORMATS[props.format]

function begin() {
  markSeen(props.format, lesson)
  intro.value = false
}
</script>

<template>
  <div v-if="intro" class="intro">
    <span class="ic act badge"><IconSparkles :size="20" /></span>
    <div class="t-label">{{ t('New way to practice') }}</div>
    <div class="t-title">{{ t(info.name) }}</div>
    <p class="how">{{ t(info.how) }}</p>
    <button class="btn pri end" @click="begin">{{ t('Start') }}</button>
  </div>
  <component :is="WIDGET_VIEWS[use.widget]" v-else :config="use.config" policy="instant" :seed="seed" @complete="(r: readonly TrialResult[]) => emit('complete', r)" />
</template>

<style scoped>
.intro { display: flex; flex-direction: column; gap: 10px; flex: 1; padding-top: 28px; }
.badge { width: 44px; height: 44px; border-radius: 14px; }
.how { margin: 0; color: var(--text-secondary); }
.end { margin-top: auto; }
</style>
