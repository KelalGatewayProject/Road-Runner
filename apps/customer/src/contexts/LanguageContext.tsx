import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export type Language = 'en' | 'am' | 'fr' | 'om'

const STORAGE_KEY = 'road_runner_preferred_language'

export const LANGUAGE_OPTIONS: { id: Language; label: string; nativeLabel: string }[] = [
  { id: 'en', label: 'English', nativeLabel: 'English' },
  { id: 'am', label: 'Amharic', nativeLabel: 'አማርኛ' },
  { id: 'fr', label: 'French', nativeLabel: 'Français' },
  { id: 'om', label: 'Afan Oromo', nativeLabel: 'Afaan Oromoo' },
]

/** Google Maps JS API language codes (Oromo falls back to English if unsupported). */
export function mapsLanguageCode(lang: Language): string {
  if (lang === 'om') return 'en'
  return lang
}

type Dict = Record<string, string>

const en: Dict = {
  account_title: 'Account',
  account_kicker: 'Your profile',
  account_name: 'Name',
  account_phone: 'Phone',
  account_phone_not_set: 'Not set',
  account_preferences: 'Preferences',
  account_language: 'Language',
  account_language_hint: 'Choose the language for Road Runner on this device.',
  account_legal: 'Legal',
  account_privacy: 'Privacy Policy',
  account_privacy_desc: 'How we collect and use your information',
  account_terms: 'Terms of Service',
  account_terms_desc: 'Rules for using Road Runner',
  account_support: 'Support',
  account_support_desc: 'Contact Road Runner support for help with your account.',
  account_sign_out: 'Sign out',
  account_back: 'Back',
  account_close: 'Close',
  legal_updated: 'Last updated',
  legal_privacy_title: 'Privacy Policy',
  legal_terms_title: 'Terms of Service',

  nav_home: 'Home',
  nav_menu: 'Menu',
  nav_pharmacies: 'Pharmacies',
  nav_cart: 'Cart',
  nav_account: 'Account',
  nav_sign_in: 'Sign in',

  menu_guest: 'Guest',
  menu_sign_in_prompt: 'Sign in to manage your Road Runner account.',
  menu_role_super: 'Super Admin',
  menu_role_admin: 'Admin',
  menu_role_customer: 'Customer',
  menu_super_admin_dashboard: 'Super Admin Dashboard',
  menu_admin_dashboard: 'Admin Dashboard',
  menu_pharmacies: 'Pharmacies',
  menu_add_pharmacy: 'Add Pharmacy',
  menu_add_product: 'Add Product',
  menu_upload_restricted: 'Only Super Admin and assigned admins can upload pharmacies and products.',

  admin_kicker: 'Road Runner control',
  admin_denied_title: 'Access denied',
  admin_denied_body: 'This area is only for Super Admin and assigned admins.',
  admin_stat_users: 'Users',
  admin_stat_pharmacies: 'Pharmacies',
  admin_stat_products: 'Products',
  admin_stat_admins: 'Admins',
  admin_banks_title: 'Banks & gateways',
  admin_banks_hint: 'Manual balances for pharmacy payment settlement. Super Admin can edit.',
  admin_banks_empty: 'Apply the admin SQL migration to create cashbox rows.',
  admin_accounting_title: 'Accounting',
  admin_accounting_invalid: 'Enter a valid amount and description.',
  admin_accounting_empty: 'No accounting entries yet.',
  admin_entry_income: 'Income',
  admin_entry_expense: 'Expense',
  admin_entry_adjustment: 'Adjustment',
  admin_entry_withdrawal: 'Withdrawal',
  admin_entry_no_gateway: 'No gateway',
  admin_entry_amount: 'Amount (ETB)',
  admin_entry_desc: 'Description',
  admin_entry_add: 'Add entry',
  admin_members_title: 'Members & roles',
  admin_members_hint: 'Assign Admin to upload pharmacies and products. Pharmacy owners cannot upload.',
  admin_assign_admin: 'Make admin',
  admin_unassign: 'Remove admin',

  upload_admin_only: 'Visible only to Super Admin and assigned admins — not the public or pharmacy owners.',
  upload_name: 'Name',
  upload_phone: 'Phone',
  upload_area: 'Area',
  upload_open_until: 'Open until',
  upload_eta: 'Delivery ETA',
  upload_pharmacy: 'Pharmacy',
  upload_category: 'Category',
  upload_description: 'Description',
  upload_price: 'Price (ETB)',
  upload_unit: 'Unit',
  upload_saving: 'Saving…',
  upload_save_pharmacy: 'Save pharmacy',
  upload_save_product: 'Save product',
  upload_failed: 'Could not save. Check you are signed in as an admin.',
  upload_pharmacy_ok: 'Pharmacy added',
  upload_product_ok: 'Product added',
  upload_area_default: 'Addis Ababa',

  map_type_label: 'Map type',
  map_type_default: 'Default',
  map_type_satellite: 'Satellite',
  map_search_placeholder: 'Search places in Ethiopia…',
  map_search_no_results: 'No places found in Ethiopia.',
  map_search_unavailable: 'Places search is unavailable. Enable Places API in Google Cloud for this key.',
  map_search_denied:
    'Places API is not enabled for this Google Maps key. In Google Cloud Console → APIs & Services → enable “Places API” (and “Places API (New)” if listed) for the same key as VITE_GOOGLE_MAPS_API_KEY, then wait a minute and refresh.',

  pharm_map_title: 'Pharmacy location',
  pharm_map_hint: 'Tap the map or drag the pin to the pharmacy entrance.',
  pharm_map_confirm: 'Confirm pharmacy pin',
  pharm_map_location: 'Map location',
  pharm_map_not_set: 'No pin set yet — open the map to place it.',
  pharm_map_open: 'Place pin on Google Map',
  pharm_map_change: 'Change pin on map',
  pharm_map_required: 'Place the pharmacy pin on the map before saving.',

  pharm_banner_label: 'Pharmacy banner image',
  pharm_banner_size:
    'Recommended size: {w} × {h} px (landscape). Max {mb} MB. JPEG, PNG or WebP. Shown as the pharmacy card and storefront cover.',
  pharm_banner_placeholder: 'No banner selected',
  pharm_banner_choose: 'Choose banner image',
  pharm_banner_change: 'Change banner image',
  pharm_banner_required: 'Upload a pharmacy banner image before saving.',
  pharm_banner_too_large: 'Banner is too large. Keep it under 2 MB.',

  deliver_to: 'Deliver to',
  set_in_cart: 'Set in cart',
  search_placeholder: 'Search medicines, wellness products or pharmacies',
  clear_search: 'Clear search',

  hero_eyebrow: 'Trusted local pharmacies',
  hero_title: 'Pharmacy essentials, delivered to your door.',
  hero_body:
    'Browse trusted pharmacies near you, compare products and get reliable delivery across Addis Ababa.',
  browse_pharmacies: 'Browse pharmacies',
  view_cart: 'View cart',
  hero_fast: 'Fast delivery',
  hero_fast_from: 'from nearby pharmacies',
  hero_eta: '20–40 min',
  hero_eta_avg: 'average arrival',
  hero_secure: 'Secure',
  hero_secure_pay: 'local payments',
  status_fast: 'Fast delivery',
  status_on_way: 'Road Runner is on the way',

  shop_by_need: 'Shop by need',
  product_categories: 'Product categories',
  categories_blurb: 'Find everyday health and wellness essentials from pharmacies near you.',
  products_count: 'products',
  limited_deals: 'Limited-time deals',
  best_offers: 'Best offers',
  shop_pharmacies: 'Shop pharmacies',
  deal: 'Deal',
  save_etb: 'Save {n} ETB',
  add_to_cart: 'Add to cart',

  all_pharmacies: 'All pharmacies',
  verified_pharmacy: 'Verified pharmacy',
  reviews: 'reviews',
  km_away: 'km away',
  available_products: 'Available products',
  items_count: 'items',
  no_matching: 'No matching products',
  no_matching_hint: 'Try a different search term or product category.',
  clear_filters: 'Clear filters',

  care_by_need: 'Care by need',
  health_conditions: 'Shop by health conditions',
  conditions_blurb: 'Discover products curated for diabetes, heart health, immunity, and more.',
  showing_pharmacies_for: 'Showing pharmacies for {name}',

  promise_verified: 'Verified pharmacies',
  promise_verified_sub: 'Trusted local partners',
  promise_fast: 'Fast local delivery',
  promise_fast_sub: 'Live order updates',
  promise_fees: 'Accurate delivery fees',
  promise_fees_sub: 'Based on your distance',
  promise_checkout: 'Secure checkout',
  promise_checkout_sub: 'Local payment options',

  footer_blurb:
    'Everyday pharmacy essentials from trusted local pharmacies, delivered across Addis Ababa.',
  help_center: 'Help center',
  partner_pharmacies: 'Partner pharmacies',
  delivery_areas: 'Delivery areas',
  privacy: 'Privacy',
  terms: 'Terms',
  footer_small: 'Road Runner Pharmacy Delivery — Customer interface prototype',

  pharmacies_kicker: 'Partner pharmacies',
  pharmacies_title: 'Browse pharmacies',
  pharmacies_intro:
    'Partner pharmacies loaded from Road Runner Supabase. New pharmacy uploads with products will appear here automatically.',
  close_pharmacies: 'Close pharmacies',
  open_store: 'Open store',

  cart_kicker: 'Your order',
  cart_title: 'Shopping cart',
  close_cart: 'Close cart',
  ordering_from: 'Ordering from',
  delivery_location: 'Delivery location',
  delivery_unset: 'Not set yet',
  set_location: 'Set location',
  change_location: 'Change',
  items_subtotal: 'Items subtotal',
  delivery: 'Delivery',
  service_fee: 'Service fee (2%)',
  service_fee_note: '2% of items subtotal (same rate as Kelal bar/platform fee). Delivery is separate.',
  total: 'Total',
  continue_checkout: 'Continue to checkout',
  cart_note: 'Stock and final price are confirmed by the pharmacy before payment.',
  cart_empty_title: 'Your cart is empty',
  cart_empty_body: 'Add products from a pharmacy to start your order.',

  bank_title: 'The Bank',
  bank_subtitle: 'All platform transactions',
  bank_service_fee_note:
    'Service fees are {pct}% of pharmacy item subtotals and land in Platform Cashbox. Gateway cards track each payment channel like Kelal.',
  bank_collected: 'Collected',
  bank_platform_cashbox: 'PLATFORM CASHBOX',
  bank_service_fees_tracked: 'Service fees',
  bank_wht_title: '3% WHT COLLECTED',
  bank_wht_hint: '{pct}% of recorded withdrawals',
  bank_wht_detail: 'Withholding tax = {pct}% of each non-refund withdrawal (same as Kelal).',
  bank_wht_on_withdraw: 'Recording a withdrawal also logs {pct}% WHT.',
  bank_recent_tx: 'Recent transactions',
  bank_account_balance: 'Account balance',
  bank_tracked: 'Tracked',
  bank_payments: 'Payments',
  bank_manual_balance: 'Manual account balance (ETB)',
  bank_save_balance: 'Save balance',
  bank_record_withdrawal: 'Record withdrawal (ETB)',
  bank_save_withdrawal: 'Save withdrawal',
  bank_no_payments_yet: 'No gateway payments recorded yet (payments go live with bank contracts).',
  bank_withdraw_invalid: 'Enter a valid withdrawal amount.',
  start_shopping: 'Start shopping',
  set_delivery_to_continue: 'Set your delivery location to continue',
  sign_in_to_pay: 'Sign in to continue to payment',
  delivery_set_to: 'Delivery location set to {label}',
  signed_in_ok: 'Signed in successfully',

  pay_choose: 'Choose payment',
  pay_total: 'Total: {n} ETB',
  pay_coming_soon_note:
    'All methods show Coming Soon until Road Runner payment contracts go live.',
  coming_soon: 'Coming Soon',
  coming_soon_body: 'This payment option ({name}) will be available soon.',
  ok: 'OK',

  loc_title: 'Set delivery location',
  loc_kicker: 'Delivery location',
  loc_where: 'Where should we deliver?',
  loc_where_body:
    'We calculate distance from the pharmacy you ordered from. You do not need the pharmacy address.',
  loc_use_gps: 'Use current location',
  loc_use_gps_desc: 'Opens a full-screen map at your GPS position so you can confirm.',
  loc_choose_map: 'Choose on map',
  loc_choose_map_desc: 'Full-screen Google Map — tap or drag the pin to your door.',
  loc_getting_gps: 'Getting your current location…',
  loc_choose_map_instead: 'Choose on map instead',
  loc_gps_title: 'Confirm current location',
  loc_pin_title: 'Drop your pin',
  loc_gps_hint: 'We use your GPS, then you confirm on the map.',
  loc_pin_hint: 'Tap the map or drag the pin to your delivery spot.',
  loc_confirm: 'Confirm delivery location',
  loc_saving: 'Saving…',
  loc_loading_map: 'Loading map…',
  loc_waiting_gps: 'Waiting for GPS…',
  loc_map_unavailable: 'Map unavailable — check Maps API key settings.',
  loc_selected: 'Selected location',
  loc_geo_unsupported: 'Geolocation is not supported on this device.',
  loc_permission: 'Location permission denied. Allow location access or choose a pin on the map.',
  loc_gps_fail: 'Could not read your current location. Try choosing a pin on the map.',
  cbe_choose_title: 'Commercial Bank of Ethiopia',
  cbe_choose_sub: 'Choose CBEBirr Plus or CBE Banking',
}

