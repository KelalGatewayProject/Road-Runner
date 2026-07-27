import { useCallback, useEffect, useId, useRef, useState } from 'react'
import './MapSearchBar.css'
import { ADDIS_CENTER } from '../../config/maps'
import { useLanguage } from '../../contexts/LanguageContext'

type Props = {
  onPlaceSelect: (lat: number, lng: number, label?: string) => void
}

type Prediction = {
  placeId: string
  description: string
  mainText: string
  secondaryText: string
}

/** Ethiopia-only Places search with custom dropdown (pin moves on pick). */
export default function MapSearchBar({ onPlaceSelect }: Props) {
  const { t } = useLanguage()
  const listId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const blurTimer = useRef<number | null>(null)
  const [query, setQuery] = useState('')
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const fetchPredictions = useCallback((input: string) => {
    const trimmed = input.trim()
    if (trimmed.length < 2) {
      setPredictions([])
      setOpen(false)
      setError('')
      return
    }
    if (typeof window === 'undefined' || !window.google?.maps?.places) {
      setError(t('map_search_unavailable'))
      return
    }

    const service = new window.google.maps.places.AutocompleteService()
    service.getPlacePredictions(
      {
        input: trimmed,
        componentRestrictions: { country: 'et' },
        location: new window.google.maps.LatLng(ADDIS_CENTER.lat, ADDIS_CENTER.lng),
        radius: 750_000,
      },
      (results, status) => {
        if (
          status !== window.google.maps.places.PlacesServiceStatus.OK ||
          !results?.length
        ) {
          setPredictions([])
          setOpen(trimmed.length >= 2)
          setError(
            status === window.google.maps.places.PlacesServiceStatus.ZERO_RESULTS
              ? t('map_search_no_results')
              : status === window.google.maps.places.PlacesServiceStatus.REQUEST_DENIED ||
                  status === window.google.maps.places.PlacesServiceStatus.OVER_QUERY_LIMIT
                ? t('map_search_denied')
                : t('map_search_unavailable'),
          )
          return
        }
        setError('')
        setPredictions(
          results.map((row) => ({
            placeId: row.place_id,
            description: row.description,
            mainText: row.structured_formatting?.main_text || row.description,
            secondaryText: row.structured_formatting?.secondary_text || '',
          })),
        )
        setOpen(true)
        setActiveIndex(-1)
      },
    )
  }, [t])

  useEffect(() => {
    const handle = window.setTimeout(() => fetchPredictions(query), 220)
    return () => window.clearTimeout(handle)
  }, [query, fetchPredictions])

  const resolvePlace = useCallback(
    (placeId: string, fallbackLabel: string) => {
      if (typeof window === 'undefined' || !window.google?.maps?.places) return
      setBusy(true)
      const attribution = document.createElement('div')
      const service = new window.google.maps.places.PlacesService(attribution)
      service.getDetails(
        {
          placeId,
          fields: ['geometry', 'formatted_address', 'name', 'address_components'],
        },
        (place, status) => {
          setBusy(false)
          if (
            status !== window.google.maps.places.PlacesServiceStatus.OK ||
            !place?.geometry?.location
          ) {
            setError(t('map_search_unavailable'))
            return
          }
          const lat = place.geometry.location.lat()
          const lng = place.geometry.location.lng()
          const label = place.formatted_address || place.name || fallbackLabel
          setQuery(label)
          setPredictions([])
          setOpen(false)
          setError('')
          onPlaceSelect(lat, lng, label)
        },
      )
    },
    [onPlaceSelect, t],
  )

  const pick = (item: Prediction) => {
    if (blurTimer.current) window.clearTimeout(blurTimer.current)
    resolvePlace(item.placeId, item.description)
  }

  return (
    <div className="rr-map-search">
      <input
        ref={inputRef}
        type="search"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onFocus={() => {
          if (predictions.length) setOpen(true)
        }}
        onBlur={() => {
          blurTimer.current = window.setTimeout(() => setOpen(false), 160)
        }}
        onKeyDown={(e) => {
          if (!open || !predictions.length) return
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setActiveIndex((i) => Math.min(i + 1, predictions.length - 1))
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setActiveIndex((i) => Math.max(i - 1, 0))
          } else if (e.key === 'Enter' && activeIndex >= 0) {
            e.preventDefault()
            pick(predictions[activeIndex])
          } else if (e.key === 'Escape') {
            setOpen(false)
          }
        }}
        placeholder={t('map_search_placeholder')}
        aria-label={t('map_search_placeholder')}
        aria-autocomplete="list"
        aria-controls={listId}
        aria-expanded={open}
        enterKeyHint="search"
        autoComplete="off"
        disabled={busy}
      />

      {error && error !== t('map_search_no_results') && (
        <div className="rr-map-search-error" role="alert">
          {error}
        </div>
      )}

      {open && predictions.length > 0 && (
        <ul id={listId} className="rr-map-search-dropdown" role="listbox">
          {predictions.map((item, index) => (
            <li key={item.placeId} role="option" aria-selected={index === activeIndex}>
              <button
                type="button"
                className={index === activeIndex ? 'active' : ''}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(item)}
              >
                <strong>{item.mainText}</strong>
                {item.secondaryText ? <small>{item.secondaryText}</small> : null}
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && error === t('map_search_no_results') && (
        <div className="rr-map-search-dropdown">
          <p className="rr-map-search-empty">{error}</p>
        </div>
      )}
    </div>
  )
}
