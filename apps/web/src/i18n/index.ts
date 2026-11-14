// App chrome strings. Each row of ui.tsv is one English string (the key) plus one column per support
// locale, with empty cells falling back to English. Target-language text never goes through t().
import { ref } from 'vue'
import tsv from './ui.tsv?raw'

export type Locale = 'en' | 'zh-Hans'

const [header = '', ...rows] = tsv.split(/\r?\n/).filter((line) => line.trim())
const columns = header.split('\t') as Locale[]
const table = new Map(rows.map((row) => {
  const cells = row.split('\t')
  return [cells[0]!, Object.fromEntries(columns.map((c, i) => [c, cells[i]]))] as const
}))

export const locale = ref<Locale>('en')

const lookup = (en: string) => table.get(en)?.[locale.value] || en

/** Translates an English support string and fills {placeholders}. */
export function t(en: string, vars: Record<string, string | number> = {}): string {
  return lookup(en).replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m))
}

/** Like t(), but in parts, so a placeholder holding target text can get its own styling. */
export function tp(en: string, vars: Record<string, string>): { text: string; isVar: boolean }[] {
  return lookup(en).split(/(\{\w+\})/).filter(Boolean).map((part) => {
    const k = /^\{(\w+)\}$/.exec(part)?.[1]
    return k !== undefined && k in vars ? { text: vars[k]!, isVar: true } : { text: part, isVar: false }
  })
}
