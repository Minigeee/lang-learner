import { createApp } from 'vue'
import '@fontsource/lexend/400.css'
import '@fontsource/lexend/500.css'
import '@fontsource/lexend/600.css'
import '@fontsource/noto-serif-sc/500.css'
import './styles/tokens.css'
import './styles/base.css'
import App from './App.vue'

createApp(App).mount('#app')

// The service worker exists only in built apps (vite.config.ts emits it); Vite's dev server serves
// modules unbundled, so there's no shell to cache there.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  void navigator.serviceWorker.register('/sw.js').catch(() => undefined)
}
