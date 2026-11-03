// Widget name → Vue view. Definitions (the contract) live in core/lesson.ts and never import these.
import type { Component } from 'vue'
import type { WidgetUse } from '../core/lesson'
import ChoicePad from './widgets/ChoicePad.vue'
import ClipStudy from './widgets/ClipStudy.vue'
import OddOneOut from './widgets/OddOneOut.vue'
import Mismatch from './widgets/Mismatch.vue'

export const WIDGET_VIEWS: Record<WidgetUse['widget'], Component> = {
  'choice-pad': ChoicePad,
  'clip-study': ClipStudy,
  'odd-one-out': OddOneOut,
  mismatch: Mismatch,
}
