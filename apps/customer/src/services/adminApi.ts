import { hasSupabaseConfig, supabase } from './supabaseClient'
import type { Pharmacy, Product } from './catalog'
import {
  PHARMACY_BANNER_ACCEPT,
  PHARMACY_BANNER_BUCKET,
  PHARMACY_BANNER_MAX_BYTES,
} from '../lib/media'

export type AdminStats = {
  usersCount: number
  pharmaciesCount: number
  productsCount: number
  adminsCount: number
}

export type CashboxRow = {
  gatewayKey: string
  label: string
  balanceEtb: number
}

export type AccountingRow = {
  id: string
  entryType: string
  gatewayKey: string | null
  amountEtb: number
  description: string
  createdAt: string
}

export type MemberRow = {
  id: string
  phone: string | null
  email: string | null
  firstName: string | null
  lastName: string | null
  fullName: string | null
  role: string
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48)
}

export async function fetchAdminStats(): Promise<AdminStats> {
  const empty: AdminStats = { usersCount: 0, pharmaciesCount: 0, productsCount: 0, adminsCount: 0 }
  if (!hasSupabaseConfig || !supabase) return empty

  const [users, pharmacies, products, admins] = await Promise.all([
    supabase.from('users').select('id', { count: 'exact', head: true }),
    supabase.from('pharmacies').select('id', { count: 'exact', head: true }),
    supabase.from('products').select('id', { count: 'exact', head: true }),
    supabase.from('users').select('id', { count: 'exact', head: true }).in('role', ['admin', 'super_admin']),
  ])

  return {
    usersCount: users.count ?? 0,
    pharmaciesCount: pharmacies.count ?? 0,
    productsCount: products.count ?? 0,
    adminsCount: admins.count ?? 0,
  }
}

export async function fetchCashbox(): Promise<CashboxRow[]> {
  if (!hasSupabaseConfig || !supabase) return []
  const { data, error } = await supabase
    .from('platform_cashbox')
    .select('gateway_key, label, balance_etb')
    .order('label')
  if (error || !data) return []
  return data.map((row) => ({
    gatewayKey: String(row.gateway_key),
    label: String(row.label),
    balanceEtb: Number(row.balance_etb) || 0,
  }))
}

export async function updateCashboxBalance(gatewayKey: string, balanceEtb: number, userId: string) {
  if (!supabase) throw new Error('Supabase is not configured')
  const { error } = await supabase
    .from('platform_cashbox')
    .update({
      balance_etb: balanceEtb,
      updated_at: new Date().toISOString(),
      updated_by: userId,
    })
    .eq('gateway_key', gatewayKey)
  if (error) throw error
}

export async function fetchAccounting(limit = 40): Promise<AccountingRow[]> {
  if (!hasSupabaseConfig || !supabase) return []
  const { data, error } = await supabase
    .from('accounting_records')
    .select('id, entry_type, gateway_key, amount_etb, description, created_at')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error || !data) return []
  return data.map((row) => ({
    id: String(row.id),
    entryType: String(row.entry_type),
    gatewayKey: row.gateway_key ? String(row.gateway_key) : null,
    amountEtb: Number(row.amount_etb) || 0,
    description: String(row.description || ''),
    createdAt: String(row.created_at),
  }))
}

export async function addAccountingEntry(input: {
  entryType: 'income' | 'expense' | 'adjustment' | 'withdrawal' | 'gateway_payment' | 'service_fee' | 'wht'
  gatewayKey?: string
  amountEtb: number
  description: string
  userId: string
}) {
  if (!supabase) throw new Error('Supabase is not configured')
  const { error } = await supabase.from('accounting_records').insert({
    entry_type: input.entryType,
    gateway_key: input.gatewayKey || null,
    amount_etb: input.amountEtb,
    description: input.description,
    created_by: input.userId,
  })
  if (error) throw error
}

export async function fetchMembers(): Promise<MemberRow[]> {
  if (!hasSupabaseConfig || !supabase) return []
  const { data, error } = await supabase
    .from('users')
    .select('id, phone, email, first_name, last_name, full_name, role')
    .order('created_at', { ascending: false })
    .limit(200)
  if (error || !data) return []
  return data.map((row) => ({
    id: String(row.id),
    phone: row.phone ? String(row.phone) : null,
    email: row.email ? String(row.email) : null,
    firstName: row.first_name ? String(row.first_name) : null,
    lastName: row.last_name ? String(row.last_name) : null,
    fullName: row.full_name ? String(row.full_name) : null,
    role: String(row.role || 'customer'),
  }))
}

