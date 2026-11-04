// Reads the local Supabase stack's connection values from `supabase status`.
import { execSync } from 'node:child_process'

export function supabaseStatus() {
  const out = execSync('pnpm exec supabase status -o env', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
  return Object.fromEntries([...out.matchAll(/^([A-Z_]+)="?(.*?)"?$/gm)].map((m) => [m[1], m[2]]))
}
