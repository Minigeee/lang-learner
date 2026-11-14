<script setup lang="ts">
// A word's gloss in a bottom sheet: the word, its reading and senses, and its audio when it has a card.
import { computed } from 'vue'
import { IconVolume, IconX } from '@tabler/icons-vue'
import type { ItemId } from '@lang-learner/core'
import { useApp } from '../../app.ts'
import { t } from '../../i18n/index.ts'
import { usePlayback } from '../lessonView.ts'

const props = defineProps<{ word: ItemId; surface: string }>()
defineEmits<{ close: [] }>()
const { content, language: { pack } } = useApp()
const { play } = usePlayback()
const item = computed(() => content.item(props.word))
const senses = computed(() => item.value?.senses ?? [])
const reading = computed(() => pack.displayReading(item.value?.reading ?? ''))
const audio = computed(() => {
  const card = content.card(props.word)
  return card ? content.clipOfMedia(card.audio.word)?.id : undefined
})
</script>

<template>
  <Transition name="fade" appear><div class="scrim" @click="$emit('close')" /></Transition>
  <Transition name="rise" appear>
    <div class="sheet" role="dialog">
      <div class="top">
        <div><span class="hz word">{{ surface }}</span> <span class="py">{{ reading }}</span></div>
        <button :aria-label="t('Close')" @click="$emit('close')"><IconX :size="20" /></button>
      </div>
      <div>{{ senses.join('; ') }}</div>
      <button v-if="audio" class="chip" @click="play(audio)"><IconVolume :size="15" />{{ t('Play') }}</button>
    </div>
  </Transition>
</template>

<style scoped>
.top { display: flex; justify-content: space-between; align-items: center; }
.word { font-size: 30px; }
.chip { align-self: flex-start; }
</style>