const am: Dict = {
  ...en,
  account_title: 'መለያ',
  account_kicker: 'መገለጫዎ',
  account_name: 'ስም',
  account_phone: 'ስልክ',
  account_phone_not_set: 'አልተቀመጠም',
  account_preferences: 'ምርጫዎች',
  account_language: 'ቋንቋ',
  account_language_hint: 'በዚህ መሣሪያ ላይ የ Road Runner ቋንቋ ይምረጡ።',
  account_legal: 'ህጋዊ',
  account_privacy: 'የግላዊነት ፖሊሲ',
  account_privacy_desc: 'መረጃዎን እንዴት እንደምንሰበስብ እና እንጠቀም',
  account_terms: 'የአገልግሎት ውሎች',
  account_terms_desc: 'Road Runnerን ለመጠቀም ደንቦች',
  account_support: 'ድጋፍ',
  account_support_desc: 'ስለ መለያዎ እገዛ ለ Road Runner ድጋፍ ያግኙ።',
  account_sign_out: 'ውጣ',
  account_back: 'ተመለስ',
  account_close: 'ዝጋ',
  legal_updated: 'መጨረሻ የተሻሻለው',
  legal_privacy_title: 'የግላዊነት ፖሊሲ',
  legal_terms_title: 'የአገልግሎት ውሎች',

  nav_home: 'መነሻ',
  nav_menu: 'ሜኑ',
  nav_pharmacies: 'ፋርማሲዎች',
  nav_cart: 'ጋሪ',
  nav_account: 'መለያ',
  nav_sign_in: 'ግባ',
  menu_super_admin_dashboard: 'የሱፐር አድሚን ዳሽቦርድ',
  menu_admin_dashboard: 'የአድሚን ዳሽቦርድ',
  menu_pharmacies: 'ፋርማሲዎች',
  menu_add_pharmacy: 'ፋርማሲ ጨምር',
  menu_add_product: 'ምርት ጨምር',
  menu_upload_restricted: 'ፋርማሲና ምርት ማስገባት ለሱፐር አድሚንና የተመደቡ አድሚኖች ብቻ ነው።',
  deliver_to: 'ማድረሻ',
  set_in_cart: 'በጋሪ ውስጥ ያዘጋጁ',
  search_placeholder: 'መድኃኒት፣ ጤንነት ወይም ፋርማሲ ፈልግ',
  clear_search: 'ፍለጋ አጽዳ',

  hero_eyebrow: 'ታማኝ የአካባቢ ፋርማሲዎች',
  hero_title: 'የፋርማሲ እቃዎች፣ እስከ በርዎ።',
  hero_body: 'በአቅራቢያዎ ያሉ ፋርማሲዎችን ይመልከቱ፣ ምርቶችን ያነፃፅሩ እና በአዲስ አበባ አስተማማኝ ማድረስ ያግኙ።',
  browse_pharmacies: 'ፋርማሲዎችን ይመልከቱ',
  view_cart: 'ጋሪ ይመልከቱ',
  hero_fast: 'ፈጣን ማድረስ',
  hero_fast_from: 'ከአቅራቢያ ፋርማሲዎች',
  hero_eta: '20–40 ደቂቃ',
  hero_eta_avg: 'አማካይ መድረስ',
  hero_secure: 'ደህንነቱ የተጠበቀ',
  hero_secure_pay: 'የአካባቢ ክፍያ',
  status_fast: 'ፈጣን ማድረስ',
  status_on_way: 'Road Runner በመንገድ ላይ ነው',

  shop_by_need: 'በፍላጎት ይግዙ',
  product_categories: 'የምርት ምድቦች',
  categories_blurb: 'ከአቅራቢያ ፋርማሲዎች የዕለት ተዕለት ጤና እና እንክብካቤ እቃዎችን ያግኙ።',
  products_count: 'ምርቶች',
  limited_deals: 'ጊዜያዊ ቅናሾች',
  best_offers: 'ምርጥ ቅናሾች',
  shop_pharmacies: 'ፋርማሲ ይግዙ',
  deal: 'ቅናሽ',
  save_etb: '{n} ብር ቁጠብ',
  add_to_cart: 'ወደ ጋሪ ጨምር',

  all_pharmacies: 'ሁሉም ፋርማሲዎች',
  verified_pharmacy: 'የተረጋገጠ ፋርማሲ',
  reviews: 'ግምገማዎች',
  km_away: 'ኪ.ሜ ርቀት',
  available_products: 'ያሉ ምርቶች',
  items_count: 'እቃዎች',
  no_matching: 'ተመሳሳይ ምርት የለም',
  no_matching_hint: 'ሌላ ፍለጋ ወይም ምድብ ይሞክሩ።',
  clear_filters: 'ማጣሪያ አጽዳ',

  care_by_need: 'በፍላጎት እንክብካቤ',
  health_conditions: 'በጤና ሁኔታ ይግዙ',
  conditions_blurb: 'ለስኳር፣ የልብ ጤና፣ በሽታ መከላከል እና ሌሎች የተዘጋጁ ምርቶች።',
  showing_pharmacies_for: 'ለ {name} ፋርማሲዎች',

  promise_verified: 'የተረጋገጡ ፋርማሲዎች',
  promise_verified_sub: 'ታማኝ የአካባቢ አጋሮች',
  promise_fast: 'ፈጣን የአካባቢ ማድረስ',
  promise_fast_sub: 'የቀጥታ ትዕዛዝ ዝማኔ',
  promise_fees: 'ትክክለኛ የማድረስ ክፍያ',
  promise_fees_sub: 'በርቀትዎ ላይ የተመሠረተ',
  promise_checkout: 'ደህንነቱ የተጠበቀ ክፍያ',
  promise_checkout_sub: 'የአካባቢ ክፍያ አማራጮች',

  footer_blurb: 'ከታማኝ የአካባቢ ፋርማሲዎች የዕለት ተዕለት እቃዎች፣ በአዲስ አበባ።',
  help_center: 'የእገዛ ማእከል',
  partner_pharmacies: 'አጋር ፋርማሲዎች',
  delivery_areas: 'የማድረስ አካባቢዎች',
  privacy: 'ግላዊነት',
  terms: 'ውሎች',
  footer_small: 'Road Runner Pharmacy Delivery — የደንበኛ ፕሮቶታይፕ',

  pharmacies_kicker: 'አጋር ፋርማሲዎች',
  pharmacies_title: 'ፋርማሲዎችን ይመልከቱ',
  pharmacies_intro: 'አጋር ፋርማሲዎች ከ Road Runner Supabase ይጫናሉ።',
  close_pharmacies: 'ፋርማሲዎችን ዝጋ',
  open_store: 'መደብር ክፈት',

  cart_kicker: 'ትዕዛዝዎ',
  cart_title: 'የግዢ ጋሪ',
  close_cart: 'ጋሪ ዝጋ',
  ordering_from: 'እየገዙ ከ',
  delivery_location: 'የማድረስ አድራሻ',
  delivery_unset: 'ገና አልተቀመጠም',
  set_location: 'አድራሻ ያዘጋጁ',
  change_location: 'ቀይር',
  items_subtotal: 'የእቃዎች ድምር',
  delivery: 'ማድረስ',
  service_fee: 'የአገልግሎት ክፍያ',
  total: 'ድምር',
  continue_checkout: 'ወደ ክፍያ ቀጥል',
  cart_note: 'ክምችት እና የመጨረሻ ዋጋ ከፋርማሲው ከመክፈል በፊት ይረጋገጣል።',
  cart_empty_title: 'ጋሪዎ ባዶ ነው',
  cart_empty_body: 'ትዕዛዝ ለመጀመር ከፋርማሲ ምርቶችን ያክሉ።',
  start_shopping: 'ግዢ ጀምር',
  set_delivery_to_continue: 'ለመቀጠል የማድረስ አድራሻ ያዘጋጁ',
  sign_in_to_pay: 'ለክፍያ ለመቀጠል ይግቡ',
  delivery_set_to: 'ማድረሻ ወደ {label} ተቀምጧል',
  signed_in_ok: 'በተሳካ ሁኔታ ገብተዋል',

  pay_choose: 'ክፍያ ይምረጡ',
  pay_total: 'ድምር: {n} ብር',
  pay_coming_soon_note: 'የ Road Runner የክፍያ ውሎች እስኪጀምሩ ድረስ ሁሉም Coming Soon ናቸው።',
  coming_soon: 'በቅርብ',
  coming_soon_body: 'ይህ የክፍያ አማራጭ ({name}) በቅርብ ይገኛል።',
  ok: 'እሺ',

  loc_title: 'የማድረስ አድራሻ ያዘጋጁ',
  loc_gps_title: 'አሁን ያለውን አድራሻ ያረጋግጡ',
  loc_pin_title: 'ፒን ያስቀምጡ',
  loc_gps_hint: 'GPS እንጠቀማለን፣ ከዚያ በካርታ ላይ ያረጋግጡ።',
  loc_pin_hint: 'ካርታውን ይንኩ ወይም ፒኑን ወደ ማድረሻ ይጎትቱ።',
  loc_confirm: 'የማድረስ አድራሻ አረጋግጥ',
  loc_saving: 'በማስቀመጥ ላይ…',
  loc_loading_map: 'ካርታ በመጫን ላይ…',
  loc_waiting_gps: 'GPS በመጠባበቅ ላይ…',
  loc_map_unavailable: 'ካርታ አይገኝም — የ Maps ቁልፍን ያረጋግጡ።',
  loc_selected: 'የተመረጠ አድራሻ',
  loc_geo_unsupported: 'በዚህ መሣሪያ ላይ አካባቢ አይደገፍም።',
  loc_permission: 'የአካባቢ ፍቃድ ተከልክሏል። ፍቀዱ ወይም በካርታ ላይ ፒን ይምረጡ።',
  loc_gps_fail: 'አሁን ያለውን አድራሻ ማንበብ አልተቻለም። በካርታ ላይ ፒን ይሞክሩ።',
}

