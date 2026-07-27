-- Road Runner phone OTP stack (RoadRunner project only).
-- Adds purge RPC, OTP tables, verify/claim signup RPCs.
-- Does NOT touch KelalGatewayProject.

BEGIN;

-- ---------------------------------------------------------------------------
-- OTP storage
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.phone_verification_otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  user_id UUID REFERENCES auth.users (id) ON DELETE CASCADE,
  purpose TEXT NOT NULL
    CHECK (purpose IN ('signup', 'profile_update', 'organizer_registration', 'ticket_purchase')),
  expires_at TIMESTAMPTZ NOT NULL,
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  verified_at TIMESTAMPTZ,
  attempts INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 3,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT phone_verification_otps_signup_user_null_check CHECK (
    (purpose = 'signup' AND user_id IS NULL)
    OR (purpose <> 'signup' AND user_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_otp_signup_phone
  ON public.phone_verification_otps (phone_number, purpose, verified)
  WHERE purpose = 'signup';

CREATE INDEX IF NOT EXISTS idx_otp_phone_purpose
  ON public.phone_verification_otps (phone_number, purpose, created_at DESC);

ALTER TABLE public.phone_verification_otps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS phone_otps_no_direct_client ON public.phone_verification_otps;
CREATE POLICY phone_otps_no_direct_client
  ON public.phone_verification_otps
  FOR ALL TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- ---------------------------------------------------------------------------
-- Rate limits + blocklist (Edge Function / service_role)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.otp_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_normalized TEXT,
  client_key TEXT NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_otp_rate_limits_phone_window
  ON public.otp_rate_limits (phone_normalized, window_start)
  WHERE phone_normalized IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_otp_rate_limits_client_window
  ON public.otp_rate_limits (client_key, window_start);

ALTER TABLE public.otp_rate_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role only for otp_rate_limits" ON public.otp_rate_limits;
CREATE POLICY "Service role only for otp_rate_limits"
  ON public.otp_rate_limits
  FOR ALL USING (false) WITH CHECK (false);

CREATE TABLE IF NOT EXISTS public.blocked_phone_numbers (
  phone_normalized TEXT PRIMARY KEY,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.blocked_phone_numbers ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.blocked_phone_numbers FROM PUBLIC, anon, authenticated;

-- Optional notifications stub (balance alerts from Edge Function)
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notifications_select_own ON public.notifications;
CREATE POLICY notifications_select_own
  ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Purge orphan auth (phone.roadrunner.et) after delete / failed signup leftovers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.purge_orphaned_phone_auth(p_phone TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_digits TEXT;
  v_local TEXT;
  v_email TEXT;
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

  v_email := 'p' || v_local || '@phone.roadrunner.et';

  FOR r IN
    SELECT id
    FROM auth.users
    WHERE lower(email) = lower(v_email)
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

REVOKE ALL ON FUNCTION public.purge_orphaned_phone_auth(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.purge_orphaned_phone_auth(TEXT) TO anon, authenticated, service_role;

-- Refresh is_phone_registered to purge orphans first
CREATE OR REPLACE FUNCTION public.is_phone_registered(p_phone TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_digits TEXT := regexp_replace(COALESCE(p_phone, ''), '\D', '', 'g');
  v_local TEXT;
  v_no_zero TEXT;
  v_intl TEXT;
BEGIN
  IF v_digits = '' THEN
    RETURN FALSE;
  END IF;

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

  PERFORM public.purge_orphaned_phone_auth(COALESCE(v_local, v_digits));

  RETURN EXISTS (
    SELECT 1
    FROM public.users u
    WHERE regexp_replace(COALESCE(u.phone, ''), '\D', '', 'g') IN (
      COALESCE(v_local, '__none__'),
      COALESCE(v_no_zero, '__none__'),
      COALESCE(v_intl, '__none__'),
      v_digits
    )
    AND COALESCE(u.phone, '') <> ''
  );
END;
$$;

REVOKE ALL ON FUNCTION public.is_phone_registered(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_phone_registered(TEXT) TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Verify + claim signup phone
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.verify_signup_phone_otp(
  p_phone_number TEXT,
  p_otp_code TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_norm TEXT;
  v_otp RECORD;
BEGIN
  v_norm := regexp_replace(COALESCE(p_phone_number, ''), '\D', '', 'g');
  IF v_norm !~ '^0[0-9]{9}$' THEN
    RETURN FALSE;
  END IF;

  SELECT *
    INTO v_otp
  FROM public.phone_verification_otps
  WHERE phone_number = v_norm
    AND purpose = 'signup'
    AND user_id IS NULL
    AND verified = FALSE
    AND expires_at > NOW()
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  IF v_otp.attempts >= v_otp.max_attempts THEN
    RETURN FALSE;
  END IF;

  IF v_otp.otp_code IS DISTINCT FROM regexp_replace(COALESCE(p_otp_code, ''), '\D', '', 'g') THEN
    UPDATE public.phone_verification_otps
    SET attempts = attempts + 1
    WHERE id = v_otp.id;
    RETURN FALSE;
  END IF;

  UPDATE public.phone_verification_otps
  SET verified = TRUE,
      verified_at = NOW()
  WHERE id = v_otp.id;

  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.verify_signup_phone_otp(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_signup_phone_otp(TEXT, TEXT) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.claim_signup_verified_phone(p_phone TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_norm TEXT;
  v_otp_id UUID;
  v_taken UUID;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated'
      USING ERRCODE = '28000';
  END IF;

  v_norm := regexp_replace(COALESCE(p_phone, ''), '\D', '', 'g');
  IF v_norm !~ '^0[0-9]{9}$' THEN
    RAISE EXCEPTION 'Invalid phone number format'
      USING ERRCODE = '22023';
  END IF;

  SELECT id INTO v_taken
  FROM public.users
  WHERE phone = v_norm
    AND id IS DISTINCT FROM v_uid
  LIMIT 1;

  IF v_taken IS NOT NULL THEN
    RAISE EXCEPTION 'This phone number is already registered to another account.'
      USING ERRCODE = '23505';
  END IF;

  SELECT id INTO v_otp_id
  FROM public.phone_verification_otps
  WHERE purpose = 'signup'
    AND user_id IS NULL
    AND phone_number = v_norm
    AND verified = TRUE
    AND verified_at IS NOT NULL
    AND verified_at > NOW() - INTERVAL '30 minutes'
  ORDER BY verified_at DESC
  LIMIT 1
  FOR UPDATE;

  IF v_otp_id IS NULL THEN
    RAISE EXCEPTION 'No verified signup SMS code for this number in the allowed time window. Verify phone again.'
      USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.users (id, phone, updated_at, created_at)
  VALUES (v_uid, v_norm, NOW(), NOW())
  ON CONFLICT (id) DO UPDATE
  SET phone = EXCLUDED.phone,
      updated_at = NOW();

  DELETE FROM public.phone_verification_otps WHERE id = v_otp_id;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_signup_verified_phone(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_signup_verified_phone(TEXT) TO authenticated, service_role;

COMMIT;
