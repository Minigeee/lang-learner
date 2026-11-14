<script setup lang="ts">
// A tone's pitch contour on the five-level scale.
import { computed } from 'vue'

const props = withDefaults(defineProps<{ tone: 1 | 2 | 3 | 4; width?: number; height?: number }>(), { width: 44, height: 28 })
// The 3rd is drawn low, as it's said in running speech; the rise at the end is optional (lesson 0.1c).
const LEVELS: Record<number, number[]> = { 1: [5, 5], 2: [3, 5], 3: [2, 1, 1], 4: [5, 1] }
const d = computed(() => {
  const pts = LEVELS[props.tone]!
  const w = props.width - 6
  const h = props.height - 6
  return pts.map((lvl, i) => `${i ? 'L' : 'M'}${3 + (w * i) / (pts.length - 1)} ${3 + h - ((lvl - 1) / 4) * h}`).join(' ')
})
</script>

<template>
  <svg :width="width" :height="height" :viewBox="`0 0 ${width} ${height}`" aria-hidden="true">
    <path :d="d" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
</template>
