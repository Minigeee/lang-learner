<script setup lang="ts">
// A lesson body string with its inline target text (content.ts Step): `:ex[…]` plays its clip,
// `:w[…]` opens the word's gloss, `:m[…]` is a mention, and `:k{#id}` names an item.
import { computed, ref } from 'vue'
import { IconVolume } from '@tabler/icons-vue'
import type { ClipId, ItemId } from '@lang-learner/core'
import { useApp } from '../../app.ts'
import { usePlayback } from '../lessonView.ts'
import WordSheet from './WordSheet.vue'

const props = defineProps<{ text: string; refs?: Record<string, ClipId | ItemId> }>()
const { content } = useApp()
const { play } = usePlayback()
const open = ref<{ word: ItemId; surface: string } | null>(null)

type Part = { kind: 'text' | 'm'; text: string } | { kind: 'ex'; text: string; clip?: ClipId } | { kind: 'w'; text: string; word?: ItemId } | { kind: 'k'; text: string }

const parts = computed<Part[]>(() => {
  const out: Part[] = []
  let at = 0
  for (const m of props.text.matchAll(/:(ex|w|m)\[([^\]]*)\]|:k\{#([^}]+)\}/g)) {
    if (m.index > at) out.push({ kind: 'text', text: props.text.slice(at, m.index) })
    const [, kind, text = '', id] = m
    const target = props.refs?.[text]
    if (id) {
      const item = content.item(id as ItemId)
      out.push({ kind: 'k', text: item?.name ? content.text(item.name) : (id.split(':')[2] ?? id) })
    } else if (kind === 'ex') out.push({ kind: 'ex', text, ...(target ? { clip: target as ClipId } : {}) })
    else if (kind === 'w') out.push({ kind: 'w', text, ...(target ? { word: target as ItemId } : {}) })
    else out.push({ kind: 'm', text })
    at = m.index + m[0].length
  }
  if (at < props.text.length) out.push({ kind: 'text', text: props.text.slice(at) })
  return out
})
</script>

<template>
  <span>
    <template v-for="(p, i) in parts" :key="i">
      <button v-if="p.kind === 'ex' && p.clip" class="ex zh" @click="play(p.clip)">{{ p.text }}<IconVolume :size="14" /></button>
      <button v-else-if="p.kind === 'w' && p.word" class="w zh" @click="open = { word: p.word, surface: p.text }">{{ p.text }}</button>
      <span v-else-if="p.kind === 'k'" class="k">{{ p.text }}</span>
      <span v-else-if="p.kind !== 'text'" class="zh">{{ p.text }}</span>
      <template v-else>{{ p.text }}</template>
    </template>
    <WordSheet v-if="open" :word="open.word" :surface="open.surface" @close="open = null" />
  </span>
</template>

<style scoped>
.ex {
  display: inline-flex; align-items: center; gap: 3px; padding: 0 6px; margin: 0 1px; border-radius: 8px;
  background: var(--act-soft); color: var(--act-text);
}
.w { border-bottom: 2px dotted var(--act-border); padding: 0 1px; }
.k { font-weight: 500; }
</style>
