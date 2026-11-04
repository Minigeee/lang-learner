import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js'

/** The app reaches Supabase on its own origin, so the phone only needs the dev server's port. */
export const supabase: SupabaseClient = createClient(
  import.meta.env.VITE_SUPABASE_URL ?? `${location.origin}/supabase`,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } },
)

export async function currentSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession()
  return data.session
}

/** Sends a sign-in code. Signups are off, so an unknown address gets an error, not an account. */
export async function sendCode(email: string): Promise<void> {
  const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } })
  if (error) throw error
}

export async function verifyCode(email: string, token: string): Promise<void> {
  const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' })
  if (error) throw error
}
