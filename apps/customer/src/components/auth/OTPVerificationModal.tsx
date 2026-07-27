import React, { useState, useEffect } from 'react'

interface OTPVerificationModalProps {
  isOpen: boolean
  onClose: () => void
  onVerify: (otp: string) => Promise<void>
  phoneNumber: string
  onResend: () => Promise<void>
  loading?: boolean
}

const OTPVerificationModal: React.FC<OTPVerificationModalProps> = ({
  isOpen,
  onClose,
  onVerify,
  phoneNumber,
  onResend,
  loading = false,
}) => {
  const [otp, setOtp] = useState<string[]>(['', '', '', '', ''])
  const [error, setError] = useState('')
  const [resendCooldown, setResendCooldown] = useState(0)
  const storageKey = `otp-verification-${phoneNumber}`

  useEffect(() => {
    if (isOpen) {
      try {
        const savedOtp = localStorage.getItem(storageKey)
        if (savedOtp) {
          const parsed = JSON.parse(savedOtp)
          if (Array.isArray(parsed) && parsed.length === 5) {
            setOtp(parsed)
          } else {
            setOtp(['', '', '', '', ''])
          }
        } else {
          setOtp(['', '', '', '', ''])
        }
      } catch {
        setOtp(['', '', '', '', ''])
      }
      setError('')
      setResendCooldown(60)
    }
  }, [isOpen, phoneNumber, storageKey])

  useEffect(() => {
    if (isOpen && otp.some((digit) => digit !== '')) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(otp))
      } catch {
        // ignore
      }
    }
  }, [otp, isOpen, storageKey])

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [resendCooldown])

  const setOtpFromString = (code: string) => {
    const cleaned = code.replace(/\D/g, '').slice(0, 5)
    if (cleaned.length !== 5 || !/^\d{5}$/.test(cleaned)) {
      setError('Please enter a valid 5-digit code')
      return
    }
    setOtp(cleaned.split(''))
    setError('')
  }

  const handleDigit = (digit: string) => {
    const current = otp.join('')
    if (current.length >= 5) return
    const next = (current + digit).slice(0, 5)
    setOtp(next.split(''))
    setError('')
  }

  const handleBackspace = () => {
    const current = otp.join('')
    const next = current.slice(0, -1)
    const arr = next.split('')
    while (arr.length < 5) arr.push('')
    setOtp(arr)
    setError('')
  }

  const handleClear = () => {
    setOtp(['', '', '', '', ''])
    setError('')
  }

  const handlePasteButton = async () => {
    try {
      if (!navigator.clipboard?.readText) {
        throw new Error('Clipboard API not supported')
      }
      const clipboardText = await navigator.clipboard.readText()
      const cleanedText = clipboardText.replace(/\D/g, '').slice(0, 5)

      if (cleanedText.length === 5 && /^\d{5}$/.test(cleanedText)) {
        setOtpFromString(cleanedText)
      } else {
        const otpPatterns = [
          /code is[:\s]+(\d{5})/i,
          /code[:\s]+(\d{5})/i,
          /(\d{5})/,
          /verification code[:\s]+(\d{5})/i,
        ]

        let foundOtp = ''
        for (const pattern of otpPatterns) {
          const match = clipboardText.match(pattern)
          if (match?.[1]) {
            foundOtp = match[1]
            break
          }
        }

        if (foundOtp && /^\d{5}$/.test(foundOtp)) {
          setOtpFromString(foundOtp)
        } else {
          setError(
            'Clipboard does not contain a valid 5-digit code. Please copy the code from your SMS.',
          )
        }
      }
    } catch {
      setError(
        'Could not access clipboard. Please try copying the code again or type it using the keypad.',
      )
    }
  }

  const handleSubmit = async () => {
    const otpString = otp.join('')
    if (otpString.length !== 5) {
      setError('Please enter the complete 5-digit code')
      return
    }

    if (!/^\d{5}$/.test(otpString)) {
      setError('Please enter a valid 5-digit code')
      return
    }

    setError('')
    try {
      await onVerify(otpString)
      try {
        localStorage.removeItem(storageKey)
      } catch {
        // ignore
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Verification failed. Please try again.'
      setError(message)
    }
  }

  const handleResend = async () => {
    if (resendCooldown > 0) return

    setError('')
    try {
      await onResend()
      setResendCooldown(60)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to resend code. Please try again.'
      setError(message)
    }
  }

  if (!isOpen) return null

  const otpString = otp.join('')

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15,23,42,0.30)',
        backdropFilter: 'blur(9px)',
        WebkitBackdropFilter: 'blur(9px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2147483590,
        padding: '20px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 340,
          borderRadius: 0,
          padding: 0,
          background: 'transparent',
          border: 'none',
          boxShadow: 'none',
          color: '#e5e7eb',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <h3
          style={{
            margin: '4px 0 4px 0',
            fontSize: '1.05rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: '#f9fafb',
            textAlign: 'center',
          }}
        >
          Verify phone number
        </h3>
        <p
          style={{
            margin: '0 0 10px 0',
            fontSize: '0.8rem',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: '#e5e7eb',
            textAlign: 'center',
          }}
        >
          Enter the 5‑digit code sent to <strong>{phoneNumber}</strong>.
        </p>

        <div
          style={{
            display: 'flex',
            gap: 10,
            marginBottom: 12,
            justifyContent: 'center',
          }}
        >
          {otp.map((digit, idx) => (
            <div
              key={idx}
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                border: '1px solid rgba(148,163,184,0.7)',
                background: 'linear-gradient(145deg, rgba(15,23,42,0.3), rgba(148,163,184,0.22))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.3rem',
                fontWeight: 600,
                letterSpacing: '0.18em',
                color: '#f9fafb',
                boxShadow: '0 6px 16px rgba(15,23,42,0.65) inset',
              }}
            >
              {digit || '•'}
            </div>
          ))}
        </div>

        {error && (
          <div
            style={{
              color: '#fecaca',
              backgroundColor: 'rgba(248,113,113,0.12)',
              border: '1px solid rgba(248,113,113,0.5)',
              borderRadius: 10,
              padding: '6px 10px',
              fontSize: '0.8rem',
              width: '100%',
              marginBottom: 10,
              textAlign: 'center',
            }}
          >
            {error}
          </div>
        )}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 10,
            width: '100%',
            marginTop: 4,
          }}
        >
          {[['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9']].map((row) =>
            row.map((digit) => (
              <button
                key={digit}
                type="button"
                disabled={loading}
                onClick={() => handleDigit(digit)}
                style={{
                  width: '100%',
                  aspectRatio: '1 / 1',
                  borderRadius: 10,
                  border: '1px solid rgba(148,163,184,0.9)',
                  background:
                    'linear-gradient(145deg, rgba(249,250,251,0.95), rgba(209,213,219,0.95))',
                  color: '#111827',
                  fontSize: '1.3rem',
                  fontWeight: 700,
                  boxShadow:
                    '0 2px 0 rgba(107,114,128,0.9), inset 0 0 0 1px rgba(243,244,246,0.8)',
                  cursor: loading ? 'not-allowed' : 'pointer',
                }}
              >
                {digit}
              </button>
            )),
          )}

          <button
            type="button"
            disabled={loading}
            onClick={handleClear}
            style={{
              width: '100%',
              aspectRatio: '1 / 1',
              borderRadius: 10,
              border: '1px solid rgba(234,179,8,0.9)',
              background: 'linear-gradient(145deg, rgba(254,249,195,0.98), rgba(250,204,21,0.98))',
              color: '#78350f',
              fontSize: '0.9rem',
              fontWeight: 700,
              boxShadow: '0 2px 0 rgba(161,98,7,0.9), inset 0 0 0 1px rgba(254,252,232,0.9)',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            Clear
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={() => handleDigit('0')}
            style={{
              width: '100%',
              aspectRatio: '1 / 1',
              borderRadius: 10,
              border: '1px solid rgba(148,163,184,0.9)',
              background:
                'linear-gradient(145deg, rgba(249,250,251,0.95), rgba(209,213,219,0.95))',
              color: '#111827',
              fontSize: '1.3rem',
              fontWeight: 700,
              boxShadow: '0 2px 0 rgba(107,114,128,0.9), inset 0 0 0 1px rgba(243,244,246,0.8)',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            0
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={handleBackspace}
            style={{
              width: '100%',
              aspectRatio: '1 / 1',
              borderRadius: 10,
              border: '1px solid rgba(248,113,113,0.9)',
              background: 'linear-gradient(145deg, rgba(254,226,226,0.98), rgba(248,113,113,0.98))',
              color: '#7f1d1d',
              fontSize: '1.1rem',
              fontWeight: 700,
              boxShadow: '0 2px 0 rgba(185,28,28,0.9), inset 0 0 0 1px rgba(254,242,242,0.9)',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            ←
          </button>
        </div>

        <button
          type="button"
          disabled={loading}
          onClick={handlePasteButton}
          style={{
            marginTop: 10,
            width: '100%',
            padding: '10px 0',
            borderRadius: 999,
            border: '1px solid rgba(148,163,184,0.6)',
            background: 'rgba(15,23,42,0.7)',
            color: '#e5e7eb',
            fontSize: '0.9rem',
            fontWeight: 500,
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          Paste code from SMS
        </button>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading || otpString.length !== 5}
          style={{
            marginTop: 12,
            width: '100%',
            padding: '12px 0',
            borderRadius: 999,
            border: 'none',
            backgroundColor: loading || otpString.length !== 5 ? 'rgba(148,163,184,0.5)' : '#16a34a',
            color: 'white',
            fontSize: '1rem',
            fontWeight: 600,
            cursor: loading || otpString.length !== 5 ? 'not-allowed' : 'pointer',
            boxShadow:
              loading || otpString.length !== 5 ? 'none' : '0 14px 30px rgba(34,197,94,0.45)',
          }}
        >
          {loading ? 'Verifying...' : 'Verify'}
        </button>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.9rem',
            marginTop: 16,
            width: '100%',
          }}
        >
          <span style={{ color: '#9ca3af' }}>Didn&apos;t receive the code?</span>
          <button
            type="button"
            onClick={handleResend}
            disabled={resendCooldown > 0 || loading}
            style={{
              border: 'none',
              background: 'none',
              color: resendCooldown > 0 || loading ? '#9ca3af' : '#38bdf8',
              cursor: resendCooldown > 0 || loading ? 'not-allowed' : 'pointer',
              fontWeight: 500,
            }}
          >
            {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
          </button>
        </div>

        <button
          type="button"
          onClick={onClose}
          style={{
            marginTop: 8,
            width: '100%',
            padding: '10px 0',
            borderRadius: 999,
            border: 'none',
            background: 'transparent',
            color: '#9ca3af',
            fontSize: '0.85rem',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

export default OTPVerificationModal
