/**
 * Road Runner auth: phone + PIN (no email).
 * SMS OTP is off until Road Runner has its own AfroMessage / telecom credentials.
 * Flip SIGNUP_SMS_OTP_ENABLED to true after Edge Function + secrets are live on RoadRunner.
 */
import React, { useEffect, useRef, useState } from 'react'
import { hasSupabaseConfig, supabase } from '../../services/supabaseClient'
import { useAuth } from '../../contexts/AuthContext'
import { loginWithIpRateLimit } from '../../utils/loginWithIpRateLimit'
import NumericKeypadModal from './NumericKeypadModal'
import OTPVerificationModal from './OTPVerificationModal'
import PhoneAlreadyRegisteredModal from './PhoneAlreadyRegisteredModal'
import PhoneBlockedModal from './PhoneBlockedModal'
import { isValidPin, normalizePin, pinToSupabasePassword } from '../../utils/pinAuth'
import {
  authEmailFromPhone,
  getSendPhoneOtpErrorResult,
  isPhoneRegistered,
  normalizeLocalEthiopianPhone,
  purgeOrphanedPhoneAuth,
} from '../../utils/phoneNumberUtils'
import './AuthSlide.css'

/** Temporary: skip SMS OTP / send-phone-otp until RR has its own SMS credentials. */
const SIGNUP_SMS_OTP_ENABLED = false

export interface AuthSlideProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

const LAST_LOGIN_PHONE_KEY = 'road_runner_last_login_phone'
const PIN_STATUS_KEY_PREFIX = 'road_runner_has_pin_for_phone_'
const SIGN_IN_TIMEOUT_MS = 90000

