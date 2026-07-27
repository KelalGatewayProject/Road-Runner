import { useCallback, useEffect, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { GoogleMap, MarkerF } from '@react-google-maps/api'
import { openDirectionsToLocation, roadRunnerMapOptions, toGoogleMapTypeId } from '../../config/maps'
import MapSearchBar from './MapSearchBar'
import MapTypeToggle, { type RoadRunnerMapType } from './MapTypeToggle'

type InteractiveGoogleMapProps = {
  latitude: number
  longitude: number
  zoom?: number
  onLocationSelect: (lat: number, lng: number) => void
  onClose: () => void
  isLoaded?: boolean
  /** When true, pin is fixed and Directions is shown (pharmacy / drop-off preview). */
  isStatic?: boolean
  placeName?: string
}

const containerStyle: CSSProperties = {
  width: '100vw',
  height: '100vh',
  position: 'fixed',
  top: 0,
  left: 0,
  zIndex: 99999,
  background: 'transparent',
}

const mapStyle: CSSProperties = {
  width: '100vw',
  height: '100vh',
  margin: 0,
  padding: 0,
  background: '#fff',
  borderRadius: 0,
  position: 'absolute',
  top: 0,
  left: 0,
  boxShadow: 'none',
}

const redPinSvgUrl =
  'data:image/svg+xml;charset=UTF-8,' +
  encodeURIComponent(
    `<svg width="40" height="50" viewBox="0 0 40 50" xmlns="http://www.w3.org/2000/svg"><path d="M20 0C8.954 0 0 8.954 0 20c0 12.5 20 30 20 30s20-17.5 20-30C40 8.954 31.046 0 20 0z" fill="#DC2626"/><circle cx="20" cy="20" r="8" fill="#FFFFFF"/></svg>`,
  )

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

/**
 * Full-screen pin map adapted for Road Runner delivery / pharmacy locations.
 * Click or drag the pin to set coordinates.
 */
export default function InteractiveGoogleMap({
  latitude,
  longitude,
  zoom = 15,
  onLocationSelect,
  onClose,
  isLoaded = false,
  isStatic = false,
  placeName = '',
}: InteractiveGoogleMapProps) {
  const [mounted, setMounted] = useState(false)
  const [mapType, setMapType] = useState<RoadRunnerMapType>('roadmap')

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  useEffect(() => {
    setMapType('roadmap')
  }, [latitude, longitude])

  const handleMapClick = useCallback(
    (e: google.maps.MapMouseEvent) => {
      if (isStatic || !e.latLng) return
      onLocationSelect(e.latLng.lat(), e.latLng.lng())
    },
    [isStatic, onLocationSelect],
  )

  if (!isLoaded) {
    const loadEl = (
      <div style={containerStyle}>
        <div style={mapStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <p>Loading map…</p>
          </div>
        </div>
      </div>
    )
    return mounted && document.body ? createPortal(loadEl, document.body) : loadEl
  }

  const fullscreenContent = (
    <div style={containerStyle}>
      <div style={mapStyle}>
        <MapSearchBar
          onPlaceSelect={(lat, lng) => {
            if (!isStatic) onLocationSelect(lat, lng)
          }}
        />
        <div className="rr-interactive-map-type">
          <MapTypeToggle value={mapType} onChange={setMapType} />
        </div>
        {!isStatic && (
          <div
            style={{
              position: 'absolute',
              top: 'calc(env(safe-area-inset-top, 0px) + 108px)',
              left: '20px',
              zIndex: 100000,
              background: 'rgba(255,255,255,0.95)',
              color: '#333',
              border: '1px solid #ddd',
              borderRadius: '8px',
              padding: '12px 16px',
              fontSize: '14px',
              fontWeight: 500,
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              maxWidth: '300px',
            }}
          >
            Click anywhere on the map or drag the pin to set your delivery location
          </div>
        )}

        <button
          type="button"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 'calc(env(safe-area-inset-top, 0px) + 12px)',
            right: '12px',
            zIndex: 100003,
            background: 'rgba(255,255,255,0.95)',
            color: '#333',
            border: '1px solid #ddd',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          }}
          title="Close fullscreen map"
        >
          ✕
        </button>

        {isStatic && (
          <button
            type="button"
            onClick={() => openDirectionsToLocation(latitude, longitude)}
            style={{
              position: 'absolute',
              bottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)',
              left: '20px',
              zIndex: 100000,
              padding: '12px 20px',
              backgroundColor: '#06122c',
              color: 'white',
              border: 'none',
              borderRadius: '25px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 600,
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            }}
            title="Get directions in Google Maps"
          >
            Directions
          </button>
        )}

        <GoogleMap
          mapContainerStyle={{ width: '100%', height: '100%', minHeight: '100vh' }}
          center={{ lat: latitude, lng: longitude }}
          zoom={zoom}
          mapTypeId={toGoogleMapTypeId(mapType)}
          options={roadRunnerMapOptions({ mapTypeId: toGoogleMapTypeId(mapType) })}
          onClick={isStatic ? undefined : handleMapClick}
        >
          <MarkerF
            key={`marker-${latitude}-${longitude}`}
            position={{ lat: latitude, lng: longitude }}
            title={isStatic ? placeName || 'Location' : 'Delivery location'}
            zIndex={999999}
            icon={markerIcon()}
            draggable={!isStatic}
            onDragEnd={
              isStatic
                ? undefined
                : (e) => {
                    if (e.latLng) onLocationSelect(e.latLng.lat(), e.latLng.lng())
                  }
            }
          />
        </GoogleMap>
      </div>
    </div>
  )

  return mounted && document.body ? createPortal(fullscreenContent, document.body) : fullscreenContent
}
