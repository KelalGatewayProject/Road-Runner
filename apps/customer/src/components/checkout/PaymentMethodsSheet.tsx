import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  PAYMENT_CBE_SUB_OPTIONS,
  PAYMENT_GRID_OPTIONS,
  type PaymentOption,
} from '../../constants/paymentOptions'
import { useLanguage } from '../../contexts/LanguageContext'
import PaymentBottomSheet from './PaymentBottomSheet'
import PaymentGridTile from './PaymentGridTile'

type PaymentMethodsSheetProps = {
  open: boolean
  onClose: () => void
  totalEtb: number
}

/**
 * Road Runner checkout payment picker (Kelal Pay bottom-sheet pattern).
 * Every gateway is Coming Soon until bank/telecom contracts and credentials are live.
 */
const PaymentMethodsSheet: React.FC<PaymentMethodsSheetProps> = ({ open, onClose, totalEtb }) => {
  const { t } = useLanguage()
  const [showCbeSubSheet, setShowCbeSubSheet] = useState(false)
  const [comingSoonName, setComingSoonName] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      setShowCbeSubSheet(false)
      setComingSoonName(null)
    }
  }, [open])

  const showComingSoon = (option: PaymentOption) => {
    setComingSoonName(option.appName)
  }

  const handleSelect = (option: PaymentOption) => {
    if (option.opensCbeSubPicker) {
      setShowCbeSubSheet(true)
      return
    }
    showComingSoon(option)
  }

  const comingSoonModal =
    comingSoonName && typeof document !== 'undefined'
      ? createPortal(
          <div
            role="presentation"
            onClick={() => setComingSoonName(null)}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.35)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 2147483647,
              padding: 20,
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              onClick={(e) => e.stopPropagation()}
              style={{
                backgroundColor: '#ffffff',
                padding: 32,
                borderRadius: 12,
                textAlign: 'center',
                boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
                maxWidth: 400,
                width: '100%',
              }}
            >
              <div style={{ fontSize: '3rem', marginBottom: 16 }}>🚧</div>
              <h3 style={{ margin: '0 0 16px', fontSize: '1.25rem', fontWeight: 700, color: '#07112A' }}>
                {t('coming_soon')}
              </h3>
              <p style={{ fontSize: '0.9rem', color: '#334155', marginBottom: 16, lineHeight: 1.55 }}>
                {t('coming_soon_body', { name: comingSoonName })}
              </p>
              <p style={{ fontSize: '1rem', color: '#07112A', marginBottom: 24, fontWeight: 700 }}>
                {t('pay_coming_soon_note')}
              </p>
              <button
                type="button"
                onClick={() => setComingSoonName(null)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: 10,
                  border: 'none',
                  background: 'linear-gradient(135deg, #06122c 0%, #0a1f4a 100%)',
                  color: '#fff',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {t('ok')}
              </button>
            </div>
          </div>,
          document.body,
        )
      : null

  return (
    <>
      <PaymentBottomSheet
        open={open && !showCbeSubSheet}
        size="payment"
        title={t('pay_choose')}
        subtitle={t('pay_total', { n: totalEtb.toLocaleString() })}
        onClose={onClose}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 8,
            paddingTop: 4,
          }}
        >
          {PAYMENT_GRID_OPTIONS.map((option) => (
            <PaymentGridTile
              key={option.id}
              bankName={option.bankName}
              appName={option.appName}
              iconUrl={option.iconUrl}
              alt={option.appName}
              darkText
              onClick={() => handleSelect(option)}
            />
          ))}
        </div>
        <p
          style={{
            margin: '12px 0 0',
            fontSize: '0.75rem',
            color: '#64748b',
            textAlign: 'center',
            lineHeight: 1.4,
          }}
        >
          {t('pay_coming_soon_note')}
        </p>
      </PaymentBottomSheet>

      <PaymentBottomSheet
        open={open && showCbeSubSheet}
        size="payment"
        title={t('cbe_choose_title')}
        subtitle={t('cbe_choose_sub')}
        onClose={() => setShowCbeSubSheet(false)}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 8,
            paddingTop: 4,
          }}
        >
          {PAYMENT_CBE_SUB_OPTIONS.map((option) => (
            <PaymentGridTile
              key={option.id}
              bankName={option.bankName}
              appName={option.appName}
              iconUrl={option.iconUrl}
              alt={option.appName}
              darkText
              onClick={() => showComingSoon(option)}
            />
          ))}
        </div>
      </PaymentBottomSheet>

      {comingSoonModal}
    </>
  )
}

export default PaymentMethodsSheet
