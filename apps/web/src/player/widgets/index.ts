// Widget registry, view half: a format's widget name (core FORMATS) to the Vue view that plays it.
// Each view takes `{ drill: Drill; prompt: string }`.
import type { Component } from 'vue'
import PickWidget from './PickWidget.vue'
import RecallWidget from './RecallWidget.vue'

export const WIDGET_VIEWS: Record<string, Component> = { pick: PickWidget, recall: RecallWidget }
