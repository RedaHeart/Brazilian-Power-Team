import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

const fallbackSupabaseUrl = 'https://placeholder.supabase.co'
const fallbackSupabaseAnonKey = 'missing-local-supabase-key'

export const supabase = createClient(
  isSupabaseConfigured ? supabaseUrl : fallbackSupabaseUrl,
  isSupabaseConfigured ? supabaseAnonKey : fallbackSupabaseAnonKey,
)

export const createIsolatedSupabaseClient = () =>
  createClient(isSupabaseConfigured ? supabaseUrl : fallbackSupabaseUrl, isSupabaseConfigured ? supabaseAnonKey : fallbackSupabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
