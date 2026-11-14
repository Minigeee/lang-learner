<script setup lang="ts">
// The tone-contours figure: the four tones' pitch shapes side by side.
import ToneGlyph from './ToneGlyph.vue'

// The app passes every figure `t` and the lesson `step`; this one needs only `t`.
defineProps<{ t: (en: string, vars?: Record<string, string | number>) => string; step?: unknown }>()
</script>

<template>
  <div class="tones">
    <div v-for="tone in [1, 2, 3, 4] as const" :key="tone" class="tone">
      <ToneGlyph :tone="tone" :width="56" :height="34" />
      <span class="t-meta">{{ t('Tone {n}', { n: tone }) }}</span>
    </div>
  </div>
</template>

<style scoped>
.tones { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.tone {
  background: var(--surface-1); border-radius: 14px; padding: 12px 0 8px;
  display: flex; flex-direction: column; align-items: center; gap: 4px; color: var(--text-primary);
}
</style>
