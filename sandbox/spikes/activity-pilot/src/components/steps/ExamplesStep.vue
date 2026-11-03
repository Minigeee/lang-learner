<script setup lang="ts">
import { t } from '../../i18n'
// Examples (the we do, brainstorm §4.1): the target in action in several native clips and voices,
// with the target lit and the meaning one tap away. Nothing is scored.
import { computed, onMounted } from 'vue'
import { IconRefresh } from '@tabler/icons-vue'
import { clip as getClip } from '../../content/clips'
import ClipLines from '../ClipLines.vue'
import { usePlaylist } from '../usePlaylist'

const props = defineProps<{ clips: string[]; highlight?: string[] }>()
const emit = defineEmits<{ next: [] }>()
const clips = computed(() => props.clips.map(getClip))
const { playing, heardAll, playAll, playOne } = usePlaylist(clips)
onMounted(() => setTimeout(playAll, 350))
</script>

<template>
  <div class="step">
    <div class="t-head">{{ t('Hear it in action') }}</div>
    <div class="t-meta">{{ t('Different voices, same idea. Tap a line to hear it again and see what it means.') }}</div>
    <ClipLines :clips="clips" :playing="playing" :highlight="highlight" meaning="on-tap" @play="playOne" />
    <div class="ctrls">
      <button class="chip" :disabled="playing >= 0" @click="playAll"><IconRefresh :size="16" />{{ t('Play all') }}</button>
    </div>
    <button class="btn pri end" :disabled="!heardAll" @click="emit('next')">{{ t('Continue') }}</button>
  </div>
</template>

<style scoped>
.step { display: flex; flex-direction: column; gap: 12px; flex: 1; }
.ctrls { display: flex; justify-content: center; }
.chip[disabled] { opacity: .4; }
.end { margin-top: auto; }
</style>
