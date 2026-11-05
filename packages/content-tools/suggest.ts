// content:suggest: corpus lines a lesson can use, from the ingester's transcript cache. It works for a
// lesson with no file yet, since the path comes from the curriculum and the placement tables.
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { ItemId } from '@lang-learner/core'
import type { LessonNode } from './curriculum.ts'
import { byCodePoint } from './diag.ts'
import { groupBy, type Project } from './project.ts'
import { offPathWords, wordsOnPath } from './rules/deps.ts'

const HAN = /\p{Script=Han}/gu
const LATIN = /[A-Za-z]/
/** Lines longer than this are too long for an early listener. */
const MAX_HANZI = 20

export interface Suggestion {
  zh: string
  /** Distinct speakers saying this line. */
  speakers: number
  /** One utterance per corpus, for a requests.yaml entry. */
  utterances: { corpus: string; utt: string; speaker: string }[]
}

interface Line { zh: string; corpus: string; utt: string; speaker: string }

/** Reads every `<corpus>.tsv` (columns utt, speaker, sentence) in the cache. */
function readTranscripts(project: Project, dir: string): Line[] {
  if (!existsSync(dir) || !readdirSync(dir).some((n) => n.endsWith('.tsv'))) {
    throw new Error(`No transcripts in ${dir}. Fetch them first with the media ingester: python -I -X utf8 -m media_ingest fetch`)
  }
  return readdirSync(dir).filter((n) => n.endsWith('.tsv')).sort().flatMap((name) => {
    const corpus = name.replace(/\.tsv$/, '')
    const [header = '', ...rows] = readFileSync(join(dir, name), 'utf8').split(/\r?\n/)
    const cols = header.split('\t')
    const [iUtt, iSpeaker, iSentence] = [cols.indexOf('utt'), cols.indexOf('speaker'), cols.indexOf('sentence')]
    return rows.flatMap((row) => {
      const cells = row.split('\t')
      const sentence = cells[iSentence]
      return sentence ? [{ zh: project.pack.simplify(sentence.replace(/\s+/g, '')), corpus, utt: cells[iUtt] ?? '', speaker: cells[iSpeaker] ?? '' }] : []
    })
  })
}

/** Lines whose words are all on the lesson's path, most voices first. */
export function suggest(project: Project, lesson: LessonNode, transcriptsDir: string): Suggestion[] {
  const known = wordsOnPath(project, lesson)
  const doc = project.docs.find((d) => project.lessonOf(d)?.id === lesson.id)
  const declared = [...(doc?.fm?.chunks ?? []), ...(doc?.fm?.names ?? [])]
  for (const id of doc?.fm?.cards ?? []) known.add(project.pack.wordToken(id as ItemId).s)
  const chars = new Set([...known, ...declared].flatMap((w) => [...w]))

  const fits = (zh: string) => {
    const hanzi = zh.match(HAN) ?? []
    return !LATIN.test(zh) && hanzi.length > 0 && hanzi.length <= MAX_HANZI && hanzi.every((c) => chars.has(c))
  }
  const byLine = groupBy(readTranscripts(project, transcriptsDir).filter((l) => fits(l.zh)), (l) => l.zh)
  const out: Suggestion[] = []
  for (const [zh, lines] of byLine) {
    if (offPathWords(project, zh, known, declared).length) continue
    const corpora = new Map(lines.map((l) => [l.corpus, l]))
    out.push({
      zh,
      speakers: new Set(lines.map((l) => `${l.corpus}:${l.speaker}`)).size,
      utterances: [...corpora.values()].map(({ corpus, utt, speaker }) => ({ corpus, utt, speaker })),
    })
  }
  return out.sort((a, b) => b.speakers - a.speakers || byCodePoint(a.zh, b.zh))
}
