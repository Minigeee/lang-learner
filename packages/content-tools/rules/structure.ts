// STR002, STR001, ORD001, OUT001: a lesson's shape, its word budgets, the graph's order and output levels.
import type { Shape } from '@lang-learner/core'
import { error, warn, type Diag, type Loc } from '../diag.ts'
import { authoredLines, FORMATS, practiceItems, SLOTS, supportTexts, type LessonDoc, type OptionSource, type Slot, type SupportKind } from '../lesson.ts'
import type { Rule } from '../pack.ts'
import { norm } from '../project.ts'

type Practice = Extract<Slot, { name: 'practice' }>

/** The slots a shape must have and may have. Examples can be skipped in a sound lesson. */
const SHAPE_SLOTS: Record<Shape, { required: Slot['name'][]; allowed: Slot['name'][] }> = {
  sound: { required: ['opener', 'lesson', 'practice'], allowed: ['opener', 'lesson', 'examples', 'practice'] },
  pattern: { required: ['opener', 'lesson', 'examples', 'practice'], allowed: ['opener', 'lesson', 'examples', 'practice'] },
  clip: { required: ['opener', 'lesson', 'examples', 'practice'], allowed: ['opener', 'lesson', 'examples', 'practice'] },
  checkpoint: { required: ['practice'], allowed: ['practice'] },
}

function slotRules(doc: LessonDoc, shape: Shape): Diag[] {
  const out: Diag[] = []
  const at = (line: number) => ({ file: doc.file, line })
  const { required, allowed } = SHAPE_SLOTS[shape]
  for (const name of required) {
    if (!doc.slots.some((s) => s.name === name)) out.push(error(at(1), 'STR002', `a ${shape} lesson needs a :::${name} slot`))
  }
  let last = -1
  const seen = new Set<string>()
  for (const s of doc.slots) {
    const index = SLOTS.indexOf(s.name)
    if (index < last) out.push(error(at(s.line), 'STR002', `:::${s.name} is out of order; slots run ${SLOTS.join(', ')}`))
    last = Math.max(last, index)
    if (!allowed.includes(s.name)) out.push(error(at(s.line), 'STR002', `a ${shape} lesson can't have a :::${s.name} slot`))
    const repeatable = s.name === 'examples' || (s.name === 'practice' && shape === 'checkpoint')
    if (seen.has(s.name) && !repeatable) out.push(error(at(s.line), 'STR002', `only one :::${s.name} slot is allowed here`))
    seen.add(s.name)
    out.push(...slotContent(doc, s))
  }
  return out
}

function slotContent(doc: LessonDoc, s: Slot): Diag[] {
  const out: Diag[] = []
  const at = { file: doc.file, line: s.line }
  const lines = s.paragraphs.flatMap((p) => p.inlines.filter((i) => i.kind === 'ex'))
  const prose = s.paragraphs.find((p) => p.plain)
  switch (s.name) {
    case 'opener':
      if (prose) out.push(error({ ...at, line: prose.line }, 'STR002', ':::opener takes :ex lines and a yaml fence, not prose'))
      if (!lines.length && !s.data?.video) out.push(error(at, 'STR002', ':::opener needs an :ex line or a video'))
      break
    case 'lesson':
      if (!s.paragraphs.length) out.push(error(at, 'STR002', ':::lesson needs a paragraph'))
      break
    case 'examples':
      if (prose) out.push(error({ ...at, line: prose.line }, 'STR002', ':::examples takes :ex lines and a yaml fence, not prose'))
      if (!lines.length && !s.data?.words) out.push(error(at, 'STR002', ':::examples needs an :ex line or words'))
      if (s.readAlong && !lines.length) out.push(error(at, 'STR002', 'a read-along needs :ex lines'))
      break
    case 'practice':
      if (s.paragraphs.length) out.push(error({ ...at, line: s.paragraphs[0]!.line }, 'STR002', ':::practice takes only a yaml fence'))
      break
  }
  return out
}

