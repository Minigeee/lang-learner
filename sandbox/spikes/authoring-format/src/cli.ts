// npm run check [-- --root content] [-- --curriculum <file> --lessons <dir>]
// npm run build
import { runCheck, format } from './check/run.ts'
import { build } from './build.ts'

const [cmd, ...args] = process.argv.slice(2)
const opt = (name: string) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : undefined }
const root = opt('root') ?? 'content'
const lessons = opt('lessons')
const { ctx, diags } = await runCheck(root, { curriculumFile: opt('curriculum'), lessonDirs: lessons ? [lessons] : undefined })
for (const d of diags) console.log(format(d))
const errors = diags.filter((d) => d.severity === 'error').length
console.log(`${ctx.docs.length} lesson file(s), ${errors} error(s), ${diags.length - errors} warning(s)`)
if (errors) process.exit(1)
if (cmd === 'build') console.log(`manifest: ${await build(ctx)}`)
