// content:upload: the build's bundle and the ingester's cached media go to the bucket, manifest last,
// so an app pinned to a build can never find its manifest before its files.
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Manifest } from '@lang-learner/core'

export interface Bucket {
  /** The file names directly under a folder. */
  list(folder: string): Promise<Set<string>>
  put(path: string, body: Buffer, contentType: string): Promise<void>
}

export interface UploadPlan {
  /** A dist/content folder holding one build. */
  distDir: string
  /** The ingester's finished files, named as their bucket keys are. */
  mediaDir: string
  /** The bucket key of every audio file this build's media refers to. */
  mediaKeys: string[]
}

export interface UploadResult {
  build: string
  uploaded: number
  skipped: number
}

function readManifest(distDir: string): { file: string; manifest: Manifest } {
  const builds = join(distDir, 'builds')
  const [file] = existsSync(builds) ? readdirSync(builds) : []
  if (!file) throw new Error(`No build in ${distDir}. Run content:build first.`)
  return { file, manifest: JSON.parse(readFileSync(join(builds, file), 'utf8')) as Manifest }
}

/** Sends what's missing. Fails before the manifest if any file the build needs can't be put in place. */
export async function uploadBuild(bucket: Bucket, plan: UploadPlan): Promise<UploadResult> {
  const { file, manifest } = readManifest(plan.distDir)
  const result = { build: manifest.build, uploaded: 0, skipped: 0 }
  const send = async (path: string, source: string, contentType: string, present: Set<string>, name: string) => {
    if (present.has(name)) {
      result.skipped++
      return
    }
    await bucket.put(path, readFileSync(source), contentType)
    result.uploaded++
  }

  const files = await bucket.list('content/files')
  for (const name of readdirSync(join(plan.distDir, 'files')).sort()) {
    await send(`content/files/${name}`, join(plan.distDir, 'files', name), 'application/json', files, name)
  }

  const media = await bucket.list('media')
  const cached = existsSync(plan.mediaDir) ? readdirSync(plan.mediaDir).sort() : []
  for (const name of cached) await send(`media/${name}`, join(plan.mediaDir, name), 'audio/ogg', media, name)
  const missing = plan.mediaKeys.filter((key) => {
    const name = key.replace(/^media\//, '')
    return !media.has(name) && !cached.includes(name)
  })
  if (missing.length) throw new Error(`Not in the media cache or the bucket, so the build wasn't published: ${missing.join(', ')}`)

  const builds = await bucket.list('content/builds')
  await send(`content/builds/${file}`, join(plan.distDir, 'builds', file), 'application/json', builds, file)
  return result
}
