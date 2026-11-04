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

/** Translates an English support string and fills {placeholders}. */
export function t(en: string, vars: Record<string, string | number> = {}): string {
  const text = table.get(en)?.[locale.value] || en
  return text.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m))
}
