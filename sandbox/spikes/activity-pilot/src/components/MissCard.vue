<script setup lang="ts">
// Neutral miss feedback (revision 6): no "wrong" color. Replays your pick, then the answer, in the same voice.
import { computed, onMounted } from 'vue'
import { IconArrowBackUp, IconVolume } from '@tabler/icons-vue'
import type { ChoiceOption, Clip } from '../core/types'
import { t, tp } from '../i18n'
import { useMedia } from './useMedia'

const props = defineProps<{ picked: ChoiceOption; answer: ChoiceOption; pickedClip?: Clip; answerClip?: Clip }>()
const { media, lesson } = useMedia()
const label = (o: ChoiceOption) => (o.target ? o.label : t(o.label))
const headline = computed(() => tp('Not quite. That was {answer}.', { answer: label(props.answer) }))

async function replayBoth() {
  if (props.pickedClip) await media.play(props.pickedClip, { lesson })
  await new Promise((r) => setTimeout(r, 250))
  if (props.answerClip) await media.play(props.answerClip, { lesson })
}
onMounted(() => { setTimeout(replayBoth, 300) })
</script>

<template>
  <div class="card miss">
    <div class="top">
      <span class="ic slate"><IconArrowBackUp :size="18" /></span>
      <div class="t-head">
        <template v-for="(p, i) in headline" :key="i"><span v-if="p.isVar" class="zh">{{ p.text }}</span><template v-else>{{ p.text }}</template></template>
        <span v-if="answer.sub" class="t-meta"> · {{ t(answer.sub) }}</span>
      </div>
    </div>
    <div class="chips">
      <button v-if="pickedClip" class="chip" @click="media.play(pickedClip, { lesson })">
        <IconVolume :size="15" /><span class="zh">{{ pickedClip.text }}</span><span class="muted">{{ t('yours') }}</span>
      </button>
      <button v-if="answerClip" class="chip ok" @click="media.play(answerClip, { lesson })">
        <IconVolume :size="15" /><span class="zh">{{ answerClip.text }}</span>
      </button>
    </div>
    <div class="t-meta">{{ t('Comes back later in a new voice') }}</div>
  </div>
</template>

<style scoped>
.miss { display: flex; flex-direction: column; gap: 10px; }
.top { display: flex; align-items: center; gap: 10px; }
.chips { display: flex; flex-wrap: wrap; gap: 8px; }
.muted { color: var(--text-muted); }
</style>
