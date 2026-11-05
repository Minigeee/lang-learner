// Sets one line of apps/web/.env.local and keeps the others, since more than one tool writes there.
import { existsSync, readFileSync, writeFileSync } from 'node:fs'

const FILE = 'apps/web/.env.local'

export function setWebEnv(key, value) {
  const lines = existsSync(FILE) ? readFileSync(FILE, 'utf8').split(/\r?\n/).filter(Boolean) : []
  const kept = lines.filter((line) => !line.startsWith(`${key}=`))
  writeFileSync(FILE, [...kept, `${key}=${value}`].join('\n') + '\n')
}
