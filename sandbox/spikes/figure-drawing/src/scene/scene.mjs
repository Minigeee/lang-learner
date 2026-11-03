// Figure spec -> themed SVG. The spec names objects and relations; this module owns all geometry.
// Contract: renderFigure(spec, backend) returns { svg, issues }. svg uses only var(--token) colors and
// gets every human-readable string from t(); issues lists what the automatic checker found.
import { makePart } from './parts.mjs'
import { t, esc } from '../i18n.mjs'
import { checkSvg } from '../check.mjs'

const RELATIONS = ['on', 'in', 'under', 'beside', 'heldBy']
const GAP = { row: 28, beside: 10, float: 8 }

function relationOf(o) {
  const rs = RELATIONS.filter((r) => o[r] != null)
  if (rs.length > 1) throw new Error(`${o.id}: one relation per object, got ${rs.join('+')}`)
  return rs.length ? { name: rs[0], target: o[rs[0]] } : null
}

function layoutPanel(panel, backend, issues) {
  const nodes = new Map()
  for (const o of panel.objects) {
    if (nodes.has(o.id)) throw new Error(`duplicate id ${o.id}`)
    const p = makePart(o.kind, o, backend)
    if (p.fallback) issues.push({ level: 'warn', msg: `${o.id}: emoji set has no "${o.kind}", fell back to the procedural drawing (style mismatch)` })
    nodes.set(o.id, { o, p, rel: relationOf(o), x: 0, y: 0, w: p.w, h: p.h, s: 1, placed: false })
  }
  for (const n of nodes.values()) if (n.rel && !nodes.has(n.rel.target)) throw new Error(`${n.o.id}: unknown target "${n.rel.target}"`)

  // 1. Ground row: unrelated objects in spec order, "beside" objects next to their target.
  const row = [...nodes.values()].filter((n) => !n.rel)
  for (const n of nodes.values()) if (n.rel?.name === 'beside') {
    const i = row.indexOf(nodes.get(n.rel.target))
    if (i < 0) throw new Error(`${n.o.id}: "beside" target must stand on the ground`)
    row.splice(n.o.side === 'left' ? i : i + 1, 0, n)
  }
  let x = 0
  row.forEach((n, i) => {
    if (i) x += (n.rel?.name === 'beside' || row[i - 1].rel?.name === 'beside') ? GAP.beside : GAP.row
    Object.assign(n, { x, y: -n.h, placed: true }); x += n.w
  })

  // 2. Dependents, resolved recursively so targets are placed first.
  const order = [...row]
  const place = (n, stack = []) => {
    if (n.placed) return
    if (stack.includes(n)) throw new Error(`relation cycle: ${[...stack, n].map((s) => s.o.id).join(' -> ')}`)
    const tg = nodes.get(n.rel.target); place(tg, [...stack, n])
    const a = tg.p.anchors ?? {}
    let { w, h } = n
    switch (n.rel.name) {
      case 'on': {
        if (!a.top) throw new Error(`${n.o.id}: "${tg.o.kind}" has no surface to be on`)
        const at = n.o.at ?? 0.5
        n.x = tg.x + a.top.x0 + (a.top.x1 - a.top.x0) * at - w / 2; n.y = tg.y + a.top.y - h; break
      }
      case 'in':
        if (!a.inner) throw new Error(`${n.o.id}: "${tg.o.kind}" cannot contain things (try open: true)`)
        n.x = tg.x + a.inner.cx - w / 2; n.y = tg.y + a.inner.bottom - h; tg.hasInner = n; break
      case 'under':
        if (a.under) { // shrink to fit the clearance; flag it when the shrink would distort relative size
          const s = Math.min(1, (a.under.h - 4) / h, (a.under.x1 - a.under.x0) / w)
          if (s < 1) { n.s = s; w = n.w = w * s; h = n.h = h * s }
          if (s < 0.8) issues.push({ level: 'warn', msg: `${n.o.id} shrunk to ${Math.round(s * 100)}% to fit under ${tg.o.id}` })
          n.x = tg.x + (a.under.x0 + a.under.x1) / 2 - w / 2; n.y = -h
        }
        else { // nothing to stand under: lift the target so the object fits beneath it
          if (order.some((m) => m.rel?.target === tg.o.id && m !== n)) throw new Error(`${tg.o.id}: lift conflicts with objects already on it`)
          n.x = tg.x + tg.w / 2 - w / 2; n.y = -h; tg.y = -h - GAP.float - tg.h
        }
        break
      case 'heldBy':
        if (!a.hand) throw new Error(`${n.o.id}: "${tg.o.kind}" (pose ${tg.o.pose ?? 'default'}) has no free hand`)
        n.x = tg.x; n.y = tg.y; n.transform = a.hand; break
    }
    n.placed = true; order.push(n)
  }
  // Lifts first, so things resting on a lifted target follow it.
  const deps = [...nodes.values()].filter((n) => !n.placed)
  deps.sort((a, b) => (b.rel.name === 'under') - (a.rel.name === 'under'))
  deps.forEach((n) => place(n))

  // 3. Overlap check between objects with no direct relation.
  const box = (n) => n.transform ? null : [n.x, n.y, n.x + n.w, n.y + n.h]
  const related = (a, b) => a.rel?.target === b.o.id || b.rel?.target === a.o.id
  const ns = [...nodes.values()]
  for (let i = 0; i < ns.length; i++) for (let j = i + 1; j < ns.length; j++) {
    const A = box(ns[i]), B = box(ns[j]); if (!A || !B || related(ns[i], ns[j])) continue
    const ix = Math.min(A[2], B[2]) - Math.max(A[0], B[0]), iy = Math.min(A[3], B[3]) - Math.max(A[1], B[1])
    const minArea = Math.min((A[2] - A[0]) * (A[3] - A[1]), (B[2] - B[0]) * (B[3] - B[1]))
    if (ix > 0 && iy > 0 && ix * iy > 0.04 * minArea) issues.push({ level: 'warn', msg: `${ns[i].o.id} and ${ns[j].o.id} overlap but are not related` })
  }

  // 4. Draw: target before dependents; "in" splits the container into back/front layers.
  const focus = panel.focus ? new Set(panel.focus) : null
  const op = (n, s) => `<g transform="translate(${n.x.toFixed(1)} ${n.y.toFixed(1)})${n.transform ? ' ' + n.transform : ''}${n.s !== 1 ? ` scale(${n.s.toFixed(3)})` : ''}"${focus && !focus.has(n.o.id) ? ' opacity=".35"' : ''}>${s}</g>`
  let out = ''
  for (const n of order) {
    if (n.hasInner) continue
    if (n.rel?.name === 'in') { const c = nodes.get(n.rel.target); out += op(c, c.p.back) + op(n, n.p.svg) + op(c, c.p.front) }
    else out += op(n, n.p.svg)
  }
  const xs = ns.flatMap((n) => [n.x, n.x + n.w]), ys = ns.flatMap((n) => [n.y, n.y + n.h])
  return { svg: out, x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: 0 }
}

