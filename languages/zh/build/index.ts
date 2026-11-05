// The zh pack's build half. Node only: it holds the dictionary, the analyzer and the zh lint.
import type { ItemId } from '@lang-learner/core'
import { supportTexts, type BuildPack, type Rule } from '@lang-learner/content-tools'
import { analyze } from './analyzer.ts'
import { itemKey, loadCedict, type LexEntry } from './cedict.ts'
import { hskCoverage, loadVocab } from './vocab.ts'

const lexicon = loadCedict()
const wordId = (key: string) => `zh:w:${key}` as ItemId
const entriesOf = (id: string): LexEntry[] => {
  const [, , surface = '', reading = ''] = id.split(':')
  return (lexicon.bySimp.get(surface) ?? []).filter((e) => itemKey(e) === `${surface}:${reading}`)
}

/** A short Han run with no sentence punctuation reads as a mention of a word, not an example. */
function isMention(run: string): boolean {
  return [...run.replace(/[^\p{Script=Han}]/gu, '')].length <= 4 && !/[。？！，]/.test(run)
}

const zhMarkup: Rule = {
  id: 'ZH001',
  summary: 'A Chinese sentence in support text is marked :ex (it needs a clip) or :m (a mention). Short runs are mentions.',
  run({ docs }) {
    return docs.flatMap((doc) => supportTexts(doc).flatMap((t) => (t.text.match(/[\p{Script=Han}，。？！、]+/gu) ?? [])
      .filter((run) => !isMention(run))
      .map((run) => ({ ...t.at, rule: 'ZH001', severity: 'error' as const, message: `unmarked Chinese "${run}" reads as an example; mark it :ex[…] (it needs a clip) or :m[…] (a mention, no audio)` }))))
  },
}

export const pack: BuildPack = {
  code: 'zh',
  itemKinds: ['c', 'cmp'],
  wordKeyError: (key) => (/^[^:\s]+:(?:[a-zv]+[1-5])+$/.test(key) ? null : `word key "${key}" must be <lemma>:<pinyin with a tone digit 1–5 after each syllable, ü as v>`),
  wordExists: (id) => entriesOf(id).length > 0,
  wordIds: (surface) => [...new Set((lexicon.bySimp.get(surface) ?? []).map(itemKey).filter((k) => k !== null))].map(wordId),
  wordToken(id) {
    const [, , s = '', r = ''] = id.split(':')
    return { s, r, id }
  },
  dictionarySenses: (id) => entriesOf(id).flatMap((e) => e.glosses),
  analyze: (line) => analyze(line, lexicon),
  simplify: (text) => [...text].map((ch) => lexicon.toSimplified.get(ch) ?? ch).join(''),
  loadVocab,
  rules: [zhMarkup, hskCoverage],
}
