-- Road Runner: super_admin / admin catalog writes + accounting + cashbox.
-- Apply in RoadRunner Supabase → SQL Editor (iumdgtwwhkcqxfqhjywp).

BEGIN;

-- ---------------------------------------------------------------------------
-- Expand roles (keep pharmacy_staff for future; uploads = admin | super_admin only)
-- ---------------------------------------------------------------------------
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users
  ADD CONSTRAINT users_role_check
  CHECK (role IN ('customer', 'pharmacy_staff', 'admin', 'super_admin'));

UPDATE public.users
SET role = 'super_admin', updated_at = NOW()
WHERE role IS DISTINCT FROM 'super_admin'
  AND (
    lower(trim(coalesce(full_name, ''))) = 'super admin'
    OR (
      lower(trim(coalesce(first_name, ''))) = 'super'
      AND lower(trim(coalesce(last_name, ''))) = 'admin'
    )
  );

-- ---------------------------------------------------------------------------
-- Role helpers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_rr_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = auth.uid()
      AND (
        u.role = 'super_admin'
        OR lower(trim(coalesce(u.full_name, ''))) = 'super admin'
        OR (
          lower(trim(coalesce(u.first_name, ''))) = 'super'
          AND lower(trim(coalesce(u.last_name, ''))) = 'admin'
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.is_rr_catalog_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_rr_super_admin()
    OR EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = auth.uid()
        AND u.role = 'admin'
    );
$$;

REVOKE ALL ON FUNCTION public.is_rr_super_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_rr_catalog_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_rr_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_rr_catalog_admin() TO authenticated;

-- Block customers from escalating their own role
CREATE OR REPLACE FUNCTION public.rr_users_guard_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF NOT public.is_rr_super_admin() THEN
      RAISE EXCEPTION 'Only Super Admin can change member roles';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_rr_users_guard_role_change ON public.users;
CREATE TRIGGER trg_rr_users_guard_role_change
  BEFORE UPDATE OF role ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.rr_users_guard_role_change();

-- Admins can list members (counts / assignment UI)
DROP POLICY IF EXISTS users_select_admin ON public.users;
CREATE POLICY users_select_admin
  ON public.users FOR SELECT TO authenticated
  USING (public.is_rr_catalog_admin() OR id = auth.uid());

DROP POLICY IF EXISTS users_update_super_admin ON public.users;
CREATE POLICY users_update_super_admin
  ON public.users FOR UPDATE TO authenticated
  USING (public.is_rr_super_admin())
  WITH CHECK (public.is_rr_super_admin());

-- ---------------------------------------------------------------------------
-- Catalog write policies (not public, not pharmacy_staff)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS pharmacies_admin_insert ON public.pharmacies;
CREATE POLICY pharmacies_admin_insert
  ON public.pharmacies FOR INSERT TO authenticated
  WITH CHECK (public.is_rr_catalog_admin());

DROP POLICY IF EXISTS pharmacies_admin_update ON public.pharmacies;
CREATE POLICY pharmacies_admin_update
  ON public.pharmacies FOR UPDATE TO authenticated
  USING (public.is_rr_catalog_admin())
  WITH CHECK (public.is_rr_catalog_admin());

DROP POLICY IF EXISTS pharmacies_admin_delete ON public.pharmacies;
CREATE POLICY pharmacies_admin_delete
  ON public.pharmacies FOR DELETE TO authenticated
  USING (public.is_rr_catalog_admin());

DROP POLICY IF EXISTS products_admin_insert ON public.products;
CREATE POLICY products_admin_insert
  ON public.products FOR INSERT TO authenticated
  WITH CHECK (public.is_rr_catalog_admin());

DROP POLICY IF EXISTS products_admin_update ON public.products;
CREATE POLICY products_admin_update
  ON public.products FOR UPDATE TO authenticated
  USING (public.is_rr_catalog_admin())
  WITH CHECK (public.is_rr_catalog_admin());

DROP POLICY IF EXISTS products_admin_delete ON public.products;
CREATE POLICY products_admin_delete
  ON public.products FOR DELETE TO authenticated
  USING (public.is_rr_catalog_admin());

DROP POLICY IF EXISTS product_categories_admin_write ON public.product_categories;
CREATE POLICY product_categories_admin_write
  ON public.product_categories FOR ALL TO authenticated
  USING (public.is_rr_catalog_admin())
  WITH CHECK (public.is_rr_catalog_admin());

-- ---------------------------------------------------------------------------
-- Accounting + gateway cashbox (pharmacy payments — no events)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.platform_cashbox (
  gateway_key TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  balance_etb NUMERIC(14, 2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users (id)
);

CREATE TABLE IF NOT EXISTS public.accounting_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_type TEXT NOT NULL CHECK (entry_type IN ('income', 'expense', 'adjustment', 'withdrawal')),
  gateway_key TEXT,
  amount_etb NUMERIC(14, 2) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_by UUID REFERENCES auth.users (id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS accounting_records_created_idx
  ON public.accounting_records (created_at DESC);

ALTER TABLE public.platform_cashbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS platform_cashbox_admin_select ON public.platform_cashbox;
CREATE POLICY platform_cashbox_admin_select
  ON public.platform_cashbox FOR SELECT TO authenticated
  USING (public.is_rr_catalog_admin());

DROP POLICY IF EXISTS platform_cashbox_super_write ON public.platform_cashbox;
CREATE POLICY platform_cashbox_super_write
  ON public.platform_cashbox FOR ALL TO authenticated
  USING (public.is_rr_super_admin())
  WITH CHECK (public.is_rr_super_admin());

DROP POLICY IF EXISTS accounting_admin_select ON public.accounting_records;
CREATE POLICY accounting_admin_select
  ON public.accounting_records FOR SELECT TO authenticated
  USING (public.is_rr_catalog_admin());

DROP POLICY IF EXISTS accounting_admin_insert ON public.accounting_records;
CREATE POLICY accounting_admin_insert
  ON public.accounting_records FOR INSERT TO authenticated
  WITH CHECK (public.is_rr_catalog_admin());

DROP POLICY IF EXISTS accounting_super_delete ON public.accounting_records;
CREATE POLICY accounting_super_delete
  ON public.accounting_records FOR DELETE TO authenticated
  USING (public.is_rr_super_admin());

INSERT INTO public.platform_cashbox (gateway_key, label, balance_etb) VALUES
  ('telebirr', 'Telebirr', 0),
  ('cbe_birr', 'CBE Birr', 0),
  ('mpesa', 'M-Pesa', 0),
  ('awash', 'Awash Birr', 0),
  ('ebirr', 'eBirr', 0),
  ('nib', 'NIB', 0),
  ('boa', 'Bank of Abyssinia', 0),
  ('cashbox', 'Platform cashbox', 0)
ON CONFLICT (gateway_key) DO UPDATE SET
  label = EXCLUDED.label,
  updated_at = NOW();

COMMIT;
