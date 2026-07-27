import React from 'react'
import { createPortal } from 'react-dom'

interface PhoneBlockedModalProps {
  isOpen: boolean
  onClose: () => void
}

/** Shown when send-phone-otp returns 403 for a blocklisted phone number. */
const PhoneBlockedModal: React.FC<PhoneBlockedModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null

  const content = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="phone-blocked-title"
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
              backgroundColor: '#fee2e2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.75rem',
            }}
            role="img"
            aria-label="Blocked"
          >
            ⛔
          </div>
          <h3
            id="phone-blocked-title"
            style={{ fontSize: '1.25rem', fontWeight: 600, color: '#111', marginBottom: 12 }}
          >
            Phone number blocked
          </h3>
        </div>
        <p style={{ fontSize: '0.875rem', color: '#4b5563', marginBottom: 24, textAlign: 'center' }}>
          This phone number has been blocked. Registration and verification using this number are
          not allowed. Please contact Road Runner support if you believe this is a mistake.
        </p>
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

export default PhoneBlockedModal
