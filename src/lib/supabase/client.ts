import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  console.log('[Supabase Client] Creating client with config:', {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    flowType: 'implicit',
    detectSessionInUrl: true,
  })

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        flowType: 'implicit',
        detectSessionInUrl: true,
        persistSession: true,
        autoRefreshToken: true,
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      }
    }
  )
}