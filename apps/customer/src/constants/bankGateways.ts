/** Kelal-aligned payment gateway keys for The Bank (pharmacy — no events). */

export type GatewayKey =
  | 'telebirr'
  | 'mpesa'
  | 'cbe'
  | 'ebirr'
  | 'nib'
  | 'awashBirr'
  | 'boa'
  | 'zeman'

export type BankGatewayDef = {
  key: GatewayKey
  label: string
  icon: string
}

const B = 'https://awrunspkmsvswrvphrdd.supabase.co/storage/v1/object/public/images/banks'

/** Same gateways / icons as Kelal Super Admin → The Bank. */
export const BANK_GATEWAYS: BankGatewayDef[] = [
  { key: 'telebirr', label: 'TELEBIRR', icon: `${B}/TELEBIRR_icon.png` },
  { key: 'mpesa', label: 'M-PESA', icon: `${B}/M-PESA_icon.png` },
  { key: 'cbe', label: 'CBEBirr Plus', icon: `${B}/CBE_Birr_icon.png` },
  { key: 'ebirr', label: 'eBirr', icon: `${B}/ebirr.png` },
  { key: 'nib', label: 'NIBtera', icon: `${B}/NIB%20logo.png` },
  { key: 'awashBirr', label: 'AwashBirr Pro', icon: `${B}/AwashBirr%20Pro.png` },
  { key: 'boa', label: 'BoA', icon: `${B}/BoA%20Bank%20logo.png` },
  { key: 'zeman', label: 'Zemen', icon: `${B}/Zeman%20Bank%20logo.png` },
]

/** Platform cashbox row — collected Road Runner service fees (2% of item subtotal). */
export const PLATFORM_CASHBOX_KEY = 'platform_cashbox'

export function isGatewayKey(value: string): value is GatewayKey {
  return BANK_GATEWAYS.some((g) => g.key === value)
}
