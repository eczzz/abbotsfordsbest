import { createServerClient } from '@supabase/ssr'

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY

function createSupabaseFromCookies(cookies) {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(key) {
        return cookies.get(key)?.value
      },
      set(key, value, options) {
        cookies.set(key, value, { path: '/', ...options })
      },
      remove(key, options) {
        cookies.delete(key, { path: '/', ...options })
      },
    },
  })
}

export async function POST({ request, cookies }) {
  let payload

  try {
    payload = await request.json()
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Invalid JSON payload' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { event, session } = payload ?? {}

  if (!event) {
    return new Response(JSON.stringify({ error: 'Missing event type' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let supabase

  try {
    supabase = createSupabaseFromCookies(cookies)
  } catch (error) {
    console.error('Failed to create Supabase client for auth sync:', error)
    return new Response(JSON.stringify({ error: 'Server configuration error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (event === 'SIGNED_IN') {
    if (!session) {
      return new Response(JSON.stringify({ error: 'Missing session data' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const { error } = await supabase.auth.setSession(session)

    if (error) {
      console.error('Error setting Supabase session on server:', error)
      return new Response(JSON.stringify({ error: 'Failed to set session' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (event === 'SIGNED_OUT') {
    const { error } = await supabase.auth.signOut()

    if (error) {
      console.error('Error clearing Supabase session on server:', error)
      return new Response(JSON.stringify({ error: 'Failed to clear session' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ error: 'Unsupported event type' }), {
    status: 400,
    headers: { 'Content-Type': 'application/json' },
  })
}
