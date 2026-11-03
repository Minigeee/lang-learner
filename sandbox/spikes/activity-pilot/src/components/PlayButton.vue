<script setup lang="ts">
import { computed } from 'vue'
import { IconVolume } from '@tabler/icons-vue'
import type { Clip } from '../core/types'
import { t } from '../i18n'
import { useMedia } from './useMedia'

const props = withDefaults(defineProps<{ clip: Clip; size?: number; caption?: string }>(), { size: 72 })
const { media, lesson } = useMedia()
const isPlaying = computed(() => media.playing.value === props.clip.id)

function play() {
  void media.play(props.clip, { lesson })
}
defineExpose({ play })
</script>

<template>
  <button class="play" :class="{ on: isPlaying }" :style="{ width: size + 'px', height: size + 'px' }" :aria-label="t('Play {x}', { x: clip.text })" @click="play">
    <span class="ring" />
    <IconVolume :size="size * 0.42" :stroke-width="1.75" />
  </button>
  <div v-if="caption" class="t-meta cap">{{ caption }}</div>
</template>

<style scoped>
.play {
  position: relative; border-radius: 50%; display: grid; place-items: center;
  background: var(--act-soft); color: var(--act-text); transition: transform .12s ease;
}
.play:active { transform: scale(.94); }
.ring { position: absolute; inset: 0; border-radius: 50%; border: 2px solid var(--act); opacity: 0; }
.play.on .ring { animation: pulse 1.1s ease-out infinite; }
@keyframes pulse { from { transform: scale(1); opacity: .55; } to { transform: scale(1.35); opacity: 0; } }
.cap { text-align: center; margin-top: 8px; }
</style>
