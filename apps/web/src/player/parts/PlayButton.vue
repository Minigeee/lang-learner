<script setup lang="ts">
// A round play button for one clip. It pulses while that clip plays.
import { computed } from 'vue'
import { IconVolume } from '@tabler/icons-vue'
import type { ClipId } from '@lang-learner/core'
import { useApp } from '../../app.ts'
import { t } from '../../i18n/index.ts'
import { usePlayback } from '../lessonView.ts'

const props = withDefaults(defineProps<{ clip: ClipId; size?: number }>(), { size: 72 })
const app = useApp()
const { play: playClip } = usePlayback()
const on = computed(() => app.clips.playing.value === props.clip)

function play() {
  return playClip(props.clip)
}
defineExpose({ play })
</script>

<template>
  <button class="play" :class="{ on }" :style="{ width: size + 'px', height: size + 'px' }" :aria-label="t('Play')" @click="play">
    <span class="ring" />
    <IconVolume :size="size * 0.42" :stroke-width="1.75" />
  </button>
</template>

<style scoped>
.play {
  position: relative; border-radius: 50%; display: grid; place-items: center; flex: none;
  background: var(--act-soft); color: var(--act-text); transition: transform .12s ease;
}
.play:active { transform: scale(.94); }
.ring { position: absolute; inset: 0; border-radius: 50%; border: 2px solid var(--act); opacity: 0; }
.play.on .ring { animation: pulse 1.1s ease-out infinite; }
@keyframes pulse { from { transform: scale(1); opacity: .55; } to { transform: scale(1.35); opacity: 0; } }
</style>
