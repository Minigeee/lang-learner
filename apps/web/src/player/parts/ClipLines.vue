<script setup lang="ts">
// Clips as tappable lines: the text with the lesson's target lit, and its reading and meaning shown
// once the line is tapped. Tapping a line plays it.
import { computed, ref } from 'vue'
import type { ClipId } from '@lang-learner/core'
import { useApp } from '../../app.ts'
import { clipReading, clipText } from '../lessonView.ts'

const props = defineProps<{ clips: ClipId[]; playing: number; highlight?: string[] }>()
const emit = defineEmits<{ play: [i: number] }>()
const { content, language: { pack } } = useApp()
const revealed = ref(new Set<number>())

const lines = computed(() => props.clips.map((id) => {
  const clip = content.clip(id)
  const text = clipText(clip, pack)
  const lit = props.highlight ?? []
  return { id, text, parts: [...text].map((s) => ({ s, hl: lit.includes(s) })), reading: clipReading(clip, pack), en: clip.en && content.text(clip.en) }
}))

function tap(i: number) {
  revealed.value = new Set(revealed.value).add(i)
  emit('play', i)
}
</script>

<template>
  <div class="lines">
    <button v-for="(l, i) in lines" :key="l.id + i" class="line" :class="{ on: playing === i }" @click="tap(i)">
      <span class="zh txt"><span v-for="(p, j) in l.parts" :key="j" :class="{ hl: p.hl }">{{ p.s }}</span></span>
      <span v-if="l.reading || l.en" class="t-meta sub" :class="{ hidden: !revealed.has(i) }">
        <span v-if="l.reading" class="py">{{ l.reading }}</span><template v-if="l.reading && l.en"> · </template>{{ l.en }}
      </span>
    </button>
  </div>
</template>

<style scoped>
.lines { display: flex; flex-direction: column; gap: 4px; }
.line { display: flex; flex-direction: column; text-align: left; border-radius: 12px; padding: 8px 10px; transition: background .2s ease; }
.line.on { background: var(--act-soft); }
.txt { font-size: 19px; }
.hl { color: var(--act-text); font-weight: 600; }
.sub { transition: opacity .2s ease; }
.sub.hidden { opacity: 0; }
</style>
