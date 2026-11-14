<script setup lang="ts">
// The graph map (app-ui-flow Screens): every unit and its direct prerequisites as one zoomable graph,
// mostly for a desktop screen: the Path layout, stage under stage, with wider rows. Cytoscape loads
// only when this screen opens (architecture §10's budget). Tapping a unit opens it. Like the Path,
// a checkpoint unit's incoming edges aren't drawn.
import { computed, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import { IconArrowLeft } from '@tabler/icons-vue'
import type { Core } from 'cytoscape'
import { useApp } from '../app.ts'
import { t } from '../i18n/index.ts'
import { layoutStage } from '../path/layout.ts'
import { pathModel } from '../path/model.ts'
import { useRouter } from '../router.ts'

const { content, progress } = useApp()
const router = useRouter(content.manifest.lang)
const el = ref<HTMLElement | null>(null)
const graph = shallowRef<Core | null>(null)
const failed = ref(false)
const path = computed(() => pathModel(content.curriculum, progress.value))
/** Wider rows than the phone's Path, since the map is for a desktop screen. */
const LANES = 6
const LANE_PX = 150
const ROW_PX = 80

onMounted(async () => {
  try {
    const { default: cytoscape } = await import('cytoscape')
    const css = getComputedStyle(document.documentElement)
    const v = (name: string) => css.getPropertyValue(name).trim()
    const units = path.value.stages.flatMap((s) => s.units)
    const known = new Set(units.map((u) => u.id))
    const isCheck = new Set(units.filter((u) => u.lessons.every((l) => l.shape === 'checkpoint')).map((u) => u.id))
    const position = new Map<string, { x: number; y: number }>()
    let rows = 0
    for (const s of path.value.stages) {
      const layout = layoutStage(s.units, LANES)
      for (const n of layout.nodes) position.set(n.id, { x: n.x * LANE_PX, y: (rows + n.row) * ROW_PX })
      rows += layout.rows + 1
    }
    graph.value = cytoscape({
      container: el.value,
      elements: [
        ...units.map((u) => ({ data: { id: u.id, label: `${u.id} ${u.title}`, state: u.state }, position: position.get(u.id)! })),
        ...units.filter((u) => !isCheck.has(u.id)).flatMap((u) => u.prereqs.filter((p) => known.has(p)).map((p) => ({ data: { id: `${p}>${u.id}`, source: p, target: u.id } }))),
      ],
      layout: { name: 'preset', fit: false },
      minZoom: 0.15,
      maxZoom: 2.5,
      style: [
        { selector: 'node', style: {
          label: 'data(label)', 'font-size': 11, 'font-family': 'Lexend, sans-serif', color: v('--text-secondary'),
          'text-valign': 'bottom', 'text-margin-y': 4, width: 22, height: 22, 'background-color': v('--surface-3'),
          'border-width': 1, 'border-color': v('--text-muted'), 'text-wrap': 'wrap', 'text-max-width': `${LANE_PX - 20}px`,
        } },
        { selector: 'node[state = "done"]', style: { 'background-color': v('--jade'), 'border-color': v('--jade') } },
        { selector: 'node[state = "current"]', style: { 'background-color': v('--act'), 'border-color': v('--act'), color: v('--text-primary') } },
        { selector: 'node[state = "ready"]', style: { 'background-color': v('--surface-2'), 'border-style': 'dashed', 'border-width': 2 } },
        { selector: 'edge', style: { width: 1.2, 'line-color': v('--text-muted'), opacity: 0.6, 'curve-style': 'bezier', 'target-arrow-shape': 'triangle', 'target-arrow-color': v('--text-muted'), 'arrow-scale': 0.7 } },
      ],
    })
    // Open at reading size on where the learner is; the rest is a pan or a pinch away.
    graph.value.zoom(1)
    const here = path.value.current?.id
    graph.value.center(here ? graph.value.$id(here) : undefined)
    graph.value.on('tap', 'node', (e) => router.go({ name: 'unit', id: e.target.id() }))
  } catch {
    failed.value = true
  }
})
onBeforeUnmount(() => graph.value?.destroy())
</script>

<template>
  <main class="screen tabbed wide">
    <header class="top">
      <button class="icon-btn" :aria-label="t('Back')" @click="router.back({ name: 'path' })"><IconArrowLeft :size="20" /></button>
      <span class="t-title">{{ t('Map') }}</span>
      <span style="width: 34px" />
    </header>
    <p v-if="failed" class="t-meta">{{ t("The map couldn't load here.") }}</p>
    <div ref="el" class="cy" />
  </main>
</template>

<style scoped>
.wide { max-width: 1100px; }
.cy { flex: 1; min-height: calc(100vh - 170px); border-radius: 16px; background: var(--surface-1); }
</style>
