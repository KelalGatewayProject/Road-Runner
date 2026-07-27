-- Pharmacy banner storage + admin helpers (self-contained).
-- Apply in RoadRunner Supabase → SQL Editor.
-- Safe to re-run. Fixes: function public.is_rr_catalog_admin() does not exist.

BEGIN;

-- Roles used by admin helpers
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

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'pharmacy-banners',
  'pharmacy-banners',
  TRUE,
  2097152,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
)
ON CONFLICT (id) DO UPDATE SET
  public = TRUE,
  file_size_limit = 2097152,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

DROP POLICY IF EXISTS pharmacy_banners_public_read ON storage.objects;
CREATE POLICY pharmacy_banners_public_read
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'pharmacy-banners');

DROP POLICY IF EXISTS pharmacy_banners_admin_insert ON storage.objects;
CREATE POLICY pharmacy_banners_admin_insert
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'pharmacy-banners'
    AND public.is_rr_catalog_admin()
  );

DROP POLICY IF EXISTS pharmacy_banners_admin_update ON storage.objects;
CREATE POLICY pharmacy_banners_admin_update
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'pharmacy-banners' AND public.is_rr_catalog_admin())
  WITH CHECK (bucket_id = 'pharmacy-banners' AND public.is_rr_catalog_admin());

DROP POLICY IF EXISTS pharmacy_banners_admin_delete ON storage.objects;
CREATE POLICY pharmacy_banners_admin_delete
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'pharmacy-banners' AND public.is_rr_catalog_admin());

COMMIT;
