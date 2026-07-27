import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { GoogleMap, MarkerF } from '@react-google-maps/api'
import { ADDIS_CENTER, roadRunnerMapOptions, toGoogleMapTypeId } from '../../config/maps'
import { useGoogleMaps } from '../../contexts/GoogleMapsContext'
import { useLanguage } from '../../contexts/LanguageContext'
import EthiopiaLocationValidator, { isLocationInEthiopia } from './EthiopiaLocationValidator'
import MapSearchBar from './MapSearchBar'
import MapTypeToggle, { type RoadRunnerMapType } from './MapTypeToggle'

export type DeliveryLocation = {
  lat: number
  lng: number
  label: string
  detail: string
  source: 'gps' | 'pin'
}

type Mode = 'choose' | 'gps' | 'pin'

type Props = {
  open: boolean
  initial?: DeliveryLocation | null
  onClose: () => void
  onConfirm: (location: DeliveryLocation) => void
}

const redPinSvgUrl =
  'data:image/svg+xml;charset=UTF-8,' +
  encodeURIComponent(
    `<svg width="40" height="50" viewBox="0 0 40 50" xmlns="http://www.w3.org/2000/svg"><path d="M20 0C8.954 0 0 8.954 0 20c0 12.5 20 30 20 30s20-17.5 20-30C40 8.954 31.046 0 20 0z" fill="#DC2626"/><circle cx="20" cy="20" r="8" fill="#FFFFFF"/></svg>`,
  )

async function reverseGeocode(
  lat: number,
  lng: number,
  fallbackLabel: string,
): Promise<{ label: string; detail: string }> {
  if (typeof window === 'undefined' || !window.google?.maps) {
    return {
      label: fallbackLabel,
      detail: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
    }
  }

  try {
    const geocoder = new window.google.maps.Geocoder()
    const result = await geocoder.geocode({ location: { lat, lng } })
    const first = result.results[0]
    if (!first) {
      return {
        label: fallbackLabel,
        detail: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
      }
    }

    const neighborhood =
      first.address_components.find((c) => c.types.includes('neighborhood'))?.long_name ||
      first.address_components.find((c) => c.types.includes('sublocality'))?.long_name ||
      first.address_components.find((c) => c.types.includes('locality'))?.long_name ||
      'Addis Ababa'

    return {
      label: neighborhood,
      detail: first.formatted_address,
    }
  } catch {
    return {
      label: fallbackLabel,
      detail: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
    }
  }
}

