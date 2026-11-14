<script setup lang="ts">
// Today's three rings (README Motivation row): Floor outside, then Standard, then Stretch. A ring
// fills with the day's minutes and turns jade once reached. Only a reached ring is named.
import { computed } from 'vue'
import { CREDIT_V1 } from '@lang-learner/core'

const props = withDefaults(defineProps<{ minutes: number; size?: number }>(), { size: 76 })
const R = [42, 31, 20]
const rings = computed(() => [CREDIT_V1.floor, CREDIT_V1.standard, CREDIT_V1.stretch].map((need, i) => {
  const c = 2 * Math.PI * R[i]!
  const share = Math.min(1, props.minutes / need)
  return { r: R[i]!, c, dash: `${share * c} ${c}`, reached: share >= 1 }
}))
</script>

<template>
  <svg :width="size" :height="size" viewBox="0 0 100 100" role="img" :aria-label="`${Math.floor(minutes)} min`">
    <g v-for="ring in rings" :key="ring.r" transform="rotate(-90 50 50)">
      <circle cx="50" cy="50" :r="ring.r" class="track" />
      <circle v-if="minutes > 0" cx="50" cy="50" :r="ring.r" class="fill" :class="{ reached: ring.reached }" :stroke-dasharray="ring.dash" />
    </g>
  </svg>
</template>

<style scoped>
circle { fill: none; stroke-width: 8; stroke-linecap: round; }
.track { stroke: var(--surface-3); }
.fill { stroke: var(--act); transition: stroke-dasharray .4s ease; }
.fill.reached { stroke: var(--jade); }
</style>
