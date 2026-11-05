// Each folder in fixtures/ named for a rule overlays fixtures/_base and must report that rule, with
// the exact output frozen in expected.txt. Run with UPDATE_FIXTURES=1 to refreeze after a real change.
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { runRules } from '../check.ts'
import { format } from '../diag.ts'
import { loadProject } from '../project.ts'

const FIXTURES = 'test/fixtures'
const root = join(FIXTURES, '_base')
const rules = readdirSync(FIXTURES).filter((name) => /^[A-Z]/.test(name)).sort()

describe('failing fixtures', () => {
  it.each(rules)('%s', async (rule) => {
    const overlay = join(FIXTURES, rule)
    const diags = runRules(await loadProject({ root, overlay }))
    const actual = `${diags.map(format).join('\n')}\n`
    const file = join(overlay, 'expected.txt')
    if (process.env.UPDATE_FIXTURES) writeFileSync(file, actual)
    expect(diags.map((d) => d.rule)).toContain(rule)
    expect(actual).toBe(existsSync(file) ? readFileSync(file, 'utf8').replace(/\r\n/g, '\n') : '')
  })
})

describe('passing fixture', () => {
  it('reports nothing', async () => {
    const project = await loadProject({ root, overlay: join(FIXTURES, 'pass') })
    expect(project.docs).toHaveLength(5)
    expect(runRules(project).map(format)).toEqual([])
  })
})
