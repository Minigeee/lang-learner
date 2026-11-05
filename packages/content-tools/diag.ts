// Diagnostics: what every parser and rule reports.
import { relative } from 'node:path'
import type { z } from 'zod'
import type { LocatedYaml } from './yaml-loc.ts'

export interface Loc {
  file: string
  line: number
}

export interface Diag extends Loc {
  rule: string
  severity: 'error' | 'warn'
  message: string
}

export const error = (at: Loc, rule: string, message: string): Diag => ({ ...at, rule, severity: 'error', message })
export const warn = (at: Loc, rule: string, message: string): Diag => ({ ...at, rule, severity: 'warn', message })

/** A path relative to the working directory, with forward slashes on every platform. */
export function rel(path: string): string {
  return relative(process.cwd(), path).replace(/\\/g, '/')
}

export function format(d: Diag): string {
  return `${d.file}:${d.line} ${d.rule}${d.severity === 'warn' ? ' (warn)' : ''} ${d.message}`
}

/** Code-point order, so a build's bytes never depend on the machine's locale. */
export function byCodePoint(a: string, b: string): number {
  const x = [...a]
  const y = [...b]
  for (let i = 0; i < Math.min(x.length, y.length); i++) {
    const d = x[i]!.codePointAt(0)! - y[i]!.codePointAt(0)!
    if (d) return d
  }
  return x.length - y.length
}

/** Validates located YAML. Schema issues become diagnostics on the offending line, and the result is undefined. */
export function validate<S extends z.ZodType>(schema: S, y: LocatedYaml, file: string, diags: Diag[], rule = 'SCHEMA'): z.output<S> | undefined {
  const r = schema.safeParse(y.data)
  if (r.success) return r.data
  for (const issue of r.error.issues) {
    const unknownKey = issue.code === 'unrecognized_keys'
    const path = [...(issue.path as (string | number)[]), ...(unknownKey ? issue.keys.slice(0, 1) : [])]
    const hint = unknownKey ? ' (if this is part of a value, quote the value)' : ''
    diags.push(error({ file, line: y.lineOf(path) }, rule, `${path.join('.') || '(root)'}: ${issue.message}${hint}`))
  }
  return undefined
}
