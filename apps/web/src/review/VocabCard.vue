<script setup lang="ts">
// A word's card (README Vocab card format). Front: the word in characters only. Back: the word with
// its reading over each character, its senses, the example sentence with the word in bold and its
// translation, and the word and sentence audio in the card's one voice. An image shows once the card
// has one; a `pending` image shows nothing.
import { computed, onMounted, watch } from 'vue'
import { IconVolume } from '@tabler/icons-vue'
import type { VocabCard } from '@lang-learner/core'
import { useApp } from '../app.ts'
import { t } from '../i18n/index.ts'
import { usePlayback } from '../player/lessonView.ts'
import Ruby from '../player/parts/Ruby.vue'

const props = defineProps<{ card: VocabCard; revealed: boolean }>()
const { content, clips } = useApp()
const { play } = usePlayback()
const surface = computed(() => props.card.word.map((w) => w.s).join(''))
const wordClip = computed(() => content.clipOfMedia(props.card.audio.word)?.id)
const sentenceClip = computed(() => content.clipOfMedia(props.card.audio.sentence)?.id)
const sentence = computed(() => props.card.sentence.tokens.map((tok, i) => ({
  s: tok.s, bold: i >= props.card.sentence.target[0] && i < props.card.sentence.target[1],
})))

function hear(clip: typeof wordClip.value) {
  if (clip) void play(clip)
}

// The back plays the word as it opens.
watch(() => props.revealed, (on) => { if (on) hear(wordClip.value) })
onMounted(() => { if (props.revealed) hear(wordClip.value) })
</script>

<template>
  <div class="vcard card">
    <div v-if="!revealed" class="front hz">{{ surface }}</div>
    <template v-else>
      <div class="word hz"><Ruby :tokens="card.word" /></div>
      <div class="senses">{{ card.senses.join('; ') }}</div>
      <div class="sentence">
        <div class="zh line"><span v-for="(p, i) in sentence" :key="i" :class="{ b: p.bold }">{{ p.s }}</span></div>
        <div class="t-meta">{{ content.text(card.sentence.translation) }}</div>
      </div>
      <div class="audio">
        <button v-if="wordClip" class="chip" :class="{ on: clips.playing.value === wordClip }" @click="hear(wordClip)"><IconVolume :size="15" />{{ t('Word') }}</button>
        <button v-if="sentenceClip" class="chip" :class="{ on: clips.playing.value === sentenceClip }" @click="hear(sentenceClip)"><IconVolume :size="15" />{{ t('Sentence') }}</button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.vcard { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 28px 16px 20px; text-align: center; min-height: 240px; justify-content: center; }
.front { font-size: 56px; line-height: 1.2; }
.word { font-size: 44px; line-height: 1.1; }
.senses { font-size: 16px; font-weight: 500; }
.sentence { display: flex; flex-direction: column; gap: 4px; padding-top: 6px; }
.line { font-size: 18px; }
.b { font-weight: 700; }
.audio { display: flex; gap: 8px; padding-top: 4px; }
</style>
