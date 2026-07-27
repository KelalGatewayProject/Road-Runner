-- Purge orphan auth.users by phone (native Phone Auth). Run on RoadRunner.

CREATE OR REPLACE FUNCTION public.purge_orphaned_phone_auth(p_phone TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_digits TEXT;
  v_local TEXT;
  v_e164 TEXT;
  r RECORD;
BEGIN
  v_digits := regexp_replace(COALESCE(p_phone, ''), '\D', '', 'g');
  IF v_digits ~ '^0[0-9]{9}$' THEN
    v_local := v_digits;
  ELSIF v_digits ~ '^251[0-9]{9}$' THEN
    v_local := '0' || substr(v_digits, 4);
  ELSIF length(v_digits) = 9 THEN
    v_local := '0' || v_digits;
  ELSE
    RETURN;
  END IF;

  v_e164 := '+251' || substr(v_local, 2);

  FOR r IN
    SELECT id
    FROM auth.users
    WHERE regexp_replace(COALESCE(phone, ''), '\D', '', 'g') IN (
      v_local,
      substr(v_local, 2),
      '251' || substr(v_local, 2)
    )
    OR lower(email) IN (
      lower('p' || v_local || '@phone.roadrunner.et'),
      lower('p' || v_local || '@phone.roadrunner.com'),
      lower('p' || v_local || '@phone.roadrunnerapp.com')
    )
  LOOP
    IF EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = r.id
        AND regexp_replace(COALESCE(u.phone, ''), '\D', '', 'g') IN (
          v_local, substr(v_local, 2), '251' || substr(v_local, 2)
        )
        AND COALESCE(u.phone, '') <> ''
    ) THEN
      CONTINUE;
    END IF;

    DELETE FROM public.users WHERE id = r.id;
    DELETE FROM auth.users WHERE id = r.id;
  END LOOP;
END;
$$;
