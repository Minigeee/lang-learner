// Plays a list of clips in order, or one on tap, and remembers whether the whole list has been heard.
// A tap or unmount cancels a play-through in progress.
import { onBeforeUnmount, ref, type Ref } from 'vue'
import type { Clip } from '../core/types'
import { useMedia } from './useMedia'

/** Gap between clips in a play-through. */
const GAP_MS = 420

export function usePlaylist(clips: Readonly<Ref<Clip[]>>) {
  const { media, lesson } = useMedia()
  const playing = ref(-1)
  const heardAll = ref(false)
  let seq = 0

  async function playAll() {
    const mine = ++seq
    for (let i = 0; i < clips.value.length; i++) {
      if (mine !== seq) return
      playing.value = i
      await media.play(clips.value[i], { lesson })
      if (mine !== seq) return
      if (clips.value.length > 1) await new Promise((r) => setTimeout(r, GAP_MS))
    }
    if (mine !== seq) return
    playing.value = -1
    heardAll.value = true
  }

  async function playOne(i: number) {
    seq++
    playing.value = i
    await media.play(clips.value[i], { lesson })
    if (playing.value === i) playing.value = -1
  }

  onBeforeUnmount(() => { seq++ })
  return { playing, heardAll, playAll, playOne }
}
