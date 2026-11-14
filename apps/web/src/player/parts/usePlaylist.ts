// Plays a list of clips in order, or one on tap. A tap or unmount cancels a play-through.
import { onBeforeUnmount, ref, type Ref } from 'vue'
import type { ClipId } from '@lang-learner/core'
import { usePlayback } from '../lessonView.ts'

/** Gap between clips in a play-through. */
const GAP_MS = 420

export function usePlaylist(clips: Readonly<Ref<readonly ClipId[]>>) {
  const { play } = usePlayback()
  const playing = ref(-1)
  const heardAll = ref(false)
  let seq = 0

  async function playAll() {
    const mine = ++seq
    for (let i = 0; i < clips.value.length; i++) {
      if (mine !== seq) return
      playing.value = i
      await play(clips.value[i]!)
      if (mine !== seq) return
      if (i < clips.value.length - 1) await new Promise((r) => setTimeout(r, GAP_MS))
    }
    if (mine !== seq) return
    playing.value = -1
    heardAll.value = true
  }

  async function playOne(i: number) {
    seq++
    playing.value = i
    await play(clips.value[i]!)
    if (playing.value === i) playing.value = -1
  }

  onBeforeUnmount(() => { seq++ })
  return { playing, heardAll, playAll, playOne }
}
