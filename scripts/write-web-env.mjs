// Writes the local stack's values into apps/web/.env.local. The publishable key only: it's safe in a browser.
import { supabaseStatus } from './supabase-env.mjs'
import { setWebEnv } from './web-env.mjs'

const { PUBLISHABLE_KEY } = supabaseStatus()
if (!PUBLISHABLE_KEY) throw new Error('No publishable key. Is the stack running? Try `pnpm db:start`.')
setWebEnv('VITE_SUPABASE_PUBLISHABLE_KEY', PUBLISHABLE_KEY)
console.log('Wrote apps/web/.env.local')
