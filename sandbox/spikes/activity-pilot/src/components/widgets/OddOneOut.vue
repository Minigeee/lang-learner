<script setup lang="ts">
import { t } from '../../i18n'
// Odd one out (C2): four voices, three say the same tone, one differs. Tap a tile to hear and pick it.
import { onMounted } from 'vue'
import { IconVolume } from '@tabler/icons-vue'
import type { OddOneOutConfig } from '../../core/lesson'
import type { ChoiceOption, FeedbackPolicy, TrialResult } from '../../core/types'
import { useSetChallenge } from '../useSetChallenge'

const props = defineProps<{ config: OddOneOutConfig; policy: FeedbackPolicy; seed: number }>()
const emit = defineEmits<{ complete: [results: readonly TrialResult[]] }>()

const LETTERS = ['A', 'B', 'C', 'D']
const options: ChoiceOption[] = LETTERS.map((l, i) => ({ key: `p${i}`, label: l, target: true }))
const c = useSetChallenge({
  sets: props.config.sets, seed: props.seed, widget: 'odd-one-out@1', options,
  clipsOf: (s) => s.clips, answerOf: (s) => s.odd,
  complete: (r) => emit('complete', r),
})
onMounted(c.advance)
</script>

<template>
  <div v-if="c.item.value" class="ch">
    <div class="prog">
      <span class="t-meta">{{ t('Practice · {i} of {n}', { i: Math.min(c.progress.value.done + 1, c.progress.value.total ?? 1), n: c.progress.value.total ?? 1 }) }}</span>
      <div class="bar"><div :style="{ width: c.progress.value.fraction * 100 + '%' }" /></div>
    </div>
    <div class="t-head prompt">{{ t(config.prompt) }}</div>
    <div class="tiles">
      <button
        v-for="(clip, i) in c.clips.value" :key="clip.id" class="tile" :class="[c.stateOf(i), { on: c.playing.value === i }]"
        :aria-label="t('Voice {n}', { n: LETTERS[i] })" @click="c.tap(i)"
      >
        <span class="letter">{{ LETTERS[i] }}</span>
        <IconVolume :size="26" :stroke-width="1.75" />
      </button>
    </div>
    <div class="t-meta center">
      {{ c.verdict.value?.kind === 'instant' ? (c.verdict.value.correct ? t('That\'s the one.') : t('It was {x}. Tap any tile to compare.', { x: LETTERS[Number(c.verdict.value.answer.slice(1))] })) : c.heardAll.value ? t('Tap to hear one again. Pick the odd one.') : t('Listen to all four.') }}
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
.tiles { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: auto; }
.tile {
  position: relative; border: 1px solid var(--border-strong); border-radius: 18px; padding: 26px 8px 16px;
  display: flex; flex-direction: column; align-items: center; gap: 6px; color: var(--text-secondary);
  transition: transform .12s ease, background .18s ease, border-color .18s ease, opacity .18s ease;
}
.tile:active { transform: scale(.97); }
.letter { position: absolute; top: 9px; left: 12px; font-size: 13px; font-weight: 600; color: var(--text-muted); }
.tile.on { background: var(--act-soft); color: var(--act-text); border-color: var(--act-border); }
.tile.sel { border: 1.5px solid var(--act); color: var(--act-text); }
.tile.right { background: var(--jade-soft); border: 1.5px solid var(--jade); color: var(--jade-text); }
.tile.answer { border: 1.5px solid var(--jade); color: var(--jade-text); }
.tile.off { opacity: .45; }
.tile.dim { opacity: .35; }
</style>
