// The zh pack's Vue half (architecture §6, LanguagePackViews). Figures take the app's `t` and the
// lesson step as props, so their labels stay in the app's string tables.
import type { Component } from 'vue'
import ToneContours from './ToneContours.vue'

export const zhViews: { figures: Record<string, Component> } = {
  figures: { 'tone-contours': ToneContours },
}
