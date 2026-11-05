// content:build's core: checked content in, a Bundle out. Pure and deterministic: every file is
// stable JSON named by its hash, so an unchanged file keeps its name and is uploaded once.
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import type {
  Clip, ClipId, CompiledItem, CompiledLesson, Credit, CurriculumStage, Format, GoDeeper, ItemId, LessonId, Manifest,
  MediaBundle, MediaId, PracticeItem, PracticeOption, SkillCardSpec, Step, StrRef, Token, VocabCard,
} from '@lang-learner/core'
import type { LessonNode } from './curriculum.ts'
import { byCodePoint } from './diag.ts'
import { authoredLines, type ItemSource, type LessonDoc, type OptionSource, type Paragraph, type Slot } from './lesson.ts'
import { norm, type MediaRecord, type Project } from './project.ts'

export interface Bundle {
  manifest: Manifest
  /** File name to its bytes: the hash-named files. */
  files: Map<string, string>
  /** The English strings this build uses. */
  strings: string[]
}

const sha = (s: string) => createHash('sha256').update(s).digest('hex')

function stable(value: unknown): string {
  return JSON.stringify(value, (_k, x: unknown) => (x && typeof x === 'object' && !Array.isArray(x)
    ? Object.fromEntries(Object.entries(x).sort(([a], [b]) => byCodePoint(a, b)))
    : x))
}

/** The key of a support string: `hash(en, context)`, with no context until a string needs two translations. */
const stringKey = (en: string, context = '') => sha(`${en}\u0000${context}`).slice(0, 16)

class Compiler {
  readonly strings = new Map<StrRef, string>()
  readonly items = new Map<ItemId, CompiledItem>()
  readonly lines: Map<string, string>
  readonly project: Project

  constructor(project: Project) {
    this.project = project
    this.lines = new Map(project.docs.flatMap((d) => authoredLines(d)).flatMap((l) => (l.en && l.zh ? [[norm(l.zh), l.en]] : [])))
  }

  str(en: string): StrRef {
    const key = stringKey(en)
    this.strings.set(key, en)
    return key
  }

  canon<T extends string>(id: T): T {
    return (this.project.redirects.get(id)?.to ?? id) as T
  }

  /** Records an item the bundle refers to. */
  item(raw: ItemId): ItemId {
    const id = this.canon(raw)
    if (this.items.has(id)) return id
    const authored = this.project.items.get(id)
    if (authored) this.items.set(id, { id, name: this.str(authored.name) })
    else this.items.set(id, { id, senses: this.project.words.get(id)?.senses ?? this.project.pack.dictionarySenses(id) })
    return id
  }

  option(o: OptionSource): PracticeOption {
    return o.target ? { key: o.key, label: o.label, target: true } : { key: o.key, label: this.str(o.label) }
  }

  stimuli(i: ItemSource): ClipId[] {
    if (i.clip) return [i.clip as ClipId]
    if (i.syllable) return this.project.clipsForSyllable(i.syllable).map((c) => c.id)
    return this.project.clipsForLine(i.line!).map((c) => c.id)
  }

  practiceItem(i: ItemSource, n: number, fallback: ItemId | null): PracticeItem {
    return {
      key: String(n + 1),
      target: this.item((i.target as ItemId | undefined) ?? fallback!),
      stimuli: this.stimuli(i),
      rung: i.rung,
      ...(i.answer === undefined ? {} : { answer: i.answer }),
      ...(i.options ? { options: i.options.map((o) => this.option(o)) } : {}),
    }
  }

  /** The clips of a slot's `:ex` lines: a pinned one, or every voice of the transcript. */
  slotClips(s: Slot): ClipId[] {
    return s.paragraphs.flatMap((p) => p.inlines).filter((i) => i.kind === 'ex').flatMap((i) => {
      if (i.attrs.clip) return [i.attrs.clip as ClipId]
      const clips = i.attrs.syllable ? this.project.clipsForSyllable(i.attrs.syllable) : this.project.clipsForLine(i.text)
      return clips.map((c) => c.id)
    })
  }

  /** What each inline in a body string points at, so the app needs no matching of its own. */
  refs(paragraphs: Paragraph[]): Record<string, ClipId | ItemId> {
    const out: Record<string, ClipId | ItemId> = {}
    for (const i of paragraphs.flatMap((p) => p.inlines)) {
      if (i.kind === 'ex') out[i.text] = (i.attrs.clip as ClipId | undefined) ?? (i.attrs.syllable ? this.project.clipsForSyllable(i.attrs.syllable) : this.project.clipsForLine(i.text))[0]!.id
      if (i.kind === 'w') out[i.text] = this.item((i.attrs.id as ItemId | undefined) ?? this.project.pack.wordIds(i.text)[0]!)
      if (i.kind === 'k') this.item(i.attrs.id as ItemId)
    }
    return out
  }