export async function setMemberRole(userId: string, role: 'customer' | 'admin' | 'super_admin' | 'pharmacy_staff') {
  if (!supabase) throw new Error('Supabase is not configured')
  const { error } = await supabase.from('users').update({ role, updated_at: new Date().toISOString() }).eq('id', userId)
  if (error) throw error
}

export async function uploadPharmacyBanner(file: File, pharmacyIdHint: string): Promise<string> {
  if (!supabase) throw new Error('Supabase is not configured')
  if (file.size > PHARMACY_BANNER_MAX_BYTES) {
    throw new Error(`Banner must be under ${Math.round(PHARMACY_BANNER_MAX_BYTES / (1024 * 1024))} MB`)
  }
  const allowed = PHARMACY_BANNER_ACCEPT.split(',').map((s) => s.trim())
  if (file.type && !allowed.includes(file.type) && !file.type.startsWith('image/')) {
    throw new Error('Use JPEG, PNG, or WebP for the pharmacy banner')
  }
  const ext =
    file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') ||
    (file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg')
  const path = `${slugify(pharmacyIdHint) || 'pharmacy'}-${Date.now().toString(36)}.${ext}`
  const { error } = await supabase.storage.from(PHARMACY_BANNER_BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type || 'image/jpeg',
  })
  if (error) throw error
  const { data } = supabase.storage.from(PHARMACY_BANNER_BUCKET).getPublicUrl(path)
  if (!data?.publicUrl) throw new Error('Could not get banner public URL')
  return data.publicUrl
}

export async function createPharmacy(input: {
  name: string
  phone: string
  area: string
  lat: number
  lng: number
  openUntil: string
  eta: string
  imagePath?: string
}): Promise<Pharmacy> {
  if (!supabase) throw new Error('Supabase is not configured')
  const id = `${slugify(input.name) || 'pharmacy'}-${Date.now().toString(36)}`
  const row = {
    id,
    name: input.name.trim(),
    phone: input.phone.trim(),
    area: input.area.trim() || 'Addis Ababa',
    rating: 5,
    reviews: 0,
    eta: input.eta.trim() || '25–40 min',
    distance_km: 0,
    lat: input.lat,
    lng: input.lng,
    open_until: input.openUntil.trim() || 'Open today',
    image_path: input.imagePath || 'pharmacies/placeholder.jpg',
    accent: 'teal',
    is_active: true,
  }
  const { error } = await supabase.from('pharmacies').insert(row)
  if (error) throw error
  return {
    id,
    name: row.name,
    phone: row.phone,
    area: row.area,
    rating: row.rating,
    reviews: row.reviews,
    eta: row.eta,
    distance: 0,
    lat: row.lat,
    lng: row.lng,
    openUntil: row.open_until,
    image: row.image_path,
    accent: row.accent,
  }
}

export async function createProduct(input: {
  pharmacyId: string
  categoryId: string
  name: string
  description: string
  priceEtb: number
  oldPriceEtb?: number
  unit: string
  imageUrl?: string
  badge?: string
}): Promise<Product> {
  if (!supabase) throw new Error('Supabase is not configured')
  const id = `${slugify(input.name) || 'product'}-${Date.now().toString(36)}`
  const row = {
    id,
    pharmacy_id: input.pharmacyId,
    category_id: input.categoryId,
    name: input.name.trim(),
    description: input.description.trim(),
    price_etb: input.priceEtb,
    old_price_etb: input.oldPriceEtb ?? null,
    unit: input.unit.trim() || 'each',
    image_url: input.imageUrl || '',
    badge: input.badge || null,
    is_active: true,
  }
  const { error } = await supabase.from('products').insert(row)
  if (error) throw error
  return {
    id,
    pharmacyId: row.pharmacy_id,
    name: row.name,
    category: row.category_id,
    description: row.description,
    price: Number(row.price_etb),
    oldPrice: row.old_price_etb != null ? Number(row.old_price_etb) : undefined,
    unit: row.unit,
    image: row.image_url || 'products/placeholder.jpg',
    badge: row.badge || undefined,
  }
}
