// The spike's check rules. Each rule is independent and returns diagnostics; none knows widget internals.
import { resolve, type Diag, type Catalog } from '../catalog.ts'
import { parseId, type Kind } from '../ids.ts'
import { getWidget, type WidgetDef, type ActivityDef } from '../widgets.ts'
import type { LessonDoc, WidgetBlock } from '../lesson.ts'
import type { Loc } from '../curriculum-dsl.ts'
import { type Ctx, type Rule, matchLines, nearestLines, lessonEligible } from './context.ts'

const ITEM: Kind[] = ['w', 'g', 'c', 'cmp', 'sc', 'sr']

function widgetBlocks(doc: LessonDoc) {
  return doc.slots.flatMap((s) => s.blocks.filter((b): b is WidgetBlock => b.kind === 'widget').map((b) => ({ slot: s.name, b })))
}

/** Widget config validated against its schema; undefined when the widget is unknown or the config is invalid. */
function validConfig(b: WidgetBlock): { def: WidgetDef; config: any } | undefined {
  const def = getWidget(b.widget)
  if (!def || b.y.errors.length) return undefined
  const r = def.config.safeParse(b.config)
  return r.success ? { def, config: r.data } : undefined
}

// ---- REF001 / ID001: every reference parses and resolves ---------------------------------------
export const refsResolve: Rule = {
  id: 'REF001',
  summary: 'Every id parses (ID001) and resolves (REF001), following redirects; using a redirected id warns (REF002).',
  run({ cat, docs, planOf }) {
    const out: Diag[] = []
    const check = (raw: string, expect: readonly Kind[], at: Loc, what: string) => {
      const r = resolve(cat, raw, expect)
      if (!r.ok) {
        const grammarError = !parseId(raw, expect).ok
        out.push({ ...at, rule: grammarError ? 'ID001' : 'REF001', severity: 'error', message: `${what}: ${r.error}` })
      } else if (r.redirectedFrom) {
        out.push({ ...at, rule: 'REF002', severity: 'warn', message: `${what}: "${raw}" is retired; write "${r.id}"` })
      }
    }
    // Curriculum and items.
    for (const l of cat.lessons) {
      for (const t of l.teaches) check(t, ITEM, l.at, `${l.id} teaches`)
      for (const a of l.assumes) check(a, ITEM, l.at, `${l.id} assumes`)
      if (!cat.templates.has(l.template)) out.push({ ...l.at, rule: 'REF001', severity: 'error', message: `${l.id}: unknown template "${l.template}"` })
    }
    for (const g of cat.items.values()) for (const p of g.prereqs) check(p, ITEM, g.at, `${g.id} prereq`)
    for (const [from, r] of cat.redirects) {
      if (cat.redirects.has(r.to)) out.push({ ...r.at, rule: 'REF001', severity: 'error', message: `redirect chain ${from} → ${r.to} → …; point it at the final id` })
      else check(r.to, ITEM, r.at, `redirect target of ${from}`)
    }
    for (const c of cat.clips.values()) {
      for (const l of c.lines) for (const t of l.tags) check(t, ITEM, l.at, `${c.id} line tag`)
      for (const q of c.questions) for (const t of q.tests) check(t, ITEM, q.at, `${c.id} question`)
    }
    // Lessons.
    for (const doc of docs) {
      const plan = planOf(doc)
      if (!plan) out.push({ file: doc.file, line: 1, rule: 'REF001', severity: 'error', message: `no curriculum entry for "${cat.lang}:les:${doc.key}" (the file name is the lesson key)` })
      const fmLine = (p: (string | number)[]) => ({ file: doc.file, line: doc.fmY?.lineOf(p) ?? 1 })
      for (const [name, s] of Object.entries(doc.fm.clips)) {
        s.candidates.forEach((c, i) => check(c, ['clip'], fmLine(['clips', name, 'candidates', i]), `clip slot "${name}"`))
        s.want.exemplifies.forEach((e, i) => check(e, ITEM, fmLine(['clips', name, 'want', 'exemplifies', i]), `clip slot "${name}"`))
        s.want.speaker?.notIn.forEach((n, i) => {
          if (!doc.fm.clips[n]) out.push({ ...fmLine(['clips', name, 'want', 'speaker', 'notIn', i]), rule: 'REF001', severity: 'error', message: `unknown clip slot "${n}"` })
        })
      }
      doc.fm.cards.forEach((c, i) => {
        check(c.clip, ['clip'], fmLine(['cards', i, 'clip']), 'card')
        check(c.note, ITEM, fmLine(['cards', i, 'note']), 'card')
      })
      for (const s of doc.slots) for (const b of s.blocks) {
        if (b.kind === 'prose') {
          for (const i of b.inlines) {
            const at = { file: doc.file, line: i.line }
            if (i.kind === 'k') {
              if (!i.attrs.id) out.push({ ...at, rule: 'REF001', severity: 'error', message: `:k needs an id: :k{#${cat.lang}:g:…}` })
              else check(i.attrs.id, ITEM, at, ':k')
            }
            if (i.kind === 'w') {
              if (i.attrs.id) check(i.attrs.id, ['w'], at, `:w[${i.text}]`)
              else {
                const ids = wordIdsFor(cat, i.text)
                if (ids.length === 0) out.push({ ...at, rule: 'REF001', severity: 'error', message: `:w[${i.text}]: not in CC-CEDICT; pin it with {#${cat.lang}:w:…}` })
                if (ids.length > 1) out.push({ ...at, rule: 'REF001', severity: 'error', message: `:w[${i.text}] is ambiguous (${ids.join(', ')}); pin one with {#…}` })
              }
            }
            if (i.kind === 'ex' && i.attrs.clip) check(i.attrs.clip, ['clip'], at, `:ex[${i.text}]`)
          }
        } else {
          const def = getWidget(b.widget)
          if (!def) { out.push({ file: doc.file, line: b.line, rule: 'REF001', severity: 'error', message: `unknown widget "@${b.widget}"` }); continue }
          const v = validConfig(b)
          if (!v) continue // STR002 reports it
          for (const r of def.refs(v.config)) check(r.id, r.id.startsWith('clip:') ? ['clip'] : ITEM, { file: doc.file, line: b.y.lineOf(r.path) }, `@${b.widget}`)
          if (doc.fmValid) for (const r of def.slotRefs(v.config)) {
            if (!doc.fm.clips[r.slot]) out.push({ file: doc.file, line: b.y.lineOf(r.path), rule: 'REF001', severity: 'error', message: `@${b.widget}: unknown clip slot "${r.slot}"; declare it under "clips:" in the frontmatter` })
          }
        }
      }
    }
    return out
  },
}

