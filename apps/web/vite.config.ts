import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { loadEnv, type Plugin } from 'vite'
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

const commit = () => {
  try { return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim() } catch { return 'unknown' }
}

/** The local apps/server (`pnpm dev` starts both). */
const SERVER = `http://127.0.0.1:${process.env.SERVER_PORT ?? '8787'}`

/**
 * Emits `sw.js`: the service worker source with this build's id and app shell files in front of it.
 * Fonts ship as woff2 and woff; every browser that runs a service worker reads woff2, so only those
 * are precached.
 */
function serviceWorker(build: string): Plugin {
  return {
    name: 'lang-learner-sw',
    apply: 'build',
    generateBundle(_options, bundle) {
      const files = Object.keys(bundle).filter((f) => f !== 'index.html' && !f.endsWith('.woff') && !f.endsWith('.map')).sort()
      const source = readFileSync(new URL('./sw/sw.js', import.meta.url), 'utf8')
      this.emitFile({ type: 'asset', fileName: 'sw.js', source: `const SHELL = ${JSON.stringify({ build, files })}\n${source}` })
    },
  }
}

export default defineConfig(({ mode }) => {
  const build = process.env.BUILD_ID ?? `dev-${commit()}`
  const content = loadEnv(mode, process.cwd()).VITE_CONTENT_BUILD ?? 'none'
  return {
    plugins: [vue(), serviceWorker(`${build}+${content}`)],
    define: { __BUILD__: JSON.stringify(build) },
    server: {
      host: '127.0.0.1',
      port: 5173,
      strictPort: true,
      proxy: { '/sync': SERVER, '/content': SERVER },
    },
    test: { environment: 'node', testTimeout: 30_000 },
  }
})
