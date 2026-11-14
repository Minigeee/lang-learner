// A drill on screen: a core trial runner with scoring and an end, which the widget views play. A
// lesson's practice step records every response as a `trial` event here, so no widget can forget one,
// and a resumed step replays its recorded responses into a fresh runner instead of starting over.
import { ref, shallowRef, type Ref, type ShallowRef } from 'vue'
import {
  CHECK_PACING, FORMATS, PRACTICE_PACING, ReplayMismatch, createTrialRunner, replay, seedOf,
  type DrillProgress, type FormatDef, type OpenRun, type Step, type Trial, type TrialRunner,
} from '@lang-learner/core'
import { useApp } from '../app.ts'
import { useLesson } from './lessonView.ts'

export type PracticeStep = Extract<Step, { kind: 'practice' }>

export interface Verdict {
  correct: boolean
  /** True when a miss will come back later in the drill. */
  retry: boolean
}

export interface Drill {
  format: FormatDef
  /** Instant in lessons; deferred in a checkpoint, where nothing says right or wrong until the end. */
  feedback: 'instant' | 'deferred'
  /** The trial on screen, or null once the drill has ended. */
  trial: ShallowRef<Trial | null>
  progress: Ref<DrillProgress>
  /** Scores and records a response to the trial on screen. */
  respond(response: string): Verdict
  /** Moves to the next trial. When there is none, the step's `onEnd` runs. */
  advance(): void
}

/** A drill over a runner. `onRespond` sees each scored response; `onEnd` runs when the runner has no trial left. */
export function makeDrill(o: {
  format: FormatDef
  runner: TrialRunner
  feedback: Drill['feedback']
  onRespond?(trial: Trial, correct: boolean): void
  onEnd(): void
}): Drill {
  const { format, runner } = o
  const trial = shallowRef<Trial | null>(null)
  const progress = ref(runner.progress())
  return {
    format,
    feedback: o.feedback,
    trial,
    progress,
    advance() {
      trial.value = runner.next()
      progress.value = runner.progress()
      if (!trial.value) o.onEnd()
    },
    respond(response) {
      const current = trial.value
      if (!current) throw new Error('respond() with no trial on screen')
      const correct = format.score(current, response)
      const { retry } = runner.respond(current, correct)
      progress.value = runner.progress()
      o.onRespond?.(current, correct)
      return { correct, retry }
    },
  }
}

/** A lesson's practice step, recorded as trials and resumable. */
export function useDrill(o: {
  practice: PracticeStep
  step: number
  run: string
  lessonHash: string
  /** The run's recorded trials, when the step is resuming. */
  history: OpenRun['trials']
  onEnd(): void
}): Drill {
  const app = useApp()
  const { lesson } = useLesson()
  const format = FORMATS[o.practice.format]
  if (!format) throw new Error(`No widget for format ${o.practice.format}`)
  const checkpoint = lesson.shape === 'checkpoint'
  const build = () => createTrialRunner({
    items: o.practice.items, options: o.practice.options, pacing: checkpoint ? CHECK_PACING : PRACTICE_PACING, seed: seedOf(o.run, o.step),
  })
  let runner = build()
  try {
    replay(runner, o.history.filter((h) => h.step === o.step))
  } catch (e) {
    if (!(e instanceof ReplayMismatch)) throw e
    runner = build()
  }
  return makeDrill({
    format, runner, feedback: checkpoint ? 'deferred' : 'instant', onEnd: o.onEnd,
    onRespond(current, correct) {
      void app.record({
        kind: 'trial', v: 1, payload: {
          lessonId: lesson.id, lessonHash: o.lessonHash, run: o.run, step: o.step, key: current.key, attempt: current.attempt,
          itemId: current.target, widget: format.widget, mode: checkpoint ? 'checkpoint' : 'lesson', correct, recycled: false,
        },
      })
    },
  })
}