export function wordIdsFor(cat: Catalog, hanzi: string): string[] {
  const ids = (cat.lexicon.bySimp.get(hanzi) ?? [])
    .map((e) => e.pinyin.trim().split(/\s+/).map((s) => s.toLowerCase().replace(/u:/g, 'v')).join(''))
    .filter((k) => /^([a-zv]+[1-5])+$/.test(k))
    .map((k) => `${cat.lang}:w:${hanzi}:${k}`)
  return [...new Set(ids)]
}

// ---- STR002: widget configs validate; widgets sit in allowed slots; template's required slots ---
export const structure: Rule = {
  id: 'STR002',
  summary: 'Widget configs validate against their schema; widgets sit in slots they allow; template-required slots exist.',
  run({ cat, docs, planOf }) {
    const out: Diag[] = []
    for (const doc of docs) {
      for (const { slot, b } of widgetBlocks(doc)) {
        const def = getWidget(b.widget)
        if (!def || b.y.errors.length) continue
        const r = def.config.safeParse(b.config)
        if (!r.success) for (const issue of r.error.issues) {
          // An unknown key is reported on the key's own line, not the enclosing object's.
          const path = [...(issue.path as (string | number)[]), ...(issue.code === 'unrecognized_keys' ? issue.keys.slice(0, 1) : [])]
          out.push({ file: doc.file, line: b.y.lineOf(path), rule: 'STR002', severity: 'error', message: `@${b.widget} ${path.join('.') || 'config'}: ${issue.message}` })
        }
        if (def.role === 'activity' && !def.slots.includes(slot)) {
          out.push({ file: doc.file, line: b.line, rule: 'STR002', severity: 'error', message: `@${b.widget} can't sit in "${slot}"; it allows ${def.slots.join(', ')}` })
        }
      }
      const tpl = cat.templates.get(planOf(doc)?.template ?? '')
      if (tpl) for (const [name, s] of Object.entries(tpl.slots)) {
        const section = doc.slots.find((x) => x.name === name)
        if (s.required && !section) out.push({ file: doc.file, line: 1, rule: 'STR002', severity: 'error', message: `template "${tpl.name}" requires a ":::${name}" slot` })
        if (section && s.widgets) for (const b of section.blocks) {
          if (b.kind === 'widget' && getWidget(b.widget) && !s.widgets.includes(b.widget)) {
            out.push({ file: doc.file, line: b.line, rule: 'STR002', severity: 'error', message: `template "${tpl.name}" doesn't allow @${b.widget} in "${name}" (allowed: ${s.widgets.join(', ')})` })
          }
        }
      }
    }
    return out
  },
}

