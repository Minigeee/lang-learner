// Writes apps/web/.env.local for the local stack. The publishable key only: it's safe in a browser.
import { writeFileSync } from 'node:fs'
import { supabaseStatus } from './supabase-env.mjs'

const { PUBLISHABLE_KEY } = supabaseStatus()
if (!PUBLISHABLE_KEY) throw new Error('No publishable key. Is the stack running? Try `pnpm db:start`.')
writeFileSync('apps/web/.env.local', `VITE_SUPABASE_PUBLISHABLE_KEY=${PUBLISHABLE_KEY}\n`)
console.log('Wrote apps/web/.env.local')
