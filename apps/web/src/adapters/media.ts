// The clip player (architecture §4, Media): the only way the app plays a clip. One clip plays at a
// time, and every play records an exposure, so no view can forget the "heard" bookkeeping.
import { readonly, ref, type Ref } from 'vue'
import type { ClipId, EventDraft, LessonId } from '@lang-learner/core'
import type { ContentBundle } from './contentLoader.ts'
import { devMuted } from './devMute.ts'

export interface ClipPlayer {
  /** Plays the clip, stopping any other. Resolves when it ends, is stopped, or can't play. */
  play(clip: ClipId, lesson: LessonId | null): Promise<void>
  stop(): void
  /** The clip playing now, or null. */
  playing: Readonly<Ref<ClipId | null>>
}

export function createClipPlayer(content: ContentBundle, record: (draft: EventDraft) => unknown): ClipPlayer {
  const playing = ref<ClipId | null>(null)
  const el = new Audio()
  el.muted = devMuted
  let finish: (() => void) | null = null
  let token = 0

  function stop() {
    token++
    el.pause()
    finish?.()
    finish = null
    playing.value = null
  }

  return {
    playing: readonly(playing),
    stop,
    async play(id, lesson) {
      stop()
      const mine = token
      const clip = content.clip(id)
      playing.value = id
      try {
        const url = await content.audioUrl(clip.media)
        if (mine !== token) return
        await new Promise<void>((resolve) => {
          finish = resolve
          el.onended = el.onerror = () => resolve()
          el.src = url
          el.currentTime = 0
          el.play().then(() => record({ kind: 'exposure', v: 1, payload: { type: 'clip', clipId: id, speaker: clip.speaker, lessonId: lesson } }), () => resolve())
        })
      } catch {
        // A clip that can't load is skipped; the lesson goes on.
      } finally {
        if (mine === token) {
          finish = null
          playing.value = null
        }
      }
    },
  }
}
