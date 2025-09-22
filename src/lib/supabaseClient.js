import { createBrowserClient, createServerClient } from '@supabase/ssr'

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY

// Debug logging for Netlify deployment
console.log('🔍 SupabaseClient Debug:')
console.log('  - supabaseUrl:', supabaseUrl)
console.log('  - supabaseAnonKey present:', !!supabaseAnonKey)
console.log('  - supabaseAnonKey length:', supabaseAnonKey?.length || 0)
console.log('  - Environment:', import.meta.env.SSR ? 'SSR' : 'Client')

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Required: PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY')
}

// Client-side Supabase client (for use in browser/client-side scripts)
export const supabase = import.meta.env.SSR
  ? undefined
  : createBrowserClient(supabaseUrl, supabaseAnonKey)

// Server-side Supabase client factory (for use in .astro files)
export function getSupabase(Astro) {
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(key) {
        return Astro.cookies.get(key)?.value
      },
      set(key, value, options) {
        Astro.cookies.set(key, value, options)
      },
      remove(key, options) {
        Astro.cookies.delete(key, options)
      },
    },
  })
}
