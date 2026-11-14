<script setup lang="ts">
// The unit view (app-ui-flow Path tab details): what it builds on, as suggestions, never locks; each
// lesson with its shape, minutes and state, a one-tap mark done (tap again to remove it), and Resume
// where a run is open. A
// lesson that isn't written yet says so and can still be marked. "I know this" offers the check or a
// self-report.
import { computed, ref } from 'vue'
import { IconArrowLeft, IconCheck, IconCircleCheck, IconCircleCheckFilled, IconPlayerPlay, IconRefresh } from '@tabler/icons-vue'
import { useApp } from '../app.ts'
import { useClaims } from '../claims.ts'
import { t } from '../i18n/index.ts'
import KnowSheet from '../parts/KnowSheet.vue'
import { SHAPE_LABEL } from '../player/lessonView.ts'
import { pathModel, type LessonView } from '../path/model.ts'
import { useRouter } from '../router.ts'

const props = defineProps<{ id: string }>()
const { content, progress } = useApp()
const router = useRouter(content.manifest.lang)
const claims = useClaims()
const path = computed(() => pathModel(content.curriculum, progress.value))
const unit = computed(() => path.value.unit(props.id))
const stage = computed(() => content.curriculum.find((s) => s.id === unit.value?.stage))
const knowing = ref(false)
const unitClaim = computed(() => progress.value.claim({ scope: 'unit', id: props.id }))
const title = (id: string) => path.value.unit(id)?.title ?? id

const STATUS = { not_started: '', in_progress: 'In progress', complete: 'Done', known: 'Marked as known' } as const
const finished = (l: LessonView) => l.status === 'complete' || l.status === 'known'

function open(l: LessonView) {
  if (l.authored) router.go({ name: 'lesson', id: l.id })
}
</script>

<template>
  <main v-if="unit" class="screen tabbed">
    <header class="top">
      <button class="icon-btn" :aria-label="t('Back')" @click="router.back({ name: 'path' })"><IconArrowLeft :size="20" /></button>
      <span class="t-meta">{{ stage?.title }} · {{ t('Unit {u}', { u: unit.id }) }}</span>
      <span style="width: 34px" />
    </header>
    <div class="t-title">{{ unit.title }}</div>
    <div v-if="unit.prereqs.length" class="rel">
      <span class="t-label">{{ t('Builds on') }}</span>
      <button v-for="p in unit.prereqs" :key="p" class="chip" @click="router.go({ name: 'unit', id: p })">{{ p }} {{ title(p) }}</button>
    </div>
    <div v-if="stage?.assumes.length && !unit.prereqs.length" class="t-meta">{{ t('Builds on everything before this stage.') }}</div>

    <section class="list">
      <div v-for="l in unit.lessons" :key="l.id" class="row">
        <button class="ic" :class="{ jade: finished(l), act: l.resume }" :disabled="!l.authored" :aria-label="l.title" @click="open(l)">
          <IconCheck v-if="finished(l)" :size="18" />
          <IconRefresh v-else-if="l.resume" :size="18" />
          <IconPlayerPlay v-else :size="18" />
        </button>
        <button class="grow lesson" :class="{ muted: !l.authored }" @click="open(l)">
          <span class="block">{{ l.label }} · {{ l.title }}</span>
          <span class="t-meta">
            {{ t(SHAPE_LABEL[l.shape]) }} · {{ t('About {n} min', { n: l.minutes }) }}
            <template v-if="l.resume"> · {{ t('Resume') }}</template>
            <template v-else-if="STATUS[l.status]"> · {{ t(STATUS[l.status]) }}</template>
            <template v-if="!l.authored"> · {{ t('Not yet available') }}</template>
          </span>
        </button>
        <button v-if="progress.claim({ scope: 'lesson', id: l.id })" class="icon-btn marked" :aria-label="t('Remove the mark')" :title="t('Remove the mark')" @click="claims.mark({ scope: 'lesson', id: l.id }, 'none')">
          <IconCircleCheckFilled :size="20" />
        </button>
        <button v-else-if="!finished(l)" class="icon-btn" :aria-label="t('Mark as done')" :title="t('Mark as done')" @click="claims.mark({ scope: 'lesson', id: l.id }, 'done')">
          <IconCircleCheck :size="20" />
        </button>
      </div>
    </section>
    <div v-if="unit.unlocks.length" class="rel">
      <span class="t-label">{{ t('Leads to') }}</span>
      <button v-for="p in unit.unlocks" :key="p" class="chip" @click="router.go({ name: 'unit', id: p })">{{ p }} {{ title(p) }}</button>
    </div>
    <button v-if="unitClaim === 'known'" class="btn sec" @click="knowing = true">{{ t('Marked as known') }}</button>
    <button v-else-if="unit.done < unit.lessons.length" class="btn sec" @click="knowing = true">{{ t('I know this') }}</button>
    <KnowSheet v-if="knowing" :target="{ scope: 'unit', id: unit.id }" :name="unit.title" @close="knowing = false" />
  </main>
  <main v-else class="screen tabbed"><p class="t-meta">{{ t('No unit {u}.', { u: id }) }}</p></main>
</template>

<style scoped>
.rel { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
.lesson { text-align: left; }
.ic[disabled] { cursor: default; }
.marked { color: var(--jade-text); }
</style>