const AuthSlide: React.FC<AuthSlideProps> = ({ isOpen, onClose, onSuccess }) => {
  const { refreshUser, updateUserPhone } = useAuth()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [loginPhone, setLoginPhone] = useState('')
  const [loginPin, setLoginPin] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [signupPhone, setSignupPhone] = useState('')
  const [signupPin, setSignupPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [signupPinError, setSignupPinError] = useState('')
  const [showLoginPhoneKeypad, setShowLoginPhoneKeypad] = useState(false)
  const [showSignupPhoneKeypad, setShowSignupPhoneKeypad] = useState(false)
  const [showOTPModal, setShowOTPModal] = useState(false)
  const [pendingPhone, setPendingPhone] = useState('')
  const [verifyingOTP, setVerifyingOTP] = useState(false)
  const [showPhoneAlreadyRegisteredModal, setShowPhoneAlreadyRegisteredModal] = useState(false)
  const [showPhoneBlockedModal, setShowPhoneBlockedModal] = useState(false)
  const [phoneAvailableMsg, setPhoneAvailableMsg] = useState('')
  const [phoneVerified, setPhoneVerified] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const openedAtRef = useRef(0)
  const pinTapReadyAtRef = useRef(0)
  const [showLoginPinKeypad, setShowLoginPinKeypad] = useState(false)
  const [showSignupPinKeypad, setShowSignupPinKeypad] = useState(false)
  const [showConfirmPinKeypad, setShowConfirmPinKeypad] = useState(false)
  const [showLoginPinValue, setShowLoginPinValue] = useState(false)
  const [showSignupPinValue, setShowSignupPinValue] = useState(false)
  const [forgotHint, setForgotHint] = useState(false)

  useEffect(() => {
    if (!isOpen) return

    openedAtRef.current = Date.now()
    setMode('login')
    setError('')
    setLoginPin('')
    setShowLoginPhoneKeypad(false)
    setShowLoginPinKeypad(false)
    setShowLoginPinValue(false)
    setShowConfirmPinKeypad(false)
    setShowSignupPinKeypad(false)
    setShowSignupPinValue(false)
    setShowSignupPhoneKeypad(false)
    setShowOTPModal(false)
    setPendingPhone('')
    setSignupPhone('')
    setSignupPin('')
    setConfirmPin('')
    setFirstName('')
    setLastName('')
    setPhoneAvailableMsg('')
    setPhoneVerified(false)
    setForgotHint(false)
    const el = document.activeElement as HTMLElement | null
    if (el?.blur) el.blur()
    panelRef.current?.focus()

    const scrollY = window.scrollY
    document.documentElement.classList.add('slide-overlay-open')
    document.body.classList.add('slide-overlay-open')
    document.body.style.top = `-${scrollY}px`

    try {
      setLoginPhone(localStorage.getItem(LAST_LOGIN_PHONE_KEY) || '')
    } catch {
      // ignore
    }

    return () => {
      document.documentElement.classList.remove('slide-overlay-open')
      document.body.classList.remove('slide-overlay-open')
      document.body.style.top = ''
      window.scrollTo(0, scrollY)
    }
  }, [isOpen])

  if (!isOpen) return null

  const blurActiveElement = () => {
    try {
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
    } catch {
      // ignore
    }
  }

  const requireSupabase = () => {
    if (!hasSupabaseConfig || !supabase) {
      setError('Sign-in is not configured yet. Add Supabase URL and anon key to continue.')
      return false
    }
    return true
  }

  const runLogin = async (overridePin?: string) => {
    setError('')
    if (!requireSupabase()) return
    const pin = overridePin ?? loginPin
    const phone = normalizeLocalEthiopianPhone(loginPhone)
    if (!phone || !phone.startsWith('0') || phone.length !== 10) {
      setError('Enter a valid Ethiopian mobile number (10 digits starting with 0).')
      return
    }
    if (!isValidPin(pin)) {
      setError('PIN must be at least 6 digits.')
      return
    }

    const authEmail = authEmailFromPhone(phone)
    if (!authEmail) {
      setError('Enter a valid Ethiopian mobile number (10 digits starting with 0).')
      return
    }

    try {
      localStorage.setItem(LAST_LOGIN_PHONE_KEY, phone)
    } catch {
      // ignore
    }

    setLoading(true)
    try {
      let timeoutId: ReturnType<typeof setTimeout> | null = null
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(
          () => reject(new Error('Sign-in is taking too long. Please try again in a moment.')),
          SIGN_IN_TIMEOUT_MS,
        )
      })
      const { data, error: signInError } = await Promise.race([
        loginWithIpRateLimit(authEmail, pinToSupabasePassword(pin)),
        timeoutPromise,
      ])
      if (timeoutId) clearTimeout(timeoutId)
      if (signInError) throw new Error(signInError.message)
      if (data?.session) {
        try {
          localStorage.setItem(`${PIN_STATUS_KEY_PREFIX}${phone}`, 'true')
          localStorage.setItem(LAST_LOGIN_PHONE_KEY, phone)
        } catch {
          // ignore
        }
        onSuccess()
        void refreshUser?.()
        setTimeout(() => {
          void refreshUser?.()
        }, 600)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sign-in failed.'
      if (msg.includes('Sign-in is taking too long') && supabase) {
        const { data } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }))
        if (data?.session) {
          onSuccess()
          void refreshUser?.()
          return
        }
      }
      setError(msg.includes('Invalid login') ? 'Invalid phone number or PIN.' : msg)
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    await runLogin()
  }

  const sendSignupOtp = async (cleanedPhone: string) => {
    if (!supabase) return { data: null, otpError: new Error('Supabase is not configured.') }
    const { data, error: otpError } = await supabase.functions.invoke('send-phone-otp', {
      body: {
        phone_number: cleanedPhone,
        purpose: 'signup',
        preferred_language: 'en',
      },
    })
    return { data, otpError }
  }

  const handleSignupPhoneComplete = async (rawPhone: string) => {
    const digits = rawPhone.replace(/\D/g, '').slice(0, 10)
    if (!digits.startsWith('0') || digits.length !== 10) {
      setError('Enter a valid Ethiopian mobile number (10 digits starting with 0).')
      return
    }
    setSignupPhone(digits)
    setPhoneVerified(false)
    setError('')
    setPhoneAvailableMsg('')
    setShowSignupPhoneKeypad(false)
    if (!requireSupabase()) return
    setLoading(true)
    try {
      const alreadyRegistered = await isPhoneRegistered(digits)
      if (alreadyRegistered) {
        setShowPhoneAlreadyRegisteredModal(true)
        setMode('login')
        setLoginPhone(digits)
        setSignupPhone('')
        return
      }
      if (!SIGNUP_SMS_OTP_ENABLED) {
        setPhoneVerified(true)
        setPhoneAvailableMsg('Number is available. Choose a PIN to finish signup (SMS verification coming later).')
        pinTapReadyAtRef.current = Date.now() + 400
        return
      }
      setPhoneAvailableMsg('Number is available. Tap Verify phone to receive an SMS code.')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not check this phone number.')
    } finally {
      setLoading(false)
    }
  }

  const handleSendSignupPhoneOtp = async () => {
    setError('')
    if (!requireSupabase()) return
    if (!firstName.trim() || !lastName.trim()) {
      setError('Please enter your first and last name.')
      return
    }
    const cleanedPhone = normalizeLocalEthiopianPhone(signupPhone)
    if (!cleanedPhone || !cleanedPhone.startsWith('0') || cleanedPhone.length !== 10) {
      setError('Enter a valid Ethiopian mobile number (10 digits starting with 0).')
      return
    }
    setLoading(true)
    try {
      const alreadyRegistered = await isPhoneRegistered(cleanedPhone)
      if (alreadyRegistered) {
        setShowPhoneAlreadyRegisteredModal(true)
        setMode('login')
        setLoginPhone(cleanedPhone)
        return
      }
      const { data: otpData, otpError } = await sendSignupOtp(cleanedPhone)
      const { message: errorMsg, isPhoneAlreadyRegistered, isPhoneBlocked } =
        await getSendPhoneOtpErrorResult(otpData, otpError)
      if (otpError || !otpData?.success) {
        if (isPhoneBlocked) setShowPhoneBlockedModal(true)
        else if (isPhoneAlreadyRegistered) {
          setShowPhoneAlreadyRegisteredModal(true)
          setMode('login')
          setLoginPhone(cleanedPhone)
        } else setError(errorMsg)
        return
      }
      setPendingPhone(cleanedPhone)
      setPhoneVerified(false)
      setShowOTPModal(true)
    } catch (err: unknown) {
      const { message: errorMsg, isPhoneAlreadyRegistered, isPhoneBlocked } =
        await getSendPhoneOtpErrorResult(null, err)
      if (isPhoneBlocked) setShowPhoneBlockedModal(true)
      else if (isPhoneAlreadyRegistered) setShowPhoneAlreadyRegisteredModal(true)
      else setError(errorMsg || (err instanceof Error ? err.message : 'Registration failed.'))
    } finally {
      setLoading(false)
    }
  }

  const handleVerifySignupOTP = async (otpCode: string) => {
    if (!pendingPhone) {
      setError('Missing phone number')
      return
    }
    if (!requireSupabase() || !supabase) return
    setVerifyingOTP(true)
    setError('')
    try {
      const phoneForVerification = pendingPhone.replace(/\D/g, '')
      const { data, error: verifyError } = await supabase.rpc('verify_signup_phone_otp', {
        p_phone_number: phoneForVerification,
        p_otp_code: otpCode,
      })
      if (verifyError) throw new Error(verifyError.message || 'OTP verification failed')
      if (!data) throw new Error('Invalid or expired verification code')

      setShowOTPModal(false)
      setShowSignupPinKeypad(false)
      setShowConfirmPinKeypad(false)
      setSignupPin('')
      setConfirmPin('')
      setSignupPinError('')
      pinTapReadyAtRef.current = Date.now() + 600
      setPhoneVerified(true)
      setPhoneAvailableMsg('Phone verified. Choose a PIN (min 6 digits) to finish signup.')
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Invalid verification code. Please try again.'
      setError(message)
      throw err
    } finally {
      setVerifyingOTP(false)
    }
  }

  const handleResendSignupOTP = async () => {
    if (!pendingPhone) return
    setError('')
    setLoading(true)
    try {
      const { data, otpError } = await sendSignupOtp(pendingPhone)
      const { message: errorMsg, isPhoneAlreadyRegistered, isPhoneBlocked } =
        await getSendPhoneOtpErrorResult(data, otpError)
      if (otpError || !data?.success) {
        if (isPhoneBlocked) setShowPhoneBlockedModal(true)
        else if (isPhoneAlreadyRegistered) setShowPhoneAlreadyRegisteredModal(true)
        else setError(errorMsg)
      }
    } catch (err: unknown) {
      const { message: errorMsg, isPhoneAlreadyRegistered, isPhoneBlocked } =
        await getSendPhoneOtpErrorResult(null, err)
      if (isPhoneBlocked) setShowPhoneBlockedModal(true)
      else if (isPhoneAlreadyRegistered) setShowPhoneAlreadyRegisteredModal(true)
      else setError(errorMsg || 'Failed to resend code')
    } finally {
      setLoading(false)
    }
  }

  const handleSignUp = async (
    e?: React.FormEvent,
    overrides?: { pin?: string; confirmPin?: string; phone?: string },
  ) => {
    e?.preventDefault()
    setError('')
    setSignupPinError('')
    if (!requireSupabase() || !supabase) return

    const effectivePin = overrides?.pin ?? signupPin
    const effectiveConfirm = overrides?.confirmPin ?? confirmPin
    const cleanedPhone = normalizeLocalEthiopianPhone(overrides?.phone ?? signupPhone)
    if (!firstName.trim() || !lastName.trim() || !cleanedPhone || !effectivePin) {
      setError('Please complete name, phone, and PIN.')
      return
    }
    if (!phoneVerified) {
      setError(
        SIGNUP_SMS_OTP_ENABLED
          ? 'Verify your phone with the SMS code before creating an account.'
          : 'Enter a valid available phone number before creating an account.',
      )
      return
    }
    if (!cleanedPhone.startsWith('0') || cleanedPhone.length !== 10) {
      setError('Enter a valid Ethiopian mobile number (10 digits starting with 0).')
      return
    }
    if (!effectiveConfirm || effectivePin !== effectiveConfirm) {
      setSignupPinError('PINs do not match.')
      setError('PINs do not match.')
      setShowSignupPinKeypad(true)
      return
    }
    if (!isValidPin(effectivePin)) {
      setError('PIN must be at least 6 digits.')
      return
    }

    setLoading(true)
    try {
      const alreadyRegistered = await isPhoneRegistered(cleanedPhone)
      if (alreadyRegistered) {
        setShowPhoneAlreadyRegisteredModal(true)
        setMode('login')
        setLoginPhone(cleanedPhone)
        setLoading(false)
        return
      }

      const authEmail = authEmailFromPhone(cleanedPhone)
      if (!authEmail) {
        setError('Enter a valid Ethiopian mobile number (10 digits starting with 0).')
        setLoading(false)
        return
      }

      const fullName =
        [firstName.trim(), lastName.trim()].filter(Boolean).join(' ') || firstName.trim()
      const cleanedPin = normalizePin(effectivePin)
      const trimmedFirst = firstName.trim()
      const trimmedLast = lastName.trim()

      const { data: existingSessionData } = await supabase.auth.getSession()
      if (existingSessionData?.session?.user) {
        await supabase.auth.signOut().catch(() => {})
      }

      const signUpBody = {
        email: authEmail,
        password: pinToSupabasePassword(cleanedPin),
        options: {
          data: {
            first_name: trimmedFirst,
            last_name: trimmedLast,
            full_name: fullName,
            phone: cleanedPhone,
            phone_verified: SIGNUP_SMS_OTP_ENABLED,
            platform:
              typeof navigator !== 'undefined'
                ? navigator.userAgent.includes('Mobile')
                  ? 'mobile_web'
                  : 'web'
                : 'web',
          },
        },
      }
      let { data, error: signUpError } = await supabase.auth.signUp(signUpBody)
      if (
        signUpError &&
        /already registered|already been registered|already exists|user already/i.test(
          signUpError.message || '',
        )
      ) {
        await purgeOrphanedPhoneAuth(cleanedPhone)
        const retry = await supabase.auth.signUp(signUpBody)
        data = retry.data
        signUpError = retry.error
      }
      if (signUpError) throw signUpError
      if (!data.user) throw new Error('Account was not created.')
      if (!data.session) {
        throw new Error(
          'Account created but session could not start. Confirm email must be OFF under Authentication → Sign In / Providers → User Signups.',
        )
      }

      try {
        await supabase.from('users').upsert(
          {
            id: data.user.id,
            first_name: trimmedFirst,
            last_name: trimmedLast,
            full_name: fullName,
            phone: cleanedPhone,
            email: null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' },
        )
      } catch (upsertErr) {
        console.warn('AuthSlide: users upsert failed (non-fatal):', upsertErr)
      }

      if (SIGNUP_SMS_OTP_ENABLED) {
        const { error: claimError } = await supabase.rpc('claim_signup_verified_phone', {
          p_phone: cleanedPhone,
        })
        if (claimError) {
          throw new Error(claimError.message || 'Phone claim failed. Please verify your phone again.')
        }
      }

      if (updateUserPhone) updateUserPhone(cleanedPhone)

      try {
        localStorage.setItem(LAST_LOGIN_PHONE_KEY, cleanedPhone)
        localStorage.setItem(`${PIN_STATUS_KEY_PREFIX}${cleanedPhone}`, 'true')
      } catch {
        // ignore
      }

      await refreshUser?.()
      onSuccess()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Registration failed.'
      if (/already registered|already exists/i.test(message)) {
        setError('This phone is already registered. Please sign in.')
        setMode('login')
        setLoginPhone(signupPhone.replace(/\D/g, '') || signupPhone)
      } else {
        setError(message)
      }
    } finally {
      setLoading(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 10px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '0.875rem',
    boxSizing: 'border-box',
    backgroundColor: '#ffffff',
    color: '#1e293b',
  }
  const labelStyle: React.CSSProperties = {
    display: 'block',
    marginBottom: '2px',
    color: '#374151',
    fontWeight: 600,
    fontSize: '0.8125rem',
  }
  const sectionStyle: React.CSSProperties = { marginBottom: '6px' }
  const tapFieldStyle: React.CSSProperties = {
    ...inputStyle,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    cursor: 'pointer',
  }

  return (
    <>
      <div
        className="auth-slide-backdrop"
        onClick={() => {
          if (Date.now() - openedAtRef.current < 500) return
          onClose()
        }}
      />
      <div ref={panelRef} tabIndex={-1} className="auth-slide-panel">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>
          <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#374151' }}>
            Sign in or create account
          </h2>
        </div>
        <p style={{ margin: '0 0 4px 0', fontSize: '0.75rem', color: '#6b7280', lineHeight: 1.3 }}>
          {mode === 'login'
            ? 'Sign in with your phone number and PIN. Road Runner does not use email login.'
            : SIGNUP_SMS_OTP_ENABLED
              ? 'Create an account with your name and phone. We verify the number with an SMS OTP.'
              : 'Create an account with your name, phone, and PIN. SMS verification will be added once Road Runner SMS credentials are ready.'}
        </p>
        <div style={{ display: 'flex', gap: '6px', marginBottom: '4px' }}>
          <button
            type="button"
            onClick={() => {
              setMode('login')
              setError('')
              setForgotHint(false)
            }}
            className={`auth-mode-btn ${mode === 'login' ? 'active' : ''}`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup')
              setError('')
              setForgotHint(false)
            }}
            className={`auth-mode-btn ${mode === 'signup' ? 'active' : ''}`}
          >
            Sign up
          </button>
        </div>
        {error && <p style={{ color: '#dc2626', fontSize: '0.8125rem', margin: '0 0 4px 0' }}>{error}</p>}

        {mode === 'login' ? (
          <form onSubmit={handleLogin}>
            <div style={sectionStyle}>
              <label style={labelStyle}>Phone number</label>
              <div
                onClick={() => {
                  blurActiveElement()
                  setShowLoginPhoneKeypad(true)
                }}
                style={tapFieldStyle}
              >
                <span>{loginPhone || 'TAP TO ENTER PHONE'}</span>
                <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>⌨️</span>
              </div>
            </div>
            <div style={sectionStyle}>
              <label style={labelStyle}>PIN (min 6 digits)</label>
              <div
                onClick={() => {
                  blurActiveElement()
                  setShowLoginPinKeypad(true)
                }}
                style={tapFieldStyle}
              >
                <span>
                  {loginPin ? (showLoginPinValue ? loginPin : '••••') : 'TAP TO ENTER PIN'}
                </span>
                <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>⌨️</span>
              </div>
              {loginPin && (
                <button
                  type="button"
                  onClick={() => setShowLoginPinValue((v) => !v)}
                  className="auth-text-link"
                >
                  {showLoginPinValue ? 'HIDE PIN' : 'SHOW PIN'}
                </button>
              )}
            </div>
            <button type="submit" disabled={loading} className="auth-primary-btn">
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
            <button
              type="button"
              onClick={() => setForgotHint(true)}
              className="auth-text-link"
              style={{ width: '100%', marginTop: 8, textAlign: 'center' }}
            >
              Forgot PIN?
            </button>
            {forgotHint && (
              <p style={{ fontSize: '0.75rem', color: '#4b5563', marginTop: 8, lineHeight: 1.4 }}>
                Contact Road Runner support to reset your PIN. Accounts are phone-only.
              </p>
            )}
          </form>
        ) : (
          <form onSubmit={handleSignUp} style={{ paddingBottom: '4px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div style={sectionStyle}>
                <label style={labelStyle}>First name *</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  style={inputStyle}
                  autoComplete="given-name"
                />
              </div>
              <div style={sectionStyle}>
                <label style={labelStyle}>Last name *</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  style={inputStyle}
                  autoComplete="family-name"
                />
              </div>
            </div>
            <div style={sectionStyle}>
              <label style={labelStyle}>Phone number *</label>
              <div
                onClick={() => {
                  blurActiveElement()
                  setShowSignupPhoneKeypad(true)
                }}
                style={tapFieldStyle}
              >
                <span>{signupPhone || 'TAP TO ENTER PHONE'}</span>
                <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>⌨️</span>
              </div>
              {phoneAvailableMsg && (
                <p style={{ fontSize: '0.75rem', color: '#0f766e', margin: '4px 0 0' }}>
                  {phoneAvailableMsg}
                </p>
              )}
              {SIGNUP_SMS_OTP_ENABLED && signupPhone && !phoneVerified && (
                <button
                  type="button"
                  className="auth-primary-btn"
                  style={{ marginTop: 6 }}
                  disabled={loading}
                  onClick={() => void handleSendSignupPhoneOtp()}
                >
                  {loading ? 'Sending…' : 'Verify phone (SMS OTP)'}
                </button>
              )}
            </div>
            {phoneVerified && (
              <>
                <div style={sectionStyle}>
                  <label style={labelStyle}>Create PIN *</label>
                  <div
                    onClick={() => {
                      if (Date.now() < pinTapReadyAtRef.current) return
                      blurActiveElement()
                      setShowSignupPinKeypad(true)
                    }}
                    style={tapFieldStyle}
                  >
                    <span>
                      {signupPin
                        ? showSignupPinValue
                          ? signupPin
                          : '••••'
                        : 'TAP TO CREATE PIN'}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>⌨️</span>
                  </div>
                  {signupPin && (
                    <button
                      type="button"
                      onClick={() => setShowSignupPinValue((v) => !v)}
                      className="auth-text-link"
                    >
                      {showSignupPinValue ? 'HIDE PIN' : 'SHOW PIN'}
                    </button>
                  )}
                </div>
                <div style={sectionStyle}>
                  <label style={labelStyle}>Confirm PIN *</label>
                  <div
                    onClick={() => {
                      if (Date.now() < pinTapReadyAtRef.current) return
                      blurActiveElement()
                      setShowConfirmPinKeypad(true)
                    }}
                    style={tapFieldStyle}
                  >
                    <span>{confirmPin ? '••••' : 'TAP TO CONFIRM PIN'}</span>
                    <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>⌨️</span>
                  </div>
                  {signupPinError && (
                    <p style={{ color: '#dc2626', fontSize: '0.75rem', margin: '4px 0 0' }}>
                      {signupPinError}
                    </p>
                  )}
                </div>
              </>
            )}
            <button
              type="submit"
              disabled={loading || !phoneVerified}
              className="auth-primary-btn"
            >
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>
        )}
      </div>

      <NumericKeypadModal
        isOpen={showLoginPhoneKeypad}
        onClose={() => setShowLoginPhoneKeypad(false)}
        onComplete={(value) => {
          const digits = value.replace(/\D/g, '').slice(0, 10)
          setLoginPhone(digits)
          setShowLoginPhoneKeypad(false)
        }}
        label="Phone number"
        subtitle="Ethiopian mobile — 10 digits starting with 0"
        initialValue={loginPhone}
        maxLength={10}
      />
      <NumericKeypadModal
        isOpen={showLoginPinKeypad}
        onClose={() => setShowLoginPinKeypad(false)}
        onComplete={(value) => {
          setLoginPin(normalizePin(value))
          setShowLoginPinKeypad(false)
          void runLogin(normalizePin(value))
        }}
        label="Enter PIN"
        subtitle="Min 6 digits"
        initialValue={loginPin}
        maxLength={12}
      />
      <NumericKeypadModal
        isOpen={showSignupPhoneKeypad}
        onClose={() => setShowSignupPhoneKeypad(false)}
        onComplete={(value) => void handleSignupPhoneComplete(value)}
        label="Phone number"
        subtitle="Ethiopian mobile — 10 digits starting with 0"
        initialValue={signupPhone}
        maxLength={10}
      />
      <NumericKeypadModal
        isOpen={showSignupPinKeypad}
        onClose={() => setShowSignupPinKeypad(false)}
        onComplete={(value) => {
          setSignupPin(normalizePin(value))
          setShowSignupPinKeypad(false)
          setShowConfirmPinKeypad(true)
        }}
        label="Create PIN"
        subtitle="Min 6 digits"
        initialValue={signupPin}
        maxLength={12}
      />
      <NumericKeypadModal
        isOpen={showConfirmPinKeypad}
        onClose={() => setShowConfirmPinKeypad(false)}
        onComplete={(value) => {
          const confirmed = normalizePin(value)
          setConfirmPin(confirmed)
          setShowConfirmPinKeypad(false)
          if (confirmed !== signupPin) {
            setSignupPinError('PINs do not match.')
            setError('PINs do not match.')
            setShowSignupPinKeypad(true)
            return
          }
          setSignupPinError('')
          void handleSignUp(undefined, { pin: signupPin, confirmPin: confirmed })
        }}
        label="Confirm PIN"
        subtitle="Enter the same PIN again"
        initialValue={confirmPin}
        maxLength={12}
      />
      {SIGNUP_SMS_OTP_ENABLED && (
        <OTPVerificationModal
          isOpen={showOTPModal}
          onClose={() => setShowOTPModal(false)}
          onVerify={handleVerifySignupOTP}
          phoneNumber={pendingPhone}
          onResend={handleResendSignupOTP}
          loading={verifyingOTP}
        />
      )}
      <PhoneAlreadyRegisteredModal
        isOpen={showPhoneAlreadyRegisteredModal}
        onClose={() => {
          setShowPhoneAlreadyRegisteredModal(false)
          setMode('login')
        }}
      />
      <PhoneBlockedModal
        isOpen={showPhoneBlockedModal}
        onClose={() => setShowPhoneBlockedModal(false)}
      />
    </>
  )
}

export default AuthSlide
