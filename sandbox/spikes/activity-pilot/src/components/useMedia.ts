import { inject, type InjectionKey } from 'vue'
import type { MediaHandle } from '../core/media'

export const MEDIA: InjectionKey<MediaHandle> = Symbol('media')
export const LESSON_ID: InjectionKey<string> = Symbol('lesson')

export function useMedia(): { media: MediaHandle; lesson: string } {
  const media = inject(MEDIA)
  if (!media) throw new Error('useMedia() needs a provided MediaHandle')
  return { media, lesson: inject(LESSON_ID, 'none') }
}

/** Short vibration on supporting devices (Android). iOS Safari ignores it. */
export function haptic(ms = 8): void {
  if ('vibrate' in navigator) navigator.vibrate(ms)
}
