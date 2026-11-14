<script setup lang="ts">
// A skill card's review (brainstorm §4.4): a short burst of its lesson's practice format, on the
// stimuli heard least lately, in the lesson's own widget. It grades itself: Good when every item was
// right on its first try, else Again. A C1 burst's score is the learner's own call, as in the lesson.
import { computed } from 'vue'
import { CHECK_PACING, FORMATS, burstRating, createTrialRunner, seedOf, skillBurst, type CardRecord, type Rating, type SkillCardSpec } from '@lang-learner/core'
import { useApp } from '../app.ts'
import { makeDrill } from '../player/drill.ts'
import { WIDGET_VIEWS } from '../player/widgets/index.ts'

const props = defineProps<{ card: CardRecord; spec: SkillCardSpec }>()
const emit = defineEmits<{ graded: [rating: Rating] }>()
const { content, progress } = useApp()

const format = FORMATS[props.spec.format]
if (!format) throw new Error(`No widget for format ${props.spec.format}`)
const items = skillBurst(props.spec, (clip) => progress.value.heardAt(clip), seedOf(props.card.id, props.card.reviews))
const runner = createTrialRunner({ items, options: props.spec.options, pacing: CHECK_PACING, seed: seedOf(props.card.id, props.card.reviews) })
const drill = makeDrill({ format, runner, feedback: 'instant', onEnd: () => emit('graded', burstRating(runner.results())) })
const view = computed(() => WIDGET_VIEWS[format.widget.split('@')[0]!])
</script>

<template>
  <component :is="view" :drill="drill" :prompt="content.text(spec.prompt)" />
</template>
