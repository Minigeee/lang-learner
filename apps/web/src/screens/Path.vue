<script setup lang="ts">
// Path (app-ui-flow Navigation): the curriculum as a graph of units, stage by stage. A finished stage
// folds into one node. Tapping a unit docks a panel with what it builds on and unlocks, and its next
// step. Items switches to the item-level map. Nothing is locked.
import { computed, ref } from 'vue'
import { IconCheck, IconChevronRight, IconSitemap } from '@tabler/icons-vue'
import { useApp } from '../app.ts'
import { t } from '../i18n/index.ts'
import KnowSheet from '../parts/KnowSheet.vue'
import ItemMap from '../path/ItemMap.vue'
import { pathModel, type StageView } from '../path/model.ts'
import UnitGraph from '../path/UnitGraph.vue'
import { useRouter } from '../router.ts'

const props = defineProps<{ view?: 'items' | undefined }>()
const { content, progress } = useApp()
const router = useRouter(content.manifest.lang)
const path = computed(() => pathModel(content.curriculum, progress.value))
const selected = ref<string | null>(path.value.current?.id ?? null)
const unit = computed(() => (selected.value ? path.value.unit(selected.value) : undefined))
const opened = ref(new Set<string>())
const knowing = ref<StageView | null>(null)

const action = computed(() => {
  const u = unit.value
  if (!u) return null
  const resume = u.lessons.find((l) => l.resume)
  if (resume) return { label: t('Resume {x}', { x: resume.label }), lesson: resume }
  const next = u.lessons.find((l) => l.authored && l.status !== 'complete' && l.status !== 'known')
  return next ? { label: t('Start {x}', { x: next.label }), lesson: next } : null
})
const minutes = computed(() => unit.value?.lessons.reduce((sum, l) => sum + l.minutes, 0) ?? 0)
const toggle = (stage: string) => {
  const next = new Set(opened.value)
  if (next.has(stage)) next.delete(stage)
  else next.add(stage)
  opened.value = next
}
</script>

<template>
  <main class="screen tabbed" :class="{ docked: unit && !view }">
    <header class="top">
      <span class="t-title">{{ t('Path') }}</span>
      <div class="seg toggle">
        <button :class="{ on: !view }" @click="router.go({ name: 'path' })">{{ t('Units') }}</button>
        <button :class="{ on: view === 'items' }" @click="router.go({ name: 'path', view: 'items' })">{{ t('Items') }}</button>
      </div>
    </header>
    <ItemMap v-if="props.view === 'items'" />
    <template v-else>
      <div class="legend t-meta">
        <span><i class="sw done" />{{ t('Done') }}</span><span><i class="sw current" />{{ t('Current') }}</span>
        <span><i class="sw ready" />{{ t('Ready') }}</span><span><i class="sw" />{{ t('Later') }}</span>
        <button class="chip map" @click="router.go({ name: 'map' })"><IconSitemap :size="15" />{{ t('Map') }}</button>
      </div>
      <section v-for="s in path.stages" :key="s.id" class="stage">
        <button v-if="s.done && !opened.has(s.id)" class="folded" @click="toggle(s.id)">
          <IconCheck :size="16" />{{ t('{x} · done or known', { x: s.title }) }}
        </button>
        <template v-else>
          <div class="stage-head">
            <span class="t-head">{{ s.title }}</span>
            <button class="chip" @click="s.done ? toggle(s.id) : (knowing = s)">{{ s.done ? t('Fold') : t('I know this') }}</button>
          </div>
          <UnitGraph :units="s.units" :selected="selected" @select="(id) => (selected = selected === id ? null : id)" />
        </template>
      </section>
    </template>
    <div v-if="unit && !view" class="dock">
      <div class="top">
        <div>
          <div class="t-head">{{ unit.title }}</div>
          <div class="t-meta">{{ unit.id }} · {{ t('{d} of {n} lessons', { d: unit.done, n: unit.lessons.length }) }} · {{ t('About {n} min', { n: minutes }) }}</div>
        </div>
        <button class="chip" @click="router.go({ name: 'unit', id: unit.id })">{{ t('Open') }}<IconChevronRight :size="14" /></button>
      </div>
      <div v-if="unit.prereqs.length || unit.unlocks.length" class="rel t-meta">
        <span v-if="unit.prereqs.length">{{ t('Builds on {x}', { x: unit.prereqs.join(', ') }) }}</span>
        <span v-if="unit.unlocks.length">{{ t('Leads to {x}', { x: unit.unlocks.join(', ') }) }}</span>
      </div>
      <button v-if="action" class="btn pri" @click="router.go({ name: 'lesson', id: action.lesson.id })">{{ action.label }}</button>
      <button v-else class="btn sec" @click="router.go({ name: 'unit', id: unit.id })">{{ t('See its lessons') }}</button>
    </div>
    <KnowSheet v-if="knowing" :target="{ scope: 'stage', id: knowing.id }" :name="knowing.title" @close="knowing = null" />
  </main>
</template>

<style scoped>
.screen.docked { padding-bottom: 300px; }
.toggle { width: 150px; }
.legend { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.legend span { display: inline-flex; align-items: center; gap: 5px; }
.sw { width: 10px; height: 10px; border-radius: 3px; background: var(--surface-3); display: inline-block; }
.sw.done { background: var(--jade); }
.sw.current { background: var(--act); }
.sw.ready { background: none; border: 1.5px dashed var(--border-stronger); }
.map { margin-left: auto; }
.stage { display: flex; flex-direction: column; gap: 8px; }
.stage-head { display: flex; justify-content: space-between; align-items: center; }
.folded {
  display: flex; align-items: center; justify-content: center; gap: 8px; padding: 12px; border-radius: 12px;
  background: var(--jade-soft); color: var(--jade-text); border: 1px solid var(--jade-border); font-size: 14px;
}
.dock {
  position: fixed; left: 50%; transform: translateX(-50%); bottom: calc(68px + env(safe-area-inset-bottom)); z-index: 3;
  width: min(100% - 24px, 416px); background: var(--surface-2); border: 1px solid var(--act-border); border-radius: 18px;
  padding: 14px; display: flex; flex-direction: column; gap: 10px; box-shadow: var(--shadow);
}
.rel { display: flex; flex-direction: column; gap: 2px; }
</style>
