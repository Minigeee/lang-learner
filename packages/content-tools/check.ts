// content:check: every rule, over everything, in file order.
import { byCodePoint, format, rel, type Diag } from './diag.ts'
import type { Rule } from './pack.ts'
import type { Project } from './project.ts'
import { copyTerms } from './rules/copy.ts'
import { onPath, targetsInTier } from './rules/deps.ts'
import { audioQuality, licensed, linesHaveClips } from './rules/media.ts'
import { refsResolve } from './rules/refs.ts'
import { graphOrder, outputLevel, structure, wordBudgets } from './rules/structure.ts'
import { vocabulary } from './rules/vocab.ts'

const RULES: Rule[] = [refsResolve, structure, wordBudgets, graphOrder, outputLevel, copyTerms, linesHaveClips, audioQuality, licensed, onPath, targetsInTier, vocabulary]

/** Diagnostics are sorted and deduplicated, so a run's output is stable. */
export function runRules(project: Project): Diag[] {
  const all = [...project.diags, ...project.docs.flatMap((d) => d.diags), ...[...RULES, ...project.pack.rules].flatMap((r) => r.run(project))]
    .map((d) => ({ ...d, file: rel(d.file) }))
  const unique = new Map(all.map((d) => [format(d), d]))
  return [...unique.values()].sort((a, b) => byCodePoint(a.file, b.file) || a.line - b.line || byCodePoint(a.rule, b.rule) || byCodePoint(a.message, b.message))
}
