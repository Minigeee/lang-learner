<script setup lang="ts">
// Read along, the we do of a video lesson (brainstorm X4): the story line by line, with its reading,
// the meaning on request, and every word tappable for its gloss.
import { computed, onMounted, ref, watch } from 'vue'
import { IconLanguage, IconPlayerSkipBack, IconPlayerSkipForward, IconRepeat } from '@tabler/icons-vue'
import type { ItemId, Step } from '@lang-learner/core'
import { useApp } from '../../app.ts'
import { t } from '../../i18n/index.ts'
import { haptic, tokenReading, usePlayback } from '../lessonView.ts'
import WordSheet from '../parts/WordSheet.vue'

const props = defineProps<{ step: Extract<Step, { kind: 'read-along' }> }>()
const emit = defineEmits<{ next: [] }>()
const { content, language: { pack } } = useApp()
const { play } = usePlayback()
const lines = computed(() => props.step.clips.map((id) => content.clip(id)))
const idx = ref(0)
const showMeaning = ref(false)
const gloss = ref<{ word: ItemId; surface: string } | null>(null)
const current = computed(() => lines.value[idx.value]!)

const playLine = () => play(current.value.id)
function go(delta: number) {
  const next = idx.value + delta
  if (next < 0 || next >= lines.value.length) return
  idx.value = next
  showMeaning.value = false
}
watch(idx, () => void playLine())
onMounted(() => setTimeout(() => void playLine(), 350))

function openGloss(word: ItemId, surface: string) {
  haptic(6)
  gloss.value = { word, surface }
}
</script>

<template>
  <div class="study">
    <div class="t-meta">{{ t('Line {i} of {n} · tap a word for its meaning', { i: idx + 1, n: lines.length }) }}</div>
    <div class="lines">
      <div v-for="(l, i) in lines" :key="l.id" class="line" :class="{ cur: i === idx, dim: i < idx, hidden: i > idx }" @click="i < idx && (idx = i)">
        <div class="zh txt">
          <template v-for="(tok, j) in l.tokens" :key="j">
            <button v-if="i === idx && tok.id" class="tok" @click.stop="openGloss(tok.id, tok.s)">{{ tok.s }}</button>
            <span v-else>{{ tok.s }}</span>
          </template>
        </div>
        <div v-if="i === idx" class="py">{{ l.tokens.filter((tok) => tok.r).map((tok) => tokenReading(tok, pack)).join(' ') }}</div>
        <Transition name="fade"><div v-if="i === idx && showMeaning && l.en" class="t-meta">{{ content.text(l.en) }}</div></Transition>
      </div>
    </div>
    <div class="ctrls">
      <button class="chip" :disabled="idx === 0" :aria-label="t('Previous line')" @click="go(-1)"><IconPlayerSkipBack :size="16" /></button>
      <button class="chip" @click="playLine()"><IconRepeat :size="16" />{{ t('Replay line') }}</button>
      <button class="chip" :class="{ on: showMeaning }" @click="showMeaning = !showMeaning"><IconLanguage :size="16" />{{ t('Meaning') }}</button>
      <button class="chip" :disabled="idx === lines.length - 1" :aria-label="t('Next line')" @click="go(1)"><IconPlayerSkipForward :size="16" /></button>
    </div>
    <button v-if="idx < lines.length - 1" class="btn sec" @click="go(1)">{{ t('Next line') }}</button>
    <button class="btn pri" :class="{ quiet: idx < lines.length - 1 }" @click="emit('next')">{{ t('Continue') }}</button>
    <WordSheet v-if="gloss" :word="gloss.word" :surface="gloss.surface" @close="gloss = null" />
  </div>
</template>

<style scoped>
.study { display: flex; flex-direction: column; gap: 12px; flex: 1; }
.lines { display: flex; flex-direction: column; gap: 4px; }
.line { border-radius: 12px; padding: 8px 10px; transition: background .2s ease, opacity .2s ease; }
.line.cur { background: var(--act-soft); }
.line.dim { opacity: .45; cursor: pointer; }
.line.hidden { display: none; }
.txt { font-size: 19px; }
.tok { border-bottom: 2px dotted var(--act-border); margin: 0 2px; padding: 0 1px; border-radius: 4px; }
.tok:first-child { margin-left: 0; }
.ctrls { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; margin-top: auto; }
.btn.quiet { background: none; color: var(--text-secondary); font-weight: 400; padding: 8px 0; }
</style>
