<script setup lang="ts">
import { t } from '../../i18n'
// Clip study. "stepper": line by line with text, pinyin and tap-to-gloss. "listen-check": no text,
// play the whole story, then one gist question with deferred feedback.
import { computed, onMounted, ref, watch } from 'vue'
import { IconPlayerSkipBack, IconPlayerSkipForward, IconRepeat, IconLanguage, IconPlayerPlay, IconX } from '@tabler/icons-vue'
import type { ClipStudyConfig, GlossEntry } from '../../core/lesson'
import type { FeedbackPolicy, TrialResult } from '../../core/types'
import { cardIdFor, record } from '../../core/events'
import { clip as getClip } from '../../content/clips'
import SceneFigure from '../figures/SceneFigure.vue'
import { haptic, useMedia } from '../useMedia'

const props = defineProps<{ config: ClipStudyConfig; policy: FeedbackPolicy }>()
const emit = defineEmits<{ complete: [results: readonly TrialResult[]] }>()
const { media, lesson } = useMedia()

const lines = computed(() => props.config.lines.map(getClip))
const idx = ref(0)
const heard = ref(new Set<number>())
const showMeaning = ref(false)
const gloss = ref<{ word: string; entry: GlossEntry } | null>(null)
const added = ref(new Set<string>())

const current = computed(() => lines.value[idx.value])
const highlight = computed(() => {
  const t = current.value?.tokens ?? []
  if (t.includes('椅子')) return 'chair'
  if (t.includes('书')) return 'book'
  if (t.includes('桌子')) return 'table'
  return 'cat'
})

async function playLine(i = idx.value) {
  await media.play(lines.value[i], { lesson })
  heard.value = new Set(heard.value).add(i)
}
function go(delta: number) {
  const next = idx.value + delta
  if (next < 0 || next >= lines.value.length) return
  idx.value = next
  showMeaning.value = false
}
watch(idx, () => { void playLine() })

function openGloss(word: string) {
  const entry = props.config.glossary[word]
  if (!entry) return
  haptic(6)
  gloss.value = { word, entry }
}
function addCard(entry: GlossEntry) {
  record({ kind: 'card_added', cardId: cardIdFor(entry.itemId, 'audio-meaning'), itemId: entry.itemId, origin: 'lesson' })
  added.value = new Set(added.value).add(entry.itemId)
}
const allHeard = computed(() => heard.value.size === lines.value.length)

// listen-check
const phase = ref<'idle' | 'playing' | 'question'>('idle')
const playingLine = ref(-1)
const gistPick = ref<string | null>(null)
let shownAt = 0
async function playStory() {
  phase.value = 'playing'
  for (let i = 0; i < lines.value.length; i++) {
    playingLine.value = i
    await media.play(lines.value[i], { lesson })
    await new Promise((r) => setTimeout(r, 350))
  }
  playingLine.value = -1
  phase.value = 'question'
  shownAt = performance.now()
}
function answerGist(key: string) {
  const g = props.config.gist!
  if (gistPick.value) return
  gistPick.value = key
  haptic()
  const ms = Math.round(performance.now() - shownAt)
  const correct = key === g.answer
  record({ kind: 'trial', itemId: g.target, lesson, widget: 'clip-study@1', picked: key, correct, ms, policy: props.policy, attempt: 1 })
  const last = lines.value[lines.value.length - 1]
  const result: TrialResult = { item: { key: 'gist', target: g.target, answer: g.answer, stimulus: last, options: g.options, attempt: 1, voiceIndex: 0 }, picked: key, correct, ms }
  setTimeout(() => emit('complete', [result]), 300)
}

onMounted(() => { if (props.config.mode === 'stepper') void playLine(0) })
</script>

