import { hasSupabaseConfig, supabase } from './supabaseClient'

export type Category = {
  id: string
  name: string
  icon: string
}

export type Pharmacy = {
  id: string
  name: string
  phone: string
  area: string
  rating: number
  reviews: number
  eta: string
  distance: number
  lat: number
  lng: number
  openUntil: string
  image: string
  accent: string
}

export type Product = {
  id: string
  pharmacyId: string
  name: string
  category: string
  description: string
  price: number
  oldPrice?: number
  unit: string
  image: string
  badge?: string
}

export type CatalogData = {
  categories: Category[]
  pharmacies: Pharmacy[]
  products: Product[]
  source: 'supabase' | 'demo'
}

/** UI always prepends this; DB does not store "all". */
export const ALL_CATEGORY: Category = {
  id: 'all',
  name: 'All products',
  icon: 'categories/all-products.jpg',
}

export const DEMO_CATEGORIES: Category[] = [
  ALL_CATEGORY,
  { id: 'medicines', name: 'OTC Medicines', icon: 'categories/otc.jpg' },
  { id: 'vitamins', name: 'Vitamins', icon: 'categories/vitamins.jpg' },
  { id: 'personal-care', name: 'Personal Care', icon: 'categories/personal-care.jpg' },
  { id: 'baby-care', name: 'Baby Care', icon: 'categories/baby-care.jpg' },
  { id: 'first-aid', name: 'First Aid', icon: 'categories/first-aid.jpg' },
  { id: 'wellness', name: 'Wellness', icon: 'categories/wellness.jpg' },
]

export const DEMO_PHARMACIES: Pharmacy[] = [
  {
    id: 'zelalem-3',
    name: 'Zelalem Pharmacy no.3',
    phone: '091 293 8334',
    area: 'Addis Ababa',
    rating: 4.9,
    reviews: 142,
    eta: '20–30 min',
    distance: 2.1,
    lat: 9.005,
    lng: 38.78,
    openUntil: 'Open 24 hours',
    image: 'pharmacies/zelalem-pharmacy-no-3.jpg',
    accent: 'teal',
  },
  {
    id: 'moringa-1',
    name: 'MORINGA PHARMACY No_1',
    phone: '099 351 8921',
    area: 'Bole · Mike Leyland St',
    rating: 4.8,
    reviews: 118,
    eta: '25–35 min',
    distance: 3.4,
    lat: 9.0076506,
    lng: 38.7811135,
    openUntil: 'Open until 11:00 PM',
    image: 'pharmacies/moringa-pharmacy-no-1.jpg',
    accent: 'blue',
  },
  {
    id: 'super-istyle',
    name: 'The Super Pharmacy by @iStyleAddis',
    phone: '090 285 7777',
    area: 'Bole · DH Geda Tower',
    rating: 4.9,
    reviews: 203,
    eta: '20–35 min',
    distance: 2.8,
    lat: 8.9896013,
    lng: 38.7863868,
    openUntil: 'Open until 10:30 PM',
    image: 'pharmacies/super-pharmacy-istyleaddis.jpg',
    accent: 'orange',
  },
  {
    id: 'gishen-8',
    name: 'Gishen pharmacy No 8',
    phone: '093 003 3292',
    area: 'Lideta · Ambassador',
    rating: 4.7,
    reviews: 97,
    eta: '30–40 min',
    distance: 4.6,
    lat: 9.0178112,
    lng: 38.7544350,
    openUntil: 'Open until 10:00 PM',
    image: 'pharmacies/gishen-pharmacy-no-8.jpg',
    accent: 'teal',
  },
]

