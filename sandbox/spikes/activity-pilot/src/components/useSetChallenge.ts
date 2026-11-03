// Shared logic for practice formats that play a set of clips and ask which one is "the one"
// (odd one out, catch the mismatch). The trial runner still owns scoring, feedback and retries;
// this owns the set's playback, the tap-to-hear-and-select, and confirm.
import { computed, onBeforeUnmount, ref, shallowRef } from 'vue'
import type { ChoiceOption, Clip, ItemId, TrialItem, TrialResult, Verdict } from '../core/types'
import { createTrialRunner, PRACTICE_PACING } from '../core/trialRunner'
import { clip as getClip } from '../content/clips'
import { haptic, useMedia } from './useMedia'

/** Gap between clips when a set plays through. */
const SET_GAP_MS = 380
/** After a correct answer, long enough to register the green. */
const CORRECT_ADVANCE_MS = 900

export interface ChallengeSet { key: string; target: ItemId }

export function useSetChallenge<S extends ChallengeSet>(opts: {
  sets: S[]
  seed: number
  widget: string
  clipsOf(set: S): string[]
  answerOf(set: S): number
  options: ChoiceOption[]
  complete(results: readonly TrialResult[]): void
}) {
  const { media, lesson } = useMedia()
  const runner = createTrialRunner(
    opts.sets.map((s) => ({ key: s.key, target: s.target, answer: `p${opts.answerOf(s)}`, stimuli: [opts.clipsOf(s)[opts.answerOf(s)]] })),
    opts.options,
    'instant',
    // Sets are few and slow, so every set is served once (plus retries) rather than climbing a ladder.
    { clip: getClip, lesson, widget: opts.widget, seed: opts.seed, pacing: { maxRetries: PRACTICE_PACING.maxRetries, maxSec: PRACTICE_PACING.maxSec } },
  )
  const item = shallowRef<TrialItem | null>(null)
  const set = computed(() => (item.value ? opts.sets.find((s) => s.key === item.value!.key)! : null))
  const clips = computed<Clip[]>(() => (set.value ? opts.clipsOf(set.value).map(getClip) : []))
  const playing = ref(-1)
  const heardAll = ref(false)
  const selected = ref<number | null>(null)
  const verdict = shallowRef<Verdict | null>(null)
  const progress = ref(runner.progress())
  let shownAt = 0
  let seq = 0

  async function playAll() {
    const mine = ++seq
    for (let i = 0; i < clips.value.length; i++) {
      if (mine !== seq) return
      playing.value = i
      await media.play(clips.value[i], { lesson })
      if (mine !== seq) return
      await new Promise((r) => setTimeout(r, SET_GAP_MS))
    }
    playing.value = -1
    heardAll.value = true
    shownAt = performance.now()
  }

  function tap(i: number) {
    if (verdict.value) { void media.play(clips.value[i], { lesson }); return }
    seq++ // stop a play-through in progress
    playing.value = -1
    heardAll.value = true
    shownAt ||= performance.now()
    selected.value = i
    haptic(6)
    void media.play(clips.value[i], { lesson })
  }

  function confirm() {
    if (!item.value || selected.value === null || verdict.value) return
    seq++
    media.stop()
    const v = runner.respond(item.value, `p${selected.value}`, Math.round(performance.now() - shownAt))
    verdict.value = v
    progress.value = runner.progress()
    haptic()
    if (v.kind === 'deferred') setTimeout(advance, 260)
    else if (v.correct) setTimeout(advance, CORRECT_ADVANCE_MS)
  }

  function advance() {
    verdict.value = null
    selected.value = null
    heardAll.value = false
    shownAt = 0
    item.value = runner.next()
    progress.value = runner.progress()
    if (!item.value) { opts.complete(runner.results()); return }
    setTimeout(() => void playAll(), 250)
  }

  /** Tile state for styling: answer and pick are shown only when a verdict is instant. */
  function stateOf(i: number): string {
    const v = verdict.value
    if (!v || v.kind === 'deferred') return selected.value === i ? 'sel' : ''
    const answer = Number(v.answer.slice(1))
    if (i === answer) return v.correct ? 'right' : 'answer'
    return selected.value === i ? 'off' : 'dim'
  }

  onBeforeUnmount(() => { seq++; media.stop() })
  return { item, set, clips, playing, heardAll, selected, verdict, progress, playAll, tap, confirm, advance, stateOf }
}
