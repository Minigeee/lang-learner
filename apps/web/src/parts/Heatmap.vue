<script setup lang="ts">
// Study days as squares, oldest first (README Motivation row). A day without study is a plain square,
// never a mark against anything; deeper jade means a bigger day.
import type { DayCredit, DayView } from '@lang-learner/core'

defineProps<{ days: readonly DayView[] }>()
const LEVEL: Record<DayCredit, number> = { none: 1, floor: 2, standard: 3, stretch: 4 }
const level = (d: DayView) => (d.minutes > 0 ? LEVEL[d.credit] : 0)
</script>

<template>
  <div class="heat" role="img" :aria-label="`${days.filter((d) => d.minutes > 0).length} / ${days.length}`">
    <span v-for="(d, i) in days" :key="d.date" :class="[`l${level(d)}`, { today: i === days.length - 1 }]" :title="d.date" />
  </div>
</template>

<style scoped>
.heat { display: grid; grid-template-columns: repeat(10, 1fr); gap: 5px; }
.heat span { aspect-ratio: 1; border-radius: 5px; background: var(--surface-3); }
.heat .l1 { background: color-mix(in srgb, var(--jade) 35%, var(--surface-3)); }
.heat .l2 { background: color-mix(in srgb, var(--jade) 60%, var(--surface-3)); }
.heat .l3 { background: color-mix(in srgb, var(--jade) 80%, var(--surface-3)); }
.heat .l4 { background: var(--jade); }
.heat .today { outline: 1.5px solid var(--border-stronger); outline-offset: 1px; }
</style>
