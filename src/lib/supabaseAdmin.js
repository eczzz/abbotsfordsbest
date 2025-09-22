import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY

// Debug logging for Netlify deployment
console.log('🔍 SupabaseAdmin Debug:')
console.log('  - supabaseUrl:', supabaseUrl)
console.log('  - supabaseServiceRoleKey present:', !!supabaseServiceRoleKey)
console.log('  - supabaseServiceRoleKey length:', supabaseServiceRoleKey?.length || 0)
console.log('  - All env vars:', Object.keys(import.meta.env).filter(key => key.includes('SUPABASE')))

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Missing Supabase environment variables. Required: PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
}

// Admin client with service role key for server-side operations
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})