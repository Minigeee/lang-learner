// Figure registry: a lesson's `figure` name to the view that draws it. A pack draws its language's
// own figures (PackViews.figures); the app draws the ones any language can use.
import type { Component } from 'vue'
import type { Step } from '@lang-learner/core'
import type { PackViews } from '../../languages.ts'
import SlotBands from './SlotBands.vue'

/** What every figure view receives. */
export interface FigureProps {
  t: (en: string, vars?: Record<string, string | number>) => string
  step: Extract<Step, { kind: 'lesson' }>
}

const APP_FIGURES: Record<string, Component> = { 'slot-bands': SlotBands }

/** The view for a figure name, or undefined when this build can't draw it. */
export const figure = (name: string, pack: PackViews): Component | undefined => pack.figures[name] ?? APP_FIGURES[name]
