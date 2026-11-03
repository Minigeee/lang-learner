// Parts library: each kind is drawn once (harvested from the critique-loop drawings in src/raw/r1),
// then reused by every figure. A part is { w, h, svg, anchors } in local coords: origin top-left,
// the part's resting base at y = h. Colors only via figure tokens (see ../theme.mjs).
//
// anchors (all optional):
//   top:   { y, x0, x1 }      supporting surface things can rest "on"
//   under: { x0, x1, h }      clear space beneath (between legs) for "under"
//   inner: { cx, bottom }     interior for "in"; such parts also give back/front layers
//   hand:  transform string   where a held object goes (person poses)
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'

const S = 'stroke="var(--fig-line)" stroke-width="2" stroke-linejoin="round"'
const crop = (x0, y0, body) => `<g transform="translate(${-x0} ${-y0})">${body}</g>`

const procedural = {
  table: () => ({ w: 164, h: 70, anchors: { top: { y: 0, x0: 10, x1: 154 }, under: { x0: 26, x1: 138, h: 56 } }, svg: crop(128, 110, `
    <g fill="var(--fig-wood)" ${S}>
      <rect x="128" y="110" width="164" height="12" rx="3"/>
      <path d="M142 122 L152 122 L150 180 L144 180 Z" fill="var(--fig-wood-dark)"/>
      <path d="M268 122 L278 122 L276 180 L270 180 Z" fill="var(--fig-wood-dark)"/></g>`) }),
  sideTable: () => ({ w: 58, h: 64, anchors: { top: { y: 0, x0: 6, x1: 52 }, under: { x0: 4, x1: 26, h: 54 } }, svg: `
    <path d="M29 8 L29 62" stroke="var(--fig-wood-dark)" stroke-width="5" stroke-linecap="round"/>
    <rect x="1" y="0" width="56" height="8" rx="2" fill="var(--fig-wood)" ${S}/>` }),
  chair: () => ({ w: 58, h: 116, anchors: { top: { y: 55, x0: 4, x1: 54 } }, svg: crop(37, 65, `
    <g fill="var(--fig-wood)" ${S}>
      <rect x="38" y="66" width="9" height="114" rx="2"/>
      <rect x="44" y="76" width="6" height="40" fill="var(--fig-wood-dark)"/>
      <rect x="38" y="120" width="56" height="9" rx="2"/>
      <rect x="86" y="129" width="8" height="51" rx="2"/></g>`) }),
  book: () => ({ w: 70, h: 18, anchors: { top: { y: 1, x0: 6, x1: 64 } }, svg: crop(175, 93, `
    <g ${S}><rect x="176" y="94" width="68" height="16" rx="2" fill="var(--fig-accent)"/>
      <rect x="182" y="98" width="62" height="8" fill="var(--fig-fill)"/>
      <line x1="186" y1="102" x2="240" y2="102" stroke="var(--fig-shade)" stroke-width="1"/></g>`) }),
  cat: () => ({ w: 78, h: 58, anchors: { top: { y: 30, x0: 22, x1: 60 } }, svg: crop(167, 36, `
    <g fill="var(--fig-fur)" ${S}>
      <path d="M188 94 Q182 66 210 64 Q236 64 236 94 Z"/>
      <path d="M190 92 Q170 92 172 76 Q174 70 180 72" fill="none" stroke-width="7" stroke-linecap="round"/>
      <path d="M190 92 Q170 92 172 76 Q174 70 180 72" fill="none" stroke="var(--fig-fur)" stroke-width="3.5" stroke-linecap="round"/>
      <path d="M217 56 L219 38 L229 48 L237 38 L240 56 Q244 72 228 74 Q212 72 217 56 Z"/></g>
    <g fill="var(--fig-line)"><circle cx="223" cy="58" r="2"/><circle cx="234" cy="58" r="2"/><path d="M227 63 L230 63 L228.5 65 Z"/></g>
    <path d="M200 76 L206 80 M200 84 L206 86" stroke="var(--fig-fur-dark)" stroke-width="2" stroke-linecap="round"/>`) }),
  // Box: closed by default; with open=true it exposes back/front layers for "in".
  box: ({ open } = {}) => {
    const lid = `<path d="M1 11 L51 11 L63 1 L13 1 Z" fill="${open ? 'var(--fig-line)' : 'var(--fig-wood)'}" ${S}/>`
    const front = `<path d="M1 11 L51 11 L51 51 L1 51 Z" fill="var(--fig-wood)" ${S}/>
      <path d="M51 11 L63 1 L63 41 L51 51 Z" fill="var(--fig-wood-dark)" ${S}/>`
    return { w: 64, h: 52, anchors: { top: { y: 7, x0: 12, x1: 52 }, ...(open ? { inner: { cx: 34, bottom: 16 } } : {}) },
      svg: lid + front, back: lid, front }
  },
  ball: () => ({ w: 24, h: 24, svg: `<circle cx="12" cy="12" r="11" fill="var(--fig-accent)" ${S}/>` }),
  // Steam is part of the box (so it never clips); the cup's base stays at y = h.
  teacup: ({ hot } = {}) => { const d = hot ? 18 : 0; return { w: 18, h: 16 + d, svg: `<g transform="translate(0 ${d})">` +
    `<path d="M1 1 L17 1 L15 13 Q9 16 3 13 Z" fill="var(--fig-fill)" ${S}/>` +
    (hot ? `<path d="M6 -4 q4 -6 0 -12 M12 -2 q4 -6 0 -12" fill="none" stroke="var(--text-muted)" stroke-width="1.5" stroke-linecap="round"/>` : '') + '</g>' } },
  // Seated person in profile (includes the chair). pose: 'rest' | 'drink'.
  person: ({ pose = 'rest' } = {}) => {
    const arm = pose === 'drink' ? 'M-16 -50 L-2 -28 L4 -66' : 'M-16 -50 L-6 -24 L14 -18'
    const body = `
      <path d="M-38 -2 L4 -2 L4 10 L-38 10 Z" fill="var(--fig-wood)" ${S}/>
      <path d="M-36 10 L-36 50 M0 10 L0 50" stroke="var(--fig-wood-dark)" stroke-width="5" stroke-linecap="round"/>
      <path d="M-40 -2 L-40 -70" stroke="var(--fig-wood-dark)" stroke-width="5" stroke-linecap="round"/>
      <path d="M-24 -10 L8 -10 L12 46 L2 46 L0 4 L-24 4 Z" fill="var(--slate)" ${S}/>
      <path d="M0 46 L18 46 Q20 52 14 52 L0 52 Z" fill="var(--fig-hair)" ${S}/>
      <path d="M-34 -6 Q-36 -56 -18 -60 Q-2 -60 -2 -40 L-4 -6 Z" fill="var(--fig-cloth)" ${S}/>
      <circle cx="-14" cy="-78" r="15" fill="var(--fig-skin)" ${S}/>
      <path d="M-29 -80 Q-28 -96 -12 -94 Q0 -93 0 -84 Q-12 -86 -20 -80 Z" fill="var(--fig-hair)" ${S}/>
      <circle cx="-5" cy="-78" r="1.8" fill="var(--fig-line)"/>
      <path d="${arm}" fill="none" stroke="var(--fig-line)" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="${arm}" fill="none" stroke="var(--fig-cloth)" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>`
    const hand = pose === 'drink' ? 'translate(41 21) rotate(-30) translate(0 -18)' : null // assumes a hot cup (steam offset 18)
    return { w: 62, h: 150, svg: crop(-43, -97, body), anchors: hand ? { hand } : {} }
  },
  // Vocabulary-card variants (harvested from r1 d-nouns).
  apple: () => ({ w: 60, h: 70, svg: crop(30, 14, `<g ${S}>
    <path d="M60 34 Q44 22 36 40 Q28 62 46 78 Q54 84 60 79 Q66 84 74 78 Q92 62 84 40 Q76 22 60 34 Z" fill="var(--fig-accent)"/>
    <path d="M60 34 Q60 24 64 18" fill="none" stroke="var(--fig-wood-dark)" stroke-width="3" stroke-linecap="round"/>
    <path d="M64 24 Q74 14 82 20 Q74 30 64 24 Z" fill="var(--jade)"/></g>`) }),
  mug: () => ({ w: 58, h: 54, svg: crop(158, 28, `<g ${S}>
    <path d="M196 38 Q214 40 210 56 Q206 68 194 64" fill="none" stroke-width="6" stroke-linecap="round"/>
    <path d="M196 38 Q214 40 210 56 Q206 68 194 64" fill="none" stroke="var(--fig-fill)" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M160 30 L198 30 L194 76 Q179 80 164 76 Z" fill="var(--fig-fill)"/>
    <path d="M161 38 L197 38" stroke="var(--fig-shade)"/></g>`) }),
  bookStanding: () => ({ w: 50, h: 62, svg: crop(278, 22, `<g ${S}>
    <path d="M280 30 L322 24 L322 72 L280 78 Z" fill="var(--ink)"/>
    <path d="M280 78 L322 72 L326 76 L284 82 Z" fill="var(--fig-fill)"/>
    <path d="M322 24 L326 28 L326 76 L322 72 Z" fill="var(--fig-fill)"/>
    <path d="M286 36 L316 32" stroke="var(--fig-fill)" stroke-width="2"/></g>`) }),
  catSitting: () => ({ w: 60, h: 74, svg: crop(38, 124, `<g ${S}>
    <path d="M42 196 Q38 162 60 160 Q82 162 78 196 Z" fill="var(--fig-fur)"/>
    <path d="M78 192 Q96 190 92 172" fill="none" stroke-width="7" stroke-linecap="round"/>
    <path d="M78 192 Q96 190 92 172" fill="none" stroke="var(--fig-fur)" stroke-width="3.5" stroke-linecap="round"/>
    <path d="M46 150 L46 128 L56 138 L64 138 L74 128 L74 150 Q74 164 60 164 Q46 164 46 150 Z" fill="var(--fig-fur)"/>
    <circle cx="54" cy="148" r="2" fill="var(--fig-line)"/><circle cx="66" cy="148" r="2" fill="var(--fig-line)"/></g>`) }),
  dog: () => ({ w: 90, h: 70, svg: crop(138, 129, `<g ${S}>
    <path d="M152 164 Q150 152 162 152 L196 152 Q206 152 204 164 L204 176 L152 176 Z" fill="var(--fig-wood)"/>
    <path d="M156 176 L156 196 M168 176 L168 196 M190 176 L190 196 M200 176 L200 196" stroke="var(--fig-wood-dark)" stroke-width="6" stroke-linecap="round"/>
    <path d="M152 158 Q140 150 142 138" fill="none" stroke="var(--fig-wood-dark)" stroke-width="5" stroke-linecap="round"/>
    <path d="M196 156 Q194 132 210 132 Q224 132 224 146 L222 152 Q214 156 204 156 Z" fill="var(--fig-wood)"/>
    <path d="M200 136 Q194 140 196 156 Q204 154 204 140 Z" fill="var(--fig-wood-dark)"/>
    <circle cx="214" cy="142" r="2" fill="var(--fig-line)"/><circle cx="224" cy="147" r="2.5" fill="var(--fig-line)"/></g>`) }),
  car: () => ({ w: 84, h: 58, svg: crop(260, 140, `<g ${S}>
    <path d="M262 186 L262 170 Q262 164 270 162 L282 160 L292 146 Q296 142 304 142 L318 142 Q326 142 330 150 L336 160 Q342 162 342 170 L342 186 Z" fill="var(--ink)"/>
    <path d="M288 160 L296 148 L308 148 L308 160 Z M314 160 L314 148 L322 148 L330 160 Z" fill="var(--fig-fill)"/>
    <circle cx="280" cy="188" r="9" fill="var(--fig-hair)"/><circle cx="280" cy="188" r="3.5" fill="var(--fig-shade)"/>
    <circle cx="324" cy="188" r="9" fill="var(--fig-hair)"/><circle cx="324" cy="188" r="3.5" fill="var(--fig-shade)"/></g>`) }),
}
// Kind aliases: one lesson word -> drawing. The spec names words, the library picks the drawing.
const kindAlias = { cup: 'mug', 'book.icon': 'bookStanding', 'cat.icon': 'catSitting' }

