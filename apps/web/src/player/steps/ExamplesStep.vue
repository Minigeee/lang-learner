<script setup lang="ts">
// Examples, the we do (brainstorm §4.1): the idea in action in several lines and voices, with the
// target lit and the meaning one tap away, or a set of new words. Nothing is scored.
import { computed, onMounted, ref } from 'vue'
import { IconRefresh, IconVolume } from '@tabler/icons-vue'
import type { ItemId, Step } from '@lang-learner/core'
import { useApp } from '../../app.ts'
import { t } from '../../i18n/index.ts'
import { usePlayback } from '../lessonView.ts'
import ClipLines from '../parts/ClipLines.vue'
import { usePlaylist } from '../parts/usePlaylist.ts'

const props = defineProps<{ step: Extract<Step, { kind: 'examples' }> }>()
const emit = defineEmits<{ next: [] }>()
const { content, language: { pack } } = useApp()
const { play } = usePlayback()
const clips = computed(() => props.step.clips)
const { playing, playAll, playOne } = usePlaylist(clips)
const playingWord = ref<ItemId | null>(null)

const words = computed(() => (props.step.words ?? []).map((id) => {
  const item = content.item(id)
  const card = content.card(id)
  return {
    id, surface: card?.word.map((w) => w.s).join('') ?? id.split(':')[2] ?? id,
    reading: pack.displayReading(item?.reading ?? ''), senses: (item?.senses ?? []).join('; '),
    audio: card ? content.clipOfMedia(card.audio.word)?.id : undefined,
  }
}))

async function playWord(w: (typeof words.value)[number]) {
  if (!w.audio) return
  playingWord.value = w.id
  await play(w.audio)
  if (playingWord.value === w.id) playingWord.value = null
}

onMounted(() => { if (clips.value.length) setTimeout(playAll, 350) })
</script>

<template>
  <div class="step">
    <template v-if="clips.length">
      <div class="t-head">{{ t('Hear it in action') }}</div>
      <div class="t-meta">{{ t('Different voices, same idea. Tap a line to hear it again and see what it means.') }}</div>
      <ClipLines :clips="clips" :playing="playing" :highlight="step.highlight ?? []" @play="playOne" />
      <div class="ctrls">
        <button class="chip" :disabled="playing >= 0" @click="playAll"><IconRefresh :size="16" />{{ t('Play all') }}</button>
      </div>
    </template>
    <template v-if="words.length">
      <div class="t-head">{{ t('More words for this') }}</div>
      <div class="list">
        <button v-for="w in words" :key="w.id" class="row word" :class="{ on: playingWord === w.id }" @click="playWord(w)">
          <span class="hz big">{{ w.surface }}</span>
          <span class="grow"><span class="py block">{{ w.reading }}</span><span class="t-meta">{{ w.senses }}</span></span>
          <IconVolume v-if="w.audio" :size="18" class="muted" />
        </button>
      </div>
    </template>
    <button class="btn pri end" @click="emit('next')">{{ t('Continue') }}</button>
  </div>
</template>

<style scoped>
.step { display: flex; flex-direction: column; gap: 12px; flex: 1; }
.ctrls { display: flex; justify-content: center; }
.list { display: flex; flex-direction: column; }
.word { width: 100%; text-align: left; border-radius: 12px; padding: 10px; }
.word.on { background: var(--act-soft); }
.big { font-size: 26px; min-width: 2.4em; }
.end { margin-top: auto; }
</style>
