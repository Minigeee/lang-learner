<script setup lang="ts">
// "I know this" on a unit or stage (README Completion & test-out): one tap marks it known, or the
// stage's check, when one is written that covers it, lets the results decide. Nothing is shown as
// failed, and a mark can be removed.
import { computed } from 'vue'
import { IconChecklist, IconX } from '@tabler/icons-vue'
import type { ClaimTarget, CompiledLesson, ItemId } from '@lang-learner/core'
import { useApp } from '../app.ts'
import { useClaims } from '../claims.ts'
import { t } from '../i18n/index.ts'
import { useRouter } from '../router.ts'

const props = defineProps<{ target: Extract<ClaimTarget, { scope: 'unit' | 'stage' }>; name: string }>()
const emit = defineEmits<{ close: [] }>()
const { content, progress } = useApp()
const router = useRouter(content.manifest.lang)
const claims = useClaims()

const stage = computed(() => content.curriculum.find((s) => props.target.scope === 'stage' ? s.id === props.target.id : s.units.some((u) => u.id === props.target.id)))
const skills = computed(() => new Set((stage.value?.units ?? [])
  .filter((u) => props.target.scope === 'stage' || u.id === props.target.id)
  .flatMap((u) => u.lessons.flatMap((l) => (l.skill ? [l.skill] : [])))))
const targetsOf = (l: CompiledLesson): ItemId[] => l.steps.flatMap((s) => (s.kind === 'practice' ? s.items.map((i) => i.target) : []))
/** Written checks in the stage that test at least one of the skills. */
const checks = computed(() => (stage.value?.units ?? []).flatMap((u) => u.lessons)
  .filter((l) => l.shape === 'checkpoint' && l.authored)
  .map((l) => content.lesson(l.id))
  .filter((l) => targetsOf(l).some((x) => skills.value.has(x))))
const marked = computed(() => progress.value.claim(props.target) === 'known')

async function mark(as: 'known' | 'none') {
  await claims.mark(props.target, as)
  emit('close')
}
</script>

<template>
  <Transition name="fade" appear><div class="scrim" @click="emit('close')" /></Transition>
  <Transition name="rise" appear>
    <div class="sheet" role="dialog" :aria-label="t('I know this')">
      <div class="top">
        <div class="t-head">{{ marked ? name : t('Already know {x}?', { x: name }) }}</div>
        <button class="icon-btn" :aria-label="t('Close')" @click="emit('close')"><IconX :size="20" /></button>
      </div>
      <p class="t-meta">{{ t('Lessons you mark count as known on your path. Every lesson stays open.') }}</p>
      <template v-if="!marked">
        <button class="btn pri" @click="mark('known')">{{ t('Mark as known') }}</button>
        <button v-for="c in checks" :key="c.id" class="row tap" @click="router.go({ name: 'lesson', id: c.id })">
          <span class="ic act"><IconChecklist :size="18" /></span>
          <span class="grow">{{ t('Take the check instead') }}<span class="t-meta block">{{ content.text(c.title) }} · {{ t('About {n} min', { n: content.entry(c.id).minutes }) }}</span></span>
        </button>
      </template>
      <template v-else>
        <div class="t-meta">{{ t('Marked as known') }}</div>
        <button class="btn sec" @click="mark('none')">{{ t('Remove the mark') }}</button>
      </template>
    </div>
  </Transition>
</template>
