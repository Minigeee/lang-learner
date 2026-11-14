<script setup lang="ts">
// Neutral miss feedback (app-ui-flow revision 6): no "wrong" color, one line, and the line again to hear.
import { computed, onMounted } from 'vue'
import { IconArrowBackUp, IconVolume } from '@tabler/icons-vue'
import type { ClipId } from '@lang-learner/core'
import { tp, t } from '../../i18n/index.ts'
import { usePlayback } from '../lessonView.ts'

const props = defineProps<{ answer: string; answerIsTarget: boolean; stimulus: ClipId; retry: boolean }>()
const { play } = usePlayback()
const headline = computed(() => tp('Not quite. That was {answer}.', { answer: props.answer }))
onMounted(() => { setTimeout(() => void play(props.stimulus), 300) })
</script>

<template>
  <div class="card miss">
    <div class="top">
      <span class="ic slate"><IconArrowBackUp :size="18" /></span>
      <div class="t-head">
        <template v-for="(p, i) in headline" :key="i"><span v-if="p.isVar" :class="{ zh: answerIsTarget }">{{ p.text }}</span><template v-else>{{ p.text }}</template></template>
      </div>
    </div>
    <div class="chips">
      <button class="chip" @click="play(stimulus)"><IconVolume :size="15" />{{ t('Hear it again') }}</button>
    </div>
    <div v-if="retry" class="t-meta">{{ t('Comes back later in a new voice') }}</div>
  </div>
</template>

<style scoped>
.miss { display: flex; flex-direction: column; gap: 10px; }
.top { display: flex; align-items: center; gap: 10px; }
.chips { display: flex; flex-wrap: wrap; gap: 8px; }
</style>