function markerIcon() {
  if (typeof window !== 'undefined' && window.google?.maps) {
    return {
      url: redPinSvgUrl,
      scaledSize: new window.google.maps.Size(40, 50),
      anchor: new window.google.maps.Point(20, 50),
    }
  }
  return { url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png' }
}

/** Full-screen delivery location: current GPS or pin drop. */
export function DeliveryLocationScreen({ open, initial, onClose, onConfirm }: Props) {
  const { isLoaded, loadError, hasApiKey } = useGoogleMaps()
  const { t } = useLanguage()
  const [mode, setMode] = useState<Mode>('choose')
  const [draft, setDraft] = useState<{ lat: number; lng: number } | null>(null)
  const [gpsError, setGpsError] = useState('')
  const [gpsLoading, setGpsLoading] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [ethiopiaErrorOpen, setEthiopiaErrorOpen] = useState(false)
  const [mapType, setMapType] = useState<RoadRunnerMapType>('roadmap')

  useEffect(() => {
    if (!open) return
    setMode('choose')
    setDraft(initial ? { lat: initial.lat, lng: initial.lng } : null)
    setGpsError('')
    setGpsLoading(false)
    setConfirming(false)
    setEthiopiaErrorOpen(false)
    setMapType('roadmap')
  }, [open, initial])

  const startGps = useCallback(() => {
    setMode('gps')
    setGpsError('')
    setGpsLoading(true)

    if (!navigator.geolocation) {
      setGpsLoading(false)
      setGpsError(t('loc_geo_unsupported'))
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setDraft({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        })
        setGpsLoading(false)
      },
      (error) => {
        setGpsLoading(false)
        setGpsError(error.code === error.PERMISSION_DENIED ? t('loc_permission') : t('loc_gps_fail'))
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    )
  }, [t])

  const startPin = useCallback(() => {
    setMode('pin')
    setDraft(initial ? { lat: initial.lat, lng: initial.lng } : ADDIS_CENTER)
    setGpsError('')
  }, [initial])

  const handleConfirm = useCallback(async () => {
    if (!draft) return
    if (!isLocationInEthiopia(draft.lat, draft.lng)) {
      setEthiopiaErrorOpen(true)
      return
    }
    setConfirming(true)
    const place = await reverseGeocode(draft.lat, draft.lng, t('loc_selected'))
    onConfirm({
      lat: draft.lat,
      lng: draft.lng,
      label: place.label,
      detail: place.detail,
      source: mode === 'gps' ? 'gps' : 'pin',
    })
    setConfirming(false)
  }, [draft, mode, onConfirm, t])

  if (!open || typeof document === 'undefined') return null

  const mapReady = hasApiKey && isLoaded && !loadError
  const center = draft || ADDIS_CENTER

  const content = (
    <div className="delivery-location-screen" role="dialog" aria-modal="true" aria-label={t('loc_title')}>
      {mode === 'choose' && (
        <div className="delivery-location-panel">
          <header className="delivery-location-header">
            <div>
              <span className="section-kicker">{t('loc_kicker')}</span>
              <h2>{t('loc_where')}</h2>
              <p>{t('loc_where_body')}</p>
            </div>
            <button type="button" className="delivery-close" onClick={onClose} aria-label={t('account_close')}>
              ✕
            </button>
          </header>

          <div className="delivery-choice-grid">
            <button type="button" className="delivery-choice-card" onClick={startGps}>
              <strong>{t('loc_use_gps')}</strong>
              <span>{t('loc_use_gps_desc')}</span>
            </button>
            <button type="button" className="delivery-choice-card" onClick={startPin}>
              <strong>{t('loc_choose_map')}</strong>
              <span>{t('loc_choose_map_desc')}</span>
            </button>
          </div>

          {!hasApiKey && (
            <p className="delivery-location-note">{t('loc_map_unavailable')}</p>
          )}
          {hasApiKey && loadError && (
            <p className="delivery-location-note">{t('loc_map_unavailable')}</p>
          )}
        </div>
      )}

      {(mode === 'gps' || mode === 'pin') && (
        <div className="delivery-map-shell">
          <div className="delivery-map-top">
            <button type="button" className="delivery-back" onClick={() => setMode('choose')}>
              ← {t('account_back')}
            </button>
            <div>
              <strong>{mode === 'gps' ? t('loc_gps_title') : t('loc_pin_title')}</strong>
              <small>{mode === 'gps' ? t('loc_gps_hint') : t('loc_pin_hint')}</small>
            </div>
            <button type="button" className="delivery-close" onClick={onClose} aria-label={t('account_close')}>
              ✕
            </button>
          </div>

          {mode === 'gps' && gpsLoading && (
            <div className="delivery-map-status">{t('loc_getting_gps')}</div>
          )}
          {mode === 'gps' && gpsError && (
            <div className="delivery-map-status error">
              <p>{gpsError}</p>
              <button type="button" onClick={startPin}>
                {t('loc_choose_map_instead')}
              </button>
            </div>
          )}

          <div className="delivery-map-canvas">
            {mapReady && draft ? (
              <>
                <MapSearchBar
                  onPlaceSelect={(lat, lng) => {
                    setDraft({ lat, lng })
                  }}
                />
                <div className="rr-delivery-map-type">
                  <MapTypeToggle value={mapType} onChange={setMapType} />
                </div>
                <GoogleMap
                  mapContainerStyle={{ width: '100%', height: '100%' }}
                  center={center}
                  zoom={15}
                  mapTypeId={toGoogleMapTypeId(mapType)}
                  options={roadRunnerMapOptions({ mapTypeId: toGoogleMapTypeId(mapType) })}
                  onClick={(event) => {
                    if (mode !== 'pin' || !event.latLng) return
                    setDraft({ lat: event.latLng.lat(), lng: event.latLng.lng() })
                  }}
                >
                  <MarkerF
                    position={draft}
                    draggable={mode === 'pin' || mode === 'gps'}
                    icon={markerIcon()}
                    onDragEnd={(event) => {
                      if (!event.latLng) return
                      setDraft({ lat: event.latLng.lat(), lng: event.latLng.lng() })
                    }}
                  />
                </GoogleMap>
              </>
            ) : (
              <div className="delivery-map-fallback">
                {!hasApiKey || loadError
                  ? t('loc_map_unavailable')
                  : gpsLoading
                    ? t('loc_waiting_gps')
                    : t('loc_loading_map')}
                {draft && (
                  <p>
                    {draft.lat.toFixed(5)}, {draft.lng.toFixed(5)}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="delivery-map-footer">
            <button
              type="button"
              className="primary-button delivery-confirm"
              disabled={!draft || confirming || (mode === 'gps' && (gpsLoading || !!gpsError))}
              onClick={() => void handleConfirm()}
            >
              {confirming ? t('loc_saving') : t('loc_confirm')}
            </button>
          </div>
        </div>
      )}

      <EthiopiaLocationValidator open={ethiopiaErrorOpen} onClose={() => setEthiopiaErrorOpen(false)} />
    </div>
  )

  return createPortal(content, document.body)
}
