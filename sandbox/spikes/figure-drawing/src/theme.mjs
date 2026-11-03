// App tokens copied from activity-pilot/src/styles/tokens.css (subset), plus a few figure tokens.
// Figures may only reference these names via var(--x); rasterization resolves them per theme.
const app = {
  light: { page: '#F5F3EE', 'surface-1': '#F3F0EA', 'surface-2': '#FFFFFF', 'surface-3': '#E9E5DC',
    'text-primary': '#1D1B18', 'text-secondary': '#625D55', 'text-muted': '#9C968C', 'border-strong': 'rgba(29,27,24,.16)',
    act: '#C2412D', 'act-soft': '#FBEAE5', jade: '#157F62', 'jade-soft': '#E2F3EC', ink: '#3D6FD1', 'ink-soft': '#E7EEFB', slate: '#64748B', 'slate-soft': '#E5E9F0' },
  dark: { page: '#121110', 'surface-1': '#25231F', 'surface-2': '#1B1A18', 'surface-3': '#302D28',
    'text-primary': '#F0ECE4', 'text-secondary': '#B3ADA2', 'text-muted': '#7A746B', 'border-strong': 'rgba(255,248,236,.15)',
    act: '#C9452E', 'act-soft': '#3A1B14', jade: '#3FB68E', 'jade-soft': '#12302A', ink: '#6F98F0', 'ink-soft': '#172540', slate: '#8B9AB0', 'slate-soft': '#222A36' },
}
// Figure tokens: semantic material colors. Proposed additions to tokens.css.
const fig = {
  light: { 'fig-line': 'var(--text-primary)', 'fig-bg': 'var(--surface-1)', 'fig-fill': 'var(--surface-2)', 'fig-shade': 'var(--surface-3)',
    'fig-wood': '#C99A6B', 'fig-wood-dark': '#9C6E45', 'fig-fur': '#E8A25A', 'fig-fur-dark': '#B8742F', 'fig-skin': '#F2C7A5', 'fig-hair': '#3A2E28',
    'fig-cloth': 'var(--ink)', 'fig-tea': '#7FA35A', 'fig-accent': 'var(--act)', 'fig-ground': 'var(--border-strong)' },
  dark: { 'fig-line': '#0B0A09', 'fig-bg': 'var(--surface-1)', 'fig-fill': '#E9E2D6', 'fig-shade': '#B9B0A2',
    'fig-wood': '#B08358', 'fig-wood-dark': '#7E5A38', 'fig-fur': '#D8914A', 'fig-fur-dark': '#A0642A', 'fig-skin': '#E2B898', 'fig-hair': '#2A211C',
    'fig-cloth': 'var(--ink)', 'fig-tea': '#8DB366', 'fig-accent': 'var(--act)', 'fig-ground': 'var(--border-strong)' },
}
export const themes = { light: { ...app.light, ...fig.light }, dark: { ...app.dark, ...fig.dark } }

export function resolveVars(svg, theme) {
  const t = themes[theme]
  let out = svg
  for (let i = 0; i < 4; i++) out = out.replace(/var\(--([a-z0-9-]+)\)/g, (m, n) => (n in t ? t[n] : (() => { throw new Error('unknown token ' + n) })()))
  return out
}
export function cssVars(theme) {
  return Object.entries(themes[theme]).map(([k, v]) => `--${k}:${v};`).join('')
}