const DEMO_PRODUCT_TEMPLATES: Omit<Product, 'id' | 'pharmacyId'>[] = [
  {
    name: 'Paracetamol 500mg',
    category: 'medicines',
    description: 'Pain and fever relief tablets for everyday use',
    price: 85,
    unit: '20 tablets',
    image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=600&q=80',
    badge: 'Popular',
  },
  {
    name: 'Ibuprofen 400mg',
    category: 'medicines',
    description: 'Anti-inflammatory tablets for muscle and joint pain',
    price: 120,
    unit: '24 tablets',
    image: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?auto=format&fit=crop&w=600&q=80',
  },
  {
    name: 'Vitamin C 1000mg',
    category: 'vitamins',
    description: 'Daily immune support with high-strength vitamin C',
    price: 420,
    oldPrice: 480,
    unit: '30 tablets',
    image: 'https://images.unsplash.com/photo-1631549916768-4119b2e5f926?auto=format&fit=crop&w=600&q=80',
    badge: 'Save 13%',
  },
  {
    name: 'Multivitamin Complex',
    category: 'vitamins',
    description: 'Complete daily multivitamin for adults',
    price: 650,
    unit: '60 tablets',
    image: 'https://images.unsplash.com/photo-1577401239170-897942555fb3?auto=format&fit=crop&w=600&q=80',
  },
  {
    name: 'Daily SPF 50 Sunscreen',
    category: 'personal-care',
    description: 'Broad-spectrum face and body sun protection',
    price: 780,
    unit: '50 ml',
    image: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?auto=format&fit=crop&w=600&q=80',
  },
  {
    name: 'Hand Sanitizer',
    category: 'personal-care',
    description: '70% alcohol hand cleanser for on-the-go use',
    price: 165,
    unit: '250 ml',
    image: 'https://images.unsplash.com/photo-1584483766114-2cea6facdf57?auto=format&fit=crop&w=600&q=80',
  },
  {
    name: 'Gentle Baby Lotion',
    category: 'baby-care',
    description: 'Sensitive-skin daily moisture for infants',
    price: 560,
    unit: '300 ml',
    image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=600&q=80',
  },
  {
    name: 'Baby Diaper Cream',
    category: 'baby-care',
    description: 'Protective cream for sensitive baby skin',
    price: 390,
    unit: '100 g',
    image: 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?auto=format&fit=crop&w=600&q=80',
  },
  {
    name: 'Home First Aid Kit',
    category: 'first-aid',
    description: 'Essential 42-piece kit for home and travel',
    price: 1250,
    unit: '1 kit',
    image: 'https://images.unsplash.com/photo-1603398938378-e54eab446dde?auto=format&fit=crop&w=600&q=80',
    badge: 'Family essential',
  },
  {
    name: 'Adhesive Bandages Pack',
    category: 'first-aid',
    description: 'Assorted sterile plasters for minor cuts',
    price: 95,
    unit: '40 pieces',
    image: 'https://images.unsplash.com/photo-1600959907703-125ba1374a12?auto=format&fit=crop&w=600&q=80',
  },
  {
    name: 'Digital Thermometer',
    category: 'wellness',
    description: 'Fast and accurate temperature reading',
    price: 690,
    unit: '1 device',
    image: 'https://images.unsplash.com/photo-1695048441386-0d6c4043d8c7?auto=format&fit=crop&w=600&q=80',
    badge: 'Recommended',
  },
  {
    name: 'Blood Pressure Monitor',
    category: 'wellness',
    description: 'Home arm cuff monitor with large display',
    price: 2450,
    unit: '1 device',
    image: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&w=600&q=80',
  },
]

export const DEMO_PRODUCTS: Product[] = DEMO_PHARMACIES.flatMap((pharmacy) =>
  DEMO_PRODUCT_TEMPLATES.map((template, index) => ({
    ...template,
    id: `${pharmacy.id}-${index + 1}`,
    pharmacyId: pharmacy.id,
  })),
)

export function getDemoCatalog(): CatalogData {
  return {
    categories: DEMO_CATEGORIES,
    pharmacies: DEMO_PHARMACIES,
    products: DEMO_PRODUCTS,
    source: 'demo',
  }
}

export async function loadCatalog(): Promise<CatalogData> {
  const demo = getDemoCatalog()
  if (!hasSupabaseConfig || !supabase) return demo

  try {
    const [catRes, pharmRes, prodRes] = await Promise.all([
      supabase
        .from('product_categories')
        .select('id, name, icon_path, sort_order')
        .eq('is_active', true)
        .order('sort_order', { ascending: true }),
      supabase
        .from('pharmacies')
        .select(
          'id, name, phone, area, rating, reviews, eta, distance_km, lat, lng, open_until, image_path, accent',
        )
        .eq('is_active', true)
        .order('name', { ascending: true }),
      supabase
        .from('products')
        .select(
          'id, pharmacy_id, category_id, name, description, price_etb, old_price_etb, unit, image_url, badge',
        )
        .eq('is_active', true),
    ])

    if (catRes.error || pharmRes.error || prodRes.error) {
      console.warn('Catalog load errors:', catRes.error, pharmRes.error, prodRes.error)
      return demo
    }

    const pharmacies: Pharmacy[] = (pharmRes.data ?? []).map((row) => ({
      id: row.id as string,
      name: row.name as string,
      phone: (row.phone as string) || '',
      area: (row.area as string) || '',
      rating: Number(row.rating) || 0,
      reviews: Number(row.reviews) || 0,
      eta: (row.eta as string) || '',
      distance: Number(row.distance_km) || 0,
      lat: Number(row.lat),
      lng: Number(row.lng),
      openUntil: (row.open_until as string) || '',
      image: (row.image_path as string) || '',
      accent: (row.accent as string) || 'teal',
    }))

    if (pharmacies.length === 0) return demo

    const dbCategories: Category[] = (catRes.data ?? []).map((row) => ({
      id: row.id as string,
      name: row.name as string,
      icon: (row.icon_path as string) || '',
    }))

    const categories: Category[] = [
      ALL_CATEGORY,
      ...dbCategories.filter((c) => c.id !== 'all'),
    ]

    const products: Product[] = (prodRes.data ?? []).map((row) => ({
      id: row.id as string,
      pharmacyId: row.pharmacy_id as string,
      name: row.name as string,
      category: row.category_id as string,
      description: (row.description as string) || '',
      price: Number(row.price_etb) || 0,
      oldPrice: row.old_price_etb != null ? Number(row.old_price_etb) : undefined,
      unit: (row.unit as string) || '',
      image: (row.image_url as string) || '',
      badge: (row.badge as string) || undefined,
    }))

    return {
      categories: categories.length > 1 ? categories : demo.categories,
      pharmacies,
      products: products.length > 0 ? products : demo.products,
      source: 'supabase',
    }
  } catch (error) {
    console.warn('Catalog load failed, using demo data:', error)
    return demo
  }
}