// Emoji backend: same kinds resolved to an open emoji set via Iconify JSON packages.
const require = createRequire(import.meta.url)
const emojiNames = { table: null, sideTable: null, chair: 'chair', book: 'closed-book', cat: 'cat', box: 'package', ball: 'basketball',
  teacup: 'teacup-without-handle', person: null, apple: 'red-apple', mug: 'hot-beverage', bookStanding: 'closed-book', catSitting: 'cat', dog: 'dog', car: 'automobile' }
const sets = {}
function iconBody(set, name) {
  sets[set] ??= JSON.parse(readFileSync(require.resolve(`@iconify-json/${set}/icons.json`), 'utf8'))
  const j = sets[set]
  const ic = j.icons[name] ?? j.icons[j.aliases?.[name]?.parent]
  if (!ic) return null
  return { body: ic.body, vw: ic.width ?? j.width ?? 16, vh: ic.height ?? j.height ?? 16 }
}
function emojiPart(set, kind, size, mono) {
  const name = emojiNames[kind]
  const ic = name && iconBody(set, name)
  if (!ic) return null
  const body = mono ? `<g style="color:var(--text-primary)">${ic.body}</g>` : ic.body
  // Emoji have no semantic anchors; assume a generic surface near the top of the glyph.
  return { w: size, h: size, emoji: `${set}:${name}`, anchors: { top: { y: size * 0.18, x0: size * 0.2, x1: size * 0.8 } },
    svg: `<svg width="${size}" height="${size}" viewBox="0 0 ${ic.vw} ${ic.vh}">${body}</svg>` }
}

export const kinds = Object.keys(procedural).concat(Object.keys(kindAlias))
// backend: 'procedural' | { emoji: '<iconify set>', size, mono }. Emoji falls back to procedural if the set lacks the kind.
export function makePart(kind, opts, backend = 'procedural') {
  const k = kindAlias[kind] ?? kind
  if (!procedural[k]) throw new Error(`unknown kind "${kind}"; known: ${kinds.join(', ')}`)
  if (backend !== 'procedural') {
    const sz = (opts?.size ?? 1) * (backend.size ?? 56)
    const p = emojiPart(backend.emoji, k, sz, backend.mono)
    if (p) return p
  }
  return { ...procedural[k](opts), fallback: backend !== 'procedural' }
}