const fr: Dict = {
  ...en,
  account_title: 'Compte',
  account_kicker: 'Votre profil',
  account_name: 'Nom',
  account_phone: 'Téléphone',
  account_phone_not_set: 'Non défini',
  account_preferences: 'Préférences',
  account_language: 'Langue',
  account_language_hint: 'Choisissez la langue Road Runner sur cet appareil.',
  account_legal: 'Mentions légales',
  account_privacy: 'Politique de confidentialité',
  account_privacy_desc: 'Comment nous collectons et utilisons vos informations',
  account_terms: "Conditions d'utilisation",
  account_terms_desc: "Règles d'utilisation de Road Runner",
  account_support: 'Assistance',
  account_support_desc: 'Contactez le support Road Runner pour votre compte.',
  account_sign_out: 'Se déconnecter',
  account_back: 'Retour',
  account_close: 'Fermer',
  legal_updated: 'Dernière mise à jour',
  legal_privacy_title: 'Politique de confidentialité',
  legal_terms_title: "Conditions d'utilisation",

  nav_home: 'Accueil',
  nav_menu: 'Menu',
  nav_pharmacies: 'Pharmacies',
  nav_cart: 'Panier',
  nav_account: 'Compte',
  nav_sign_in: 'Connexion',
  menu_super_admin_dashboard: 'Tableau Super Admin',
  menu_admin_dashboard: 'Tableau Admin',
  menu_add_pharmacy: 'Ajouter pharmacie',
  menu_add_product: 'Ajouter produit',
  deliver_to: 'Livrer à',
  set_in_cart: 'Définir dans le panier',
  search_placeholder: 'Rechercher médicaments, bien-être ou pharmacies',
  clear_search: 'Effacer la recherche',

  hero_eyebrow: 'Pharmacies locales de confiance',
  hero_title: 'Essentiels de pharmacie, livrés chez vous.',
  hero_body:
    'Parcourez les pharmacies près de chez vous, comparez les produits et recevez une livraison fiable à Addis-Abeba.',
  browse_pharmacies: 'Voir les pharmacies',
  view_cart: 'Voir le panier',
  hero_fast: 'Livraison rapide',
  hero_fast_from: 'depuis les pharmacies proches',
  hero_eta: '20–40 min',
  hero_eta_avg: "d'arrivée en moyenne",
  hero_secure: 'Sécurisé',
  hero_secure_pay: 'paiements locaux',
  status_fast: 'Livraison rapide',
  status_on_way: 'Road Runner est en route',

  shop_by_need: 'Acheter par besoin',
  product_categories: 'Catégories de produits',
  categories_blurb: 'Trouvez des essentiels santé et bien-être près de chez vous.',
  products_count: 'produits',
  limited_deals: 'Offres limitées',
  best_offers: 'Meilleures offres',
  shop_pharmacies: 'Voir pharmacies',
  deal: 'Offre',
  save_etb: 'Économisez {n} ETB',
  add_to_cart: 'Ajouter au panier',

  all_pharmacies: 'Toutes les pharmacies',
  verified_pharmacy: 'Pharmacie vérifiée',
  reviews: 'avis',
  km_away: 'km',
  available_products: 'Produits disponibles',
  items_count: 'articles',
  no_matching: 'Aucun produit correspondant',
  no_matching_hint: 'Essayez un autre terme ou une autre catégorie.',
  clear_filters: 'Effacer les filtres',

  care_by_need: 'Soins par besoin',
  health_conditions: 'Acheter par condition de santé',
  conditions_blurb: 'Produits pour diabète, cœur, immunité et plus.',
  showing_pharmacies_for: 'Pharmacies pour {name}',

  promise_verified: 'Pharmacies vérifiées',
  promise_verified_sub: 'Partenaires locaux de confiance',
  promise_fast: 'Livraison locale rapide',
  promise_fast_sub: 'Suivi en direct',
  promise_fees: 'Frais de livraison précis',
  promise_fees_sub: 'Selon votre distance',
  promise_checkout: 'Paiement sécurisé',
  promise_checkout_sub: 'Options de paiement locales',

  footer_blurb: 'Essentiels de pharmacie de partenaires locaux, livrés à Addis-Abeba.',
  help_center: "Centre d'aide",
  partner_pharmacies: 'Pharmacies partenaires',
  delivery_areas: 'Zones de livraison',
  privacy: 'Confidentialité',
  terms: 'Conditions',
  footer_small: 'Road Runner Pharmacy Delivery — Prototype client',

  pharmacies_kicker: 'Pharmacies partenaires',
  pharmacies_title: 'Parcourir les pharmacies',
  pharmacies_intro: 'Pharmacies chargées depuis Supabase Road Runner.',
  close_pharmacies: 'Fermer les pharmacies',
  open_store: 'Ouvrir la boutique',

  cart_kicker: 'Votre commande',
  cart_title: 'Panier',
  close_cart: 'Fermer le panier',
  ordering_from: 'Commande chez',
  delivery_location: 'Adresse de livraison',
  delivery_unset: 'Pas encore définie',
  set_location: "Définir l'adresse",
  change_location: 'Modifier',
  items_subtotal: 'Sous-total',
  delivery: 'Livraison',
  service_fee: 'Frais de service',
  total: 'Total',
  continue_checkout: 'Continuer vers le paiement',
  cart_note: 'Le stock et le prix final sont confirmés par la pharmacie avant paiement.',
  cart_empty_title: 'Votre panier est vide',
  cart_empty_body: "Ajoutez des produits d'une pharmacie pour commencer.",
  start_shopping: 'Commencer',
  set_delivery_to_continue: 'Définissez une adresse de livraison pour continuer',
  sign_in_to_pay: 'Connectez-vous pour payer',
  delivery_set_to: 'Livraison définie : {label}',
  signed_in_ok: 'Connexion réussie',

  pay_choose: 'Choisir le paiement',
  pay_total: 'Total : {n} ETB',
  pay_coming_soon_note:
    'Toutes les méthodes affichent Coming Soon jusqu’aux contrats de paiement Road Runner.',
  coming_soon: 'Bientôt',
  coming_soon_body: 'Cette option ({name}) sera bientôt disponible.',
  ok: 'OK',

  loc_title: 'Définir la livraison',
  loc_gps_title: 'Confirmer la position actuelle',
  loc_pin_title: 'Placer l’épingle',
  loc_gps_hint: 'Nous utilisons le GPS, puis vous confirmez sur la carte.',
  loc_pin_hint: 'Touchez la carte ou faites glisser l’épingle.',
  loc_confirm: 'Confirmer l’adresse de livraison',
  loc_saving: 'Enregistrement…',
  loc_loading_map: 'Chargement de la carte…',
  loc_waiting_gps: 'En attente du GPS…',
  loc_map_unavailable: 'Carte indisponible — vérifiez la clé Maps.',
  loc_selected: 'Emplacement sélectionné',
  loc_geo_unsupported: 'La géolocalisation n’est pas prise en charge.',
  loc_permission: 'Permission refusée. Autorisez la localisation ou choisissez une épingle.',
  loc_gps_fail: 'Impossible de lire la position. Essayez une épingle sur la carte.',
}

