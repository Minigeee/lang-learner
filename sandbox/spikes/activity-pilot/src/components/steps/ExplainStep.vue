<script setup lang="ts">
import { t } from '../../i18n'
// Step 3 (How it works): one claim, one figure, a few lines, a wrong/right pair, examples to hear.
import { computed, ref } from 'vue'
import { IconCheck, IconChevronDown, IconVolume, IconX } from '@tabler/icons-vue'
import { clip as getClip } from '../../content/clips'
import TimelineFigure from '../figures/TimelineFigure.vue'
import ToneGlyph from '../figures/ToneGlyph.vue'
import SceneFigure from '../figures/SceneFigure.vue'
import { useMedia } from '../useMedia'

const props = defineProps<{
  title: string; body: string[]; figure?: 'tone-contours' | 'timeline-bu-mei' | 'cat-words'
  wrong?: string; right?: string; deeper?: { q: string; a: string }
}>()
const emit = defineEmits<{ next: [] }>()
const { media, lesson } = useMedia()
const right = computed(() => (props.right ? getClip(props.right) : null))
const open = ref(false)
</script>

<template>
  <div class="step">
    <div class="t-title zh">{{ t(title) }}</div>
    <div v-if="figure === 'tone-contours'" class="tones">
      <div v-for="tone in [1, 2, 3, 4] as const" :key="tone" class="tone">
        <ToneGlyph :tone="tone" :width="56" :height="34" />
        <span class="t-meta">{{ t('Tone {n}', { n: tone }) }}</span>
      </div>
    </div>
    <TimelineFigure v-else-if="figure === 'timeline-bu-mei'" />
    <SceneFigure v-else-if="figure === 'cat-words'" highlight="table" />
    <p v-for="(b, i) in body" :key="i" class="zh body">{{ t(b) }}</p>
    <div v-if="wrong || right" class="list">
      <div v-if="wrong" class="row"><span class="ic slate"><IconX :size="18" /></span><span class="grow zh strike">{{ wrong }}</span></div>
      <button v-if="right" class="row tap" @click="media.play(right, { lesson })">
        <span class="ic jade"><IconCheck :size="18" /></span>
        <span class="grow"><span class="zh">{{ right.text }}</span><span class="t-meta block">{{ right.gloss }}</span></span>
        <IconVolume :size="18" class="muted" />
      </button>
    </div>
    <div v-if="deeper" class="deeper">
      <button class="t-meta dq" @click="open = !open"><IconChevronDown :size="16" :class="{ flip: open }" /><span class="zh">{{ t(deeper.q) }}</span></button>
      <Transition name="fade"><p v-if="open" class="t-meta zh">{{ t(deeper.a) }}</p></Transition>
    </div>
    <button class="btn pri end" @click="emit('next')">{{ t('Continue') }}</button>
  </div>
</template>

<style scoped>
.step { display: flex; flex-direction: column; gap: 12px; flex: 1; }
.tones { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.tone { background: var(--surface-1); border-radius: 14px; padding: 12px 0 8px; display: flex; flex-direction: column; align-items: center; gap: 4px; color: var(--text-primary); }
.body { margin: 0; }
.list { display: flex; flex-direction: column; }
.tap { width: 100%; text-align: left; }
.strike { text-decoration: line-through; color: var(--text-muted); }
.block { display: block; }
.muted { color: var(--text-muted); }
.deeper { display: flex; flex-direction: column; }
.dq { display: flex; align-items: center; gap: 6px; padding: 6px 0; }
.flip { transform: rotate(180deg); }
.end { margin-top: auto; }
</style>