// ---- MED001: every Chinese example has a native clip --------------------------------------------
export const examplesHaveClips: Rule = {
  id: 'MED001',
  summary: 'Every :ex and every widget line matches a line of a lesson-eligible clip; clip-slot candidates are lesson-eligible.',
  run(ctx) {
    const { cat, docs } = ctx
    const out: Diag[] = []
    const need = (zh: string, clip: string | undefined, file: string, line: number, what: string) => {
      if (clip && !cat.clips.has(clip)) return // REF001 reports it
      if (clip && !lessonEligible(cat, clip)) {
        out.push({ file, line, rule: 'MED001', severity: 'error', message: `${what}: ${clip} has no automatic transcript, so it can't back a lesson example` })
        return
      }
      if (matchLines(ctx, zh, clip).length) return
      const near = nearestLines(ctx, zh)
      const where = clip ? `${clip} has no line containing "${zh}"` : `no native clip line contains "${zh}"`
      out.push({ file, line, rule: 'MED001', severity: 'error', message: `${what}: ${where}${near.length ? `; nearest: ${near.join(' | ')}` : ''}` })
    }
    for (const doc of docs) {
      for (const s of doc.slots) for (const b of s.blocks) {
        if (b.kind === 'prose') {
          for (const i of b.inlines) if (i.kind === 'ex') need(i.text, i.attrs.clip, doc.file, i.line, `:ex[${i.text}]`)
        } else {
          const v = validConfig(b)
          if (v) for (const l of v.def.lines(v.config)) need(l.text, undefined, doc.file, b.y.lineOf(l.path), `@${b.widget}`)
        }
      }
      for (const [name, slot] of Object.entries(doc.fm.clips)) slot.candidates.forEach((c, i) => {
        if (cat.clips.has(c) && !lessonEligible(cat, c)) {
          out.push({ file: doc.file, line: doc.fmY?.lineOf(['clips', name, 'candidates', i]) ?? 1, rule: 'MED001', severity: 'error', message: `clip slot "${name}": ${c} has no automatic transcript; it can only be a free-watch item` })
        }
      })
    }
    return out
  },
}

// ---- ORD001: prerequisite order ------------------------------------------------------------------
export const prereqOrder: Rule = {
  id: 'ORD001',
  summary: "Each lesson's assumes, and every prereq of what it teaches, is taught by an earlier lesson.",
  run({ cat }) {
    const out: Diag[] = []
    const firstTaught = new Map<string, number>()
    cat.lessons.forEach((l, i) => l.teaches.forEach((t) => { if (!firstTaught.has(t)) firstTaught.set(t, i) }))
    const canon = (id: string) => cat.redirects.get(id)?.to ?? id
    cat.lessons.forEach((l, i) => {
      const needs = [
        ...l.assumes.map((a) => ({ id: canon(a), why: 'assumes' })),
        ...l.teaches.flatMap((t) => (cat.items.get(canon(t))?.prereqs ?? []).map((p) => ({ id: canon(p), why: `${t} needs` }))),
      ]
      for (const n of needs) {
        if (l.teaches.map(canon).includes(n.id) && n.why !== 'assumes') continue
        const j = firstTaught.get(n.id)
        if (j === undefined) out.push({ ...l.at, rule: 'ORD001', severity: 'error', message: `${l.id} ${n.why} ${n.id}, which no lesson teaches` })
        else if (j >= i) out.push({ ...l.at, rule: 'ORD001', severity: 'error', message: `${l.id} ${n.why} ${n.id}, first taught by ${cat.lessons[j].id}, which comes ${j === i ? 'in this same lesson' : 'later'}` })
      }
    })
    return out
  },
}

