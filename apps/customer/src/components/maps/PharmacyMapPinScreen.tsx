import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { GoogleMap, MarkerF } from '@react-google-maps/api'
import { ADDIS_CENTER, roadRunnerMapOptions, toGoogleMapTypeId } from '../../config/maps'
import { useGoogleMaps } from '../../contexts/GoogleMapsContext'
import { useLanguage } from '../../contexts/LanguageContext'
import EthiopiaLocationValidator, { isLocationInEthiopia } from './EthiopiaLocationValidator'
import MapSearchBar from './MapSearchBar'
import MapTypeToggle, { type RoadRunnerMapType } from './MapTypeToggle'
import './PharmacyMapPinScreen.css'

export type PharmacyMapPin = {
  lat: number
  lng: number
  area: string
  detail: string
}

type Props = {
  open: boolean
  initial?: { lat: number; lng: number } | null
  onClose: () => void
  onConfirm: (pin: PharmacyMapPin) => void
}

const redPinSvgUrl =
  'data:image/svg+xml;charset=UTF-8,' +
  encodeURIComponent(
    `<svg width="40" height="50" viewBox="0 0 40 50" xmlns="http://www.w3.org/2000/svg"><path d="M20 0C8.954 0 0 8.954 0 20c0 12.5 20 30 20 30s20-17.5 20-30C40 8.954 31.046 0 20 0z" fill="#DC2626"/><circle cx="20" cy="20" r="8" fill="#FFFFFF"/></svg>`,
  )

async function reverseGeocode(lat: number, lng: number, fallback: string) {
  if (typeof window === 'undefined' || !window.google?.maps) {
    return { area: fallback, detail: `${lat.toFixed(5)}, ${lng.toFixed(5)}` }
  }
  try {
    const geocoder = new window.google.maps.Geocoder()
    const result = await geocoder.geocode({ location: { lat, lng } })
    const first = result.results[0]
    if (!first) return { area: fallback, detail: `${lat.toFixed(5)}, ${lng.toFixed(5)}` }
    const area =
      first.address_components.find((c) => c.types.includes('neighborhood'))?.long_name ||
      first.address_components.find((c) => c.types.includes('sublocality'))?.long_name ||
      first.address_components.find((c) => c.types.includes('locality'))?.long_name ||
      fallback
    return { area, detail: first.formatted_address }
  } catch {
    return { area: fallback, detail: `${lat.toFixed(5)}, ${lng.toFixed(5)}` }
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

/** Full-screen Google Map pin drop for adding a pharmacy location. */
export default function PharmacyMapPinScreen({ open, initial, onClose, onConfirm }: Props) {
  const { isLoaded, loadError, hasApiKey } = useGoogleMaps()
  const { t } = useLanguage()
  const [draft, setDraft] = useState<{ lat: number; lng: number }>(initial || ADDIS_CENTER)
  const [center, setCenter] = useState<{ lat: number; lng: number }>(initial || ADDIS_CENTER)
  const [confirming, setConfirming] = useState(false)
  const [ethiopiaErrorOpen, setEthiopiaErrorOpen] = useState(false)
  const [mapType, setMapType] = useState<RoadRunnerMapType>('roadmap')
  const [map, setMap] = useState<google.maps.Map | null>(null)

  useEffect(() => {
    if (!open) return
    const start = initial || ADDIS_CENTER
    setDraft(start)
    setCenter(start)
    setConfirming(false)
    setEthiopiaErrorOpen(false)
    setMapType('roadmap')
  }, [open, initial])

  const movePin = useCallback(
    (lat: number, lng: number, pan = false) => {
      const next = { lat, lng }
      setDraft(next)
      setCenter(next)
      if (pan && map) map.panTo(next)
    },
    [map],
  )

  const handleConfirm = useCallback(async () => {
    if (!isLocationInEthiopia(draft.lat, draft.lng)) {
      setEthiopiaErrorOpen(true)
      return
    }
    setConfirming(true)
    const place = await reverseGeocode(draft.lat, draft.lng, t('upload_area_default'))
    onConfirm({
      lat: draft.lat,
      lng: draft.lng,
      area: place.area,
      detail: place.detail,
    })
    setConfirming(false)
  }, [draft, onConfirm, t])

  if (!open || typeof document === 'undefined') return null

  const mapReady = hasApiKey && isLoaded && !loadError
  const googleMapTypeId = toGoogleMapTypeId(mapType)

  const content = (
    <div className="delivery-location-screen rr-pharm-map" role="dialog" aria-modal="true" aria-label={t('pharm_map_title')}>
      <div className="rr-pharm-map-shell">
        <button type="button" className="rr-pharm-map-close" onClick={onClose} aria-label={t('account_close')}>
          ✕
        </button>

        <div className="rr-pharm-map-canvas">
          {mapReady ? (
            <>
              <MapSearchBar
                onPlaceSelect={(lat, lng) => {
                  movePin(lat, lng, true)
                  map?.setZoom(17)
                }}
              />
              <div className="rr-pharm-map-type">
                <MapTypeToggle value={mapType} onChange={setMapType} />
              </div>
              <GoogleMap
                mapContainerStyle={{ width: '100%', height: '100%' }}
                center={center}
                zoom={15}
                mapTypeId={googleMapTypeId}
                onLoad={(instance) => setMap(instance)}
                options={roadRunnerMapOptions({
                  mapTypeId: googleMapTypeId,
                  clickableIcons: true,
                  gestureHandling: 'greedy',
                })}
                onClick={(event) => {
                  if (!event.latLng) return
                  movePin(event.latLng.lat(), event.latLng.lng())
                }}
              >
                <MarkerF
                  position={draft}
                  draggable
                  icon={markerIcon()}
                  onDragEnd={(event) => {
                    if (!event.latLng) return
                    movePin(event.latLng.lat(), event.latLng.lng())
                  }}
                />
              </GoogleMap>
            </>
          ) : (
            <div className="delivery-map-fallback">
              {!hasApiKey || loadError ? t('loc_map_unavailable') : t('loc_loading_map')}
              <p>
                {draft.lat.toFixed(5)}, {draft.lng.toFixed(5)}
              </p>
            </div>
          )}
        </div>

        <button
          type="button"
          className="rr-pharm-map-confirm"
          disabled={confirming || !mapReady}
          onClick={() => void handleConfirm()}
        >
          {confirming ? t('loc_saving') : t('pharm_map_confirm')}
        </button>
      </div>

      <EthiopiaLocationValidator open={ethiopiaErrorOpen} onClose={() => setEthiopiaErrorOpen(false)} />
    </div>
  )

  return createPortal(content, document.body)
}
