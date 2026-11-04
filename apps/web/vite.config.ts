import { execSync } from 'node:child_process'
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

const commit = () => {
  try { return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim() } catch { return 'unknown' }
}

export default defineConfig({
  plugins: [vue()],
  define: { __BUILD__: JSON.stringify(process.env.BUILD_ID ?? `dev-${commit()}`) },
  server: {
    port: 5173,
    strictPort: true,
    // The phone reaches the local stack through this port, so it only needs the one.
    proxy: {
      '/supabase': {
        target: 'http://127.0.0.1:54321',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/supabase/, ''),
      },
    },
  },
  test: { environment: 'node', testTimeout: 30_000 },
})
