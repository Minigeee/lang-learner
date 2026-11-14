// How compiled lessons read on screen: user-facing labels (app-ui-flow "UI copy": no internal terms)
// and the text of a clip. Every label here is an English key into ui.tsv.
import { inject, provide, type InjectionKey } from 'vue'
import type { Clip, ClipId, CompiledLesson, Format, LanguagePack, LessonId, OpenerType, Shape, Step, Token } from '@lang-learner/core'
import { useApp } from '../app.ts'

export const SHAPE_LABEL: Record<Shape, string> = {
  sound: 'Sound practice', pattern: 'Lesson', clip: 'Video lesson', checkpoint: 'Check',
}

const OPENER_LABEL: Record<OpenerType, string> = {
  story: 'Listen', mystery: 'Puzzle', showdown: 'Compare', discover: 'Spot the pattern',
}

/** A format's name and its one-line introduction (brainstorm §4.3). */
export const FORMAT_INFO: Partial<Record<Format, { name: string; how: string }>> = {
  C0: { name: 'Pick one', how: 'Hear it, then tap the answer.' },
  C1: { name: 'Recall', how: 'Hear it and think of the meaning. Then show it and say whether you knew it.' },
}

export function stepLabel(step: Step, shape: Shape): string {
  switch (step.kind) {
    case 'opener': return OPENER_LABEL[step.type]
    case 'lesson': return 'How it works'
    case 'examples': return step.clips.length ? 'Examples' : 'New words'
    case 'read-along': return 'Read along'
    case 'practice': return shape === 'checkpoint' ? 'Check' : 'Practice'
  }
}

/** What a clip shows: its line, or for a bare syllable its toned spelling. */
export const clipText = (clip: Clip, pack: LanguagePack): string => (clip.tokens.length ? clip.zh : pack.displayReading(clip.zh))

/** The reading line under a clip's text, word by word. Empty for a bare syllable, whose text is its reading. */
export const clipReading = (clip: Clip, pack: LanguagePack): string =>
  clip.tokens.filter((t) => t.r).map((t) => pack.displayReading(t.r!)).join(' ')

export const tokenReading = (token: Token, pack: LanguagePack): string => (token.r ? pack.displayReading(token.r) : '')

/** How the components inside a player or a review play clips: with exposure attributed to its lesson, if any. */
interface Playback {
  play(clip: ClipId): Promise<void>
}

const PLAYBACK: InjectionKey<Playback> = Symbol('playback')
const LESSON: InjectionKey<CompiledLesson> = Symbol('lesson')

/** Provides clip playback to the components below, attributed to `lesson` (null outside lessons). */
export function providePlayback(lesson: LessonId | null): Playback {
  const app = useApp()
  const playback: Playback = { play: (clip) => app.clips.play(clip, lesson) }
  provide(PLAYBACK, playback)
  return playback
}

export function usePlayback(): Playback {
  const playback = inject(PLAYBACK)
  if (!playback) throw new Error('usePlayback() needs providePlayback() above it')
  return playback
}

/** Provides the lesson a player is showing, and playback attributed to it. */
export function provideLesson(lesson: CompiledLesson): void {
  provide(LESSON, lesson)
  providePlayback(lesson.id)
}

export function useLesson(): { lesson: CompiledLesson; play: Playback['play'] } {
  const lesson = inject(LESSON)
  if (!lesson) throw new Error('useLesson() needs a LessonPlayer above it')
  return { lesson, play: usePlayback().play }
}

/** A short vibration where supported (Android). */
export function haptic(ms = 8): void {
  if ('vibrate' in navigator) navigator.vibrate(ms)
}
