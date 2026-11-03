// content:build — compiles checked content into hash-named JSON files plus one manifest per build
// (architecture §4 "Content toolchain"). Files are immutable: a name is the hash of its bytes, so an
// unchanged lesson keeps its file across builds and is uploaded once.
import { createHash } from 'node:crypto'
import { mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import type { RootContent } from 'mdast'
import type { Ctx } from './check/context.ts'
import { matchLines } from './check/context.ts'
import { wordIdsFor } from './check/rules.ts'
import { isMention } from './check/rules.ts'
import { getWidget, definitions } from './widgets.ts'
import { analyze } from './zh/analyzer.ts'
import { resolve } from './catalog.ts'
import type { LessonDoc } from './lesson.ts'

const OUT = 'dist'

function stable(v: unknown): string {
  return JSON.stringify(v, (_k, x) => (x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.entries(x).sort(([a], [b]) => a.localeCompare(b))) : x))
}

/** Writes `files/<name>.<hash>.json` (if new) and returns its bundle-relative path. */
function emit(name: string, value: unknown): { path: string; hash: string } {
  const body = stable(value)
  const hash = createHash('sha256').update(body).digest('hex').slice(0, 16)
  const path = `files/${name}.${hash}.json`
  const full = join(OUT, path)
  if (!existsSync(full)) { mkdirSync(join(full, '..'), { recursive: true }); writeFileSync(full, body) }
  return { path, hash }
}

/** Prose → a small JSON tree: positions dropped, directives replaced by typed inline nodes. */
function prose(ctx: Ctx, node: RootContent): unknown {
  const canon = (id: string) => { const r = resolve(ctx.cat, id, ['w', 'g', 'c', 'cmp', 'sc', 'sr']); return r.ok ? r.id : id }
  const walk = (n: any): unknown => {
    if (n.type === 'textDirective') {
      const text = (n.children ?? []).map((c: any) => c.value ?? '').join('')
      switch (n.name) {
        case 'ex': return { type: 'ex', zh: text, clips: n.attributes?.clip ? [n.attributes.clip] : matchLines(ctx, text).map((l) => l.clip) }
        case 'bad': return { type: 'bad', zh: text }
        case 'm': return { type: 'mention', zh: text }
        case 'w': return { type: 'chip', zh: text, id: canon(n.attributes?.id ?? wordIdsFor(ctx.cat, text)[0]) }
        case 'k': return { type: 'chip', id: canon(n.attributes.id) }
      }
    }
    if (n.type === 'text') {
      // Short unmarked Han runs are mentions (ZH001 has already rejected anything longer).
      const parts = (n.value as string).split(/([\p{Script=Han}]+)/u).filter(Boolean)
      return parts.length === 1 && !/\p{Script=Han}/u.test(parts[0]) ? { type: 'text', value: n.value }
        : { type: 'span', children: parts.map((p) => (/\p{Script=Han}/u.test(p) && isMention(p) ? { type: 'mention', zh: p } : { type: 'text', value: p })) }
    }
    const { position: _p, children, ...rest } = n
    return children ? { ...rest, children: children.map(walk) } : rest
  }
  return walk(node)
}

function compileLesson(ctx: Ctx, doc: LessonDoc) {
  const plan = ctx.planOf(doc)!
  const slots = Object.fromEntries(doc.slots.map((s) => [s.name, s.blocks.map((b) => {
    if (b.kind === 'prose') return { kind: 'prose', tree: prose(ctx, b.node) }
    const def = getWidget(b.widget)!
    return { kind: 'widget', widget: b.widget, version: def.version, ...b.instance, config: def.config.parse(b.config) }
  })]))
  return {
    id: plan.id,
    plan: { title: plan.title, idea: plan.idea, template: plan.template, teaches: plan.teaches, assumes: plan.assumes },
    clipSlots: doc.fm.clips,
    cards: doc.fm.cards,
    slots,
  }
}

export async function build(ctx: Ctx): Promise<string> {
  const { cat } = ctx
  const lessons: Record<string, { file: string; hash: string }> = {}
  for (const doc of ctx.docs) {
    const compiled = compileLesson(ctx, doc)
    const f = emit(`lessons/${doc.key}`, compiled)
    lessons[compiled.id] = { file: f.path, hash: f.hash }
  }
  // Media with every line analyzed at build time (tokens carry citation readings and item ids).
  const media = [...cat.media.values()].map(({ at: _a, ...m }) => ({
    ...m,
    clips: [...cat.clips.values()].filter((c) => c.media === m.id).map((c) => ({
      id: c.id, span: c.span,
      questions: c.questions.map(({ at: _q, ...q }) => q),
      lines: c.lines.map(({ at: _l, ...l }) => ({ ...l, tokens: analyze(l.zh, cat.lexicon).map((t) => ({ s: t.surface, r: t.reading || undefined, id: t.itemId })) })),
    })),
  }))
  const mediaFile = emit('media', media)
  const items = [...cat.items.values()].map(({ at: _a, ...i }) => i)
  const itemsFile = emit('items.core', items)
  const manifest = {
    lang: cat.lang,
    files: { media: mediaFile.path, items: itemsFile.path },
    lessons,
    order: cat.lessons.map((l) => l.id),
    redirects: Object.fromEntries([...cat.redirects].map(([k, v]) => [k, v.to])),
    widgets: Object.fromEntries(Object.entries(definitions).map(([k, d]) => [k, d.version])),
  }
  const build = createHash('sha256').update(stable(manifest)).digest('hex').slice(0, 12)
  mkdirSync(join(OUT, 'manifests'), { recursive: true })
  const path = join(OUT, 'manifests', `${build}.json`)
  writeFileSync(path, JSON.stringify({ build, ...manifest }, null, 2))
  return path.replace(/\\/g, '/')
}
