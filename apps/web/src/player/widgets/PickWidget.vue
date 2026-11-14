<script setup lang="ts">
// C0 Pick: hear it, tap one of 2–4 buttons. The drill owns order, scoring and retries; this view
// renders the trial on screen and reports the tap.
import { computed, nextTick, onMounted, ref, shallowRef } from 'vue'
import { IconEye, IconEyeOff } from '@tabler/icons-vue'
import type { PracticeOption } from '@lang-learner/core'
import { useApp } from '../../app.ts'
import { t } from '../../i18n/index.ts'
import type { Drill, Verdict } from '../drill.ts'
import { clipReading, clipText, haptic } from '../lessonView.ts'
import MissCard from '../parts/MissCard.vue'
import PlayButton from '../parts/PlayButton.vue'
import DrillProgressBar from './DrillProgressBar.vue'

const props = defineProps<{ drill: Drill; prompt: string }>()
const { content, clips, language: { pack } } = useApp()

/** Pause after a right answer before the next item, long enough to register the green. */
const CORRECT_ADVANCE_MS = 650
/** In a checkpoint there's no verdict, only a brief acknowledgement of the tap. */
const DEFERRED_ADVANCE_MS = 260
/** Delay before an item plays itself. */
const AUTOPLAY_MS = 220

const trial = props.drill.trial
const verdict = shallowRef<(Verdict & { picked: string }) | null>(null)
const showText = ref(false)
const playBtn = ref<InstanceType<typeof PlayButton> | null>(null)

/** Display hanzi take the serif; target text in Latin letters, such as pinyin, keeps the sans. */
const HAN = /\p{Script=Han}/u
const label = (o: PracticeOption) => (o.target ? o.label : content.text(o.label))
const stimulus = computed(() => (trial.value ? content.clip(trial.value.stimulus) : null))
const answer = computed(() => trial.value?.options.find((o) => o.key === trial.value?.answer))
const layout = computed(() => ((trial.value?.options.length ?? 0) <= 2 ? 'pair' : 'grid'))

async function advance() {
  verdict.value = null
  props.drill.advance()
  if (!trial.value) return
  await nextTick()
  setTimeout(() => void playBtn.value?.play(), AUTOPLAY_MS)
}

function pick(o: PracticeOption) {
  if (!trial.value || verdict.value) return
  haptic()
  const v = props.drill.respond(o.key)
  verdict.value = { ...v, picked: o.key }
  if (props.drill.feedback === 'deferred') setTimeout(advance, DEFERRED_ADVANCE_MS)
  else if (v.correct) setTimeout(advance, CORRECT_ADVANCE_MS)
  else clips.stop()
}

function stateOf(o: PracticeOption): string {
  const v = verdict.value
  if (!v) return ''
  if (props.drill.feedback === 'deferred') return o.key === v.picked ? 'tapped' : ''
  if (o.key === trial.value?.answer) return v.correct ? 'right' : 'answer'
  return o.key === v.picked ? 'off' : 'dim'
}

onMounted(advance)
</script>

<template>
  <div v-if="trial && stimulus" class="pad">
    <DrillProgressBar :progress="drill.progress.value" :ladder="drill.feedback === 'instant'" />

    <div class="stim card">
      <PlayButton ref="playBtn" :clip="trial.stimulus" :size="76" />
      <div v-if="trial.attempt > 1" class="t-meta">{{ t('Again, in a new voice') }}</div>
      <Transition name="fade">
        <div v-if="showText" class="reveal">
          <span class="zh txt">{{ clipText(stimulus, pack) }}</span>
          <span class="py">{{ clipReading(stimulus, pack) }}</span>
        </div>
      </Transition>
      <button class="chip" @click="showText = !showText">
        <component :is="showText ? IconEyeOff : IconEye" :size="15" />{{ showText ? t('Hide text') : t('Show text') }}
      </button>
    </div>

    <div class="t-head prompt">{{ prompt }}</div>

    <Transition name="rise">
      <MissCard
        v-if="verdict && drill.feedback === 'instant' && !verdict.correct && answer" :key="trial.key + trial.attempt"
        :answer="label(answer)" :answer-is-target="!!answer.target" :stimulus="trial.stimulus" :retry="verdict.retry"
      />
    </Transition>

    <div class="opts" :class="layout">
      <button v-for="o in trial.options" :key="o.key" class="opt" :class="stateOf(o)" @click="pick(o)">
        <span :class="o.target ? (HAN.test(o.label) ? 'hz big' : 'zh big') : 't-head'">{{ label(o) }}</span>
      </button>
    </div>

    <button v-if="verdict && drill.feedback === 'instant' && !verdict.correct" class="btn pri" @click="advance">{{ t('Next') }}</button>
  </div>
</template>

<style scoped>
.pad { display: flex; flex-direction: column; gap: 14px; flex: 1; }
.stim { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 22px 14px 16px; }
.reveal { display: flex; flex-direction: column; align-items: center; }
.txt { font-size: 22px; }
.prompt { text-align: center; }
.opts { display: grid; gap: 10px; margin-top: auto; grid-template-columns: 1fr 1fr; }
.opt {
  border: 1px solid var(--border-strong); border-radius: 16px; padding: 16px 8px 14px;
  display: flex; flex-direction: column; align-items: center; gap: 4px; color: var(--text-primary);
  transition: transform .12s ease, background .18s ease, border-color .18s ease, opacity .18s ease;
}
.opts.pair .opt { padding: 22px 8px 18px; }
.opt:active { transform: scale(.97); }
.big { font-size: 30px; line-height: 1.15; }
.opt.right { background: var(--jade-soft); border: 1.5px solid var(--jade); }
.opt.right .big, .opt.right .t-head { color: var(--jade-text); }
.opt.answer { border: 1.5px solid var(--jade); }
.opt.answer .big, .opt.answer .t-head { color: var(--jade-text); }
.opt.off { opacity: .45; }
.opt.dim { opacity: .3; }
.opt.tapped { background: var(--surface-1); border-color: var(--border-stronger); }
</style>
