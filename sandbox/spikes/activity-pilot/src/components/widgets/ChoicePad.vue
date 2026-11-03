<script setup lang="ts">
import { t } from '../../i18n'
// Choice pad: hear a stimulus, pick one option. The trial runner owns order, scoring, feedback and retries;
// this view only renders the current item and reports the pick.
import { computed, nextTick, onMounted, ref, shallowRef } from 'vue'
import { IconEye, IconEyeOff } from '@tabler/icons-vue'
import type { ChoicePadConfig } from '../../core/lesson'
import type { ChoiceOption, FeedbackPolicy, TrialItem, TrialResult, Verdict } from '../../core/types'
import { createTrialRunner, PRACTICE_PACING } from '../../core/trialRunner'
import { clip as getClip, SPEAKERS } from '../../content/clips'
import PlayButton from '../PlayButton.vue'
import MissCard from '../MissCard.vue'
import ToneGlyph from '../figures/ToneGlyph.vue'
import { haptic, useMedia } from '../useMedia'

const props = defineProps<{ config: ChoicePadConfig; policy: FeedbackPolicy; seed: number }>()
const emit = defineEmits<{ complete: [results: readonly TrialResult[]] }>()

/** Pause after a correct answer before the next item, long enough to register the green. */
const CORRECT_ADVANCE_MS = 650
/** In checks there's no verdict, just a brief acknowledgement of the tap. */
const DEFERRED_ADVANCE_MS = 260

const { media, lesson } = useMedia()
const runner = createTrialRunner(props.config.items, props.config.options, props.policy, {
  clip: getClip, lesson, widget: 'choice-pad@2', seed: props.seed, voiceOffset: props.config.voiceOffset,
  pacing: PRACTICE_PACING,
})
const item = shallowRef<TrialItem | null>(null)
const verdict = shallowRef<Verdict | null>(null)
const picked = ref<string | null>(null)
const progress = ref(runner.progress())
const showText = ref(false)
const playBtn = ref<InstanceType<typeof PlayButton> | null>(null)
let shownAt = 0

const placeholder = computed(() => (item.value ? media.isPlaceholder(item.value.stimulus) : false))
// The synth carries tone contours, so syllables stay text-free. For sentences it can't carry the
// difference (不 vs 没), so placeholder sentences show their text.
const placeholderNeedsText = computed(() => placeholder.value && item.value?.stimulus.synth.kind === 'phrase')
const textVisible = computed(() => showText.value || placeholderNeedsText.value)
/** 1-based position of the item on screen; stays put while a verdict is showing. */
const position = computed(() => Math.min(progress.value.done + (verdict.value ? 0 : 1), progress.value.total ?? Infinity))
const progressText = computed(() => {
  const rung = props.config.rungs?.[progress.value.rung]
  if (rung) return t('Practice · {x}', { x: t(rung) })
  return progress.value.total ? t('Practice · {i} of {n}', { i: position.value, n: progress.value.total }) : t('Practice')
})
const speakerLabel = computed(() => (item.value ? t('Voice {n}', { n: Object.keys(SPEAKERS).indexOf(item.value.stimulus.speaker) + 1 }) : ''))
const optLabel = (o: ChoiceOption) => (o.target ? o.label : t(o.label))
const optionByKey = (key: string) => props.config.options.find((o) => o.key === key)!

async function advance() {
  verdict.value = null
  picked.value = null
  item.value = runner.next()
  progress.value = runner.progress()
  if (!item.value) { emit('complete', runner.results()); return }
  shownAt = performance.now()
  await nextTick()
  setTimeout(() => playBtn.value?.play(), 220)
}

function pick(opt: ChoiceOption) {
  if (!item.value || picked.value) return
  picked.value = opt.key
  haptic()
  const v = runner.respond(item.value, opt.key, Math.round(performance.now() - shownAt))
  verdict.value = v
  progress.value = runner.progress()
  if (v.kind === 'deferred') setTimeout(advance, DEFERRED_ADVANCE_MS)
  else if (v.correct) setTimeout(advance, CORRECT_ADVANCE_MS)
  else media.stop()
}

function stateOf(opt: ChoiceOption): string {
  const v = verdict.value
  if (!v || !picked.value) return ''
  if (v.kind === 'deferred') return opt.key === picked.value ? 'tapped' : ''
  if (opt.key === v.answer) return v.correct ? 'right' : 'answer'
  return opt.key === picked.value ? 'off' : 'dim'
}

onMounted(advance)
</script>

