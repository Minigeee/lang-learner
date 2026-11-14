<script setup lang="ts">
// A lesson video (README Video and Tracking rows). A `main` video is shown in full; a supplemental one
// is offered folded, unless it's all the step has. Either counts at its full length once it starts or
// is marked watched, and either can be skipped: nothing waits on it.
import { nextTick, onBeforeUnmount, ref } from 'vue'
import { IconBrandYoutube, IconCheck, IconChevronDown } from '@tabler/icons-vue'
import type { VideoRef } from '@lang-learner/core'
import { useApp } from '../../app.ts'
import { embedVideo, type Embed } from '../../adapters/youtube.ts'
import { t } from '../../i18n/index.ts'
import { useLesson } from '../lessonView.ts'

/** `alone`: the video is all the step has, so it's shown open whatever its role. */
const props = defineProps<{ video: VideoRef; alone?: boolean }>()
const app = useApp()
const { lesson } = useLesson()
const open = ref(props.video.role === 'main' || props.alone)
const counted = ref(false)
const failed = ref(false)
const host = ref<HTMLElement | null>(null)
const minutes = Math.max(1, Math.round(props.video.durationSec / 60))
let embed: Embed | null = null

function count(via: 'played' | 'marked') {
  if (counted.value) return
  counted.value = true
  const { youtubeId, role, durationSec } = props.video
  void app.record({ kind: 'exposure', v: 1, payload: { type: 'video', youtubeId, role, durationSec, lessonId: lesson.id, via } })
}

async function mount() {
  await nextTick()
  if (!host.value || embed) return
  embed = await embedVideo(host.value, props.video.youtubeId, { onStart: () => count('played'), onError: () => { failed.value = true } })
}

function unfold() {
  open.value = true
  void mount()
}

if (open.value) void mount()
onBeforeUnmount(() => embed?.destroy())
</script>

<template>
  <div class="video">
    <button v-if="!open" class="row fold" @click="unfold">
      <span class="ic"><IconBrandYoutube :size="18" /></span>
      <span class="grow">{{ t('Watch a video') }}<span class="t-meta block">{{ t('Optional · {n} min', { n: minutes }) }}</span></span>
      <IconChevronDown :size="18" class="muted" />
    </button>
    <template v-else>
      <div class="frame"><div ref="host" /></div>
      <p v-if="failed" class="t-meta">{{ t('This video needs a connection. You can come back to it.') }}</p>
      <div class="meta">
        <span class="t-meta">{{ t('{n} min video', { n: minutes }) }}</span>
        <span v-if="counted" class="t-meta done"><IconCheck :size="14" />{{ t('Counted') }}</span>
        <button v-else class="chip" @click="count('marked')">{{ t('Mark watched') }}</button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.video { display: flex; flex-direction: column; gap: 8px; }
.fold { width: 100%; text-align: left; }
.frame { position: relative; width: 100%; aspect-ratio: 16 / 9; border-radius: 12px; overflow: hidden; background: var(--player); }
.frame :deep(iframe), .frame > div { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; }
.meta { display: flex; justify-content: space-between; align-items: center; }
.done { display: inline-flex; align-items: center; gap: 4px; color: var(--jade-text); }
</style>
