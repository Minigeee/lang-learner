import type { ClipId, CompiledLesson, CurriculumStage, LessonId, Manifest, MediaBundle } from '@lang-learner/core'
import { supabase } from './auth.ts'

const BUCKET = 'private'

async function download(path: string): Promise<Blob> {
  const { data, error } = await supabase.storage.from(BUCKET).download(path)
  if (error) throw error
  return data
}

const readJson = async <T>(path: string): Promise<T> => JSON.parse(await (await download(path)).text()) as T

/** One build's content. Everything comes from the private bucket with the session token. */
export interface ContentBundle {
  manifest: Manifest
  curriculum(): Promise<CurriculumStage[]>
  lesson(id: LessonId): Promise<CompiledLesson>
  strings(): Promise<Record<string, string>>
  /** A clip's audio, downloaded whole. */
  audio(clip: ClipId): Promise<Blob>
}

/** Opens the build this app was built against, so a deployed app always reads the content it expects. */
export async function openContent(build: string): Promise<ContentBundle> {
  const manifest = await readJson<Manifest>(`content/builds/${build}.json`)
  const file = <T>(name: string) => {
    const hashed = manifest.files[name]
    if (!hashed) throw new Error(`Build ${build} has no ${name} file`)
    return readJson<T>(`content/files/${hashed}`)
  }
  let media: Promise<MediaBundle> | undefined
  return {
    manifest,
    curriculum: () => file<CurriculumStage[]>('curriculum'),
    lesson: (id) => {
      const entry = manifest.lessons[id]
      if (!entry) throw new Error(`Build ${build} has no lesson ${id}`)
      return readJson<CompiledLesson>(`content/files/${entry.file}`)
    },
    strings: () => file<Record<string, string>>('strings.en'),
    audio: async (id) => {
      media ??= file<MediaBundle>('media')
      const bundle = await media
      const clip = bundle.clips.find((c) => c.id === id)
      const entry = clip && bundle.files[clip.media]
      if (!entry) throw new Error(`Build ${build} has no clip ${id}`)
      return download(entry.key)
    },
  }
}
