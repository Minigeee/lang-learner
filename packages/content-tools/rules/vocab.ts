// VOC001: placement rules any language's vocabulary follows, and senses trace to the dictionary. The
// pack adds what depends on its own word lists.
import type { ItemId } from '@lang-learner/core'
import { error, type Diag } from '../diag.ts'
import type { Placement, Rule } from '../pack.ts'
import type { Project } from '../project.ts'

const MAX_LESSON_WORDS = 5

/** The unit a placement or needed_by entry points at, or undefined for queues and free words. */
function unitOf({ curriculum }: Project, place: string): string | undefined {
  const bare = place.replace(/^prep:/, '')
  return curriculum.byLabel.get(bare)?.unit.id ?? (curriculum.units.has(bare) ? bare : undefined)
}

function placement(project: Project): Diag[] {
  const { curriculum } = project
  const out: Diag[] = []
  const perLesson = new Map<string, Placement[]>()
  for (const r of project.vocab) {
    const unit = unitOf(project, r.place)
    if (r.tier !== 'queue' && !unit) {
      out.push(error(r.at, 'VOC001', `${r.word}: place "${r.place}" isn't a lesson or unit`))
      continue
    }
    if (r.tier === 'lesson') perLesson.set(r.place, [...(perLesson.get(r.place) ?? []), r])
    if (unit && curriculum.isCheckpoint(curriculum.units.get(unit)!)) out.push(error(r.at, 'VOC001', `${r.word} is placed at checkpoint ${r.place}`))
    if (r.tier === 'prep' && unit) {
      for (const need of r.neededBy) {
        const target = unitOf(project, need)
        if (!target || target === unit || curriculum.isCheckpoint(curriculum.units.get(target)!)) continue
        if (!curriculum.closure(target).has(unit)) out.push(error(r.at, 'VOC001', `${r.word} is fed during ${unit}, not on the path of ${target}`))
      }
    }
  }
  for (const [label, rows] of perLesson) {
    if (rows.length > MAX_LESSON_WORDS && !curriculum.byLabel.get(label)?.unit.closedSet) {
      out.push(error(rows[0]!.at, 'VOC001', `lesson ${label} has ${rows.length} words; the cap is ${MAX_LESSON_WORDS}`))
    }
  }
  return out
}

/** A sense as comparable text: lowercased, with parentheticals and a leading "to" dropped. */
const senseKey = (s: string) => s.toLowerCase().replace(/\([^)]*\)/g, ' ').replace(/^\s*to\s+/, '').replace(/\s+/g, ' ').trim()

/** A chosen sense traces to the dictionary when it's one of its senses, or a whole-word part of one. */
function traces(sense: string, dictionary: string[]): boolean {
  const wanted = ` ${senseKey(sense)} `
  return dictionary.flatMap((d) => d.split(';')).some((d) => ` ${senseKey(d)} `.includes(wanted))
}

function senses(project: Project): Diag[] {
  const out: Diag[] = []
  for (const w of project.words.values()) {
    const dictionary = project.pack.dictionarySenses(w.id as ItemId)
    if (!dictionary.length) continue // REF001 reports the missing word
    for (const s of w.senses) {
      if (!traces(s, dictionary)) out.push(error(w.at, 'VOC001', `${w.id}: sense "${s}" isn't in the dictionary (${dictionary.join(' / ')})`))
    }
  }
  return out
}

export const vocabulary: Rule = {
  id: 'VOC001',
  summary: 'Placements point at real lessons, keep lessons at the word cap and off checkpoints, feed prep on the path, and senses trace to the dictionary.',
  run: (project) => [...placement(project), ...senses(project)],
}
