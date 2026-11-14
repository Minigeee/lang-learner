<script setup lang="ts">
// Opener (brainstorm §4.2): real input first, as a story, a puzzle, a side-by-side comparison or a set
// of lines to find the pattern in, with one unscored question to listen for.
import { computed, onMounted, ref } from 'vue'
import { IconPlayerPlay, IconRefresh, IconVolume } from '@tabler/icons-vue'
import type { Step } from '@lang-learner/core'
import { useApp } from '../../app.ts'
import { t } from '../../i18n/index.ts'
import VideoBlock from '../parts/VideoBlock.vue'
import { usePlaylist } from '../parts/usePlaylist.ts'

const props = defineProps<{ step: Extract<Step, { kind: 'opener' }> }>()
const emit = defineEmits<{ next: [] }>()
const { content } = useApp()
const clips = computed(() => props.step.clips)
const { playing, heardAll, playAll, playOne } = usePlaylist(clips)
const choice = ref<number | null>(null)
onMounted(() => { if (clips.value.length) setTimeout(playAll, 350) })
</script>

<template>
  <div class="step">
    <div v-if="step.type === 'showdown' && clips.length === 2" class="duel">
      <button v-for="(c, i) in clips" :key="c" class="side card" :class="{ on: playing === i }" @click="playOne(i)">
        <span class="t-label">{{ i === 0 ? t('First') : t('Second') }}</span>
        <IconVolume :size="30" :stroke-width="1.75" />
      </button>
    </div>
    <div v-else-if="clips.length" class="card stage">
      <div class="dots"><span v-for="(c, i) in clips" :key="c + i" :class="{ on: i === playing }" @click="playOne(i)" /></div>
      <div class="t-meta">{{ playing >= 0 ? t('Playing {i} of {n}', { i: playing + 1, n: clips.length }) : clips.length > 1 ? t('{n} recordings', { n: clips.length }) : t('One recording') }}</div>
    </div>
    <div v-if="clips.length" class="ctrls">
      <button class="chip" :disabled="playing >= 0" @click="playAll">
        <component :is="heardAll ? IconRefresh : IconPlayerPlay" :size="16" />{{ heardAll ? t('Play again') : t('Play') }}
      </button>
    </div>

    <VideoBlock v-if="step.video" :video="step.video" :alone="clips.length === 0" />

    <template v-if="step.hook">
      <div class="t-head">{{ content.text(step.hook.prompt) }}</div>
      <div>
        <button v-for="(o, i) in step.hook.options" :key="o" class="row opt" :class="{ sel: choice === i }" @click="choice = i">{{ content.text(o) }}</button>
      </div>
      <div class="t-meta center">{{ t('Listen for it. Nothing here is scored.') }}</div>
    </template>
    <button class="btn pri end" @click="emit('next')">{{ t('Continue') }}</button>
  </div>
</template>

<style scoped>
.step { display: flex; flex-direction: column; gap: 14px; flex: 1; }
.stage { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 30px 0; background: var(--player); }
.dots { display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; padding: 0 12px; }
.dots span { width: 12px; height: 12px; border-radius: 50%; background: #3a3631; transition: background .2s, transform .2s; cursor: pointer; }
.dots span.on { background: var(--act); transform: scale(1.3); }
.duel { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.side {
  display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 18px 8px 22px; background: var(--player);
  color: var(--text-secondary); border: 1.5px solid transparent; transition: border-color .2s, color .2s;
}
.side.on { border-color: var(--act); color: var(--act-text); }
.ctrls { display: flex; justify-content: center; }
.opt { width: 100%; text-align: left; padding: 13px 4px; }
.opt.sel { color: var(--act-text); }
.center { text-align: center; }
.end { margin-top: auto; }
</style>