<template>
  <!-- Stepper: one line at a time, with support -->
  <div v-if="config.mode === 'stepper'" class="study">
    <SceneFigure :highlight="highlight" />
    <div class="t-meta">{{ t('Chinese text and pinyin · tap a word') }}</div>
    <div class="lines">
      <div v-for="(l, i) in lines" :key="l.id" class="line" :class="{ cur: i === idx, dim: i < idx, hidden: i > idx }" @click="i < idx && (idx = i)">
        <div class="zh txt">
          <template v-for="(tok, j) in l.tokens ?? [l.text]" :key="j">
            <button v-if="i === idx && config.glossary[tok]" class="tok" @click.stop="openGloss(tok)">{{ tok }}</button>
            <span v-else>{{ tok }}</span>
          </template>
        </div>
        <div v-if="i === idx" class="py">{{ l.pinyin }}</div>
        <Transition name="fade"><div v-if="i === idx && showMeaning" class="t-meta">{{ l.gloss }}</div></Transition>
      </div>
    </div>
    <div class="ctrls">
      <button class="chip" :disabled="idx === 0" :aria-label="t('Previous line')" @click="go(-1)"><IconPlayerSkipBack :size="16" /></button>
      <button class="chip" @click="playLine()"><IconRepeat :size="16" />{{ t('Replay line') }}</button>
      <button class="chip" :class="{ on: showMeaning }" @click="showMeaning = !showMeaning"><IconLanguage :size="16" />{{ t('Meaning') }}</button>
      <button class="chip" :disabled="idx === lines.length - 1" :aria-label="t('Next line')" @click="go(1)"><IconPlayerSkipForward :size="16" /></button>
    </div>
    <button class="btn pri" :disabled="!allHeard" @click="emit('complete', [])">{{ allHeard ? t('Continue') : t('Hear all {n} lines', { n: lines.length }) }}</button>

    <Transition name="fade"><div v-if="gloss" class="scrim" @click="gloss = null" /></Transition>
    <Transition name="rise">
      <div v-if="gloss" class="sheet">
        <div class="sheet-top">
          <div><span class="hz word">{{ gloss.word }}</span> <span class="py">{{ gloss.entry.pinyin }}</span></div>
          <button :aria-label="t('Close')" @click="gloss = null"><IconX :size="20" /></button>
        </div>
        <div>{{ gloss.entry.gloss }}</div>
        <span v-if="gloss.entry.inCards || added.has(gloss.entry.itemId)" class="badge">{{ t('In your cards') }}</span>
        <button v-else class="chip" @click="addCard(gloss.entry)">{{ t('Add to cards') }}</button>
      </div>
    </Transition>
  </div>

  <!-- Listen check: no text, then one gist question -->
  <div v-else class="study">
    <SceneFigure :highlight="null" :show-cat-on="phase === 'question' || phase === 'playing' ? 'book' : 'book'" />
    <div class="t-meta">{{ t('No text, new voice') }}</div>
    <div v-if="phase !== 'question'" class="listen">
      <button class="big-play" :disabled="phase === 'playing'" @click="playStory">
        <IconPlayerPlay :size="28" />
      </button>
      <div class="t-meta">{{ phase === 'playing' ? t('Line {i} of {n}', { i: playingLine + 1, n: lines.length }) : t('Play the story') }}</div>
    </div>
    <Transition name="rise">
      <div v-if="phase === 'question' && config.gist" class="gist">
        <div class="t-head">{{ t(config.gist.prompt) }}</div>
        <button v-for="o in config.gist.options" :key="o.key" class="opt" :class="{ tapped: gistPick === o.key }" @click="answerGist(o.key)">{{ t(o.label) }}</button>
        <button class="chip again" @click="playStory">{{ t('Hear it again') }}</button>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.study { position: relative; display: flex; flex-direction: column; gap: 12px; flex: 1; }
.lines { display: flex; flex-direction: column; gap: 4px; }
.line { border-radius: 12px; padding: 8px 10px; transition: background .2s ease, opacity .2s ease; }
.line.cur { background: var(--act-soft); }
.line.dim { opacity: .45; cursor: pointer; }
.line.hidden { display: none; }
.txt { font-size: 19px; }
/* Separate dotted underlines, so adjacent tappable words read as distinct targets. */
.tok { border-bottom: 2px dotted var(--act-border); margin: 0 2px; padding: 0 1px; color: inherit; border-radius: 4px; }
.tok:first-child { margin-left: 0; }
.tok:active { background: var(--act); color: var(--on-act); }
.ctrls { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; margin-top: auto; }
.chip[disabled] { opacity: .35; }
.scrim { position: fixed; inset: 0; background: rgba(0, 0, 0, .35); z-index: 5; }
.sheet {
  position: fixed; left: 50%; bottom: 0; transform: translateX(-50%); width: min(100%, 430px); z-index: 6;
  background: var(--surface-2); border-radius: 22px 22px 0 0; padding: 18px 18px calc(22px + env(safe-area-inset-bottom));
  display: flex; flex-direction: column; gap: 8px; align-items: flex-start; box-shadow: 0 -8px 30px rgba(0, 0, 0, .25);
}
.sheet-top { display: flex; justify-content: space-between; width: 100%; align-items: center; }
.word { font-size: 30px; }
.badge { background: var(--jade-soft); color: var(--jade-text); border-radius: 6px; padding: 3px 8px; font-size: 12px; font-weight: 500; }
.listen { display: flex; flex-direction: column; align-items: center; gap: 10px; margin: auto 0; }
.big-play { width: 76px; height: 76px; border-radius: 50%; background: var(--act); color: var(--on-act); display: grid; place-items: center; transition: transform .12s ease, opacity .2s; }
.big-play:active { transform: scale(.94); }
.big-play[disabled] { opacity: .5; }
.gist { display: flex; flex-direction: column; gap: 10px; margin-top: auto; }
.opt { border: 1px solid var(--border-strong); border-radius: 14px; padding: 14px; text-align: left; transition: transform .12s ease, background .18s; }
.opt:active { transform: scale(.98); }
.opt.tapped { background: var(--surface-1); border-color: var(--border-stronger); }
.again { align-self: center; }
</style>
