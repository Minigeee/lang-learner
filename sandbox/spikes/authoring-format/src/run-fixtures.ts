// npm run fixtures [-- --update]
// Each fixtures/<RULE>/ holds lesson files (and optionally a curriculum.ts extending the real one) that must
// fail with that rule. expected.txt freezes the exact diagnostics, so message and line regressions show up.
import { readdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { runCheck, format } from './check/run.ts'

const update = process.argv.includes('--update')
let failed = 0
for (const rule of readdirSync('fixtures').filter((d) => !d.includes('.') && !d.startsWith('_')).sort()) {
  const dir = join('fixtures', rule)
  const curriculum = join(dir, 'curriculum.ts')
  const { diags } = await runCheck('content', {
    curriculumFile: existsSync(curriculum) ? curriculum : undefined,
    lessonDirs: [join(dir, 'lessons')],
  })
  const actual = diags.map(format).join('\n') + '\n'
  const expectedFile = join(dir, 'expected.txt')
  const hasRule = diags.some((d) => d.rule === rule)
  if (update) writeFileSync(expectedFile, actual)
  const same = existsSync(expectedFile) && readFileSync(expectedFile, 'utf8') === actual
  const ok = hasRule && same
  if (!ok) failed++
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${rule}: ${diags.length} diagnostic(s)${hasRule ? '' : `, none from ${rule}`}${same ? '' : ', differs from expected.txt'}`)
  if (!ok || process.argv.includes('--verbose')) console.log(actual.replace(/^/gm, '     '))
}
process.exit(failed ? 1 : 0)