// ---- COPY001: no internal terms in user-facing text ---------------------------------------------
// The mapping lives in docs/design/app-ui-flow.md "UI copy: no internal terminology"; this is its machine-checkable half.
const BANNED: { re: RegExp; use: string }[] = [
  { re: /\b(hear it|we do|you do|i do)\b/i, use: 'Listen / How it works / Practice / Check' },
  { re: /\b(pattern|clip|sound) (lesson|template|shape)s?\b/i, use: 'Lesson / Video lesson / Sound practice' },
  { re: /\bS[0-2]\b/, use: 'the stage name (Sounds, Stage 1)' },
  { re: /\bprereq(uisite)?s?\b/i, use: '"builds on" or nothing' },
  { re: /\btest(ed)?[- ]out\b/i, use: '"Marked as known"' },
  { re: /\b(strands?|refold|output levels?|encompassing|comprehensible input|i\+1)\b/i, use: 'nothing (never shown)' },
  { re: /\bpass [1-9]\b/i, use: '"Watch 2 of 3", "Watch again"' },
  { re: /\b(slots?|widgets?|templates?|knowledge items?|evidence|checkpoints?|SRS|FSRS)\b/i, use: 'plain words ("step", "card", "Check")' },
]
export const copyTerms: Rule = {
  id: 'COPY001',
  summary: 'User-facing text (titles, ideas, prose, widget copy, clip translations, gist questions) uses no internal terms.',
  run({ cat, docs }) {
    const out: Diag[] = []
    const scan = (text: string, at: Loc, what: string) => {
      for (const b of BANNED) {
        const m = b.re.exec(text)
        if (m) out.push({ ...at, rule: 'COPY001', severity: 'error', message: `${what}: internal term "${m[0]}" in user-facing text; use ${b.use}` })
      }
    }
    for (const s of cat.stages) { scan(s.title, s.at, 'stage title'); for (const u of s.units) scan(u.title, u.at, 'unit title') }
    for (const l of cat.lessons) { scan(l.title, l.at, `${l.id} title`); scan(l.idea, l.at, `${l.id} idea`) }
    for (const c of cat.clips.values()) {
      for (const l of c.lines) if (l.en) scan(l.en, l.at, `${c.id} translation`)
      for (const q of c.questions) [q.ask, ...q.choices].forEach((t) => scan(t, q.at, `${c.id} question`))
    }
    for (const doc of docs) for (const s of doc.slots) for (const b of s.blocks) {
      if (b.kind === 'prose') b.english.forEach((r) => scan(r.text, { file: doc.file, line: r.line }, s.name))
      else {
        const v = validConfig(b)
        if (v) for (const t of v.def.copy(v.config)) scan(t.text, { file: doc.file, line: b.y.lineOf(t.path) }, `@${b.widget}`)
      }
    }
    return out
  },
}

// ---- OUT001: output level allowed for the stage ---------------------------------------------------
export const outputLevel: Rule = {
  id: 'OUT001',
  summary: "A widget's output level is within its stage's policy (required activities vs optional ones).",
  run({ cat, docs, planOf }) {
    const out: Diag[] = []
    for (const doc of docs) {
      const plan = planOf(doc)
      const stage = plan && cat.stageOf.get(plan.id)
      if (!stage) continue
      for (const { b } of widgetBlocks(doc)) {
        const def = getWidget(b.widget)
        if (def?.role !== 'activity') continue
        const optional = b.instance.optional === true
        const allowed = optional ? stage.output.optional : stage.output.required
        const level = (def as ActivityDef<unknown>).outputLevel
        if (level > allowed) {
          out.push({ file: doc.file, line: b.line, rule: 'OUT001', severity: 'error', message: `@${b.widget} asks for output level ${level}; "${stage.title}" allows ${allowed} for ${optional ? 'optional' : 'required'} activities${!optional && level <= stage.output.optional ? ' (mark it "optional: true")' : ''}` })
        }
      }
    }
    return out
  },
}

// ---- ZH001 (language pack lint): Chinese sentences in prose must be marked up ----------------------
/** A short Han run with no sentence punctuation reads as a mention of a word or character, not an example. */
export function isMention(run: string): boolean {
  return [...run.replace(/[^\p{Script=Han}]/gu, '')].length <= 4 && !/[。？！，]/.test(run)
}
export const zhMarkup: Rule = {
  id: 'ZH001',
  summary: 'A Chinese sentence in prose is marked :ex (needs a clip) or :m (mention). Short runs (≤ 4 hanzi) are mentions automatically.',
  run({ docs }) {
    const out: Diag[] = []
    for (const doc of docs) for (const s of doc.slots) for (const b of s.blocks) {
      if (b.kind !== 'prose') continue
      for (const r of b.unmarkedHan) for (const run of r.text.match(/[\p{Script=Han}，。？！、]+/gu) ?? []) {
        if (isMention(run)) continue
        out.push({ file: doc.file, line: r.line, rule: 'ZH001', severity: 'error', message: `unmarked Chinese "${run}" reads as an example; mark it :ex[…] (it needs a native clip) or :m[…] (a mention, no audio)` })
      }
    }
    return out
  },
}

export const RULES: Rule[] = [refsResolve, structure, examplesHaveClips, prereqOrder, copyTerms, outputLevel, zhMarkup]