/** A practice or pool item fits its format: graded items answer one of their buttons, self-graded ones have a meaning to reveal. */
function formatRules(doc: LessonDoc, checkpoint: boolean): Diag[] {
  const out: Diag[] = []
  const practices = doc.slots.filter((s): s is Practice => s.name === 'practice')
  const first = practices[0]
  const check = (format: Practice['format'], common: OptionSource[] | undefined, items: ReturnType<typeof practiceItems>) => {
    const def = format && FORMATS[format]
    if (!def) return
    for (const { item, at } of items) {
      const options = item.options ?? common
      if (def.graded) {
        if (!options) out.push(error(at([]), 'STR002', `${format} needs options on the step or the item`))
        else if (item.answer === undefined) out.push(error(at([]), 'STR002', `${format} needs an answer on every item`))
        else if (!options.some((o) => o.key === item.answer)) out.push(error(at(['answer']), 'STR002', `"${item.answer}" isn't an option key (${options.map((o) => o.key).join(', ')})`))
      } else {
        if (options) out.push(error(at([]), 'STR002', `${format} is self-graded, so it takes no options`))
        if (item.answer !== undefined) out.push(error(at(['answer']), 'STR002', `${format} is self-graded, so it takes no answer`))
        if (!item.en) out.push(error(at([]), 'STR002', `${format} reveals a meaning, so every item needs en`))
      }
      if (checkpoint && !item.target) out.push(error(at([]), 'STR002', 'a checkpoint item needs a target: the skill its evidence goes to'))
    }
  }
  const all = practiceItems(doc)
  for (const p of practices) {
    if (!p.data) continue
    const mine = all.filter((i) => i.where === 'practice' && p.data!.items.includes(i.item))
    check(p.format, p.data.options, mine)
  }
  check(first?.format, first?.data?.options, all.filter((i) => i.where === 'pool'))
  return out
}

export const structure: Rule = {
  id: 'STR002',
  summary: "A lesson's slots fit its shape, and its practice fits its format.",
  run(project) {
    const out: Diag[] = []
    const translations = new Map<string, { en: string; at: Loc }>()
    for (const doc of project.docs) {
      const lesson = project.lessonOf(doc)
      if (!lesson) continue
      out.push(...slotRules(doc, lesson.shape), ...formatRules(doc, lesson.shape === 'checkpoint'))
      if (doc.fm?.skill && !lesson.skill) out.push(error({ file: doc.file, line: doc.fmY?.lineOf(['skill']) ?? 1 }, 'STR002', 'this lesson teaches no skill, so it takes no skill pool'))
      if (doc.fm && !doc.fm.skill && lesson.skill) out.push(warn({ file: doc.file, line: 1 }, 'STR002', `no skill.pool, so ${lesson.skill} gets no skill card yet`))
      if (lesson.shape === 'checkpoint' && doc.fm?.cards.length) out.push(error({ file: doc.file, line: doc.fmY?.lineOf(['cards']) ?? 1 }, 'STR002', "new words never go in a checkpoint, so it takes no cards"))
      for (const line of authoredLines(doc)) {
        if (line.needsEn && !line.en) out.push(error(line.at, 'STR002', `"${line.zh ?? line.clip}" needs a translation: add {en="…"}`))
        if (!line.en || !line.zh) continue
        const seen = translations.get(norm(line.zh))
        if (seen && seen.en !== line.en) out.push(error(line.at, 'STR002', `"${line.zh}" has a different translation at ${seen.at.file}:${seen.at.line}; a line has one translation`))
        if (!seen) translations.set(norm(line.zh), { en: line.en, at: line.at })
      }
    }
    return out
  },
}

