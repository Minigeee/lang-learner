<script setup lang="ts">
// Small pitch-contour drawing for a tone, on the classic five-level scale.
import { computed } from 'vue'

const props = withDefaults(defineProps<{ tone: 1 | 2 | 3 | 4; width?: number; height?: number }>(), { width: 44, height: 28 })
const PATHS: Record<number, number[]> = { 1: [5, 5], 2: [3, 5], 3: [2, 1, 4], 4: [5, 1] }
const d = computed(() => {
  const pts = PATHS[props.tone]
  const w = props.width - 6, h = props.height - 6
  return pts.map((lvl, i) => `${i ? 'L' : 'M'}${3 + (w * i) / (pts.length - 1)} ${3 + h - ((lvl - 1) / 4) * h}`).join(' ')
})
</script>

<template>
  <svg :width="width" :height="height" :viewBox="`0 0 ${width} ${height}`" aria-hidden="true">
    <path :d="d" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
</template>
