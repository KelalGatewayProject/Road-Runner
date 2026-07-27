/** Road Runner Google Maps helpers (web). API key from env only — never hardcode. */

export const GOOGLE_MAPS_LIBRARIES: ('places' | 'geometry')[] = ['places', 'geometry']

/** Default map center: Addis Ababa */
export const ADDIS_CENTER = { lat: 9.0222, lng: 38.7468 }

export function getGoogleMapsApiKey(): string {
  return (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined)?.trim() || ''
}

export function handleGoogleMapsError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? '')

  if (message.includes('BillingNotEnabledMapError')) {
    return 'Google Maps billing is not enabled. Enable billing in Google Cloud Console.'
  }

  if (
    message.includes('ApiTargetBlockedMapError') ||
    message.includes('RefererNotAllowedMapError')
  ) {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'this origin'
    return `Google Maps access blocked for ${origin}. Add this origin to the API key HTTP referrers.`
  }

  if (message.includes('OVER_QUERY_LIMIT')) {
    return 'Google Maps quota exceeded. Try again later.'
  }

  if (message.includes('REQUEST_DENIED') || message.includes('INVALID_KEY')) {
    return 'Google Maps request denied. Check VITE_GOOGLE_MAPS_API_KEY and enabled APIs.'
  }

  return 'Google Maps error. Please try again.'
}

export function isGoogleMapsBlocked(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '')
  return (
    message.includes('BillingNotEnabledMapError') ||
    message.includes('ApiTargetBlockedMapError') ||
    message.includes('RefererNotAllowedMapError') ||
    message.includes('REQUEST_DENIED') ||
    message.includes('INVALID_KEY')
  )
}

export function getFallbackMapUrl(latitude: number, longitude: number, placeName?: string): string {
  const encodedName = placeName ? encodeURIComponent(placeName) : ''
  return `https://www.google.com/maps?q=${latitude},${longitude}${encodedName ? `&query_place=${encodedName}` : ''}`
}

export function getDirectionsUrl(latitude: number, longitude: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`
}

export function openDirectionsToLocation(latitude: number, longitude: number): void {
  if (typeof window === 'undefined') return
  window.open(getDirectionsUrl(latitude, longitude), '_blank', 'noopener,noreferrer')
}

/** Shared Google Map options for Road Runner pin screens. */
export function roadRunnerMapOptions(
  extras: google.maps.MapOptions = {},
): google.maps.MapOptions {
  return {
    zoomControl: true,
    streetViewControl: false,
    mapTypeControl: false,
    fullscreenControl: false,
    clickableIcons: true,
    gestureHandling: 'greedy',
    mapTypeId: 'roadmap',
    ...extras,
  }
}

/**
 * UI "Satellite" uses Google `hybrid` so road/place names stay visible
 * (plain `satellite` has no labels).
 */
export function toGoogleMapTypeId(uiType: 'roadmap' | 'satellite'): string {
  return uiType === 'satellite' ? 'hybrid' : 'roadmap'
}
