import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

type PaymentBottomSheetProps = {
  open: boolean
  onClose?: () => void
  title: string
  subtitle?: string
  children: React.ReactNode
  dismissible?: boolean
  size?: 'default' | 'scan' | 'amount' | 'payment'
}

/** Bottom sheet adapted from Kelal Pay for Road Runner checkout. */
const PaymentBottomSheet: React.FC<PaymentBottomSheetProps> = ({
  open,
  onClose,
  title,
  subtitle,
  children,
  dismissible = true,
  size = 'default',
}) => {
  const isScan = size === 'scan'
  const isAmount = size === 'amount'
  const isPayment = size === 'payment'
  const panelHeight = isScan
    ? 'min(72vh, 560px)'
    : isAmount
      ? 'min(58vh, 500px)'
      : isPayment
        ? 'auto'
        : 'min(52vh, 480px)'
  const panelMaxHeight = isScan
    ? '72vh'
    : isAmount
      ? '58vh'
      : isPayment
        ? 'calc(100dvh - env(safe-area-inset-top, 0px))'
        : '52vh'

  const [shouldRender, setShouldRender] = useState(open)
  const [isClosing, setIsClosing] = useState(false)

  useEffect(() => {
    if (open) {
      setShouldRender(true)
      setIsClosing(false)
      const scrollY = window.scrollY
      document.documentElement.classList.add('payment-bottom-sheet-open')
      document.body.classList.add('payment-bottom-sheet-open')
      document.body.style.top = `-${scrollY}px`
      return () => {
        document.documentElement.classList.remove('payment-bottom-sheet-open')
        document.body.classList.remove('payment-bottom-sheet-open')
        document.body.style.top = ''
        window.scrollTo(0, scrollY)
      }
    }

    if (shouldRender) {
      setIsClosing(true)
      const timer = window.setTimeout(() => {
        setShouldRender(false)
        setIsClosing(false)
      }, 320)
      return () => window.clearTimeout(timer)
    }

    return undefined
  }, [open, shouldRender])

  if (!shouldRender || typeof document === 'undefined') return null

  return createPortal(
    <>
      <style>{`
        @keyframes paymentSheetSlideUp {
          from { transform: translateY(100%); opacity: 0.65; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes paymentSheetSlideDown {
          from { transform: translateY(0); opacity: 1; }
          to { transform: translateY(100%); opacity: 0.65; }
        }
        @keyframes paymentSheetBackdropIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes paymentSheetBackdropOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        .payment-bottom-sheet-panel {
          animation: paymentSheetSlideUp 0.38s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
        }
        .payment-bottom-sheet-panel--closing {
          animation: paymentSheetSlideDown 0.32s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
        }
        .payment-bottom-sheet-backdrop {
          animation: paymentSheetBackdropIn 0.28s ease forwards;
        }
        .payment-bottom-sheet-backdrop--closing {
          animation: paymentSheetBackdropOut 0.28s ease forwards;
        }
        html.payment-bottom-sheet-open,
        body.payment-bottom-sheet-open {
          overflow: hidden !important;
          overscroll-behavior: none;
          touch-action: none;
        }
        body.payment-bottom-sheet-open {
          position: fixed;
          left: 0;
          right: 0;
          width: 100%;
        }
      `}</style>
      <div
        role="presentation"
        className={isClosing ? 'payment-bottom-sheet-backdrop--closing' : 'payment-bottom-sheet-backdrop'}
        onClick={dismissible && !isClosing ? onClose : undefined}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.45)',
          zIndex: 11020,
        }}
      />
      <div
        className={isClosing ? 'payment-bottom-sheet-panel--closing' : 'payment-bottom-sheet-panel'}
        role="dialog"
        aria-modal="true"
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          margin: '0 auto',
          maxWidth: 560,
          height: panelHeight,
          maxHeight: panelMaxHeight,
          paddingBottom: 0,
          zIndex: 11021,
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '20px 20px 0 0',
          background: '#ffffff',
          border: '1px solid #e5e7eb',
          borderBottom: 'none',
          boxShadow: '0 -8px 32px rgba(0, 0, 0, 0.18)',
          boxSizing: 'border-box',
          overflow: 'hidden',
          fontFamily: 'Roboto, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            flexShrink: 0,
            padding: isPayment ? '12px 18px 8px' : '14px 18px 10px',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#07112A' }}>
              {title}
            </h2>
            {subtitle ? (
              <p style={{ margin: '4px 0 0', fontSize: '0.8125rem', color: '#334155', lineHeight: 1.35 }}>
                {subtitle}
              </p>
            ) : null}
          </div>
          {dismissible && onClose ? (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              style={{
                flexShrink: 0,
                width: 34,
                height: 34,
                borderRadius: '50%',
                border: '2px solid rgba(255,255,255,0.9)',
                background: 'rgba(0,0,0,0.65)',
                color: '#fff',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              ✕
            </button>
          ) : null}
        </div>
        <div
          style={{
            flex: isPayment ? '0 0 auto' : 1,
            minHeight: 0,
            overflowY: isPayment ? 'hidden' : 'auto',
            overflowX: 'hidden',
            padding: isScan
              ? '0 18px calc(20px + env(safe-area-inset-bottom, 0px))'
              : isPayment
                ? '0 16px max(14px, env(safe-area-inset-bottom, 0px))'
                : '0 18px calc(18px + env(safe-area-inset-bottom, 0px))',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {children}
        </div>
      </div>
    </>,
    document.body,
  )
}

export default PaymentBottomSheet
