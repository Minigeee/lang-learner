// One short message at the bottom of the screen, with an optional action such as Undo. A new message
// replaces the one showing. `Toast.vue`, mounted once in the shell, draws it.
import { shallowRef } from 'vue'

export interface ToastMessage {
  text: string
  action?: { label: string; run: () => void }
}

const SHOW_MS = 6000
export const toastMessage = shallowRef<ToastMessage | null>(null)
let timer: ReturnType<typeof setTimeout> | undefined

export function toast(message: ToastMessage): void {
  clearTimeout(timer)
  toastMessage.value = message
  timer = setTimeout(() => { toastMessage.value = null }, SHOW_MS)
}

export function dismissToast(): void {
  clearTimeout(timer)
  toastMessage.value = null
}
