import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

export const NUMERIC_KEYPAD_MODAL_Z = 2147483645

interface NumericKeypadModalProps {
  isOpen: boolean
  initialValue?: string
  maxLength?: number
  label?: string
  subtitle?: string
  errorMessage?: string
  onClose: () => void
  onComplete: (value: string) => void
  primaryButtonLabel?: string
  allowEmptyConfirm?: boolean
  mode?: 'integer' | 'money'
  portalToBody?: boolean
}

function normalizeIntegerInput(s: string): string {
  return s.replace(/\D/g, '')
}

function normalizeMoneyInput(s: string): string {
  let cleaned = s.replace(/[^\d.]/g, '')
  const dotIndex = cleaned.indexOf('.')
  if (dotIndex !== -1) {
    cleaned =
      cleaned.slice(0, dotIndex + 1) + cleaned.slice(dotIndex + 1).replace(/\./g, '')
  }
  const [intPart = '', decPart] = cleaned.split('.')
  const intLimited = intPart.slice(0, 7)
  if (decPart === undefined) return intLimited
  const decLimited = decPart.slice(0, 2)
  if (cleaned.endsWith('.') && decLimited.length === 0) {
    return `${intLimited}.`
  }
  return decLimited.length > 0 ? `${intLimited}.${decLimited}` : intLimited
}

function formatMoneyDisplay(value: string): string {
  if (!value) return '0.00'
  const n = Number(value)
  if (!Number.isFinite(n)) return value
  return n.toFixed(2)
}

