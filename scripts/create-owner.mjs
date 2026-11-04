// Creates the owner account on the local stack, since signups are off. Safe to run again.
// OWNER_EMAIL comes from .env.development.local, so the address is never committed.
import { readFileSync } from 'node:fs'
import { supabaseStatus } from './supabase-env.mjs'

const env = readFileSync('.env.development.local', 'utf8')
const email = /^OWNER_EMAIL=(.+)$/m.exec(env)?.[1]?.trim()
if (!email) throw new Error('Set OWNER_EMAIL in .env.development.local')

const { API_URL, SECRET_KEY } = supabaseStatus()
const res = await fetch(`${API_URL}/auth/v1/admin/users`, {
  method: 'POST',
  headers: { apikey: SECRET_KEY, authorization: `Bearer ${SECRET_KEY}`, 'content-type': 'application/json' },
  body: JSON.stringify({ email, email_confirm: true }),
})
if (res.ok) console.log('Owner account created')
else if (res.status === 422) console.log('Owner account already exists')
else throw new Error(`Couldn't create the owner: ${res.status} ${await res.text()}`)
