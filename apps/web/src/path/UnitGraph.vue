<script setup lang="ts">
// One stage's units as a vertical flowchart (layout.ts), colored by state: jade done, cinnabar current,
// dashed ready, gray later. The selected unit's incoming edges turn cinnabar. A checkpoint unit sits
// below everything it checks, so its many incoming edges aren't drawn.
import { computed } from 'vue'
import { layoutStage, LANES } from './layout.ts'
import type { UnitView } from './model.ts'

const props = defineProps<{ units: readonly UnitView[]; selected: string | null }>()
const emit = defineEmits<{ select: [unit: string] }>()
const ROW = 66
const BOX = 46
const TOP = 8
const layout = computed(() => layoutStage(props.units))
const at = computed(() => new Map(layout.value.nodes.map((n) => [n.id, n])))
const byId = computed(() => new Map(props.units.map((u) => [u.id, u])))
const height = computed(() => layout.value.rows * ROW)
const cx = (x: number) => ((x + 0.5) / LANES) * 300
const isCheck = (id: string) => byId.value.get(id)?.lessons.every((l) => l.shape === 'checkpoint') ?? false
const edges = computed(() => layout.value.edges.filter((e) => !isCheck(e.to)).map((e) => {
  const a = at.value.get(e.from)!
  const b = at.value.get(e.to)!
  const y1 = a.row * ROW + TOP + BOX
  const y2 = b.row * ROW + TOP
  const mid = (y1 + y2) / 2
  return { ...e, d: `M${cx(a.x)} ${y1} C${cx(a.x)} ${mid},${cx(b.x)} ${mid},${cx(b.x)} ${y2}`, on: e.to === props.selected }
}).sort((a, b) => Number(a.on) - Number(b.on)))
</script>

<template>
  <div class="graph" :style="{ height: height + 'px' }">
    <svg :viewBox="`0 0 300 ${height}`" preserveAspectRatio="none" aria-hidden="true">
      <path v-for="e in edges" :key="e.from + '>' + e.to" :d="e.d" :class="{ on: e.on }" vector-effect="non-scaling-stroke" />
    </svg>
    <button
      v-for="n in layout.nodes" :key="n.id" class="node" :class="[byId.get(n.id)!.state, { sel: n.id === selected }]"
      :style="{ left: `calc(${(n.x / LANES) * 100}% + 4px)`, top: n.row * ROW + TOP + 'px', height: BOX + 'px' }"
      @click="emit('select', n.id)"
    >
      <span class="num">{{ n.id }}</span>
      <span class="name">{{ byId.get(n.id)!.title }}</span>
    </button>
  </div>
</template>

<style scoped>
.graph { position: relative; }
svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
path { fill: none; stroke: var(--border-stronger); stroke-width: 1.4; }
path.on { stroke: var(--act); stroke-width: 2; }
.node {
  position: absolute; width: calc(100% / 3 - 8px); border-radius: 11px; display: flex; flex-direction: column;
  align-items: center; justify-content: center; padding: 2px 6px; line-height: 1.2; text-align: center;
  background: var(--surface-1); border: 1px solid var(--border); color: var(--text-muted);
}
.num { font-size: 10px; opacity: .85; }
.name { font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100%; }
.node.done { border-color: var(--jade-border); background: var(--jade-soft); color: var(--jade-text); }
.node.current { background: var(--act); border-color: var(--act); color: var(--on-act); }
.node.ready { border: 1.5px dashed var(--border-stronger); color: var(--text-primary); background: var(--surface-2); }
.node.sel { box-shadow: 0 0 0 2px var(--page), 0 0 0 4px var(--act-border); }
</style>
