// The placement tables in content/zh/vocab/: HSK entries (vocab-S1, vocab-S2), the frequency gaps
// (vocab-extra, vocab-post-S2) and the HSK source list (words-l1-3).
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Placement, Project, Rule } from '@lang-learner/content-tools'

interface Row {
  fields: Record<string, string>
  file: string
  line: number
}

function readTsv(dir: string, name: string): Row[] {
  const path = join(dir, name)
  if (!existsSync(path)) return []
  const [header = '', ...lines] = readFileSync(path, 'utf8').split(/\r?\n/)
  const columns = header.split('\t')
  return lines.flatMap((text, i) => {
    if (!text) return []
    const cells = text.split('\t')
    return [{ fields: Object.fromEntries(columns.map((c, j) => [c, cells[j] ?? ''])), file: path, line: i + 2 }]
  })
}

const PLACED = ['vocab-S1.tsv', 'vocab-S2.tsv', 'vocab-extra.tsv', 'vocab-post-S2.tsv']

export function loadVocab(dir: string): Placement[] {
  return PLACED.flatMap((name) => readTsv(dir, name)).map((r) => ({
    word: r.fields.word ?? '',
    tier: r.fields.tier as Placement['tier'],
    place: r.fields.place ?? '',
    neededBy: (r.fields.needed_by ?? '').split(' ').filter(Boolean),
    ...(r.fields.rank ? { rank: Number(r.fields.rank) } : {}),
    at: { file: r.file, line: r.line },
  }))
}

/**
 * VOC001's HSK half: every source row is placed exactly once across vocab-S1 and vocab-S2 (an entry
 * may gain extra `sense:` rows, never lose its own), and no HSK word also sits in a gap file.
 */
export const hskCoverage: Rule = {
  id: 'VOC001',
  summary: 'Every HSK 2025 L1-3 entry is placed exactly once, and no HSK word sits in a gap file.',
  run({ paths }: Project) {
    const hsk = [...readTsv(paths.vocab, 'vocab-S1.tsv'), ...readTsv(paths.vocab, 'vocab-S2.tsv')]
    const gaps = [...readTsv(paths.vocab, 'vocab-extra.tsv'), ...readTsv(paths.vocab, 'vocab-post-S2.tsv')]
    const source = readTsv(paths.vocab, 'words-l1-3.tsv')
    const key = (r: Row) => `${r.fields.word}\t${r.fields.level}`
    const count = (rows: Row[]) => rows.reduce((m, r) => m.set(key(r), (m.get(key(r)) ?? 0) + 1), new Map<string, number>())
    const placed = count(hsk)
    const senseRows = count(hsk.filter((r) => r.fields.note?.includes('sense:')))
    const out = []
    for (const [k, n] of count(source)) {
      const have = placed.get(k) ?? 0
      if (have < n || have > n + (senseRows.get(k) ?? 0)) {
        const row = source.find((r) => key(r) === k)!
        out.push({ file: row.file, line: row.line, rule: 'VOC001', severity: 'error' as const, message: `HSK entry ${k.replace('\t', ' L')}: ${n} source row(s), ${have} placed` })
      }
    }
    const hskWords = new Set(hsk.map((r) => r.fields.word))
    for (const r of gaps) {
      if (hskWords.has(r.fields.word) && !r.fields.note?.includes('sense')) {
        out.push({ file: r.file, line: r.line, rule: 'VOC001', severity: 'error' as const, message: `${r.fields.word} is in an HSK file and in a gap file` })
      }
    }
    return out
  },
}
