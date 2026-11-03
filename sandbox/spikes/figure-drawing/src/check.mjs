// Automatic figure checks that need no vision model. Works on any SVG string (hand-written or compiled).
import { resolveVars, themes } from './theme.mjs'

function rgb(c, bg) {
  let m = c.match(/^#([0-9a-f]{6})$/i)
  if (m) return [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16))
  m = c.match(/^rgba?\(([^)]+)\)$/)
  if (m) { const [r, g, b, a = 1] = m[1].split(',').map(Number); const B = bg ? rgb(bg) : [0, 0, 0]; return [r, g, b].map((v, i) => v * a + B[i] * (1 - a)) }
  return null
}
const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b) }
export function contrast(a, b) { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05) }

// Walks tags with a style stack (fill/stroke inheritance). Nested emoji <svg> content is skipped for contrast.
export function checkSvg(svg) {
  const issues = [], hard = new Set()
  // A path drawn twice (dark wide stroke under a colored narrow one) is an outlined stroke: it reads fine.
  const ds = [...svg.matchAll(/\sd="([^"]+)"/g)].map((m) => m[1])
  const outlined = new Set(ds.filter((d, i) => ds.indexOf(d) !== i))
  for (const theme of ['light', 'dark']) {
    const bg = themes[theme]['surface-2']
    const stack = [{ fill: '#000000', stroke: 'none', emoji: false }]
    const seen = new Set()
    for (const m of svg.matchAll(/<(\/?)([a-zA-Z]+)([^>]*?)(\/?)>/g)) {
      const [, close, tag, attrs, self] = m
      if (close) { stack.pop(); continue }
      const top = stack[stack.length - 1]
      const get = (k) => attrs.match(new RegExp(`\\s${k}="([^"]*)"`))?.[1]
      const cur = { fill: get('fill') ?? top.fill, stroke: get('stroke') ?? top.stroke, emoji: top.emoji || (tag === 'svg' && stack.length > 1) }
      for (const v of [get('fill'), get('stroke')]) if (v && !/^(none|currentColor|var\(--[a-z0-9-]+\))$/.test(v) && !cur.emoji) hard.add(v)
      const shape = /^(path|rect|circle|ellipse|line|polyline|polygon)$/.test(tag)
      if (shape && !cur.emoji && cur.stroke.startsWith('var(')) {
        const strokeOnly = tag === 'line' || tag === 'polyline' || cur.fill === 'none'
        const width = Number(get('stroke-width') ?? 2)
        if (strokeOnly && width >= 3 && !outlined.has(get('d'))) { // thick strokes act as shapes (limbs, legs): they must stand out from the page
          const c = contrast(rgb(resolveVars(cur.stroke, theme), bg), rgb(bg))
          const key = `${cur.stroke}@${theme}`
          if (c < 1.6 && !seen.has(key)) { seen.add(key); issues.push({ level: 'warn', msg: `${theme}: thick stroke-only ${tag} in ${cur.stroke} has contrast ${c.toFixed(2)}:1 against the page` }) }
        }
      }
      if (!self && tag !== 'br') stack.push(cur)
    }
  }
  if (hard.size) issues.push({ level: 'warn', msg: `hard-coded colors (will not theme): ${[...hard].join(', ')}` })
  return issues
}

// Template-only check for hand-written SVGs: visible text must be CJK lesson content or a {{t:key}} message.
export function checkTemplate(svg) {
  const issues = []
  for (const m of svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)) {
    const s = m[1].replace(/\{\{t:[\w.]+\}\}/g, '').trim()
    if (/[A-Za-z]/.test(s)) issues.push({ level: 'error', msg: `baked UI text "${s}" (use a message key)` })
  }
  if (!/aria-label="\{\{t:[\w.]+\}\}"/.test(svg)) issues.push({ level: 'error', msg: 'aria-label must be a message key' })
  return issues
}
