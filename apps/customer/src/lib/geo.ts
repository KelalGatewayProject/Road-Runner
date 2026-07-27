export type LatLng = { lat: number; lng: number }

/** Delivery charge: 25 ETB per kilometer (rounded up to whole km). */
export const DELIVERY_RATE_ETB_PER_KM = 25

export function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const lat1 = (a.lat * Math.PI) / 180
  const lat2 = (b.lat * Math.PI) / 180
  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2)
  return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x))
}

export function deliveryFeeEtb(distanceKm: number): number {
  if (!Number.isFinite(distanceKm) || distanceKm <= 0) return 0
  return Math.ceil(distanceKm) * DELIVERY_RATE_ETB_PER_KM
}

export function formatDistanceKm(distanceKm: number): string {
  if (!Number.isFinite(distanceKm)) return '—'
  return distanceKm < 10 ? distanceKm.toFixed(1) : Math.round(distanceKm).toString()
}
