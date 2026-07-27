export type PaymentGatewayId =
  | 'telebirr'
  | 'cbebirr'
  | 'cbe'
  | 'mpesa'
  | 'awash'
  | 'nibtera'
  | 'ebirr'
  | 'boa'
  | 'zeman'

export type PaymentOption = {
  id: PaymentGatewayId
  /** Institution name (line 1 in grid UI) */
  bankName: string
  /** Product / app name (line 2 in grid UI) */
  appName: string
  iconUrl: string
  /** Main grid tile opens CBE sub-picker (CBEBirr Plus + CBE Banking app) */
  opensCbeSubPicker?: boolean
}

const BASE = 'https://awrunspkmsvswrvphrdd.supabase.co/storage/v1/object/public/images/banks'

/** Labels for future order / cashbox records once gateways go live. */
export const PAYMENT_GATEWAY_ACCOUNTING_LABEL: Record<PaymentGatewayId, string> = {
  telebirr: 'Telebirr',
  mpesa: 'M-PESA',
  cbebirr: 'CBEBirr',
  cbe: 'CBE Banking',
  awash: 'AwashBirr Pro',
  nibtera: 'NIBtera',
  ebirr: 'eBirr',
  boa: 'BoA',
  zeman: 'Zemen Bank',
}

export function getPaymentGatewayAccountingLabel(gateway: PaymentGatewayId): string {
  return PAYMENT_GATEWAY_ACCOUNTING_LABEL[gateway] ?? gateway
}

/** Road Runner local payment grid (same order/pairing as Kelal Pay — all Coming Soon for now). */
export const PAYMENT_GRID_OPTIONS: PaymentOption[] = [
  {
    id: 'telebirr',
    bankName: 'Ethio Telecom',
    appName: 'Telebirr',
    iconUrl: `${BASE}/telebirr_logo.jpg`,
  },
  {
    id: 'mpesa',
    bankName: 'Safaricom',
    appName: 'M-PESA',
    iconUrl: `${BASE}/M-Pesa%20icon.png`,
  },
  {
    id: 'cbe',
    bankName: 'Commercial Bank of Ethiopia',
    appName: 'CBEBirr & CBE',
    iconUrl: `${BASE}/CBE_MOBILE_BANKING_icon.png`,
    opensCbeSubPicker: true,
  },
  {
    id: 'awash',
    bankName: 'Awash International Bank',
    appName: 'AwashBirr Pro',
    iconUrl: `${BASE}/AwashBirr%20Pro.png`,
  },
  {
    id: 'boa',
    bankName: 'Bank of Abyssinia',
    appName: 'BoA Mobile',
    iconUrl: `${BASE}/BoA%20Bank%20logo.png`,
  },
  {
    id: 'zeman',
    bankName: 'Zemen Bank',
    appName: 'Zemen Mobile Banking',
    iconUrl: `${BASE}/Zeman%20Bank%20logo.png`,
  },
  {
    id: 'nibtera',
    bankName: 'NIB International Bank',
    appName: 'NIBTera',
    iconUrl: `${BASE}/NIB%20logo.png`,
  },
  {
    id: 'ebirr',
    bankName: 'Cooperative Bank of Oromia',
    appName: 'eBirr',
    iconUrl: `${BASE}/ebirr.png`,
  },
]

/** CBE sub-picker options. */
export const PAYMENT_CBE_SUB_OPTIONS: PaymentOption[] = [
  {
    id: 'cbebirr',
    bankName: 'Commercial Bank of Ethiopia',
    appName: 'CBEBirr Plus',
    iconUrl: `${BASE}/CBE_Birr_icon.png`,
  },
  {
    id: 'cbe',
    bankName: 'Commercial Bank of Ethiopia',
    appName: 'CBE Banking app',
    iconUrl: `${BASE}/CBE_MOBILE_BANKING_icon.png`,
  },
]