/** lesson-writing-style.md's word budgets. `body` is the total across a lesson's paragraphs. */
const BUDGETS: Partial<Record<SupportKind | 'title', number>> = { title: 10, idea: 15, body: 60, prompt: 6, option: 3, 'hook-option': 6, 'deeper-answer': 30 }

/** Support-language words: target text and punctuation don't count. */
export function countWords(text: string): number {
  return text.replace(/\p{Script=Han}+/gu, ' ').match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu)?.length ?? 0
}

export const wordBudgets: Rule = {
  id: 'STR001',
  summary: "Support text stays within lesson-writing-style.md's word budgets.",
  run(project) {
    const out: Diag[] = []
    const over = (at: Loc, what: string, words: number, budget: number) => error(at, 'STR001', `${what} is ${words} words; the budget is ${budget}`)
    for (const doc of project.docs) {
      const lesson = project.lessonOf(doc)
      if (lesson) {
        const words = countWords(lesson.title)
        if (words > BUDGETS.title!) out.push(over(project.curriculumLine(lesson.id), `title of ${lesson.label}`, words, BUDGETS.title!))
      }
      const texts = supportTexts(doc)
      for (const t of texts) {
        const budget = BUDGETS[t.kind]
        if (t.kind === 'body' || budget === undefined) continue
        const words = countWords(t.text)
        if (words > budget) out.push(over(t.at, t.kind, words, budget))
      }
      const body = texts.filter((t) => t.kind === 'body')
      const words = body.reduce((n, t) => n + countWords(t.text), 0)
      if (words > BUDGETS.body!) out.push(over(body[0]!.at, 'the lesson body', words, BUDGETS.body!))
    }
    return out
  },
}

export const graphOrder: Rule = {
  id: 'ORD001',
  summary: 'Unit prereqs exist, come earlier in table order and form no cycle; lesson ids and labels are unique.',
  run({ curriculum, curriculumLine }) {
    const out: Diag[] = []
    const position = new Map([...curriculum.units.keys()].map((id, i) => [id, i]))
    curriculum.stages.forEach((stage, i) => {
      for (const assumed of stage.assumes ?? []) {
        if (!curriculum.stages.slice(0, i).some((s) => s.id === assumed)) out.push(error(curriculumLine(`id: '${stage.id}'`), 'ORD001', `stage ${stage.id} assumes ${assumed}, which isn't an earlier stage`))
      }
    })
    const seen = new Set<string>()
    for (const unit of curriculum.units.values()) {
      const at = curriculumLine(`id: '${unit.id}'`)
      for (const p of unit.prereqs) {
        const where = position.get(p)
        if (where === undefined) out.push(error(at, 'ORD001', `unit ${unit.id} has an unknown prereq ${p}`))
        else if (where >= position.get(unit.id)!) out.push(error(at, 'ORD001', `unit ${unit.id} needs ${p}, which comes later in table order`))
      }
      if (curriculum.closure(unit.id).has(unit.id)) out.push(error(at, 'ORD001', `unit ${unit.id} is in a prereq cycle`))
      for (const l of unit.lessons) {
        for (const key of [l.id, l.label]) {
          if (seen.has(key)) out.push(error(curriculumLine(l.id), 'ORD001', `${key} appears twice`))
          seen.add(key)
        }
      }
    }
    return out
  },
}

export const outputLevel: Rule = {
  id: 'OUT001',
  summary: "A practice format's output level is within its stage's limit.",
  run(project) {
    const out: Diag[] = []
    for (const doc of project.docs) {
      const stage = project.lessonOf(doc)?.stage
      if (!stage) continue
      for (const s of doc.slots) {
        const level = s.name === 'practice' && s.format ? FORMATS[s.format]?.output : undefined
        if (level !== undefined && level > stage.maxOutput) {
          out.push(error({ file: doc.file, line: s.line }, 'OUT001', `${(s as Practice).format} asks for output level ${level}; "${stage.title}" allows ${stage.maxOutput}`))
        }
      }
    }
    return out
  },
}
