<script setup lang="ts">
// The player's top bar: close, the lesson title and where you are, a note button, and the step strip.
import { IconNote, IconX } from '@tabler/icons-vue'
import { t } from '../../i18n/index.ts'

defineProps<{ title: string; meta: string; steps: number; current: number }>()
defineEmits<{ close: []; note: [] }>()
</script>

<template>
  <header class="head">
    <div class="bar">
      <button class="x" :aria-label="t('Close lesson')" @click="$emit('close')"><IconX :size="22" :stroke-width="1.75" /></button>
      <div class="mid">
        <div class="t-head title">{{ title }}</div>
        <div class="t-meta">{{ meta }}</div>
      </div>
      <button class="x" :aria-label="t('Add a note')" @click="$emit('note')"><IconNote :size="20" :stroke-width="1.75" /></button>
    </div>
    <div v-if="steps" class="steps" role="progressbar" :aria-valuenow="current + 1" :aria-valuemax="steps">
      <div v-for="i in steps" :key="i" :class="{ d: i - 1 < current, c: i - 1 === current }" />
    </div>
  </header>
</template>

<style scoped>
.head { display: flex; flex-direction: column; gap: 12px; }
.bar { display: grid; grid-template-columns: 32px 1fr 32px; align-items: center; text-align: center; }
.x { width: 32px; height: 32px; display: grid; place-items: center; color: var(--text-secondary); }
.title { font-size: 15px; }
.steps { display: flex; gap: 5px; }
.steps div { flex: 1; height: 4px; border-radius: 2px; background: var(--surface-3); transition: background .3s ease; }
.steps .d { background: var(--jade); }
.steps .c { background: var(--act); }
</style>
