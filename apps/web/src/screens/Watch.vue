<script setup lang="ts">
// Watch (app-ui-flow Navigation): immersion outside the app. This week's watching, Log watching, the
// recent shows (one tap logs one again with its last values), and the history.
import { computed, ref } from 'vue'
import { IconPlus } from '@tabler/icons-vue'
import { useApp } from '../app.ts'
import { t } from '../i18n/index.ts'
import WatchSheet from '../parts/WatchSheet.vue'
import { dayLabel, hoursMinutes, recentShows, watchLogs, type WatchLog } from '../watching.ts'
import { weekOf } from '../week.ts'

const { daily, events } = useApp()
const week = computed(() => weekOf(daily.days.value, Date.now()))
const recent = computed(() => recentShows(events.value))
const history = computed(() => watchLogs(events.value).slice(0, 30))
const sheet = ref<{ show?: WatchLog } | null>(null)
const SUB: Record<WatchLog['subtitles'], { label: string; cls: string }> = {
  none: { label: 'No subs', cls: '' }, zh: { label: '中文', cls: 'jade' }, dual: { label: 'Dual', cls: 'ink' }, en: { label: 'EN', cls: 'ink' },
}
</script>

<template>
  <main class="screen tabbed">
    <header class="top">
      <span class="t-title">{{ t('Watch') }}</span>
      <span class="t-meta">{{ t('{x} this week', { x: hoursMinutes(week.split.watching) }) }}</span>
    </header>
    <button class="btn pri log" @click="sheet = {}"><IconPlus :size="18" />{{ t('Log watching') }}</button>
    <section v-if="recent.length" class="list">
      <div class="t-label">{{ t('Recent') }}</div>
      <button v-for="s in recent" :key="s.id" class="row tap" @click="sheet = { show: s }">
        <span class="ic poster">{{ s.title.slice(0, 2).toUpperCase() }}</span>
        <span class="grow">{{ s.title }}<span class="t-meta block"><template v-if="s.episode">{{ s.episode }} · </template>{{ dayLabel(s.date) }} · {{ t('{n} min', { n: s.minutes }) }}</span></span>
        <span class="tag" :class="SUB[s.subtitles].cls">{{ s.subtitles === 'zh' ? SUB.zh.label : t(SUB[s.subtitles].label) }}</span>
      </button>
    </section>
    <p v-else class="t-meta">{{ t('Shows you log appear here, so logging one again is a tap.') }}</p>
    <section v-if="history.length > recent.length" class="list">
      <div class="t-label">{{ t('History') }}</div>
      <div v-for="h in history" :key="h.id" class="row">
        <span class="grow">{{ h.title }}<template v-if="h.episode"> · {{ h.episode }}</template></span>
        <span class="t-meta">{{ dayLabel(h.date) }} · {{ t('{n} min', { n: h.minutes }) }}</span>
      </div>
    </section>
    <WatchSheet v-if="sheet" :show="sheet.show" @close="sheet = null" />
  </main>
</template>

<style scoped>
.log { display: flex; align-items: center; justify-content: center; gap: 6px; }
.poster { background: var(--ink-soft); color: var(--ink-text); font-size: 12px; font-weight: 600; }
</style>
