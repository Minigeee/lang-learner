<script setup lang="ts">
// The item-level knowledge map (app-ui-flow Path, Items): every item the build knows, by layer, shaded
// by the highest state it has reached. Tapping one opens its detail.
import { computed } from 'vue'
import type { MasteryState } from '@lang-learner/core'
import { useApp } from '../app.ts'
import { t } from '../i18n/index.ts'
import { itemTitle, LAYER_LABEL, LAYERS, layerOf } from '../items.ts'
import { useRouter } from '../router.ts'

const { content, progress } = useApp()
const router = useRouter(content.manifest.lang)
const layers = computed(() => {
  const ids = content.itemList.map((i) => i.id)
  return LAYERS.map((layer) => ({
    layer,
    items: ids.filter((id) => layerOf(id) === layer).map((id) => ({ id, ...itemTitle(content, id), state: progress.value.mastery(id) })),
  })).filter((g) => g.items.length)
})
const shade = (s: MasteryState) => (s === 'new' ? '' : s === 'learning' ? 'learning' : 'known')
</script>

<template>
  <div class="map">
    <div class="legend t-meta"><span class="dot known" />{{ t('Familiar or better') }}<span class="dot learning" />{{ t('Learning') }}<span class="dot" />{{ t('Not met yet') }}</div>
    <section v-for="g in layers" :key="g.layer" class="layer">
      <div class="t-label">{{ t(LAYER_LABEL[g.layer]) }}</div>
      <div class="chips">
        <button v-for="i in g.items" :key="i.id" class="item" :class="shade(i.state)" @click="router.go({ name: 'item', id: i.id })">
          <span :class="{ hz: i.isTarget }">{{ i.text }}</span>
        </button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.map { display: flex; flex-direction: column; gap: 14px; }
.legend { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.dot { width: 10px; height: 10px; border-radius: 3px; background: var(--surface-3); margin-left: 6px; }
.dot.known { background: var(--jade); }
.dot.learning { background: var(--jade-soft); border: 1px solid var(--jade-border); }
.layer { display: flex; flex-direction: column; gap: 8px; }
.chips { display: flex; flex-wrap: wrap; gap: 6px; }
.item { border-radius: 9px; padding: 5px 10px; font-size: 14px; background: var(--surface-1); color: var(--text-secondary); border: 1px solid var(--border); }
.item.learning { background: var(--jade-soft); color: var(--jade-text); border-color: var(--jade-border); }
.item.known { background: var(--jade); color: var(--on-act); border-color: var(--jade); }
</style>
