// ID001, REF001, REF002: every id parses, resolves, and isn't retired.
import { createIdParser, type ItemId } from '@lang-learner/core'
import { error, warn, type Diag, type Loc } from '../diag.ts'
import { practiceItems, type LessonDoc } from '../lesson.ts'
import type { Rule } from '../pack.ts'
import { itemKinds, resolve, type Project } from '../project.ts'

export const refsResolve: Rule = {
  id: 'REF001',
  summary: 'Every id parses (ID001) and resolves (REF001), following redirects; using a retired id warns (REF002).',
  run(project) {
    const out: Diag[] = []
    const check = (raw: string, kinds: readonly string[], at: Loc, what: string) => {
      const r = resolve(project, raw, kinds)
      if (!r.ok) out.push(error(at, r.grammar ? 'ID001' : 'REF001', `${what}: ${r.error}`))
      else if (r.redirectedFrom) out.push(warn(at, 'REF002', `${what}: "${raw}" is retired; write "${r.id}"`))
    }
    const items = itemKinds(project)

    for (const l of project.curriculum.lessons.values()) {
      if (l.skill) check(l.skill, items, project.curriculumLine(l.id), `${l.id} skill`)
    }
    for (const [from, r] of project.redirects) {
      if (project.redirects.has(r.to)) out.push(error(r.at, 'REF001', `redirect chain ${from} → ${r.to} → …; point it at the final id`))
      else check(r.to, items, r.at, `redirect target of ${from}`)
    }
    const parseId = createIdParser(project.pack.itemKinds)
    for (const c of project.clips.values()) {
      for (const id of [c.id, c.media]) {
        const parsed = parseId(id)
        if (!parsed.ok) out.push(error(c.at, 'ID001', parsed.error))
      }
      const { ids, families } = project.speakers
      if (!ids.has(c.speaker) && !families.some((f) => c.speaker.startsWith(f))) {
        out.push(error(c.at, 'REF001', `${c.id}: speaker "${c.speaker}" isn't in speakers.yaml`))
      }
    }
    for (const w of project.words.values()) {
      check(w.id, ['w'], w.at, 'word card')
      check(w.word, ['clip'], w.at, `${w.id} word audio`)
      check(w.sentence, ['clip'], w.at, `${w.id} sentence`)
      const line = project.clips.get(w.sentence)?.zh
      const target = w.target ?? project.pack.wordToken(w.id as ItemId).s
      if (line && !line.includes(target)) out.push(error(w.at, 'REF001', `${w.id}: sentence "${line}" doesn't contain "${target}"`))
    }
    for (const doc of project.docs) lessonRefs(project, doc, check, out)
    return out
  },
}

function lessonRefs(project: Project, doc: LessonDoc, check: (raw: string, kinds: readonly string[], at: Loc, what: string) => void, out: Diag[]) {
  const items = itemKinds(project)
  const file = doc.file
  if (!project.lessonOf(doc)) out.push(error({ file, line: 1 }, 'REF001', `no curriculum entry for "${project.lang}:les:${doc.key}" (the file name is the lesson's slug)`))

  doc.fm?.cards.forEach((id, i) => {
    const at = { file, line: doc.fmY?.lineOf(['cards', i]) ?? 1 }
    check(id, ['w'], at, 'cards')
    if (!project.words.has(project.redirects.get(id)?.to ?? id)) out.push(error(at, 'REF001', `cards: ${id} has no entry in items/overrides/words.yaml`))
  })
  for (const { item, at } of practiceItems(doc)) {
    if (item.target) check(item.target, items, at(['target']), 'item target')
    if (item.clip) check(item.clip, ['clip'], at(['clip']), 'item clip')
  }
  for (const s of doc.slots) {
    for (const p of s.paragraphs) for (const i of p.inlines) {
      const at = { file, line: i.line }
      if (i.kind === 'k') {
        if (i.attrs.id) check(i.attrs.id, items, at, ':k')
        else out.push(error(at, 'REF001', ':k needs an id: :k{#…}'))
      } else if (i.kind === 'w') {
        if (i.attrs.id) check(i.attrs.id, ['w'], at, `:w[${i.text}]`)
        else {
          const ids = project.pack.wordIds(i.text)
          if (ids.length === 0) out.push(error(at, 'REF001', `:w[${i.text}]: not in the dictionary`))
          if (ids.length > 1) out.push(error(at, 'REF001', `:w[${i.text}] is ambiguous (${ids.join(', ')}); pin one with {#…}`))
        }
      } else if (i.kind === 'ex' && i.attrs.clip) check(i.attrs.clip, ['clip'], at, `:ex[${i.text}]`)
    }
    if (s.name === 'examples' && s.y) {
      s.data?.words?.forEach((id, i) => check(id, ['w'], { file, line: s.y!.lineOf(['words', i]) }, 'examples words'))
    }
    if (s.name === 'lesson' && s.y && s.data?.right?.startsWith('clip:')) check(s.data.right, ['clip'], { file, line: s.y.lineOf(['right']) }, 'right')
  }
}
