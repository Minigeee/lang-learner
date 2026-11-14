import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { CompiledLesson, CurriculumStage, FeedEntry, MediaBundle, VocabCard } from '@lang-learner/core'
import { describe, expect, it } from 'vitest'
import { addStrings, compile, writeBundle, type Bundle } from '../compile.ts'
import { loadProject } from '../project.ts'
import { countWords } from '../rules/structure.ts'
import { suggest } from '../suggest.ts'

const options = { root: 'test/fixtures/_base', overlay: 'test/fixtures/pass' }
const scratch = () => mkdtempSync(join(tmpdir(), 'content-tools-'))
const read = <T>(bundle: Bundle, name: string) => JSON.parse(bundle.files.get(bundle.manifest.files[name]!)!) as T
const lesson = (bundle: Bundle, id: string) => {
  const entry = bundle.manifest.lessons[id as keyof typeof bundle.manifest.lessons]!
  return JSON.parse(bundle.files.get(entry.file)!) as CompiledLesson
}

describe('compile', () => {
  it('gives the same build twice', async () => {
    const first = compile(await loadProject(options))
    const second = compile(await loadProject(options))
    expect(second.manifest).toEqual(first.manifest)
    expect([...second.files]).toEqual([...first.files])
  })

  it('compiles the arc and derives the skill card from the practice and pool', async () => {
    const bundle = compile(await loadProject(options))
    const compiled = lesson(bundle, 'zh:les:shi-links-nouns')
    expect(compiled.steps.map((s) => s.kind)).toEqual(['opener', 'lesson', 'examples', 'practice'])
    expect(compiled.estimateSec).toBe(360)
    const practice = compiled.steps[3]!
    if (practice.kind !== 'practice') throw new Error('expected practice')
    expect(practice.items[0]).toMatchObject({ key: '1', target: 'zh:g:shi-links-nouns', answer: 'he', rung: 4 })
    expect(practice.items[0]!.stimuli).toEqual(['clip:a3-ta-laoshi-1', 'clip:tts-laoshi-line'])
    expect(compiled.cards.skill).toMatchObject({ item: 'zh:g:shi-links-nouns', format: 'C0', prompt: practice.prompt })
    expect(compiled.cards.skill!.pool[0]!.stimuli).toEqual(['clip:a3-ta-xuesheng-1'])
    const clips = compiled.steps[2]!
    if (clips.kind !== 'examples') throw new Error('expected examples')
    expect(clips.clips).toContain('clip:a3-wo-xuesheng-2') // matched with its punctuation ignored
    expect(clips.clips.filter((c) => c.includes('laoshi'))).toEqual(['clip:a3-ta-laoshi-1']) // pinned
  })

  it('keeps inline markup in body strings and resolves it beside them', async () => {
    const bundle = compile(await loadProject(options))
    const step = lesson(bundle, 'zh:les:shi-links-nouns').steps[1]!
    if (step.kind !== 'lesson') throw new Error('expected lesson')
    const strings = read<Record<string, string>>(bundle, 'strings.en')
    expect(strings[step.body[0]!]).toBe('是 joins two nouns: who, then what they are. :ex[我是学生。] says it in one line, and :w[学生] comes last.')
    expect(step.refs).toEqual({ '我是学生。': 'clip:a3-wo-xuesheng-1', 学生: 'zh:w:学生:xue2sheng5' })
    expect(step).toMatchObject({ figure: 'slot-bands', wrong: '我学生。', right: 'clip:a3-wo-xuesheng-1' })
  })

  it('compiles a read-along, a word set and a self-graded practice', async () => {
    const bundle = compile(await loadProject(options))
    const compiled = lesson(bundle, 'zh:les:meeting-someone')
    expect(compiled.steps.map((s) => s.kind)).toEqual(['opener', 'lesson', 'read-along', 'examples', 'practice'])
    const practice = compiled.steps[4]!
    if (practice.kind !== 'practice') throw new Error('expected practice')
    expect(practice.format).toBe('C1')
    expect(practice.options).toEqual([])
    expect(practice.items[0]).not.toHaveProperty('answer')
    const media = read<MediaBundle>(bundle, 'media')
    const strings = read<Record<string, string>>(bundle, 'strings.en')
    const clip = media.clips.find((c) => c.id === 'clip:tts-nihao-line')!
    expect(strings[clip.en!]).toBe('Hello!')
    expect(clip.tokens[0]).toEqual({ s: '你好', r: 'ni3hao3', id: 'zh:w:你好:ni3hao3' })
  })

  it('compiles cards with one voice, a target span and a pending image', async () => {
    const bundle = compile(await loadProject(options))
    const cards = read<VocabCard[]>(bundle, 'cards')
    expect(cards.map((c) => c.itemId)).toHaveLength(4)
    const card = cards.find((c) => c.itemId === 'zh:w:学生:xue2sheng5')!
    expect(card.senses).toEqual(['student'])
    expect(card.audio.voice).toBe('spk:elevenlabs-abc123')
    expect(card.image).toEqual({ none: 'pending' })
    const [start, end] = card.sentence.target
    expect(card.sentence.tokens.slice(start, end).map((t) => t.s).join('')).toBe('学生')
  })

  it('lists the feed in rank order, with a card only for words the overlay gives one', async () => {
    const project = await loadProject(options)
    expect(read<FeedEntry[]>(compile(project), 'feed')).toEqual([
      { tier: 'queue', word: '吃', stage: 'S1', rank: 1 },
      { tier: 'queue', word: '饭', stage: 'S1', rank: 2 },
    ])
    // A queue word that gains a card in words.yaml becomes feedable, and its card ships.
    const xuesheng = project.words.get('zh:w:学生:xue2sheng5')!
    project.words.set('zh:w:吃:chi1', { ...xuesheng, id: 'zh:w:吃:chi1', target: '学生' })
    const bundle = compile(project)
    expect(read<FeedEntry[]>(bundle, 'feed')[0]).toEqual({ tier: 'queue', word: '吃', card: 'zh:w:吃:chi1', stage: 'S1', rank: 1 })
    expect(read<VocabCard[]>(bundle, 'cards').map((c) => c.itemId)).toContain('zh:w:吃:chi1')
  })

  it('marks authored lessons, keeps direct prerequisites, and names the stages a stage assumes', async () => {
    const bundle = compile(await loadProject(options))
    const stages = read<CurriculumStage[]>(bundle, 'curriculum')
    const unit = stages[2]!.units[0]!
    expect(unit.prereqs).toEqual([])
    expect(stages[2]!.assumes).toEqual(['S1'])
    expect(stages[1]!.units.map((u) => u.id)).toEqual(['1.1', '1.2'])
    expect(unit.lessons[0]).toMatchObject({ id: 'zh:les:eats', authored: true, skill: expect.any(String) })
  })

  it('reports no authored lessons cleanly', async () => {
    const bundle = compile(await loadProject({ root: 'test/fixtures/_base' }))
    expect(bundle.manifest.lessons).toEqual({})
    expect(read<CurriculumStage[]>(bundle, 'curriculum')[0]!.units[0]!.lessons[0]!.authored).toBe(false)
  })
})