  step(s: Slot, skill: ItemId | null): Step {
    switch (s.name) {
      case 'opener': {
        const hook = s.data?.hook
        return {
          kind: 'opener', type: s.type!, clips: this.slotClips(s),
          ...(s.data?.video ? { video: s.data.video } : {}),
          ...(hook ? { hook: { prompt: this.str(hook.prompt), options: hook.options.map((o) => this.str(o)) } } : {}),
        }
      }
      case 'lesson': {
        const { figure, video, wrong, right } = s.data ?? {}
        const refs = this.refs(s.paragraphs)
        const rightClip = right && (right.startsWith('clip:') ? (right as ClipId) : this.project.clipsForLine(right)[0]!.id)
        return {
          kind: 'lesson', body: s.paragraphs.map((p) => this.str(p.text)),
          ...(Object.keys(refs).length ? { refs } : {}),
          ...(figure ? { figure } : {}), ...(video ? { video } : {}), ...(wrong ? { wrong } : {}), ...(rightClip ? { right: rightClip } : {}),
        }
      }
      case 'examples': {
        const clips = this.slotClips(s)
        if (s.readAlong) return { kind: 'read-along', clips }
        const { words, highlight } = s.data ?? {}
        return {
          kind: 'examples', clips,
          ...(words ? { words: words.map((w) => this.item(w as ItemId)) } : {}),
          ...(highlight ? { highlight } : {}),
        }
      }
      case 'practice': {
        const data = s.data!
        return {
          kind: 'practice', format: s.format!, prompt: this.str(data.prompt),
          options: (data.options ?? []).map((o) => this.option(o)),
          items: data.items.map((i, n) => this.practiceItem(i, n, skill)),
        }
      }
    }
  }

  skillCard(doc: LessonDoc, skill: ItemId | null, steps: Step[]): SkillCardSpec | undefined {
    const practice = steps.find((s) => s.kind === 'practice')
    const pool = doc.fm?.skill?.pool
    if (!skill || !practice || !pool) return undefined
    return {
      item: this.item(skill), format: practice.format as Format, prompt: practice.prompt, options: practice.options,
      pool: pool.map((i, n) => this.practiceItem(i, n, skill)),
    }
  }

  lesson(doc: LessonDoc, node: LessonNode): CompiledLesson {
    const fm = doc.fm!
    const skill = node.skill && this.item(node.skill)
    const steps = doc.slots.map((s) => this.step(s, skill))
    const card = this.skillCard(doc, skill, steps)
    const deeper: GoDeeper[] = fm.deeper.map((d) => ({ question: this.str(d.question), answer: this.str(d.answer) }))
    return {
      id: node.id, unit: node.unit.id, shape: node.shape, skill,
      title: this.str(node.title), idea: this.str(fm.idea), estimateSec: node.minutes * 60,
      steps,
      ...(deeper.length ? { deeper } : {}),
      cards: { ...(card ? { skill: card } : {}), words: fm.cards.map((w) => this.item(w as ItemId)) },
    }
  }

  clip(c: MediaRecord): Clip {
    const zh = c.zh ?? c.syllable ?? ''
    const tokens = c.zh ? this.project.pack.analyze(c.zh) : []
    for (const t of tokens) if (t.id) this.item(t.id)
    const en = c.zh ? this.lines.get(norm(c.zh)) : undefined
    return { id: c.id, media: c.media, speaker: c.speaker, zh, tokens, durationSec: c.file.durationSec, ...(en ? { en: this.str(en) } : {}) }
  }

  card(id: ItemId, media: MediaBundle): VocabCard {
    const { project } = this
    const entry = project.words.get(id)!
    const word = project.clips.get(entry.word)!
    const sentence = media.clips.find((c) => c.id === entry.sentence)!
    const target = entry.target ?? project.pack.wordToken(id).s
    return {
      itemId: id,
      word: [project.pack.wordToken(id)],
      senses: entry.senses,
      sentence: { tokens: sentence.tokens, target: tokenSpan(sentence.tokens, target), translation: this.str(entry.en) },
      audio: { voice: word.speaker, word: word.media, sentence: sentence.media },
      image: entry.image,
    }
  }
}