const om: Dict = {
  ...en,
  account_title: 'Akaawuntii',
  account_kicker: 'Profaayilii kee',
  account_name: 'Maqaa',
  account_phone: 'Bilbila',
  account_phone_not_set: 'Hin qophaa’inne',
  account_preferences: 'Filannoo',
  account_language: 'Afaan',
  account_language_hint: 'Meeshaa kana irratti afaan Road Runner filadhu.',
  account_legal: 'Seeraa',
  account_privacy: 'Imaammata Dhuunfaa',
  account_privacy_desc: 'Odeeffannoo kee akkamitti akka walitti qabnu',
  account_terms: 'Haala Tajaajilaa',
  account_terms_desc: 'Road Runner itti fayyadamuuf seera',
  account_support: 'Deeggarsa',
  account_support_desc: 'Gargaarsa akaawuntii keetiif deeggarsa qunnami.',
  account_sign_out: 'Ba’i',
  account_back: 'Deebi’i',
  account_close: 'Cufi',
  legal_updated: 'Yeroo dhumaa fooyya’e',
  legal_privacy_title: 'Imaammata Dhuunfaa',
  legal_terms_title: 'Haala Tajaajilaa',

  nav_home: 'Mana',
  nav_menu: 'Menu',
  nav_pharmacies: 'Farmashiiwwan',
  nav_cart: 'Gaarii',
  nav_account: 'Akaawuntii',
  nav_sign_in: 'Seeni',
  menu_super_admin_dashboard: 'Daashboordii Super Admin',
  menu_admin_dashboard: 'Daashboordii Admin',
  menu_add_pharmacy: 'Farmashii dabali',
  menu_add_product: 'Oomisha dabali',
  deliver_to: 'Gahi',
  set_in_cart: 'Gaarii keessatti mijeessi',
  search_placeholder: 'Qoricha, fayyaa ykn farmashii barbaadi',
  clear_search: 'Barbaacha haqi',

  hero_eyebrow: 'Farmashiiwwan naannoo amanamoo',
  hero_title: 'Meeshaalee farmashii, hanga balbala keetti.',
  hero_body: 'Farmashiiwwan dhihoo ilaali, oomishaalee wal bira qabi, Finfinnee keessatti geejjiba amanamaa argadhu.',
  browse_pharmacies: 'Farmashiiwwan ilaali',
  view_cart: 'Gaarii ilaali',
  hero_fast: 'Geejjiba saffisaa',
  hero_fast_from: 'farmashiiwwan dhihoo irraa',
  hero_eta: 'daqiiqaa 20–40',
  hero_eta_avg: 'giddu galeessaan',
  hero_secure: 'Nageenya qabu',
  hero_secure_pay: 'kaffaltii naannoo',
  status_fast: 'Geejjiba saffisaa',
  status_on_way: 'Road Runner karaa irratti jira',

  shop_by_need: 'Fedhii irratti bitadhu',
  product_categories: 'Ramaddii oomishaa',
  categories_blurb: 'Meeshaalee fayyaa fi kunuunsaa guyyaa guyyaa argadhu.',
  products_count: 'oomishaalee',
  limited_deals: 'Gatii yeroo murtaa’e',
  best_offers: 'Gatiiwwan gaarii',
  shop_pharmacies: 'Farmashii bitadhu',
  deal: 'Gatii',
  save_etb: '{n} ETB qusadhu',
  add_to_cart: 'Gaariiitti dabali',

  all_pharmacies: 'Farmashiiwwan hunda',
  verified_pharmacy: 'Farmashii mirkanaa’e',
  reviews: 'yaada',
  km_away: 'km fagaataa',
  available_products: 'Oomishaalee jiran',
  items_count: 'meeshaalee',
  no_matching: 'Oomishan wal fakkaatu hin jiru',
  no_matching_hint: 'Jecha ykn ramaddii biroo yaali.',
  clear_filters: 'Calaluu haqi',

  care_by_need: 'Kunuunsa fedhiin',
  health_conditions: 'Haala fayyaa irratti bitadhu',
  conditions_blurb: 'Sukkaara, onnee, dhukkuba ittisaafi kanneen biroo.',
  showing_pharmacies_for: 'Farmashiiwwan {name} tiif',

  promise_verified: 'Farmashiiwwan mirkanaa’an',
  promise_verified_sub: 'Michuuwwan naannoo amanamoo',
  promise_fast: 'Geejjiba naannoo saffisaa',
  promise_fast_sub: 'Odeeffannoo ajajaa kallattiin',
  promise_fees: 'Kaffaltii geejjibaa sirrii',
  promise_fees_sub: 'Fageenya kee irratti hundaa’e',
  promise_checkout: 'Kaffaltii nageenya qabu',
  promise_checkout_sub: 'Filannoo kaffaltii naannoo',

  footer_blurb: 'Meeshaalee farmashii michuuwwan naannoo irraa, Finfinnee keessatti.',
  help_center: 'Giddugala gargaarsaa',
  partner_pharmacies: 'Farmashiiwwan michuu',
  delivery_areas: 'Naannoo geejjibaa',
  privacy: 'Dhuunfaa',
  terms: 'Haalawwan',
  footer_small: 'Road Runner Pharmacy Delivery — Protootaayipii maamilaa',

  pharmacies_kicker: 'Farmashiiwwan michuu',
  pharmacies_title: 'Farmashiiwwan ilaali',
  pharmacies_intro: 'Farmashiiwwan Supabase Road Runner irraa fe’amu.',
  close_pharmacies: 'Farmashiiwwan cufi',
  open_store: 'Suuqii bani',

  cart_kicker: 'Ajaja kee',
  cart_title: 'Gaarii bittaa',
  close_cart: 'Gaarii cufi',
  ordering_from: 'Kan ajajamu',
  delivery_location: 'Iddoo geejjibaa',
  delivery_unset: 'Ammatti hin qophaa’inne',
  set_location: 'Iddoo mijeessi',
  change_location: 'Jijjiiri',
  items_subtotal: 'Walitti qabama meeshaalee',
  delivery: 'Geejjiba',
  service_fee: 'Kaffaltii tajaajilaa',
  total: 'Ida’ama',
  continue_checkout: 'Gara kaffaltii itti fufi',
  cart_note: 'Kuusaa fi gatii xumuraa farmashiiin kaffaltii dura mirkanaa’a.',
  cart_empty_title: 'Gaariin kee duwwaa dha',
  cart_empty_body: 'Ajaja jalqabuuf oomishaalee farmashii irraa dabali.',
  start_shopping: 'Bittaa jalqabi',
  set_delivery_to_continue: 'Itti fufuuf iddoo geejjibaa mijeessi',
  sign_in_to_pay: 'Kaffaluuf seeni',
  delivery_set_to: 'Geejjibni gara {label}tti qophaa’e',
  signed_in_ok: 'Milkaa’inaan seente',

  pay_choose: 'Kaffaltii filadhu',
  pay_total: 'Ida’ama: {n} ETB',
  pay_coming_soon_note: 'Waliigaltee kaffaltii Road Runner hanga jalqabuutti Coming Soon.',
  coming_soon: 'Dhiyootti',
  coming_soon_body: 'Filannoon kaffaltii kun ({name}) dhiyootti ni argama.',
  ok: 'Tole',

  loc_title: 'Iddoo geejjibaa mijeessi',
  loc_gps_title: 'Iddoo ammaa mirkaneessi',
  loc_pin_title: 'Pin kaa’i',
  loc_gps_hint: 'GPS fayyadamna, sana booda kaartaa irratti mirkaneessi.',
  loc_pin_hint: 'Kaartaa tuqi ykn pin harkisii.',
  loc_confirm: 'Iddoo geejjibaa mirkaneessi',
  loc_saving: 'Olkaa’aa jira…',
  loc_loading_map: 'Kaartaa fe’aa jira…',
  loc_waiting_gps: 'GPS eegaa jira…',
  loc_map_unavailable: 'Kaartaan hin argamu — furtuu Maps ilaali.',
  loc_selected: 'Iddoo filatame',
  loc_geo_unsupported: 'Meeshaa kana irratti iddoo hin deeggaramu.',
  loc_permission: 'Hayyama iddoo didame. Hayyami ykn pin filadhu.',
  loc_gps_fail: 'Iddoo ammaa dubbisuu hin dandeenye. Pin yaali.',
}

const translations: Record<Language, Dict> = { en, am, fr, om }

function isLanguage(value: string | null | undefined): value is Language {
  return value === 'en' || value === 'am' || value === 'fr' || value === 'om'
}

type LanguageContextType = {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string, vars?: Record<string, string | number>) => string
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (isLanguage(stored)) return stored
    } catch {
      // ignore
    }
    return 'en'
  })

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, language)
    } catch {
      // ignore
    }
    document.documentElement.lang = language === 'am' ? 'am' : language === 'om' ? 'om' : language
  }, [language])

  const setLanguage = (lang: Language) => setLanguageState(lang)

  const t = (key: string, vars?: Record<string, string | number>) => {
    let text = translations[language][key] ?? translations.en[key] ?? key
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v))
      }
    }
    return text
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage(): LanguageContextType {
  const ctx = useContext(LanguageContext)
  if (!ctx) {
    return {
      language: 'en',
      setLanguage: () => {},
      t: (key, vars) => {
        let text = translations.en[key] ?? key
        if (vars) {
          for (const [k, v] of Object.entries(vars)) {
            text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v))
          }
        }
        return text
      },
    }
  }
  return ctx
}
