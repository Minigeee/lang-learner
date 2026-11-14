<script setup lang="ts">
// C1 Recall: hear it, think of the meaning, show it, and say whether you knew it. The reveal is the
// feedback, so there is no miss card; a "not yet" comes back later in the drill.
import { computed, nextTick, onMounted, ref } from 'vue'
import { RECALL } from '@lang-learner/core'
import { useApp } from '../../app.ts'
import { t } from '../../i18n/index.ts'
import type { Drill } from '../drill.ts'
import { clipReading, clipText, haptic } from '../lessonView.ts'
import PlayButton from '../parts/PlayButton.vue'
import DrillProgressBar from './DrillProgressBar.vue'

const props = defineProps<{ drill: Drill; prompt: string }>()
const { content, language: { pack } } = useApp()
const AUTOPLAY_MS = 220

const trial = props.drill.trial
const shown = ref(false)
const playBtn = ref<InstanceType<typeof PlayButton> | null>(null)
const stimulus = computed(() => (trial.value ? content.clip(trial.value.stimulus) : null))

async function advance() {
  shown.value = false
  props.drill.advance()
  if (!trial.value) return
  await nextTick()
  setTimeout(() => void playBtn.value?.play(), AUTOPLAY_MS)
}

function grade(response: string) {
  haptic()
  props.drill.respond(response)
  void advance()
}

onMounted(advance)
</script>

<template>
  <div v-if="trial && stimulus" class="pad">
    <DrillProgressBar :progress="drill.progress.value" :ladder="true" />
    <div class="stim card">
      <PlayButton ref="playBtn" :clip="trial.stimulus" :size="76" />
      <div v-if="trial.attempt > 1" class="t-meta">{{ t('Again, in a new voice') }}</div>
      <Transition name="fade">
        <div v-if="shown" class="reveal">
          <span class="zh txt">{{ clipText(stimulus, pack) }}</span>
          <span class="py">{{ clipReading(stimulus, pack) }}</span>
          <span v-if="stimulus.en" class="en">{{ content.text(stimulus.en) }}</span>
        </div>
      </Transition>
    </div>
    <div class="t-head prompt">{{ prompt }}</div>
    <div class="end">
      <button v-if="!shown" class="btn pri" @click="shown = true">{{ t('Show the meaning') }}</button>
      <div v-else class="grades">
        <button class="btn sec" @click="grade(RECALL.missed)">{{ t('Not yet') }}</button>
        <button class="btn pri" @click="grade(RECALL.knew)">{{ t('I knew it') }}</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pad { display: flex; flex-direction: column; gap: 14px; flex: 1; }
.stim { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 22px 14px 16px; min-height: 200px; }
.reveal { display: flex; flex-direction: column; align-items: center; gap: 2px; text-align: center; }
.txt { font-size: 22px; }
.en { margin-top: 6px; }
.prompt { text-align: center; }
.end { margin-top: auto; }
.grades { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.grades .btn.sec { padding: 15px 0; }
</style>
