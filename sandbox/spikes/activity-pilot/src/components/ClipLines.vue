<script setup lang="ts">
// A list of clips as tappable lines: hanzi with the lesson's target characters lit, a tone glyph for
// single syllables, and pinyin plus meaning (always shown, or revealed per line on tap).
import { ref } from 'vue'
import type { Clip } from '../core/types'
import ToneGlyph from './figures/ToneGlyph.vue'

const props = defineProps<{ clips: Clip[]; playing: number; highlight?: string[]; meaning: 'shown' | 'on-tap' }>()
const emit = defineEmits<{ play: [i: number] }>()
const revealed = ref(new Set<number>())

const parts = (c: Clip) => [...c.text].map((s) => ({ s, hl: (props.highlight ?? []).includes(s) }))
const tone = (c: Clip) => (c.synth.kind === 'syllable' && c.synth.tone < 5 ? (c.synth.tone as 1 | 2 | 3 | 4) : null)
function tap(i: number) {
  revealed.value = new Set(revealed.value).add(i)
  emit('play', i)
}
</script>

<template>
  <div class="lines">
    <button v-for="(c, i) in clips" :key="c.id" class="line" :class="{ on: playing === i }" @click="tap(i)">
      <ToneGlyph v-if="tone(c)" :tone="tone(c)!" :width="40" :height="24" />
      <span class="grow">
        <span class="zh txt"><span v-for="(p, j) in parts(c)" :key="j" :class="{ hl: p.hl }">{{ p.s }}</span></span>
        <span class="t-meta sub" :class="{ hidden: meaning === 'on-tap' && !revealed.has(i) }"><span class="py">{{ c.pinyin }}</span> · {{ c.gloss }}</span>
      </span>
    </button>
  </div>
</template>

<style scoped>
.lines { display: flex; flex-direction: column; gap: 4px; }
.line { display: flex; align-items: center; gap: 12px; text-align: left; border-radius: 12px; padding: 8px 10px; transition: background .2s ease; }
.line.on { background: var(--act-soft); }
.line svg { color: var(--text-secondary); flex: none; }
.txt { font-size: 19px; display: block; }
.hl { color: var(--act-text); font-weight: 600; }
.sub { display: block; transition: opacity .2s ease; }
.sub.hidden { opacity: 0; }
</style>
