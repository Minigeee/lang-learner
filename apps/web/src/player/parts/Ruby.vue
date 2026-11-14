<script setup lang="ts">
// Target text with its reading set above it, piece by piece as the language pack splits it (zh: one
// syllable over each character). Tokens in `bold`, a half-open range, are set in bold.
import { computed } from 'vue'
import type { Token } from '@lang-learner/core'
import { useApp } from '../../app.ts'

const props = defineProps<{ tokens: Token[]; bold?: [number, number] }>()
const { language: { pack } } = useApp()
const pieces = computed(() => props.tokens.map((token, i) => ({
  segments: pack.rubySegments(token),
  bold: props.bold ? i >= props.bold[0] && i < props.bold[1] : false,
})))
</script>

<template>
  <span class="ruby">
    <span v-for="(p, i) in pieces" :key="i" :class="{ b: p.bold }">
      <ruby v-for="(seg, j) in p.segments" :key="j">{{ seg.s }}<rt>{{ seg.r }}</rt></ruby>
    </span>
  </span>
</template>

<style scoped>
.ruby { line-height: 2.1; }
ruby { ruby-position: over; }
rt { font-family: Lexend, system-ui, sans-serif; font-size: .42em; color: var(--text-secondary); font-weight: 400; letter-spacing: 0; }
.b { font-weight: 700; }
</style>
