import 'server-only'

import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

function makeClient(key: string | undefined) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/rest\/v1\/?$/, '')
  if (!url || !key) throw new Error('Configuração do Supabase incompleta.')

  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }) },
  })
}

export function createAuthSupabase() {
  return makeClient(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}

export function createAdminSupabase() {
  return makeClient(process.env.SUPABASE_SERVICE_ROLE_KEY)
}
