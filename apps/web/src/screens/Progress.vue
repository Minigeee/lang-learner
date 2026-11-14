<script setup lang="ts">
// Progress (app-ui-flow): four answers. This week's time split into lessons, cards and watching; days
// studied in the last 30 with a heatmap; what you know, by layer; and listening hours. Every number
// only rises, and none is set against a target (README Motivation row).
import { computed } from 'vue'
import { IconChevronRight } from '@tabler/icons-vue'
import { CONSISTENCY_V1, inputHours, type Bucket } from '@lang-learner/core'
import { useApp } from '../app.ts'
import { t } from '../i18n/index.ts'
import { LAYER_LABEL, LAYERS, layerOf } from '../items.ts'
import Heatmap from '../parts/Heatmap.vue'
import { useRouter } from '../router.ts'
import { hoursMinutes } from '../watching.ts'
import { weekOf } from '../week.ts'

const { content, daily, progress, events } = useApp()
const router = useRouter(content.manifest.lang)
const week = computed(() => weekOf(daily.days.value, Date.now()))
const recent = computed(() => daily.days.value.recent(Date.now(), CONSISTENCY_V1.windowDays))
const studied = computed(() => recent.value.filter((d) => d.minutes > 0).length)
const listening = computed(() => inputHours(events.value))

const known = computed(() => {
  const counts = Object.fromEntries(LAYERS.map((l) => [l, { familiar: 0, learning: 0 }]))
  for (const [id, state] of progress.value.reached()) {
    const layer = layerOf(id)
    if (!layer) continue
    if (state === 'learning') counts[layer]!.learning++
    else counts[layer]!.familiar++
  }
  return LAYERS.map((l) => ({ layer: l, ...counts[l]! }))
})
const BUCKETS: { key: Bucket; label: string }[] = [
  { key: 'lessons', label: 'Lessons' }, { key: 'cards', label: 'Cards' }, { key: 'watching', label: 'Watching' },
]
const share = (b: Bucket) => (week.value.total > 0 ? (week.value.split[b] / week.value.total) * 100 : 0)
</script>

<template>
  <main class="screen tabbed">
    <header class="top"><span class="t-title">{{ t('Progress') }}</span></header>

    <section class="block">
      <div class="t-label">{{ t('This week') }}</div>
      <div class="t-display">{{ hoursMinutes(week.total) }}</div>
      <div class="split" role="img" :aria-label="t('Time split')">
        <span v-for="b in BUCKETS" :key="b.key" :class="b.key" :style="{ width: share(b.key) + '%' }" />
      </div>
      <div class="legend t-meta">
        <span v-for="b in BUCKETS" :key="b.key"><i :class="b.key" />{{ t(b.label) }} {{ hoursMinutes(week.split[b.key]) }}</span>
      </div>
    </section>

    <section class="block">
      <div class="top"><span class="t-label">{{ t('Consistency') }}</span><span class="t-meta">{{ t('{n} of the last {d} days', { n: studied, d: CONSISTENCY_V1.windowDays }) }}</span></div>
      <Heatmap :days="recent" />
    </section>

    <section class="block">
      <div class="t-label">{{ t('What you know') }}</div>
      <button v-for="k in known" :key="k.layer" class="row tap" @click="router.go({ name: 'path', view: 'items' })">
        <span class="grow">{{ t(LAYER_LABEL[k.layer]) }}</span>
        <span class="t-meta">{{ t('{n} learning', { n: k.learning }) }}</span>
        <b class="count">{{ k.familiar }}</b>
      </button>
      <p class="t-meta">{{ t('The big number counts what you know at Familiar or better.') }}</p>
    </section>

    <section class="block">
      <div class="top"><span class="t-label">{{ t('Listening') }}</span><span v-if="listening.nextMark" class="t-meta">{{ t('Next mark: {n} h', { n: listening.nextMark }) }}</span></div>
      <div class="t-display">{{ t('{n} h', { n: listening.hours }) }}</div>
    </section>

    <button class="row tap" @click="router.go({ name: 'week' })">
      <span class="grow">{{ t('Weekly review') }}</span><IconChevronRight :size="18" class="muted" />
    </button>
  </main>
</template>

<style scoped>
.block { display: flex; flex-direction: column; gap: 8px; }
.split { display: flex; height: 8px; border-radius: 4px; overflow: hidden; background: var(--surface-3); }
.lessons { background: var(--act); }
.cards { background: var(--jade); }
.watching { background: var(--ink); }
.legend { display: flex; gap: 14px; flex-wrap: wrap; }
.legend span { display: inline-flex; align-items: center; gap: 5px; }
.legend i { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
.count { min-width: 2.5em; text-align: right; font-weight: 500; font-size: 16px; }
</style>
