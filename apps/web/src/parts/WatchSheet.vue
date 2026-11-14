<script setup lang="ts">
// Log watching (app-ui-flow Log watching): a show, minutes, subtitles, how you watched and how much you
// followed, on any day (README Tracking row: no date or runtime limits). A recent show fills in its
// last values, so logging it again is about three taps.
import { computed, ref } from 'vue'
import { IconMinus, IconPlus, IconX } from '@tabler/icons-vue'
import { studyDate, type WatchPayload } from '@lang-learner/core'
import { useApp } from '../app.ts'
import { t } from '../i18n/index.ts'
import { recentShows, type WatchLog } from '../watching.ts'
import { toast } from './toast.ts'

const props = defineProps<{ show?: WatchLog | undefined }>()
const emit = defineEmits<{ close: [] }>()
const { record, events, daily } = useApp()
const recent = computed(() => recentShows(events.value))

const title = ref(props.show?.title ?? '')
const episode = ref('')
const minutes = ref(props.show?.minutes ?? 20)
const subtitles = ref<WatchPayload['subtitles']>(props.show?.subtitles ?? 'en')
const attention = ref<WatchPayload['attention']>(props.show?.attention ?? 'straight')
const followed = ref<WatchPayload['followed']>(props.show?.followed ?? 'some')
const editing = ref(!props.show)

const DAY = 86_400_000
const today = studyDate(Date.now(), daily.days.value.clock)
const yesterday = new Date(Date.parse(`${today}T00:00:00Z`) - DAY).toISOString().slice(0, 10)
const when = ref<'today' | 'yesterday' | 'earlier'>('today')
const earlier = ref(yesterday)
const date = computed(() => (when.value === 'today' ? today : when.value === 'yesterday' ? yesterday : earlier.value))

const SUBTITLES = [['none', 'None'], ['zh', '中文'], ['dual', 'Dual'], ['en', 'English']] as const
const ATTENTION = [['straight', 'Straight'], ['pausing', 'Pausing'], ['half', 'Half']] as const
const FOLLOWED = [['little', 'A little'], ['some', 'Some'], ['most', 'Most']] as const

function pick(show: WatchLog) {
  title.value = show.title
  minutes.value = show.minutes
  subtitles.value = show.subtitles
  attention.value = show.attention
  followed.value = show.followed
  editing.value = false
}

const step = (d: number) => { minutes.value = Math.min(1440, Math.max(1, minutes.value + d)) }
const ready = computed(() => title.value.trim().length > 0 && minutes.value >= 1 && /^\d{4}-\d{2}-\d{2}$/.test(date.value))

async function save() {
  if (!ready.value) return
  const ep = episode.value.trim()
  await record({ kind: 'watch', v: 1, payload: {
    title: title.value.trim().slice(0, 200), ...(ep ? { episode: ep.slice(0, 200) } : {}), minutes: Math.round(minutes.value), date: date.value,
    subtitles: subtitles.value, attention: attention.value, followed: followed.value,
  } })
  toast({ text: t('Logged {n} min', { n: Math.round(minutes.value) }) })
  emit('close')
}
</script>

<template>
  <Transition name="fade" appear><div class="scrim" @click="emit('close')" /></Transition>
  <Transition name="rise" appear>
    <div class="sheet" role="dialog" :aria-label="t('Log watching')">
      <div class="top">
        <div class="t-head">{{ t('Log watching') }}</div>
        <button class="icon-btn" :aria-label="t('Close')" @click="emit('close')"><IconX :size="20" /></button>
      </div>
      <div v-if="!editing" class="row show">
        <span class="ic poster">{{ title.slice(0, 2).toUpperCase() }}</span>
        <span class="grow">{{ title }}</span>
        <button class="chip" @click="editing = true">{{ t('Change') }}</button>
      </div>
      <template v-else>
        <label class="field">{{ t('Show') }}<input v-model="title" maxlength="200" :placeholder="t('What did you watch?')" /></label>
        <div v-if="recent.length" class="chips">
          <button v-for="s in recent" :key="s.id" class="chip" @click="pick(s)">{{ s.title }}</button>
        </div>
      </template>
      <label class="field">{{ t('Episode (optional)') }}<input v-model="episode" maxlength="200" /></label>
      <div class="line">
        <span>{{ t('Minutes') }}</span>
        <span class="stepper">
          <button class="chip" :aria-label="t('Fewer')" @click="step(-5)"><IconMinus :size="15" /></button>
          <b>{{ minutes }}</b>
          <button class="chip" :aria-label="t('More')" @click="step(5)"><IconPlus :size="15" /></button>
        </span>
      </div>
      <div class="t-label">{{ t('Subtitles') }}</div>
      <div class="seg"><button v-for="[k, l] in SUBTITLES" :key="k" :class="{ on: subtitles === k }" @click="subtitles = k">{{ k === 'zh' ? l : t(l) }}</button></div>
      <div class="t-label">{{ t('How did you watch?') }}</div>
      <div class="seg"><button v-for="[k, l] in ATTENTION" :key="k" :class="{ on: attention === k }" @click="attention = k">{{ t(l) }}</button></div>
      <div class="t-label">{{ t('How much did you follow?') }}</div>
      <div class="seg"><button v-for="[k, l] in FOLLOWED" :key="k" :class="{ on: followed === k }" @click="followed = k">{{ t(l) }}</button></div>
      <div class="t-label">{{ t('When') }}</div>
      <div class="seg">
        <button :class="{ on: when === 'today' }" @click="when = 'today'">{{ t('Today') }}</button>
        <button :class="{ on: when === 'yesterday' }" @click="when = 'yesterday'">{{ t('Yesterday') }}</button>
        <button :class="{ on: when === 'earlier' }" @click="when = 'earlier'">{{ t('Earlier') }}</button>
      </div>
      <label v-if="when === 'earlier'" class="field"><input v-model="earlier" type="date" :max="today" /></label>
      <button class="btn pri" :disabled="!ready" @click="save">{{ t('Save') }}</button>
    </div>
  </Transition>
</template>

<style scoped>
.sheet { max-height: 92vh; overflow-y: auto; }
.show { border: none; }
.poster { background: var(--ink-soft); color: var(--ink-text); font-size: 12px; font-weight: 600; }
.chips { display: flex; flex-wrap: wrap; gap: 6px; }
.line { display: flex; justify-content: space-between; align-items: center; }
.stepper { display: inline-flex; align-items: center; gap: 12px; }
.stepper b { min-width: 2.5em; text-align: center; font-weight: 500; font-size: 16px; }
</style>