describe('strings table', () => {
  it('adds only new strings and keeps existing rows', () => {
    const path = join(scratch(), 'lessons.tsv')
    writeFileSync(path, 'en\tcontext\tzh\nHello\t\t你好\n')
    expect(addStrings(path, ['Hello', 'Bye', 'Aye'])).toBe(2)
    expect(readFileSync(path, 'utf8')).toBe('en\tcontext\tzh\nHello\t\t你好\nAye\t\t\nBye\t\t\n')
    expect(addStrings(path, ['Hello', 'Bye'])).toBe(0)
  })
})

describe('word budgets', () => {
  it('counts support words, not target text', () => {
    expect(countWords('是 joins two nouns.')).toBe(3)
    expect(countWords("doesn't, won't")).toBe(2)
  })
})

describe('writeBundle', () => {
  const mediaKeys = (bundle: Bundle) => Object.values(read<MediaBundle>(bundle, 'media').files).map((f) => f.key)

  it('writes the manifest, the files and every referenced audio file', async () => {
    const bundle = compile(await loadProject(options))
    const mediaDir = scratch()
    for (const key of mediaKeys(bundle)) writeFileSync(join(mediaDir, key.replace(/^media\//, '')), key)
    const outDir = join(scratch(), 'content')
    writeBundle(bundle, outDir, mediaDir)
    expect(existsSync(join(outDir, 'builds', `${bundle.manifest.build}.json`))).toBe(true)
    for (const name of bundle.files.keys()) expect(existsSync(join(outDir, 'files', name))).toBe(true)
    for (const key of mediaKeys(bundle)) expect(readFileSync(join(outDir, key), 'utf8')).toBe(key)
  })

  it('writes nothing when a referenced audio file is missing', async () => {
    const bundle = compile(await loadProject(options))
    const outDir = join(scratch(), 'content')
    mkdirSync(outDir)
    writeFileSync(join(outDir, 'keep.txt'), 'old build')
    expect(() => writeBundle(bundle, outDir, scratch())).toThrow(mediaKeys(bundle)[0]!)
    expect(readFileSync(join(outDir, 'keep.txt'), 'utf8')).toBe('old build')
  })
})

describe('suggest', () => {
  const transcripts = () => {
    const dir = scratch()
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'aishell3.tsv'), 'utt\tspeaker\tsentence\nSSB00010001\tSSB0001\t我是学生\nSSB00020001\tSSB0002\t我是学生\nSSB00030001\tSSB0003\t他是老师\nSSB00040001\tSSB0004\t他吃饭\nSSB00050001\tSSB0005\t他是学生吗\n')
    return dir
  }

  it('lists lines on the path with speaker counts, for a lesson with no file', async () => {
    const project = await loadProject({ root: 'test/fixtures/_base' })
    const lesson = project.curriculum.lessons.get('zh:les:shi-links-nouns')!
    expect(suggest(project, lesson, transcripts())).toEqual([
      { zh: '我是学生', speakers: 2, utterances: [{ corpus: 'aishell3', utt: 'SSB00020001', speaker: 'SSB0002' }] },
      { zh: '他是老师', speakers: 1, utterances: [{ corpus: 'aishell3', utt: 'SSB00030001', speaker: 'SSB0003' }] },
    ])
  })

  it('counts the queue of a stage the unit assumes', async () => {
    const project = await loadProject({ root: 'test/fixtures/_base' })
    const lesson = project.curriculum.lessons.get('zh:les:eats')!
    expect(suggest(project, lesson, transcripts()).map((s) => s.zh)).toContain('他吃饭')
  })

  it('says so when the transcripts are absent', async () => {
    const project = await loadProject({ root: 'test/fixtures/_base' })
    const lesson = project.curriculum.lessons.get('zh:les:eats')!
    expect(() => suggest(project, lesson, join(scratch(), 'none'))).toThrow('No transcripts')
  })
})