<template>
  <div v-if="item" class="pad">
    <div class="prog">
      <div class="prog-top">
        <span class="t-meta">{{ progressText }}</span>
        <span v-if="policy === 'instant' && progress.rungs > 1" class="rungs" :aria-label="t('Level {i} of {n}', { i: progress.rung + 1, n: progress.rungs })">
          <span v-for="r in progress.rungs" :key="r" :class="{ on: r - 1 <= progress.rung }" />
        </span>
      </div>
      <div class="bar"><div :style="{ width: progress.fraction * 100 + '%' }" /></div>
    </div>

    <div class="stim card">
      <PlayButton ref="playBtn" :clip="item.stimulus" :size="76" />
      <div class="t-meta">{{ speakerLabel }}<template v-if="item.attempt > 1"> · {{ t('again, new voice') }}</template></div>
      <Transition name="fade">
        <div v-if="textVisible" class="reveal">
          <span class="zh txt">{{ item.stimulus.text }}</span>
          <span class="py">{{ item.stimulus.pinyin }}</span>
        </div>
      </Transition>
      <button v-if="!placeholderNeedsText" class="chip" @click="showText = !showText">
        <component :is="showText ? IconEyeOff : IconEye" :size="15" />{{ showText ? t('Hide text') : t('Show text') }}
      </button>
      <span v-else class="ph t-meta">{{ t('Placeholder audio · text shown') }}</span>
    </div>

    <div class="t-head prompt">{{ t(config.prompt) }}</div>

    <Transition name="rise">
      <MissCard
        v-if="verdict?.kind === 'instant' && !verdict.correct"
        :picked="optionByKey(verdict.picked)" :answer="optionByKey(verdict.answer)"
        :picked-clip="verdict.pickedClip" :answer-clip="verdict.answerClip"
      />
    </Transition>

    <div class="opts" :class="config.layout">
      <button
        v-for="opt in config.options" :key="opt.key" class="opt" :class="stateOf(opt)"
        :aria-label="opt.sub ? `${optLabel(opt)}, ${t(opt.sub)}` : optLabel(opt)" @click="pick(opt)"
      >
        <ToneGlyph v-if="opt.glyph" :tone="Number(opt.glyph.slice(4)) as 1 | 2 | 3 | 4" />
        <span :class="opt.target ? 'hz big' : 't-head'">{{ optLabel(opt) }}</span>
        <span v-if="opt.sub" class="t-meta">{{ t(opt.sub) }}</span>
      </button>
    </div>

    <button v-if="verdict?.kind === 'instant' && !verdict.correct" class="btn pri" @click="advance">{{ t('Next') }}</button>
  </div>
</template>

<style scoped>
.pad { display: flex; flex-direction: column; gap: 14px; flex: 1; }
.prog { display: flex; flex-direction: column; gap: 6px; }
.prog-top { display: flex; justify-content: space-between; align-items: center; }
.rungs { display: flex; gap: 4px; }
.rungs span { width: 14px; height: 4px; border-radius: 2px; background: var(--surface-3); transition: background .3s ease; }
.rungs span.on { background: var(--jade); }
.bar { height: 3px; border-radius: 2px; background: var(--surface-3); overflow: hidden; }
.bar div { height: 100%; background: var(--jade); transition: width .3s ease; }
.stim { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 22px 14px 16px; }
.reveal { display: flex; flex-direction: column; align-items: center; }
.txt { font-size: 22px; }
.ph { color: var(--text-muted); }
.prompt { text-align: center; }
.opts { display: grid; gap: 10px; margin-top: auto; }
.opts.grid { grid-template-columns: 1fr 1fr; }
.opts.pair { grid-template-columns: 1fr 1fr; }
.opt {
  border: 1px solid var(--border-strong); border-radius: 16px; padding: 14px 8px 12px;
  display: flex; flex-direction: column; align-items: center; gap: 4px; color: var(--text-primary);
  transition: transform .12s ease, background .18s ease, border-color .18s ease, opacity .18s ease;
}
.opts.pair .opt { padding: 20px 8px 14px; }
.opt:active { transform: scale(.97); }
.opt svg { color: var(--text-secondary); }
.big { font-size: 34px; line-height: 1.15; }
.opt.right { background: var(--jade-soft); border: 1.5px solid var(--jade); }
.opt.right .big, .opt.right .t-head, .opt.right svg { color: var(--jade-text); }
.opt.answer { border: 1.5px solid var(--jade); }
.opt.answer .big, .opt.answer .t-head { color: var(--jade-text); }
.opt.off { opacity: .45; }
.opt.dim { opacity: .3; }
.opt.tapped { background: var(--surface-1); border-color: var(--border-stronger); }
</style>
