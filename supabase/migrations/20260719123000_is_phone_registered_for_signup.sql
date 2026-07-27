-- Public phone-taken check for signup (RLS blocks anon/auth from reading other users' phones).

BEGIN;

CREATE OR REPLACE FUNCTION public.is_phone_registered(p_phone TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_digits TEXT;
  v_local TEXT;
  v_no_zero TEXT;
  v_intl TEXT;
BEGIN
  v_digits := regexp_replace(COALESCE(p_phone, ''), '\D', '', 'g');
  IF v_digits = '' THEN
    RETURN FALSE;
  END IF;

  -- Normalize to local 0XXXXXXXXX when possible
  IF v_digits ~ '^0[0-9]{9}$' THEN
    v_local := v_digits;
  ELSIF v_digits ~ '^251[0-9]{9}$' THEN
    v_local := '0' || substr(v_digits, 4);
  ELSIF length(v_digits) = 9 THEN
    v_local := '0' || v_digits;
  ELSE
    v_local := NULL;
  END IF;

  IF v_local IS NOT NULL THEN
    v_no_zero := substr(v_local, 2);
    v_intl := '251' || v_no_zero;
  ELSE
    v_no_zero := v_digits;
    v_intl := CASE WHEN v_digits LIKE '251%' THEN v_digits ELSE '251' || v_digits END;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.users u
    WHERE regexp_replace(COALESCE(u.phone, ''), '\D', '', 'g') IN (
      COALESCE(v_local, ''),
      COALESCE(v_no_zero, ''),
      COALESCE(v_intl, ''),
      v_digits
    )
    AND COALESCE(u.phone, '') <> ''
  );
END;
$$;

REVOKE ALL ON FUNCTION public.is_phone_registered(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_phone_registered(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.is_phone_registered(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_phone_registered(TEXT) TO service_role;

COMMENT ON FUNCTION public.is_phone_registered(TEXT) IS
  'Returns true if public.users already has this Ethiopian mobile (any common format). Safe for signup pre-check; SECURITY DEFINER bypasses RLS without exposing user rows.';

COMMIT;
