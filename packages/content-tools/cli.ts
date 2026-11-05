// The content toolchain: pnpm content:check | content:build | content:upload | content:suggest <slug>
// Run from the repo root. `--root` and `--overlay` point it at another content tree, as the fixtures do.
import { createClient } from '@supabase/supabase-js'
import type { LessonId } from '@lang-learner/core'
import { supabaseStatus } from '../../scripts/supabase-env.mjs'
import { setWebEnv } from '../../scripts/web-env.mjs'
import { runRules } from './check.ts'
import { addStrings, compile, writeBundle } from './compile.ts'
import { format } from './diag.ts'
import { loadProject, type Project } from './project.ts'
import { suggest } from './suggest.ts'
import { uploadBuild, type Bucket } from './upload.ts'

const DIST = 'dist/content'
const MEDIA_CACHE = 'tools/media-ingest/.cache/out'
const TRANSCRIPTS = 'tools/media-ingest/.cache/transcripts'
const BUCKET = 'private'

const [command, ...args] = process.argv.slice(2)
const flag = (name: string) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 ? args[i + 1] : undefined
}
const root = flag('root') ?? 'content'
const overlay = flag('overlay')

async function checked(): Promise<Project> {
  const project = await loadProject({ root, ...(overlay ? { overlay } : {}) })
  const diags = runRules(project)
  for (const d of diags) console.log(format(d))
  const errors = diags.filter((d) => d.severity === 'error').length
  console.log(`${project.docs.length} lesson file(s), ${project.curriculum.lessons.size} lessons, ${project.curriculum.units.size} units, ${errors} error(s), ${diags.length - errors} warning(s)`)
  if (errors) process.exit(1)
  return project
}

function storageBucket(): Bucket {
  const { API_URL, SECRET_KEY } = supabaseStatus()
  if (!API_URL || !SECRET_KEY) throw new Error('No secret key. Is the stack running? Try `pnpm db:start`.')
  const storage = createClient(API_URL, SECRET_KEY).storage.from(BUCKET)
  const pageSize = 1000
  return {
    async list(folder) {
      const names = new Set<string>()
      for (let offset = 0; ; offset += pageSize) {
        const { data, error } = await storage.list(folder, { limit: pageSize, offset })
        if (error) throw new Error(`Can't list ${folder}: ${error.message}`)
        for (const f of data) names.add(f.name)
        if (data.length < pageSize) return names
      }
    },
    async put(path, body, contentType) {
      const { error } = await storage.upload(path, body, { contentType })
      if (error) throw new Error(`Can't upload ${path}: ${error.message}`)
    },
  }
}

async function main() {
  switch (command) {
    case 'check':
      await checked()
      return
    case 'build': {
      const project = await checked()
      const bundle = compile(project)
      writeBundle(bundle, DIST)
      const added = addStrings(project.paths.strings, bundle.strings)
      setWebEnv('VITE_CONTENT_BUILD', bundle.manifest.build)
      console.log(`build ${bundle.manifest.build}: ${Object.keys(bundle.manifest.lessons).length} lesson(s), ${bundle.files.size} file(s), ${added} new string(s)`)
      return
    }
    case 'upload': {
      const project = await checked()
      const mediaKeys = [...project.clips.values()].map((c) => c.file.key)
      const result = await uploadBuild(storageBucket(), { distDir: DIST, mediaDir: MEDIA_CACHE, mediaKeys })
      console.log(`build ${result.build}: ${result.uploaded} uploaded, ${result.skipped} already there`)
      return
    }
    case 'suggest': {
      const slug = args.find((a) => !a.startsWith('--') && a !== root && a !== overlay)
      if (!slug) throw new Error('Usage: pnpm content:suggest <lesson-slug>')
      const project = await loadProject({ root, ...(overlay ? { overlay } : {}) })
      const lesson = project.curriculum.lessons.get(`${project.lang}:les:${slug}` as LessonId)
      if (!lesson) throw new Error(`No lesson "${slug}" in the curriculum`)
      const lines = suggest(project, lesson, TRANSCRIPTS)
      for (const s of lines) {
        const utterances = s.utterances.map((u) => `${u.corpus}:${u.utt}`).join(' ')
        console.log(`${s.speakers}\t${s.zh}\t${utterances}`)
      }
      console.log(`${lines.length} line(s) on the path of ${lesson.label}`)
      return
    }
    default:
      throw new Error('Usage: cli.ts check | build | upload | suggest <lesson-slug>')
  }
}

try {
  await main()
} catch (e) {
  console.error(e instanceof Error ? e.message : e)
  process.exit(1)
}