const NumericKeypadModal: React.FC<NumericKeypadModalProps> = ({
  isOpen,
  initialValue = '',
  maxLength = 10,
  label,
  subtitle,
  errorMessage,
  onClose,
  onComplete,
  primaryButtonLabel,
  allowEmptyConfirm = false,
  mode = 'integer',
  portalToBody,
}) => {
  const isMoney = mode === 'money'
  const shouldPortal = portalToBody ?? isMoney
  const [value, setValue] = useState<string>(
    isMoney ? normalizeMoneyInput(initialValue) : normalizeIntegerInput(initialValue),
  )
  const [activeKey, setActiveKey] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return

    setValue(isMoney ? normalizeMoneyInput(initialValue) : normalizeIntegerInput(initialValue))

    // Auth slide already locks scroll; only lock here when opened alone.
    const alreadyLocked = document.body.classList.contains('slide-overlay-open')
    if (alreadyLocked) return

    const scrollY = window.scrollY
    document.documentElement.classList.add('numeric-keypad-open')
    document.body.classList.add('numeric-keypad-open')
    document.body.style.top = `-${scrollY}px`

    return () => {
      document.documentElement.classList.remove('numeric-keypad-open')
      document.body.classList.remove('numeric-keypad-open')
      document.body.style.top = ''
      window.scrollTo(0, scrollY)
    }
  }, [isOpen, initialValue, isMoney])

  if (!isOpen || typeof document === 'undefined') return null

  const handleDigit = (digit: string) => {
    if (isMoney) {
      if (digit === '.') {
        if (value.includes('.')) return
        setActiveKey('.')
        setValue((prev) => normalizeMoneyInput(prev ? `${prev}.` : '0.'))
        return
      }
      setActiveKey(digit)
      setValue((prev) => normalizeMoneyInput(`${prev || ''}${digit}`))
      return
    }
    if (value.length >= maxLength) return
    setActiveKey(digit)
    setValue((prev) => (prev + digit).slice(0, maxLength))
  }

  const handleClear = () => {
    setActiveKey('clear')
    setValue('')
  }

  const handleBackspace = () => {
    setActiveKey('backspace')
    setValue((prev) => prev.slice(0, -1))
  }

  const handleConfirm = () => {
    setActiveKey(null)
    const out = isMoney ? value.replace(/\.$/, '') : value
    onComplete(out)
  }

  const buttons = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
  ]

  const effectiveLabel = label ?? 'Enter number'
  const effectivePrimaryButtonLabel = primaryButtonLabel ?? 'OK'
  const keypadZIndex = shouldPortal ? NUMERIC_KEYPAD_MODAL_Z : 12060

  const keypadContent = (
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
        zIndex: keypadZIndex,
        padding: '20px',
      }}
      onClick={onClose}
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
          {effectiveLabel}
        </h3>
        {subtitle && (
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
            {subtitle}
          </p>
        )}

        <div
          style={{
            width: '100%',
            borderRadius: 18,
            padding: '10px 14px',
            marginBottom: 12,
            background: 'rgba(15,23,42,0.55)',
            border: '1px solid rgba(148,163,184,0.7)',
            textAlign: 'center',
            fontSize: '1.3rem',
            fontWeight: 600,
            letterSpacing: '0.18em',
            color: '#f9fafb',
            boxShadow: '0 8px 20px rgba(15,23,42,0.65) inset',
          }}
        >
          {value.length > 0
            ? isMoney
              ? `${formatMoneyDisplay(value.replace(/\.$/, ''))}${value.endsWith('.') ? '.' : ''} ETB`
              : value
            : isMoney
              ? '0.00 ETB'
              : '•'.repeat(Math.min(3, maxLength))}
        </div>

        {errorMessage && (
          <div
            style={{
              marginBottom: 10,
              padding: '8px 10px',
              borderRadius: 10,
              backgroundColor: 'rgba(248,113,113,0.18)',
              border: '1px solid rgba(248,113,113,0.8)',
              color: '#fee2e2',
              fontSize: '0.8rem',
              fontWeight: 700,
              textAlign: 'center',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            {errorMessage}
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
          {buttons.map((row) =>
            row.map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => handleDigit(digit)}
                style={{
                  width: '100%',
                  aspectRatio: '1 / 1',
                  borderRadius: 10,
                  border: '1px solid rgba(148,163,184,0.9)',
                  background:
                    activeKey === digit
                      ? 'linear-gradient(145deg, rgba(156,163,175,0.98), rgba(75,85,99,0.98))'
                      : 'linear-gradient(145deg, rgba(249,250,251,0.95), rgba(209,213,219,0.95))',
                  color: activeKey === digit ? '#f9fafb' : '#111827',
                  fontSize: '1.3rem',
                  fontWeight: 700,
                  boxShadow:
                    activeKey === digit
                      ? '0 1px 0 rgba(55,65,81,0.9), inset 0 0 0 1px rgba(17,24,39,0.3)'
                      : '0 2px 0 rgba(107,114,128,0.9), inset 0 0 0 1px rgba(243,244,246,0.8)',
                  cursor: 'pointer',
                  transition:
                    'background 120ms ease, box-shadow 120ms ease, color 120ms ease, transform 80ms ease',
                  transform: activeKey === digit ? 'translateY(1px)' : 'translateY(0)',
                }}
              >
                {digit}
              </button>
            )),
          )}

          <button
            type="button"
            onClick={handleClear}
            style={{
              width: '100%',
              aspectRatio: '1 / 1',
              borderRadius: 10,
              border: '1px solid rgba(234,179,8,0.9)',
              background:
                activeKey === 'clear'
                  ? 'linear-gradient(145deg, rgba(234,179,8,0.98), rgba(202,138,4,0.98))'
                  : 'linear-gradient(145deg, rgba(254,249,195,0.98), rgba(250,204,21,0.98))',
              color: activeKey === 'clear' ? '#fefce8' : '#854d0e',
              fontSize: '0.9rem',
              fontWeight: 700,
              boxShadow:
                activeKey === 'clear'
                  ? '0 1px 0 rgba(133,77,14,0.9), inset 0 0 0 1px rgba(113,63,18,0.6)'
                  : '0 2px 0 rgba(161,98,7,0.9), inset 0 0 0 1px rgba(254,252,232,0.9)',
              cursor: 'pointer',
              transition:
                'background 120ms ease, box-shadow 120ms ease, color 120ms ease, transform 80ms ease',
              transform: activeKey === 'clear' ? 'translateY(1px)' : 'translateY(0)',
            }}
          >
            Clear
          </button>

          {isMoney ? (
            <button
              type="button"
              onClick={() => handleDigit('.')}
              style={{
                width: '100%',
                aspectRatio: '1 / 1',
                borderRadius: 10,
                border: '1px solid rgba(148,163,184,0.9)',
                background:
                  activeKey === '.'
                    ? 'linear-gradient(145deg, rgba(156,163,175,0.98), rgba(75,85,99,0.98))'
                    : 'linear-gradient(145deg, rgba(249,250,251,0.95), rgba(209,213,219,0.95))',
                color: activeKey === '.' ? '#f9fafb' : '#111827',
                fontSize: '1.5rem',
                fontWeight: 700,
                boxShadow:
                  activeKey === '.'
                    ? '0 1px 0 rgba(55,65,81,0.9), inset 0 0 0 1px rgba(17,24,39,0.3)'
                    : '0 2px 0 rgba(107,114,128,0.9), inset 0 0 0 1px rgba(243,244,246,0.8)',
                cursor: 'pointer',
              }}
            >
              .
            </button>
          ) : null}

          <button
            type="button"
            onClick={() => handleDigit('0')}
            style={{
              width: '100%',
              aspectRatio: '1 / 1',
              borderRadius: 10,
              border: '1px solid rgba(148,163,184,0.9)',
              background:
                activeKey === '0'
                  ? 'linear-gradient(145deg, rgba(156,163,175,0.98), rgba(75,85,99,0.98))'
                  : 'linear-gradient(145deg, rgba(249,250,251,0.95), rgba(209,213,219,0.95))',
              color: activeKey === '0' ? '#f9fafb' : '#111827',
              fontSize: '1.3rem',
              fontWeight: 700,
              boxShadow:
                activeKey === '0'
                  ? '0 1px 0 rgba(55,65,81,0.9), inset 0 0 0 1px rgba(17,24,39,0.3)'
                  : '0 2px 0 rgba(107,114,128,0.9), inset 0 0 0 1px rgba(243,244,246,0.8)',
              cursor: 'pointer',
            }}
          >
            0
          </button>

          {!isMoney ? (
            <button
              type="button"
              onClick={handleBackspace}
              style={{
                width: '100%',
                aspectRatio: '1 / 1',
                borderRadius: 10,
                border: '1px solid rgba(248,113,113,0.9)',
                background:
                  activeKey === 'backspace'
                    ? 'linear-gradient(145deg, rgba(248,113,113,0.98), rgba(239,68,68,0.98))'
                    : 'linear-gradient(145deg, rgba(254,226,226,0.98), rgba(248,113,113,0.98))',
                color: activeKey === 'backspace' ? '#fef2f2' : '#7f1d1d',
                fontSize: '1.55rem',
                fontWeight: 700,
                boxShadow:
                  activeKey === 'backspace'
                    ? '0 1px 0 rgba(127,29,29,0.9), inset 0 0 0 1px rgba(127,29,29,0.7)'
                    : '0 2px 0 rgba(185,28,28,0.9), inset 0 0 0 1px rgba(254,242,242,0.9)',
                cursor: 'pointer',
              }}
            >
              ←
            </button>
          ) : null}
        </div>

        <button
          type="button"
          onClick={handleConfirm}
          disabled={!allowEmptyConfirm && value.length === 0}
          style={{
            marginTop: 16,
            width: '100%',
            padding: '12px 0',
            borderRadius: 999,
            border: 'none',
            background:
              !allowEmptyConfirm && value.length === 0
                ? 'rgba(148,163,184,0.5)'
                : 'linear-gradient(135deg,#22c55e,#16a34a)',
            color: 'white',
            fontSize: '1rem',
            fontWeight: 600,
            cursor: !allowEmptyConfirm && value.length === 0 ? 'not-allowed' : 'pointer',
            boxShadow:
              !allowEmptyConfirm && value.length === 0 ? 'none' : '0 14px 30px rgba(34,197,94,0.45)',
          }}
        >
          {effectivePrimaryButtonLabel}
        </button>

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
            color: '#e5e7eb',
            fontSize: '0.9rem',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  )

  if (shouldPortal && typeof document !== 'undefined') {
    return createPortal(keypadContent, document.body)
  }

  return keypadContent
}

export default NumericKeypadModal
