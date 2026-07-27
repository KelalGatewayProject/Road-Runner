import type { CSSProperties } from 'react'

/** Approximate Ethiopia bounding box for delivery / pharmacy pin validation. */
export const ETHIOPIA_BOUNDS = {
  north: 14.8941,
  south: 3.4024,
  east: 47.9862,
  west: 32.9999,
}

type EthiopiaLocationValidatorProps = {
  open: boolean
  onClose: () => void
  title?: string
  message?: string
}

const overlayStyle: CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100vw',
  height: '100vh',
  backgroundColor: 'rgba(0,0,0,0.5)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 130000,
  padding: '16px',
}

export default function EthiopiaLocationValidator({
  open,
  onClose,
  title = 'Location restriction',
  message = 'Road Runner only accepts delivery locations in Ethiopia.',
}: EthiopiaLocationValidatorProps) {
  if (!open) return null

  return (
    <div style={overlayStyle} role="dialog" aria-modal="true" aria-label={title}>
      <div
        style={{
          width: '100%',
          maxWidth: '400px',
          borderRadius: 8,
          background: 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(9px)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          position: 'relative',
          padding: '24px',
          textAlign: 'center',
        }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            background: 'none',
            border: 'none',
            fontSize: 24,
            cursor: 'pointer',
            color: '#666',
          }}
        >
          ×
        </button>
        <h2 style={{ color: '#030f29', fontWeight: 700, fontSize: '1.35rem', margin: '8px 0 12px' }}>
          {title}
        </h2>
        <p style={{ color: '#333', marginBottom: 12 }}>{message}</p>
        <p style={{ color: '#666', marginBottom: 20 }}>Please select a location within Ethiopia.</p>
        <button
          type="button"
          onClick={onClose}
          style={{
            backgroundColor: '#07132d',
            color: 'white',
            padding: '12px 32px',
            borderRadius: 8,
            fontWeight: 600,
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Close
        </button>
      </div>
    </div>
  )
}

export function isLocationInEthiopia(lat: number, lng: number): boolean {
  return (
    lat >= ETHIOPIA_BOUNDS.south &&
    lat <= ETHIOPIA_BOUNDS.north &&
    lng >= ETHIOPIA_BOUNDS.west &&
    lng <= ETHIOPIA_BOUNDS.east
  )
}

export async function isAddressInEthiopia(address: string, apiKey: string): Promise<boolean> {
  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`,
    )
    const data = await response.json()
    if (data.status === 'OK' && data.results?.[0]) {
      const { lat, lng } = data.results[0].geometry.location
      return isLocationInEthiopia(lat, lng)
    }
    return false
  } catch {
    return false
  }
}
