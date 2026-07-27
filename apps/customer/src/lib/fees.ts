/** Checkout fee rules for Road Runner (pharmacy). */

/** Same rate Kelal uses for bar/F&B platform fee. */
export const SERVICE_FEE_RATE = 0.02

/** Delivery: 25 ETB per whole km (see `deliveryFeeEtb` in geo.ts). */
export const DELIVERY_RATE_ETB_PER_KM = 25

/** WHT on non-refund withdrawals — same as Kelal The Bank. */
export const WHT_RATE = 0.03

/**
 * Service fee on cart checkout:
 *   Math.round(itemsSubtotalEtb * 0.02)
 * Applied to product line subtotal only — not delivery.
 */
export function serviceFeeEtb(itemsSubtotalEtb: number): number {
  if (!Number.isFinite(itemsSubtotalEtb) || itemsSubtotalEtb <= 0) return 0
  return Math.round(itemsSubtotalEtb * SERVICE_FEE_RATE)
}
