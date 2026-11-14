<script setup lang="ts">
// The four bottom tabs (app-ui-flow Navigation). The current tab is cinnabar.
import { IconChartBar, IconDeviceTv, IconRoute, IconSun } from '@tabler/icons-vue'
import { useApp } from '../app.ts'
import { t } from '../i18n/index.ts'
import { useRouter, type Tab } from '../router.ts'

defineProps<{ tab: Tab }>()
const { content } = useApp()
const router = useRouter(content.manifest.lang)
const TAB_INFO = [
  { tab: 'today', label: 'Today', icon: IconSun },
  { tab: 'path', label: 'Path', icon: IconRoute },
  { tab: 'progress', label: 'Progress', icon: IconChartBar },
  { tab: 'watch', label: 'Watch', icon: IconDeviceTv },
] as const
</script>

<template>
  <nav class="tabs">
    <button v-for="x in TAB_INFO" :key="x.tab" :class="{ on: x.tab === tab }" :aria-current="x.tab === tab ? 'page' : undefined" @click="router.go({ name: x.tab })">
      <component :is="x.icon" :size="22" :stroke-width="1.6" />
      <span>{{ t(x.label) }}</span>
    </button>
  </nav>
</template>

<style scoped>
.tabs {
  position: fixed; left: 50%; bottom: 0; transform: translateX(-50%); width: min(100%, 440px); z-index: 4;
  display: grid; grid-template-columns: repeat(4, 1fr); background: var(--surface-2); border-top: 1px solid var(--border);
  padding: 6px 0 calc(6px + env(safe-area-inset-bottom));
}
.tabs button { display: flex; flex-direction: column; align-items: center; gap: 2px; font-size: 11px; color: var(--text-muted); padding: 4px 0; }
.tabs button.on { color: var(--act-text); }
</style>
