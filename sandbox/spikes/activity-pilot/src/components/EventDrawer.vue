<script setup lang="ts">
// Dev-only: shows the events the widgets and runner emit, to check the contract by eye.
import { IconX } from '@tabler/icons-vue'
import { eventLog } from '../core/events'

defineEmits<{ close: [] }>()
function summary(e: Record<string, unknown>): string {
  return Object.entries(e).filter(([k]) => k !== 'kind').map(([k, v]) => `${k}=${String(v)}`).join('  ')
}
</script>

<template>
  <div class="drawer">
    <div class="top">
      <span class="t-head">Events ({{ eventLog.length }})</span>
      <div class="acts">
        <button class="chip" @click="eventLog.splice(0)">Clear</button>
        <button aria-label="Close events" @click="$emit('close')"><IconX :size="20" /></button>
      </div>
    </div>
    <div class="list">
      <div v-for="e in eventLog" :key="e.id" class="ev">
        <span class="kind" :class="e.event.kind">{{ e.event.kind }}</span>
        <span class="zh sum">{{ summary(e.event as Record<string, unknown>) }}</span>
      </div>
      <div v-if="!eventLog.length" class="t-meta">No events yet.</div>
    </div>
  </div>
</template>

<style scoped>
.drawer {
  position: fixed; right: 0; top: 0; bottom: 0; width: min(420px, 100%); z-index: 20;
  background: var(--surface-2); border-left: 1px solid var(--border); padding: 16px; display: flex; flex-direction: column; gap: 10px;
  box-shadow: var(--shadow);
}
.top { display: flex; justify-content: space-between; align-items: center; }
.acts { display: flex; gap: 8px; align-items: center; }
.list { overflow: auto; display: flex; flex-direction: column; gap: 6px; font-size: 12px; }
.ev { display: flex; gap: 8px; align-items: baseline; border-bottom: 1px solid var(--border); padding-bottom: 6px; }
.kind { flex: none; font-weight: 500; padding: 1px 6px; border-radius: 5px; background: var(--surface-3); }
.kind.trial { background: var(--act-soft); color: var(--act-text); }
.kind.card_added { background: var(--jade-soft); color: var(--jade-text); }
.sum { color: var(--text-secondary); word-break: break-all; }
</style>
