import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// Local-only dev server. --host (in package.json) exposes it on the LAN so a phone can open it.
export default defineConfig({
  plugins: [vue()],
  server: { port: 5173 },
})
