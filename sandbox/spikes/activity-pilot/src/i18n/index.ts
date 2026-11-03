// Support-language strings. Each row of strings.tsv is one English string (the key) plus one column
// per support locale. Adding a locale = adding a column; empty cells fall back to English.
// Target-language text (Chinese examples) never goes through t().
import { ref } from 'vue'
import tsv from './strings.tsv?raw'

export type Locale = 'en' | 'zh-Hans'
export const LOCALES: { id: Locale; name: string }[] = [
  { id: 'en', name: 'English' },
  { id: 'zh-Hans', name: '中文' },
]

const table = parse(tsv)
const missing = new Set<string>()

export const locale = ref<Locale>(readSaved())

export function setLocale(l: Locale): void {
  locale.value = l
  document.documentElement.lang = l === 'en' ? 'en' : 'zh-Hans'
  try { localStorage.setItem('pilot-locale', l) } catch { /* private mode */ }
}

/** Translates an English support string and fills {placeholders}. */
export function t(en: string, vars: Record<string, string | number> = {}): string {
  return fill(lookup(en), vars)
}

/** Like t(), but returns parts so a placeholder can be rendered with its own styling (e.g. target text). */
export function tp(en: string, vars: Record<string, string>): { text: string; isVar: boolean }[] {
  return lookup(en)
    .split(/(\{\w+\})/)
    .filter(Boolean)
    .map((part) => {
      const m = /^\{(\w+)\}$/.exec(part)
      return m && m[1] in vars ? { text: vars[m[1]], isVar: true } : { text: part, isVar: false }
    })
}

/** English strings rendered so far that have no cell in the current locale's column. */
export function missingStrings(): string[] {
  return [...missing]
}

function lookup(en: string): string {
  if (locale.value === 'en') return en
  const cell = table.get(en)?.[locale.value]
  if (cell) return cell
  if (import.meta.env.DEV && !missing.has(en)) { missing.add(en); console.warn(`[i18n] no ${locale.value} for: ${en}`) }
  return en
}

function fill(s: string, vars: Record<string, string | number>): string {
  return s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m))
}

function parse(text: string): Map<string, Partial<Record<Locale, string>>> {
  const [header, ...rows] = text.split(/\r?\n/).filter((l) => l.trim() && !l.startsWith('#'))
  const cols = header.split('\t') as Locale[]
  const map = new Map<string, Partial<Record<Locale, string>>>()
  for (const row of rows) {
    const cells = row.split('\t')
    const entry: Partial<Record<Locale, string>> = {}
    cols.forEach((c, i) => { if (cells[i]) entry[c] = cells[i] })
    if (entry.en) map.set(entry.en, entry)
  }
  return map
}

function readSaved(): Locale {
  try { return localStorage.getItem('pilot-locale') === 'zh-Hans' ? 'zh-Hans' : 'en' } catch { return 'en' }
}
