import React from 'react'
import { createPortal } from 'react-dom'

interface PhoneAlreadyRegisteredModalProps {
  isOpen: boolean
  onClose: () => void
}

/**
 * Shown when the user tries to register or verify a phone number that is already
 * registered to another account. Renders via portal so it stays viewport-centered on mobile.
 */
const PhoneAlreadyRegisteredModal: React.FC<PhoneAlreadyRegisteredModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null

  const content = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="phone-registered-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2147483590,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding:
          'max(16px, env(safe-area-inset-top)) max(16px, env(safe-area-inset-right)) max(16px, env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left))',
        backgroundColor: 'rgba(0,0,0,0.25)',
        backdropFilter: 'blur(9px)',
        WebkitBackdropFilter: 'blur(9px)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
          maxWidth: 'min(400px, calc(100vw - 32px))',
          width: '100%',
          padding: '24px',
          border: '1px solid #e5e7eb',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              margin: '0 auto 16px',
              width: 56,
              height: 56,
              borderRadius: '50%',
              backgroundColor: '#fef3c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.75rem',
            }}
            role="img"
            aria-label="Warning"
          >
            ⚠️
          </div>
          <h3
            id="phone-registered-title"
            style={{ fontSize: '1.25rem', fontWeight: 600, color: '#111', marginBottom: 12 }}
          >
            Phone already registered
          </h3>
        </div>
        <div style={{ textAlign: 'left', marginBottom: 24 }}>
          <p style={{ fontSize: '0.875rem', color: '#4b5563', marginBottom: 4 }}>
            This phone number is already linked to an account.
          </p>
          <p style={{ fontSize: '0.875rem', color: '#4b5563', marginBottom: 8 }}>You can:</p>
          <ul style={{ fontSize: '0.875rem', color: '#374151', margin: 0, paddingLeft: '1.25rem' }}>
            <li>Sign in with this phone and your PIN</li>
            <li>Use a different phone number to create an account</li>
          </ul>
        </div>
        <button
          type="button"
          onClick={onClose}
          style={{
            width: '100%',
            padding: '12px 16px',
            borderRadius: '12px',
            fontWeight: 500,
            color: '#fff',
            border: 'none',
            cursor: 'pointer',
            backgroundColor: '#0f766e',
          }}
        >
          OK
        </button>
      </div>
    </div>
  )

  return typeof document !== 'undefined' ? createPortal(content, document.body) : content
}

export default PhoneAlreadyRegisteredModal
