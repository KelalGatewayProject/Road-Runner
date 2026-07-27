/**
 * Login with synthetic phone email + PIN.
 * Tries auth-login-proxy first; falls back to signInWithPassword({ email }).
 */
import { hasSupabaseConfig, supabase, supabaseAnonKey, supabaseUrl } from '../services/supabaseClient'

export type LoginResult = {
  data: { user: unknown; session: unknown } | null
  error: { message: string } | null
}

const LOGIN_PROXY_TIMEOUT_MS = 25000

async function signInDirect(email: string, password: string): Promise<LoginResult> {
  if (!supabase) {
    return { data: null, error: { message: 'Supabase is not configured.' } }
  }
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  return {
    data: data ? { user: data.user, session: data.session } : null,
    error: error ? { message: error.message } : null,
  }
}

export async function loginWithIpRateLimit(
  email: string,
  password: string,
  captchaToken?: string,
): Promise<LoginResult> {
  const trimmedEmail = email.trim()
  if (!trimmedEmail || !password) {
    return { data: null, error: { message: 'Missing email or password' } }
  }

  if (!hasSupabaseConfig || !supabase) {
    return { data: null, error: { message: 'Supabase is not configured.' } }
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), LOGIN_PROXY_TIMEOUT_MS)
  let res: Response
  try {
    res = await fetch(`${supabaseUrl}/functions/v1/auth-login-proxy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({
        email: trimmedEmail,
        password,
        captchaToken: captchaToken || '',
      }),
      signal: controller.signal,
    })
  } catch {
    clearTimeout(timeoutId)
    return signInDirect(trimmedEmail, password)
  } finally {
    clearTimeout(timeoutId)
  }

  if (res.status === 404 || res.status === 405) {
    return signInDirect(trimmedEmail, password)
  }

  const payload = (await res.json().catch(() => ({}))) as Record<string, unknown>

  if (!res.ok) {
    if (res.status >= 500 && !payload?.error && !payload?.msg) {
      return signInDirect(trimmedEmail, password)
    }
    const message =
      (typeof payload?.error === 'string' && payload.error) ||
      (typeof payload?.msg === 'string' && payload.msg) ||
      (typeof payload?.error_description === 'string' && payload.error_description) ||
      'Login failed'
    return { data: null, error: { message } }
  }

  const access_token = typeof payload?.access_token === 'string' ? payload.access_token : ''
  const refresh_token = typeof payload?.refresh_token === 'string' ? payload.refresh_token : ''

  if (!access_token || !refresh_token) {
    return signInDirect(trimmedEmail, password)
  }

  const { data, error } = await supabase.auth.setSession({
    access_token,
    refresh_token,
  })

  return {
    data: data ? { user: data.user, session: data.session } : null,
    error: error ? { message: error.message } : null,
  }
}
