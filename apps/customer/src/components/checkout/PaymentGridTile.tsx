import React from 'react'

const LOGO_BOX_STYLE: React.CSSProperties = {
  width: '100%',
  maxWidth: 80,
  aspectRatio: '1',
  borderRadius: 10,
  overflow: 'hidden',
  boxShadow: '0 3px 8px rgba(0,0,0,0.1)',
}

const TILE_BTN_STYLE: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 4,
  padding: '3px 2px',
  border: 'none',
  background: 'transparent',
}

function PaymentGatewayCaption({
  bankName,
  appName,
  busyLabel,
  darkText,
}: {
  bankName: string
  appName: string
  busyLabel?: string | null
  darkText?: boolean
}) {
  const bankColor = darkText ? '#475569' : 'rgba(15, 23, 42, 0.72)'
  const appColor = darkText ? '#07112A' : '#020617'

  if (busyLabel) {
    return (
      <span
        style={{
          fontSize: '0.66rem',
          fontWeight: 700,
          color: appColor,
          textAlign: 'center',
          lineHeight: 1.15,
        }}
      >
        {busyLabel}
      </span>
    )
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 1,
        width: '100%',
        paddingInline: 1,
      }}
    >
      <span
        style={{
          fontSize: '0.58rem',
          fontWeight: 600,
          color: bankColor,
          textAlign: 'center',
          lineHeight: 1.12,
        }}
      >
        {bankName}
      </span>
      <span
        style={{
          fontSize: '0.64rem',
          fontWeight: 700,
          color: appColor,
          textAlign: 'center',
          lineHeight: 1.12,
        }}
      >
        {appName}
      </span>
    </div>
  )
}

export type PaymentGridTileProps = {
  bankName: string
  appName: string
  iconUrl: string
  alt: string
  onClick: () => void
  disabled?: boolean
  busyLabel?: string | null
  darkText?: boolean
}

const PaymentGridTile: React.FC<PaymentGridTileProps> = ({
  bankName,
  appName,
  iconUrl,
  alt,
  onClick,
  disabled,
  busyLabel,
  darkText,
}) => (
  <button
    type="button"
    disabled={disabled}
    onClick={onClick}
    style={{
      ...TILE_BTN_STYLE,
      cursor: disabled ? 'wait' : 'pointer',
      opacity: disabled ? 0.75 : 1,
    }}
  >
    <div style={LOGO_BOX_STYLE}>
      <img
        src={iconUrl}
        alt={alt}
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      />
    </div>
    <PaymentGatewayCaption
      bankName={bankName}
      appName={appName}
      busyLabel={busyLabel}
      darkText={darkText}
    />
  </button>
)

export default PaymentGridTile
