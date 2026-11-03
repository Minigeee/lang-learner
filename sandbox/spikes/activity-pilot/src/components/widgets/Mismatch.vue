<script setup lang="ts">
import { t } from '../../i18n'
// Catch the mismatch (C3): lines play with English under each; one English line is flipped on the
// target. The Chinese is always right, so the learner never hears a wrong form.
import { computed, onMounted } from 'vue'
import { IconVolume } from '@tabler/icons-vue'
import type { MismatchConfig } from '../../core/lesson'
import type { ChoiceOption, FeedbackPolicy, TrialResult } from '../../core/types'
import { useSetChallenge } from '../useSetChallenge'
import { useMedia } from '../useMedia'

const props = defineProps<{ config: MismatchConfig; policy: FeedbackPolicy; seed: number }>()
const emit = defineEmits<{ complete: [results: readonly TrialResult[]] }>()
const { media } = useMedia()

const size = Math.max(...props.config.sets.map((s) => s.lines.length))
const options: ChoiceOption[] = Array.from({ length: size }, (_, i) => ({ key: `p${i}`, label: `Line ${i + 1}` }))
const c = useSetChallenge({
  sets: props.config.sets, seed: props.seed, widget: 'mismatch@1', options,
  clipsOf: (s) => s.lines, answerOf: (s) => s.wrong,
  complete: (r) => emit('complete', r),
})
// The English shown under each line; the wrong one carries the flipped meaning. Shown English is lesson
// content, like a gloss, so it is not a support-language string.
const shown = computed(() => c.clips.value.map((clip, i) => (c.set.value && i === c.set.value.wrong ? c.set.value.shown : clip.gloss ?? '')))
// The placeholder synth can't carry 不 vs 没, so placeholder lines show their Chinese text.
const showText = computed(() => c.clips.value.some((clip) => media.isPlaceholder(clip)))
onMounted(c.advance)
</script>

<template>
  <div v-if="c.item.value" class="ch">
    <div class="prog">
      <span class="t-meta">{{ t('Practice · {i} of {n}', { i: Math.min(c.progress.value.done + 1, c.progress.value.total ?? 1), n: c.progress.value.total ?? 1 }) }}</span>
      <div class="bar"><div :style="{ width: c.progress.value.fraction * 100 + '%' }" /></div>
    </div>
    <div class="t-head prompt">{{ t(config.prompt) }}</div>
    <div class="lines">
      <button
        v-for="(clip, i) in c.clips.value" :key="clip.id" class="line" :class="[c.stateOf(i), { on: c.playing.value === i }]" @click="c.tap(i)"
      >
        <IconVolume :size="20" :stroke-width="1.75" class="vol" />
        <span class="grow">
          <span v-if="showText" class="zh txt">{{ clip.text }}</span>
          <span class="en">{{ shown[i] }}</span>
        </span>
      </button>
    </div>
    <span v-if="showText" class="t-meta center ph">{{ t('Placeholder audio · text shown') }}</span>
    <div class="t-meta center">
      {{ c.verdict.value?.kind === 'instant' ? (c.verdict.value.correct ? t('That\'s the one.') : t('It was line {n}. Tap a line to hear it again.', { n: Number(c.verdict.value.answer.slice(1)) + 1 })) : c.heardAll.value ? t('Tap a line to hear it again. Pick the wrong English.') : t('Listen to every line.') }}
    </div>
    <button v-if="c.verdict.value?.kind === 'instant' && !c.verdict.value.correct" class="btn pri" @click="c.advance">{{ t('Next') }}</button>
    <button v-else class="btn pri" :disabled="c.selected.value === null || !!c.verdict.value" @click="c.confirm">{{ t('That one') }}</button>
  </div>
</template>

<style scoped>
.ch { display: flex; flex-direction: column; gap: 14px; flex: 1; }
.prog { display: flex; flex-direction: column; gap: 6px; }
.bar { height: 3px; border-radius: 2px; background: var(--surface-3); overflow: hidden; }
.bar div { height: 100%; background: var(--jade); transition: width .3s ease; }
.prompt, .center { text-align: center; }
.ph { color: var(--text-muted); }
.lines { display: flex; flex-direction: column; gap: 10px; margin-top: auto; }
.line {
  display: flex; align-items: center; gap: 12px; text-align: left; border: 1px solid var(--border-strong); border-radius: 16px;
  padding: 14px; transition: transform .12s ease, background .18s ease, border-color .18s ease, opacity .18s ease;
}
.line:active { transform: scale(.98); }
.vol { color: var(--text-secondary); flex: none; }
.txt { display: block; font-size: 18px; }
.en { display: block; }
.line.on { background: var(--act-soft); border-color: var(--act-border); }
.line.on .vol { color: var(--act-text); }
.line.sel { border: 1.5px solid var(--act); }
.line.right { background: var(--jade-soft); border: 1.5px solid var(--jade); }
.line.answer { border: 1.5px solid var(--jade); }
.line.off { opacity: .45; }
.line.dim { opacity: .35; }
</style>
