-- Road Runner core schema (empty RoadRunner Supabase project).
-- Catalog + customer profiles. Does not touch KelalGatewayProject.
-- Apply in Dashboard → SQL Editor, or via supabase db push when linked.

BEGIN;

-- ---------------------------------------------------------------------------
-- Customers (app profile; auth.users is the login identity)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  full_name TEXT,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'customer'
    CHECK (role IN ('customer', 'pharmacy_staff', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS users_phone_unique
  ON public.users (phone)
  WHERE phone IS NOT NULL AND length(trim(phone)) > 0;

CREATE INDEX IF NOT EXISTS users_phone_idx ON public.users (phone);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS users_select_own ON public.users;
CREATE POLICY users_select_own
  ON public.users FOR SELECT TO authenticated
  USING (id = auth.uid());

DROP POLICY IF EXISTS users_insert_own ON public.users;
CREATE POLICY users_insert_own
  ON public.users FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS users_update_own ON public.users;
CREATE POLICY users_update_own
  ON public.users FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Signup pre-check (works while logged out)
CREATE OR REPLACE FUNCTION public.is_phone_registered(p_phone TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_digits TEXT := regexp_replace(COALESCE(p_phone, ''), '\D', '', 'g');
  v_local TEXT;
BEGIN
  IF v_digits LIKE '251%' AND length(v_digits) = 12 THEN
    v_local := '0' || substr(v_digits, 4);
  ELSIF v_digits LIKE '0%' AND length(v_digits) = 10 THEN
    v_local := v_digits;
  ELSIF length(v_digits) = 9 THEN
    v_local := '0' || v_digits;
  ELSE
    v_local := v_digits;
  END IF;

  IF v_local IS NULL OR v_local = '' THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.phone IS NOT NULL
      AND regexp_replace(u.phone, '\D', '', 'g') IN (
        v_local,
        '251' || substr(v_local, 2),
        substr(v_local, 2)
      )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.is_phone_registered(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_phone_registered(TEXT) TO anon, authenticated;

COMMENT ON FUNCTION public.is_phone_registered(TEXT) IS
  'True if public.users already has this Ethiopian mobile. Safe for logged-out signup.';

-- ---------------------------------------------------------------------------
-- Product categories
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.product_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon_path TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS product_categories_public_read ON public.product_categories;
CREATE POLICY product_categories_public_read
  ON public.product_categories FOR SELECT TO anon, authenticated
  USING (is_active = TRUE);

-- ---------------------------------------------------------------------------
-- Pharmacies
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pharmacies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  area TEXT,
  rating NUMERIC(3, 2) NOT NULL DEFAULT 0,
  reviews INT NOT NULL DEFAULT 0,
  eta TEXT,
  distance_km NUMERIC(6, 2),
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  open_until TEXT,
  image_path TEXT,
  accent TEXT NOT NULL DEFAULT 'teal',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS pharmacies_active_idx
  ON public.pharmacies (is_active)
  WHERE is_active = TRUE;

ALTER TABLE public.pharmacies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pharmacies_public_read ON public.pharmacies;
CREATE POLICY pharmacies_public_read
  ON public.pharmacies FOR SELECT TO anon, authenticated
  USING (is_active = TRUE);

-- ---------------------------------------------------------------------------
-- Products (per pharmacy)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.products (
  id TEXT PRIMARY KEY,
  pharmacy_id TEXT NOT NULL REFERENCES public.pharmacies (id) ON DELETE CASCADE,
  category_id TEXT NOT NULL REFERENCES public.product_categories (id),
  name TEXT NOT NULL,
  description TEXT,
  price_etb NUMERIC(12, 2) NOT NULL CHECK (price_etb >= 0),
  old_price_etb NUMERIC(12, 2),
  unit TEXT,
  image_url TEXT,
  badge TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS products_pharmacy_idx ON public.products (pharmacy_id);
CREATE INDEX IF NOT EXISTS products_category_idx ON public.products (category_id);
CREATE INDEX IF NOT EXISTS products_active_idx
  ON public.products (is_active)
  WHERE is_active = TRUE;

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS products_public_read ON public.products;
CREATE POLICY products_public_read
  ON public.products FOR SELECT TO anon, authenticated
  USING (is_active = TRUE);

-- ---------------------------------------------------------------------------
-- Seed: categories (skip synthetic "all" — UI adds that)
-- ---------------------------------------------------------------------------
INSERT INTO public.product_categories (id, name, icon_path, sort_order) VALUES
  ('medicines', 'OTC Medicines', 'categories/otc.jpg', 10),
  ('vitamins', 'Vitamins', 'categories/vitamins.jpg', 20),
  ('personal-care', 'Personal Care', 'categories/personal-care.jpg', 30),
  ('baby-care', 'Baby Care', 'categories/baby-care.jpg', 40),
  ('first-aid', 'First Aid', 'categories/first-aid.jpg', 50),
  ('wellness', 'Wellness', 'categories/wellness.jpg', 60)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  icon_path = EXCLUDED.icon_path,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW();

-- ---------------------------------------------------------------------------
-- Seed: pharmacies (current demo pins)
-- ---------------------------------------------------------------------------
INSERT INTO public.pharmacies (
  id, name, phone, area, rating, reviews, eta, distance_km,
  lat, lng, open_until, image_path, accent
) VALUES
  (
    'zelalem-3',
    'Zelalem Pharmacy no.3',
    '091 293 8334',
    'Addis Ababa',
    4.9, 142, '20–30 min', 2.1,
    9.0050, 38.7800,
    'Open 24 hours',
    'pharmacies/zelalem-pharmacy-no-3.jpg',
    'teal'
  ),
  (
    'moringa-1',
    'MORINGA PHARMACY No_1',
    '099 351 8921',
    'Bole · Mike Leyland St',
    4.8, 118, '25–35 min', 3.4,
    9.0076506, 38.7811135,
    'Open until 11:00 PM',
    'pharmacies/moringa-pharmacy-no-1.jpg',
    'blue'
  ),
  (
    'super-istyle',
    'The Super Pharmacy by @iStyleAddis',
    '090 285 7777',
    'Bole · DH Geda Tower',
    4.9, 203, '20–35 min', 2.8,
    8.9896013, 38.7863868,
    'Open until 10:30 PM',
    'pharmacies/super-pharmacy-istyleaddis.jpg',
    'orange'
  ),
  (
    'gishen-8',
    'Gishen pharmacy No 8',
    '093 003 3292',
    'Lideta · Ambassador',
    4.7, 97, '30–40 min', 4.6,
    9.0178112, 38.7544350,
    'Open until 10:00 PM',
    'pharmacies/gishen-pharmacy-no-8.jpg',
    'teal'
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  phone = EXCLUDED.phone,
  area = EXCLUDED.area,
  rating = EXCLUDED.rating,
  reviews = EXCLUDED.reviews,
  eta = EXCLUDED.eta,
  distance_km = EXCLUDED.distance_km,
  lat = EXCLUDED.lat,
  lng = EXCLUDED.lng,
  open_until = EXCLUDED.open_until,
  image_path = EXCLUDED.image_path,
  accent = EXCLUDED.accent,
  updated_at = NOW();

-- ---------------------------------------------------------------------------
-- Seed: product templates × each pharmacy
-- ---------------------------------------------------------------------------
WITH templates AS (
  SELECT * FROM (VALUES
    ('Paracetamol 500mg', 'medicines', 'Pain and fever relief tablets for everyday use', 85::numeric, NULL::numeric, '20 tablets',
      'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=600&q=80', 'Popular', 1),
    ('Ibuprofen 400mg', 'medicines', 'Anti-inflammatory tablets for muscle and joint pain', 120, NULL, '24 tablets',
      'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?auto=format&fit=crop&w=600&q=80', NULL, 2),
    ('Vitamin C 1000mg', 'vitamins', 'Daily immune support with high-strength vitamin C', 420, 480, '30 tablets',
      'https://images.unsplash.com/photo-1631549916768-4119b2e5f926?auto=format&fit=crop&w=600&q=80', 'Save 13%', 3),
    ('Multivitamin Complex', 'vitamins', 'Complete daily multivitamin for adults', 650, NULL, '60 tablets',
      'https://images.unsplash.com/photo-1577401239170-897942555fb3?auto=format&fit=crop&w=600&q=80', NULL, 4),
    ('Daily SPF 50 Sunscreen', 'personal-care', 'Broad-spectrum face and body sun protection', 780, NULL, '50 ml',
      'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?auto=format&fit=crop&w=600&q=80', NULL, 5),
    ('Hand Sanitizer', 'personal-care', '70% alcohol hand cleanser for on-the-go use', 165, NULL, '250 ml',
      'https://images.unsplash.com/photo-1584483766114-2cea6facdf57?auto=format&fit=crop&w=600&q=80', NULL, 6),
    ('Gentle Baby Lotion', 'baby-care', 'Sensitive-skin daily moisture for infants', 560, NULL, '300 ml',
      'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=600&q=80', NULL, 7),
    ('Baby Diaper Cream', 'baby-care', 'Protective cream for sensitive baby skin', 390, NULL, '100 g',
      'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?auto=format&fit=crop&w=600&q=80', NULL, 8),
    ('Home First Aid Kit', 'first-aid', 'Essential 42-piece kit for home and travel', 1250, NULL, '1 kit',
      'https://images.unsplash.com/photo-1603398938378-e54eab446dde?auto=format&fit=crop&w=600&q=80', 'Family essential', 9),
    ('Adhesive Bandages Pack', 'first-aid', 'Assorted sterile plasters for minor cuts', 95, NULL, '40 pieces',
      'https://images.unsplash.com/photo-1600959907703-125ba1374a12?auto=format&fit=crop&w=600&q=80', NULL, 10),
    ('Digital Thermometer', 'wellness', 'Fast and accurate temperature reading', 690, NULL, '1 device',
      'https://images.unsplash.com/photo-1695048441386-0d6c4043d8c7?auto=format&fit=crop&w=600&q=80', 'Recommended', 11),
    ('Blood Pressure Monitor', 'wellness', 'Home arm cuff monitor with large display', 2450, NULL, '1 device',
      'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&w=600&q=80', NULL, 12)
  ) AS t(name, category_id, description, price_etb, old_price_etb, unit, image_url, badge, sort_idx)
)
INSERT INTO public.products (
  id, pharmacy_id, category_id, name, description, price_etb, old_price_etb, unit, image_url, badge
)
SELECT
  p.id || '-' || t.sort_idx,
  p.id,
  t.category_id,
  t.name,
  t.description,
  t.price_etb,
  t.old_price_etb,
  t.unit,
  t.image_url,
  t.badge
FROM public.pharmacies p
CROSS JOIN templates t
ON CONFLICT (id) DO UPDATE SET
  pharmacy_id = EXCLUDED.pharmacy_id,
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price_etb = EXCLUDED.price_etb,
  old_price_etb = EXCLUDED.old_price_etb,
  unit = EXCLUDED.unit,
  image_url = EXCLUDED.image_url,
  badge = EXCLUDED.badge,
  updated_at = NOW();

COMMIT;
