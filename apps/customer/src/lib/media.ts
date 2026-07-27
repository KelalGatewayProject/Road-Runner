/** Pharmacy list card + storefront cover banner. */

/** Display: card banner is full width × 190px (cover); storefront cover is full width × 360px. */
export const PHARMACY_BANNER_WIDTH = 1200
export const PHARMACY_BANNER_HEIGHT = 640
export const PHARMACY_BANNER_MAX_BYTES = 2 * 1024 * 1024
export const PHARMACY_BANNER_ACCEPT = 'image/jpeg,image/jpg,image/png,image/webp'

export const PHARMACY_BANNER_BUCKET = 'pharmacy-banners'

export function resolveMediaUrl(pathOrUrl: string, assetUrl: (path: string) => string): string {
  const value = (pathOrUrl || '').trim()
  if (!value) return ''
  if (/^(https?:|data:|blob:)/i.test(value)) return value
  return assetUrl(value)
}
