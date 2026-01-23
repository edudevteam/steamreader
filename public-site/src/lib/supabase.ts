import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Use sessionStorage instead of localStorage
    // This clears the session when the browser is closed
    storage: typeof window !== 'undefined' ? window.sessionStorage : undefined,
    // Automatically refresh the session before it expires
    autoRefreshToken: true,
    // Persist session in storage
    persistSession: true,
    // Detect session from URL (for OAuth and magic links)
    detectSessionInUrl: true
  }
})
