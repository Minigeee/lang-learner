<script setup lang="ts">
// How far a drill has come: the climb on a ladder, or items done in a checkpoint.
import type { DrillProgress } from '@lang-learner/core'
import { t } from '../../i18n/index.ts'

defineProps<{ progress: DrillProgress; ladder: boolean }>()
</script>

<template>
  <div class="prog">
    <div class="top">
      <span class="t-meta">{{ progress.total ? t('{i} of {n}', { i: Math.min(progress.done + 1, progress.total), n: progress.total }) : t('Practice') }}</span>
      <span v-if="ladder && progress.rungs > 1" class="rungs" :aria-label="t('Level {i} of {n}', { i: progress.rung + 1, n: progress.rungs })">
        <span v-for="r in progress.rungs" :key="r" :class="{ on: r - 1 <= progress.rung }" />
      </span>
    </div>
    <div class="bar"><div :style="{ width: progress.fraction * 100 + '%' }" /></div>
  </div>
</template>

<style scoped>
.prog { display: flex; flex-direction: column; gap: 6px; }
.top { display: flex; justify-content: space-between; align-items: center; }
.rungs { display: flex; gap: 4px; }
.rungs span { width: 14px; height: 4px; border-radius: 2px; background: var(--surface-3); transition: background .3s ease; }
.rungs span.on { background: var(--jade); }
.bar { height: 3px; border-radius: 2px; background: var(--surface-3); overflow: hidden; }
.bar div { height: 100%; background: var(--jade); transition: width .3s ease; }
</style>
