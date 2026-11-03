// Media handle: the only way widgets play audio. Hides whether a clip is a real file or the
// placeholder synth, and records exposure for every play.
import { ref } from 'vue'
import type { Clip, Speaker } from './types'
import { record } from './events'

/** Pitch contour per tone, as multiples of the speaker's base pitch over the syllable. */
const CONTOURS: Record<number, number[]> = {
  1: [1.32, 1.32, 1.32],
  2: [0.98, 1.1, 1.36],
  3: [0.86, 0.7, 0.92],
  4: [1.42, 1.1, 0.78],
  5: [1.0, 0.96, 0.94],
}

export interface MediaHandle {
  /** Plays the clip and resolves when it ends or is interrupted. Only one clip plays at a time. */
  play(clip: Clip, ctx: { lesson: string }): Promise<void>
  stop(): void
  /** Id of the clip currently playing, or null. */
  playing: Readonly<{ value: string | null }>
  /** True when a clip has no real recording and the synth stood in for it. */
  isPlaceholder(clip: Clip): boolean
}

export function createMediaHandle(speakers: Record<string, Speaker>): MediaHandle {
  const playing = ref<string | null>(null)
  let audioCtx: AudioContext | null = null
  let current: { stop(): void; done: Promise<void> } | null = null

  function ctx(): AudioContext {
    audioCtx ??= new AudioContext()
    if (audioCtx.state === 'suspended') void audioCtx.resume()
    return audioCtx
  }

  function synth(clip: Clip): { stop(): void; done: Promise<void> } {
    const ac = ctx()
    const base = speakers[clip.speaker]?.basePitch ?? 200
    const tones = clip.synth.kind === 'syllable' ? [clip.synth.tone] : clip.synth.tones
    const sylDur = clip.synth.kind === 'syllable' ? 0.42 : 0.24
    const t0 = ac.currentTime + 0.03
    const osc = ac.createOscillator()
    const filter = ac.createBiquadFilter()
    const gain = ac.createGain()
    osc.type = 'sawtooth'
    filter.type = 'lowpass'
    filter.frequency.value = 900 + base * 2
    gain.gain.value = 0
    osc.connect(filter).connect(gain).connect(ac.destination)
    tones.forEach((tone, i) => {
      const start = t0 + i * sylDur
      const contour = CONTOURS[tone] ?? CONTOURS[5]
      const dur = tone === 5 ? sylDur * 0.6 : sylDur * 0.88
      contour.forEach((m, j) => osc.frequency.linearRampToValueAtTime(base * m, start + (dur * j) / (contour.length - 1)))
      gain.gain.setTargetAtTime(0.16, start, 0.012)
      gain.gain.setTargetAtTime(0, start + dur - 0.03, 0.015)
    })
    const end = t0 + tones.length * sylDur + 0.08
    osc.start(t0)
    osc.stop(end)
    let resolve!: () => void
    const done = new Promise<void>((r) => (resolve = r))
    osc.onended = () => resolve()
    return { stop: () => { try { osc.stop() } catch { /* already stopped */ } resolve() }, done }
  }

  function file(clip: Clip): { stop(): void; done: Promise<void> } {
    const el = new Audio(clip.src)
    let resolve!: () => void
    const done = new Promise<void>((r) => (resolve = r))
    el.onended = () => resolve()
    el.onerror = () => resolve()
    void el.play().catch(() => resolve())
    return { stop: () => { el.pause(); resolve() }, done }
  }

  return {
    playing,
    isPlaceholder: (clip) => !clip.src,
    async play(clip, { lesson }) {
      current?.stop()
      const handle = clip.src ? file(clip) : synth(clip)
      current = handle
      playing.value = clip.id
      record({ kind: 'exposure', clipId: clip.id, speaker: clip.speaker, lesson })
      await handle.done
      if (current === handle) { current = null; playing.value = null }
    },
    stop() { current?.stop(); current = null; playing.value = null },
  }
}
