import { supabase } from '../services/supabaseClient'

/**
 * Extract user-facing error message from send-phone-otp Edge Function result.
 * When the function returns 403/4xx/500, the Supabase client often only gives a generic
 * "edge functions returned a non-2xx status code"; this tries to read the JSON body
 * from error.context so we can show the actual message.
 */
export async function getSendPhoneOtpErrorResult(
  data: { success?: boolean; error?: string; details?: string } | null,
  error: unknown
): Promise<{ message: string; isPhoneAlreadyRegistered: boolean; isPhoneBlocked: boolean }> {
  let message = 'Failed to send verification code. Please try again.'
  let fromServerBody = false
  if (data?.error && typeof data.error === 'string') {
    message = data.error
    fromServerBody = true
    if (/Failed to send SMS\. Please try again\./i.test(message)) {
      message =
        'SMS could not be sent. Verification codes are currently unavailable. Please contact Road Runner support to continue verification.'
    }
  }
  if (error) {
    const err = error as {
      message?: string
      context?: { json?: () => Promise<{ error?: string; details?: string }>; status?: number }
    }
    const status = err?.context?.status
    if (status === 429 || /429|too many requests/i.test(String(err?.message))) {
      message = 'Too many attempts. Please wait a few minutes before requesting another code.'
    } else {
      const ctx = err?.context
      if (ctx && typeof ctx.json === 'function') {
        try {
          const body = await ctx.json()
          if (body?.error && typeof body.error === 'string') {
            message = body.error
            fromServerBody = true
          } else if (body?.details && typeof body.details === 'string') {
            message = body.details
            fromServerBody = true
          }
        } catch (_) {
          if (err?.message) message = err.message
        }
      } else if (err?.message) {
        message = err.message
      }
    }
  }
  const isGenericFailure =
    !fromServerBody && /non-2xx|status code|FunctionsHttpError/i.test(message)
  if (isGenericFailure) {
    message =
      'SMS could not be sent. Verification codes are currently unavailable. Please contact Road Runner support to continue verification.'
  }

  const isPhoneAlreadyRegistered = /already registered/i.test(message)
  const isPhoneBlocked = /has been blocked|phone number has been blocked/i.test(message)
  return { message, isPhoneAlreadyRegistered, isPhoneBlocked }
}

/** Synthetic Auth email domain for phone+PIN (Confirm email must be OFF). */
export const PHONE_AUTH_EMAIL_DOMAIN = 'phone.rrunner.app'

/** Normalize to local 0XXXXXXXXX (10 digits) for OTP / users.phone. */
export function normalizeLocalEthiopianPhone(rawPhone: string): string | null {
  const digits = String(rawPhone || '').replace(/\D/g, '')
  if (!digits) return null
  if (digits.startsWith('0') && digits.length === 10) return digits
  if (digits.startsWith('251') && digits.length === 12) return `0${digits.slice(3)}`
  if (digits.length === 9) return `0${digits}`
  return null
}

/** E.164 for future native Phone Auth, e.g. +251984715947 */
export function authPhoneE164(phoneNumber: string): string | null {
  const local = normalizeLocalEthiopianPhone(phoneNumber)
  if (!local || !local.startsWith('0') || local.length !== 10) return null
  return `+251${local.slice(1)}`
}

/**
 * Deterministic Supabase Auth email for a phone-first account.
 * Login reconstructs this from the same phone number.
 */
export function authEmailFromPhone(phoneNumber: string): string | null {
  const local = normalizeLocalEthiopianPhone(phoneNumber)
  if (!local) return null
  return `p${local}@${PHONE_AUTH_EMAIL_DOMAIN}`
}

/** True when email is a phone-auth placeholder (not a user-entered inbox). */
export function isPhoneAuthEmail(email: string | null | undefined): boolean {
  if (!email) return false
  return email.toLowerCase().endsWith(`@${PHONE_AUTH_EMAIL_DOMAIN}`)
}

/**
 * Resolve login identifier: phone → auth email, otherwise trim as email.
 */
