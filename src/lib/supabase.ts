import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Cliente Supabase: lee SOLO desde variables de entorno.
 * Nunca hay claves en el código. Sin variables, `supabase` es null
 * y la app usa el modo local con datos de ejemplo (ver backend.ts).
 */
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const SUPABASE_URL = url || ''
export const isSupabaseConfigured = Boolean(url && anonKey)

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url as string, anonKey as string, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
  : null
