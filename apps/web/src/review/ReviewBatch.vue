<script setup lang="ts">
// A session's review block: its cards in the queue's order, then first looks at new words. Two
// grades, Again and Good (build-phases §8). A card answered Again that's due again within the
// session comes back once at the end. Nothing here counts what's left beyond this batch.
import { computed, ref, watchEffect } from 'vue'
import { AGAIN, GOOD, type Block, type CardId, type ItemId, type Rating } from '@lang-learner/core'
import { useApp } from '../app.ts'
import { t } from '../i18n/index.ts'
import { haptic } from '../player/lessonView.ts'
import SkillReview from './SkillReview.vue'
import VocabCard from './VocabCard.vue'

const props = defineProps<{ block: Extract<Block, { kind: 'reviews' }> }>()
const emit = defineEmits<{ done: [] }>()
const { content, daily } = useApp()

/** An Again card due within this long comes back at the end of the batch. */
const AGAIN_WINDOW_MS = 15 * 60_000

type Item = { kind: 'card'; id: CardId; again: boolean } | { kind: 'look'; item: ItemId; via: 'prep' | 'queue' }
const items = ref<Item[]>([
  ...props.block.cards.map((id): Item => ({ kind: 'card', id, again: false })),
  ...props.block.firstLooks.map((f): Item => ({ kind: 'look', item: f.item, via: f.via })),
])
const at = ref(0)
const revealed = ref(false)
let shownAt = Date.now()

const current = computed(() => items.value[at.value])
const record = computed(() => (current.value?.kind === 'card' ? daily.card(current.value.id) : undefined))
const vocab = computed(() => {
  const c = current.value
  if (c?.kind === 'look') return content.card(c.item)
  return record.value?.template === 'vocab' ? content.card(record.value.itemId) : undefined
})
const spec = computed(() => (record.value?.template === 'skill' ? daily.skillSpec(record.value.itemId) : undefined))

function next() {
  revealed.value = false
  shownAt = Date.now()
  if (at.value + 1 >= items.value.length) emit('done')
  else at.value++
}

async function grade(rating: Rating) {
  const c = current.value
  if (c?.kind !== 'card') return
  haptic()
  await daily.review(c.id, rating, Date.now() - shownAt)
  const after = daily.card(c.id)
  if (rating === AGAIN && !c.again && after && after.state.dueAt <= Date.now() + AGAIN_WINDOW_MS) {
    items.value = [...items.value, { kind: 'card', id: c.id, again: true }]
  }
  next()
}

async function keep() {
  const c = current.value
  if (c?.kind !== 'look') return
  await daily.firstLook(c.item, c.via)
  next()
}

// A card this build can't show (its lesson was removed) is passed over.
watchEffect(() => { if (current.value && !vocab.value && !spec.value) next() })
</script>

<template>
  <div v-if="current" class="batch">
    <div class="bar"><div :style="{ width: (at / items.length) * 100 + '%' }" /></div>
    <template v-if="current.kind === 'look' && vocab">
      <div class="t-label">{{ t('New word') }}</div>
      <VocabCard :card="vocab" :revealed="true" />
      <button class="btn pri end" @click="keep">{{ t('Add to my reviews') }}</button>
    </template>
    <template v-else-if="vocab">
      <VocabCard :key="at" :card="vocab" :revealed="revealed" />
      <button v-if="!revealed" class="btn pri end" @click="revealed = true">{{ t('Show') }}</button>
      <div v-else class="grades end">
        <button class="btn sec" @click="grade(AGAIN)">{{ t('Again') }}</button>
        <button class="btn pri" @click="grade(GOOD)">{{ t('Good') }}</button>
      </div>
    </template>
    <SkillReview v-else-if="spec && record" :key="at" :card="record" :spec="spec" @graded="grade" />
  </div>
</template>

<style scoped>
.batch { display: flex; flex-direction: column; gap: 14px; flex: 1; }
.bar { height: 3px; border-radius: 2px; background: var(--surface-3); overflow: hidden; }
.bar div { height: 100%; background: var(--jade); transition: width .3s ease; }
.end { margin-top: auto; }
.grades { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.grades .btn.sec { padding: 15px 0; }
</style>
