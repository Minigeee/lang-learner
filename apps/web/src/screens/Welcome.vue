<script setup lang="ts">
// First-run setup (app-ui-flow Screens): a plan for when to study, then the offer for the first stage:
// mark it known in one tap, take its check, or start at the beginning. Shown once per history, so a
// second device skips it. There's no daily goal: a target to fall short of is what the Motivation row
// rules out.
import { computed, ref } from 'vue'
import { IconChecklist, IconChevronRight, IconPlayerPlay } from '@tabler/icons-vue'
import type { LessonId } from '@lang-learner/core'
import { useApp } from '../app.ts'
import { t } from '../i18n/index.ts'
import { useRouter } from '../router.ts'

const app = useApp()
const { content } = app
const router = useRouter(content.manifest.lang)
const step = ref<'plan' | 'sounds'>('plan')
const PLANS = ['After I get into bed', 'With my morning coffee', 'On my commute', 'After dinner']
const picked = ref<string | null>(null)
const first = content.curriculum[0]!
const check = computed(() => first.units.flatMap((u) => u.lessons).find((l) => l.shape === 'checkpoint' && l.authored))

async function plan() {
  if (picked.value) await app.record({ kind: 'setting', v: 1, payload: { key: 'intention', value: t(picked.value) } })
  step.value = 'sounds'
}

async function finish(then: { known?: boolean; lesson?: LessonId }) {
  if (then.known) await app.record({ kind: 'claim', v: 1, payload: { scope: 'stage', id: first.id, as: 'known' } })
  await app.record({ kind: 'setting', v: 1, payload: { key: 'setupDone', value: true } })
  if (then.lesson) router.replace({ name: 'lesson', id: then.lesson })
  else router.replace({ name: 'today' })
}
</script>

<template>
  <main class="screen">
    <span class="seal big">学</span>
    <template v-if="step === 'plan'">
      <div class="t-display">{{ t('Welcome') }}</div>
      <p class="lead">{{ t('A few minutes most days adds up. When will you usually study?') }}</p>
      <div class="list">
        <button v-for="p in PLANS" :key="p" class="row tap" :class="{ on: picked === p }" @click="picked = p">
          <span class="grow">{{ t(p) }}</span>
          <span v-if="picked === p" class="tag act">{{ t('Picked') }}</span>
        </button>
      </div>
      <div class="end">
        <button class="btn pri" @click="plan">{{ t('Continue') }}</button>
        <button class="btn sec" @click="picked = null; plan()">{{ t('Skip') }}</button>
      </div>
    </template>
    <template v-else>
      <div class="t-title">{{ t('Do you already know the sounds?') }}</div>
      <p class="lead">{{ t('The first stage, {x}, covers tones and pinyin. If you know them, mark it known and start with the first words. You can open any of its lessons later.', { x: first.title }) }}</p>
      <div class="end">
        <button class="btn pri" @click="finish({ known: true })">{{ t('I know them: mark {x} as known', { x: first.title }) }}</button>
        <button v-if="check" class="row tap" @click="finish({ lesson: check.id })">
          <span class="ic act"><IconChecklist :size="18" /></span>
          <span class="grow">{{ t('Take the check') }}<span class="t-meta block">{{ check.title }} · {{ t('About {n} min', { n: check.minutes }) }}</span></span>
          <IconChevronRight :size="18" class="muted" />
        </button>
        <button class="row tap" @click="finish({})">
          <span class="ic"><IconPlayerPlay :size="18" /></span>
          <span class="grow">{{ t('Start from the beginning') }}</span>
          <IconChevronRight :size="18" class="muted" />
        </button>
      </div>
    </template>
  </main>
</template>

<style scoped>
.big { width: 44px; height: 44px; font-size: 24px; border-radius: 12px; }
.lead { margin: 0; color: var(--text-secondary); }
.row.on { color: var(--act-text); }
.end { margin-top: auto; display: flex; flex-direction: column; gap: 10px; }
</style>
