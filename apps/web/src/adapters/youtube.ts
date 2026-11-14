// The YouTube IFrame adapter (README Video row): embeds only, playsinline, foreground, online only.
// The only module that knows the IFrame API.
import { devMuted } from './devMute.ts'

interface YTPlayer { destroy(): void; mute(): void }
interface YTNamespace {
  Player: new (el: HTMLElement, o: {
    videoId: string
    playerVars: Record<string, string | number>
    events: { onReady(e: { target: YTPlayer }): void; onStateChange(e: { data: number }): void; onError(e: { data: number }): void }
  }) => YTPlayer
  PlayerState: { PLAYING: number }
}
declare global {
  interface Window { YT?: YTNamespace; onYouTubeIframeAPIReady?: () => void }
}

let api: Promise<YTNamespace> | null = null

function loadApi(): Promise<YTNamespace> {
  api ??= new Promise<YTNamespace>((resolve, reject) => {
    if (window.YT?.Player) return resolve(window.YT)
    window.onYouTubeIframeAPIReady = () => resolve(window.YT!)
    const script = document.createElement('script')
    script.src = 'https://www.youtube.com/iframe_api'
    script.onerror = () => {
      api = null
      reject(new Error('YouTube is unreachable'))
    }
    document.head.append(script)
  })
  return api
}

export interface Embed { destroy(): void }

/**
 * Mounts a player in `el`. `onStart` runs once, the first time the video plays. `onError` runs when
 * the API can't load or the video won't play here.
 */
export async function embedVideo(el: HTMLElement, youtubeId: string, on: { onStart(): void; onError(): void }): Promise<Embed> {
  let started = false
  try {
    const YT = await loadApi()
    const player = new YT.Player(el, {
      videoId: youtubeId,
      playerVars: { playsinline: 1, rel: 0, modestbranding: 1, origin: location.origin, ...(devMuted ? { mute: 1 } : {}) },
      events: {
        onReady(e) {
          if (devMuted) e.target.mute()
        },
        onStateChange(e) {
          if (e.data === YT.PlayerState.PLAYING && !started) {
            started = true
            on.onStart()
          }
        },
        onError: () => on.onError(),
      },
    })
    return { destroy: () => player.destroy() }
  } catch {
    on.onError()
    return { destroy: () => undefined }
  }
}
