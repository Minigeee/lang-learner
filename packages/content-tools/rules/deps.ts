// DEP001, DEP002: a lesson relies only on what its path teaches, and its target words sit in its tier.
import type { ItemId } from '@lang-learner/core'
import type { LessonNode } from '../curriculum.ts'
import { error, warn, type Diag, type Loc } from '../diag.ts'
import { authoredLines, type LessonDoc } from '../lesson.ts'
import type { Rule } from '../pack.ts'
import type { Project } from '../project.ts'

/**
 * The words on a lesson's path: placed in its unit's closure, in an earlier lesson of its unit, in
 * the lesson itself, in its unit's word set or prep feed, or queued in a stage the unit assumes whole.
 */
export function wordsOnPath(project: Project, lesson: LessonNode): Set<string> {
  const { curriculum } = project
  const unit = lesson.unit.id
  const onPath = curriculum.closure(unit)
  const reached = (u: string) => u === unit || onPath.has(u)
  const words = new Set<string>()
  for (const row of project.vocab) {
    const [, tail = ''] = row.place.split(':')
    const placed = row.tier === 'lesson' ? curriculum.byLabel.get(row.place) : undefined
    const on =
      row.tier === 'lesson' ? !!placed && (onPath.has(placed.unit.id) || (placed.unit.id === unit && placed.index <= lesson.index))
      : row.tier === 'unit' ? reached(row.place)
      : row.tier === 'prep' ? reached(tail)
      : curriculum.stageComplete(tail, unit)
    if (on) words.add(row.word)
  }
  return words
}

/** True when the surface is one known word or splits wholly into known words (不是 into 不 and 是). */
function covered(surface: string, known: Set<string>): boolean {
  const cps = [...surface]
  const ok = [true, ...cps.map(() => false)]
  for (let end = 1; end <= cps.length; end++) {
    for (let start = 0; start < end && !ok[end]; start++) {
      ok[end] = ok[start]! && known.has(cps.slice(start, end).join(''))
    }
  }
  return ok[cps.length]!
}

/** The words of a line that aren't on the path. Declared chunks and names are lifted out first. */
export function offPathWords(project: Project, line: string, known: Set<string>, declared: readonly string[]): string[] {
  const longestFirst = [...declared].sort((a, b) => b.length - a.length)
  const pieces = longestFirst.reduce((parts, d) => parts.flatMap((p) => p.split(d)), [line])
  return pieces.flatMap((piece) => project.pack.analyze(piece)).filter((t) => t.r && !covered(t.s, known)).map((t) => t.s)
}

function cardWords(project: Project, doc: LessonDoc): string[] {
  return (doc.fm?.cards ?? []).map((id) => project.pack.wordToken(id as ItemId).s)
}

export const onPath: Rule = {
  id: 'DEP001',
  summary: "Every word in an authored line is on the lesson's path; a perception stage's stimuli and opener lines, which are only heard, are exempt, and frontmatter can declare chunks and names.",
  run(project) {
    const out: Diag[] = []
    for (const doc of project.docs) {
      const lesson = project.lessonOf(doc)
      if (!lesson || !doc.fm) continue
      const known = wordsOnPath(project, lesson)
      for (const w of cardWords(project, doc)) known.add(w)
      const declared = [...doc.fm.chunks, ...doc.fm.names]
      const check = (zh: string, at: Loc) => {
        const off = offPathWords(project, zh, known, declared)
        if (off.length) out.push(error(at, 'DEP001', `"${zh}" uses ${[...new Set(off)].join(', ')}, not on the path of ${lesson.label}; add to cards, declare under chunks or names, or pick another line`))
      }
      for (const line of authoredLines(doc)) {
        if (lesson.stage.perception && line.played) continue
        if (line.listenOnly) continue
        const zh = line.zh ?? (line.clip ? project.clips.get(line.clip)?.zh : undefined)
        if (zh) check(zh, line.at)
      }
      doc.fm.cards.forEach((id, i) => {
        const sentence = project.clips.get(project.words.get(id)?.sentence ?? '')?.zh
        if (sentence) check(sentence, { file: doc.file, line: doc.fmY?.lineOf(['cards', i]) ?? 1 })
      })
    }
    return out
  },
}

export const targetsInTier: Rule = {
  id: 'DEP002',
  summary: "A lesson's card words sit in its lesson tier or its unit's tier, and its lesson-tier words are all carded.",
  run(project) {
    const out: Diag[] = []
    for (const doc of project.docs) {
      const lesson = project.lessonOf(doc)
      if (!lesson || !doc.fm) continue
      const mine = project.vocab.filter((r) => (r.tier === 'lesson' && r.place === lesson.label) || (r.tier === 'unit' && r.place === lesson.unit.id))
      const placed = new Set(mine.map((r) => r.word))
      const cards = cardWords(project, doc)
      cards.forEach((w, i) => {
        if (placed.has(w)) return
        const where = project.vocab.find((r) => r.word === w)
        out.push(error({ file: doc.file, line: doc.fmY?.lineOf(['cards', i]) ?? 1 }, 'DEP002', `${w} isn't in the tier of ${lesson.label}; it's placed ${where ? `in ${where.tier} tier at ${where.place}` : 'nowhere'}`))
      })
      for (const r of mine) {
        if (r.tier === 'lesson' && !cards.includes(r.word)) out.push(warn({ file: doc.file, line: 1 }, 'DEP002', `${r.word} is placed at ${lesson.label} but isn't in cards`))
      }
    }
    return out
  },
}
