/// <reference types="vite/client" />

declare const __BUILD__: string

declare module '*.tsv?raw' {
  const text: string
  export default text
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent
  export default component
}

interface ImportMetaEnv {
  /** The content build this app reads, written by `pnpm content:build`. */
  readonly VITE_CONTENT_BUILD?: string
}
