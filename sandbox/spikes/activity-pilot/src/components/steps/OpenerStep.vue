<script setup lang="ts">
import { t } from '../../i18n'
// Opener (brainstorm §4.2): native input first, framed as a story, a puzzle or a side-by-side
// comparison, with one unscored hook question.
import { computed, onMounted, ref } from 'vue'
import { IconPlayerPlay, IconRefresh, IconVolume } from '@tabler/icons-vue'
import type { Opener } from '../../core/lesson'
import { clip as getClip } from '../../content/clips'
import SceneFigure from '../figures/SceneFigure.vue'
import { useMedia } from '../useMedia'
import { usePlaylist } from '../usePlaylist'

const props = defineProps<{ opener: Opener }>()
const emit = defineEmits<{ next: [] }>()
const { media } = useMedia()
const clips = computed(() => (props.opener.type === 'showdown' ? [props.opener.a, props.opener.b] : props.opener.clips).map(getClip))
const { playing, heardAll, playAll, playOne } = usePlaylist(clips)
const choice = ref<string | null>(null)
onMounted(() => setTimeout(playAll, 350))
</script>

<template>
  <div class="step">
    <SceneFigure v-if="opener.type === 'story' && opener.scene" :highlight="null" />

    <div v-else-if="opener.type === 'showdown'" class="duel">
      <button v-for="(c, i) in clips" :key="c.id" class="side card" :class="{ on: playing === i }" @click="playOne(i)">
        <span class="t-label">{{ i === 0 ? t('First') : t('Second') }}</span>
        <IconVolume :size="30" :stroke-width="1.75" />
        <span v-if="media.isPlaceholder(c)" class="zh txt">{{ c.text }}</span>
      </button>
    </div>

    <div v-else class="card stage">
      <div class="dots">
        <span v-for="(c, i) in clips" :key="c.id" :class="{ on: i === playing }" />
      </div>
      <div class="t-meta">{{ playing >= 0 ? t('Playing {i} of {n}', { i: playing + 1, n: clips.length }) : clips.length > 1 ? t('{n} recordings', { n: clips.length }) : t('Native clip') }}</div>
    </div>

    <div class="ctrls">
      <button class="chip" :disabled="playing >= 0" @click="playAll">
        <component :is="heardAll ? IconRefresh : IconPlayerPlay" :size="16" />{{ heardAll ? t('Play again') : t('Play') }}
      </button>
    </div>
    <div class="t-head">{{ t(opener.hook.prompt) }}</div>
    <div>
      <button v-for="o in opener.hook.options" :key="o" class="row opt" :class="{ sel: choice === o }" @click="choice = o">{{ t(o) }}</button>
    </div>
    <div class="t-meta center">{{ t("Just listen. This one isn't scored.") }}</div>
    <button class="btn pri end" :disabled="!heardAll" @click="emit('next')">{{ t('Continue') }}</button>
  </div>
</template>

<style scoped>
.step { display: flex; flex-direction: column; gap: 14px; flex: 1; }
.stage { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 30px 0; background: var(--player); }
.dots { display: flex; gap: 10px; }
.dots span { width: 12px; height: 12px; border-radius: 50%; background: #3a3631; transition: background .2s, transform .2s; }
.dots span.on { background: var(--act); transform: scale(1.3); }
.duel { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.side {
  display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 18px 8px 22px; background: var(--player);
  color: var(--text-secondary); border: 1.5px solid transparent; transition: border-color .2s, color .2s;
}
.side.on { border-color: var(--act); color: var(--act-text); }
.txt { font-size: 18px; color: var(--text-primary); }
.ctrls { display: flex; justify-content: center; }
.chip[disabled] { opacity: .4; }
.opt { width: 100%; text-align: left; padding: 13px 4px; }
.opt.sel { color: var(--act-text); }
.center { text-align: center; }
.end { margin-top: auto; }
</style>