/** The half-open token range covering the first occurrence of `target` in the line. */
function tokenSpan(tokens: Token[], target: string): [number, number] {
  const offset = tokens.map((t) => t.s).join('').indexOf(target)
  let start = -1
  let end = 0
  let at = 0
  tokens.forEach((t, i) => {
    const next = at + t.s.length
    if (start < 0 && next > offset) start = i
    if (at < offset + target.length) end = i + 1
    at = next
  })
  return [start, end]
}

/** Compiles a project that passed the check. */
export function compile(project: Project): Bundle {
  const c = new Compiler(project)
  const files = new Map<string, string>()
  const emit = (value: unknown) => {
    const body = stable(value)
    const hash = sha(body).slice(0, 16)
    files.set(`${hash}.json`, body)
    return { file: `${hash}.json`, hash }
  }

  const authored = project.docs.flatMap((doc) => {
    const node = project.lessonOf(doc)
    return node ? [{ doc, node }] : []
  })
  const lessons: Manifest['lessons'] = {}
  for (const { doc, node } of authored) lessons[node.id] = emit(c.lesson(doc, node))

  const records = [...project.clips.values()].sort((a, b) => byCodePoint(a.id, b.id))
  const media: MediaBundle = {
    clips: records.map((r) => c.clip(r)),
    files: Object.fromEntries(records.map((r): [MediaId, MediaBundle['files'][MediaId]] => [r.media, { key: r.file.key, bytes: r.file.bytes }])),
  }

  const cardIds = [...new Set(authored.flatMap(({ doc }) => doc.fm!.cards.map((w) => c.canon(w as ItemId))))].sort(byCodePoint)
  const cards = cardIds.map((id) => c.card(id, media))

  const authoredIds = new Set<LessonId>(authored.map(({ node }) => node.id))
  const curriculum: CurriculumStage[] = project.curriculum.stages.map((s) => ({
    id: s.id, title: s.title,
    units: s.units.map((u) => ({
      id: u.id, title: u.title, prereqs: project.curriculum.prereqsOf(u.id),
      lessons: u.lessons.map((l) => ({ id: l.id, label: l.label, title: l.title, shape: l.shape, minutes: l.minutes, authored: authoredIds.has(l.id) })),
    })),
  }))

  const credits: Credit[] = [...project.licenses.values()].flatMap((l) => {
    const count = records.filter((r) => r.rights.license === l.id).length
    return count || l.always ? [{ id: l.id, name: l.name, url: l.url, author: l.author, files: count }] : []
  })

  const items = [...c.items.values()].sort((a, b) => byCodePoint(a.id, b.id))
  const fileNames = {
    'strings.en': emit(Object.fromEntries(c.strings)).file,
    curriculum: emit(curriculum).file,
    media: emit(media).file,
    items: emit(items).file,
    cards: emit(cards).file,
    credits: emit(credits).file,
  }
  const body = { lang: project.lang, files: fileNames, lessons }
  const manifest: Manifest = { build: sha(stable(body)).slice(0, 12), ...body }
  return { manifest, files, strings: [...c.strings.values()] }
}

/** Replaces `outDir` with this bundle: `files/<hash>.json` and `builds/<build>.json`. */
export function writeBundle(bundle: Bundle, outDir: string): void {
  rmSync(outDir, { recursive: true, force: true })
  mkdirSync(join(outDir, 'files'), { recursive: true })
  mkdirSync(join(outDir, 'builds'), { recursive: true })
  for (const [name, body] of bundle.files) writeFileSync(join(outDir, 'files', name), body)
  writeFileSync(join(outDir, 'builds', `${bundle.manifest.build}.json`), stable(bundle.manifest))
}

const STRINGS_HEADER = 'en\tcontext\tzh'

/** Appends a row to the strings table for every English string it doesn't have yet, keeping the rest. */
export function addStrings(path: string, strings: string[]): number {
  const text = existsSync(path) ? readFileSync(path, 'utf8').replace(/\r\n/g, '\n') : `${STRINGS_HEADER}\n`
  const have = new Set(text.split('\n').slice(1).map((row) => row.split('\t')[0]))
  const fresh = [...new Set(strings)].filter((s) => !have.has(s)).sort(byCodePoint)
  if (fresh.length || !existsSync(path)) {
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, text + fresh.map((s) => `${s}\t\t\n`).join(''))
  }
  return fresh.length
}