export function resolveLoginEmail(emailOrPhone: string): string {
  const trimmed = String(emailOrPhone || '').trim()
  if (!trimmed) return ''
  if (trimmed.includes('@')) return trimmed
  const fromPhone = authEmailFromPhone(trimmed)
  return fromPhone || trimmed
}

/**
 * Checks if a phone number exists in the users table and returns user data
 * @param phoneNumber - Phone number to check (should be 10 digits starting with 0)
 * @returns User data if found, null otherwise
 *
 * Note: RLS only allows reading your own users row. For signup (logged out),
 * use isPhoneRegistered() which calls the SECURITY DEFINER RPC.
 */
export const getUserByPhoneNumber = async (phoneNumber: string) => {
  try {
    if (!supabase) return null
    const cleanedPhone = phoneNumber.replace(/\D/g, '')

    if (!cleanedPhone.startsWith('0') || cleanedPhone.length !== 10) {
      return null
    }

    const { data, error } = await supabase
      .from('users')
      .select('id, first_name, last_name, phone, email')
      .eq('phone', cleanedPhone)
      .maybeSingle()

    if (error) {
      console.error('Error fetching user by phone number:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error in getUserByPhoneNumber:', error)
    return null
  }
}

/**
 * Remove leftover Auth users for a phone after account delete (public.users gone,
 * but p0…@phone.roadrunner.com still in auth.users). Safe no-op if phone is live.
 */
export const purgeOrphanedPhoneAuth = async (phoneNumber: string): Promise<void> => {
  try {
    if (!supabase) return
    const local = normalizeLocalEthiopianPhone(phoneNumber)
    if (!local) return
    const { error } = await supabase.rpc('purge_orphaned_phone_auth', {
      p_phone: local,
    })
    // Missing RPC on a fresh project is expected until OTP migrations are applied.
    if (error && !/Could not find the function|PGRST202|schema cache/i.test(error.message || '')) {
      console.warn('purge_orphaned_phone_auth:', error.message)
    }
  } catch (error) {
    console.warn('purge_orphaned_phone_auth failed:', error)
  }
}

/**
 * True if this phone is already linked to any account.
 * Works while logged out (signup) via SECURITY DEFINER RPC — not blocked by users RLS.
 * When the purge RPC exists, orphans from a prior delete are cleaned first.
 */
export const isPhoneRegistered = async (phoneNumber: string): Promise<boolean> => {
  try {
    if (!supabase) return false
    const local = normalizeLocalEthiopianPhone(phoneNumber)
    if (!local) return false
    await purgeOrphanedPhoneAuth(local)
    const { data, error } = await supabase.rpc('is_phone_registered', {
      p_phone: local,
    })
    if (error) {
      console.error('Error in isPhoneRegistered:', error)
      const existing = await getUserByPhoneNumber(local)
      return !!existing
    }
    return data === true
  } catch (error) {
    console.error('Error in isPhoneRegistered:', error)
    return false
  }
}

/**
 * Updates user's phone number in the database
 * @param userId - User ID to update
 * @param phoneNumber - Phone number to set (will be cleaned automatically)
 * @returns Success status and error if any
 */
export const updateUserPhoneNumber = async (userId: string, phoneNumber: string) => {
  try {
    if (!supabase) {
      return { success: false, error: 'Supabase is not configured.' }
    }
    const cleanedPhone = phoneNumber.replace(/\D/g, '')

    if (!cleanedPhone.startsWith('0') || cleanedPhone.length !== 10) {
      return { success: false, error: 'Invalid phone number format' }
    }

    const { data: authData } = await supabase.auth.getUser()
    if (!authData?.user || authData.user.id !== userId) {
      return { success: false, error: 'Not authorized to update this phone number.' }
    }

    const { error } = await supabase.rpc('set_user_phone_after_verified_otp', {
      p_phone: cleanedPhone,
    })

    if (error) {
      console.error('Error updating phone number:', error)
      return { success: false, error: error.message }
    }

    return { success: true, error: null }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error in updateUserPhoneNumber:', error)
    return { success: false, error: message }
  }
}