const ZH_FONT = 'Noto Serif SC, Microsoft YaHei, serif', UI_FONT = 'Lexend, Segoe UI, sans-serif'
const textWidth = (s, size, cjk) => [...s].length * size * (cjk ? 1 : 0.56)

export function renderFigure(spec, backend = 'procedural') {
  const issues = []
  const panels = spec.panels.map((p) => {
    const l = layoutPanel(p, backend, issues)
    let w = l.x1 - l.x0, h = l.y1 - l.y0, scale = 1
    if (p.fit) { scale = p.fit / Math.max(w, h); w *= scale; h *= scale }
    return { p, l, w, h, scale }
  })
  const pad = 14, capH = panels.some((x) => x.p.caption) ? 44 : 0
  const cols = spec.columns ?? panels.length
  const cellW = Math.max(...panels.map((x) => x.w)) + 2 * pad
  const cellH = Math.max(...panels.map((x) => x.h)) + 2 * pad + capH
  let body = ''
  panels.forEach(({ p, l, w, h, scale }, i) => {
    const cx = (i % cols) * cellW, cy = Math.floor(i / cols) * cellH
    const gx = cx + (cellW - w) / 2, groundY = cy + cellH - capH - pad
    body += `<g transform="translate(${gx.toFixed(1)} ${groundY.toFixed(1)}) scale(${scale.toFixed(3)}) translate(${-l.x0} 0)">`
    if (p.ground !== false && !p.fit) body += `<line x1="${l.x0 - 10}" y1="0" x2="${l.x1 + 10}" y2="0" stroke="var(--fig-ground)" stroke-width="2" stroke-linecap="round"/>`
    body += l.svg + '</g>'
    if (p.caption) {
      const mx = cx + cellW / 2, gloss = t(p.caption.gloss)
      body += `<text x="${mx}" y="${groundY + 26}" text-anchor="middle" font-size="18" font-family="${ZH_FONT}" fill="var(--text-primary)">${esc(p.caption.zh)}</text>`
      body += `<text x="${mx}" y="${groundY + 42}" text-anchor="middle" font-size="11" font-family="${UI_FONT}" fill="var(--text-secondary)">${esc(gloss)}</text>`
      for (const [s, sz, cjk] of [[p.caption.zh, 18, true], [gloss, 11, false]])
        if (textWidth(s, sz, cjk) > cellW - 4) issues.push({ level: 'warn', msg: `caption "${s}" is wider than its panel` })
    }
  })
  const W = Math.ceil(cols * cellW), H = Math.ceil(Math.ceil(panels.length / cols) * cellH)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(t(spec.aria))}">${body}</svg>`
  issues.push(...checkSvg(svg))
  return { svg, issues }
}
