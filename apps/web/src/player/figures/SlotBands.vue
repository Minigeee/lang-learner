<script setup lang="ts">
// The slot-bands figure (brainstorm X11): a line laid out word by word, each word over its gloss, so
// the order of the slots shows. It draws the lesson step's ✓ line, so it needs no figure data of its own.
import { computed } from 'vue'
import { useApp } from '../../app.ts'
import { tokenReading } from '../lessonView.ts'
import type { FigureProps } from './index.ts'

const props = defineProps<FigureProps>()
const { content, language: { pack } } = useApp()
const bands = computed(() => {
  if (!props.step.right) return []
  return content.clip(props.step.right).tokens.filter((tok) => tok.r).map((tok) => ({
    s: tok.s, reading: tokenReading(tok, pack), gloss: (tok.id && content.item(tok.id)?.senses?.[0]) ?? '',
  }))
})
</script>

<template>
  <div v-if="bands.length" class="bands">
    <div v-for="(b, i) in bands" :key="i" class="band">
      <span class="py">{{ b.reading }}</span>
      <span class="hz word">{{ b.s }}</span>
      <span class="t-meta gloss">{{ b.gloss }}</span>
    </div>
  </div>
</template>

<style scoped>
.bands { display: flex; gap: 6px; }
.band {
  flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 10px 4px;
  background: var(--surface-1); border-radius: 14px; border-top: 3px solid var(--surface-3);
}
.word { font-size: 26px; line-height: 1.2; }
.gloss { text-align: center; }
</style>
