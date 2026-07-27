-- Signup phone OTP before account creation.
-- Allows purpose=signup with nullable user_id; verify + claim RPCs.

BEGIN;

-- 1) Allow signup purpose + nullable user_id for pre-auth OTPs
ALTER TABLE public.phone_verification_otps
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.phone_verification_otps
  DROP CONSTRAINT IF EXISTS phone_verification_otps_purpose_check;

ALTER TABLE public.phone_verification_otps
  ADD CONSTRAINT phone_verification_otps_purpose_check
  CHECK (purpose IN ('organizer_registration', 'profile_update', 'ticket_purchase', 'signup'));

-- Signup rows must have null user_id; other purposes keep a user_id
ALTER TABLE public.phone_verification_otps
  DROP CONSTRAINT IF EXISTS phone_verification_otps_signup_user_null_check;

ALTER TABLE public.phone_verification_otps
  ADD CONSTRAINT phone_verification_otps_signup_user_null_check
  CHECK (
    (purpose = 'signup' AND user_id IS NULL)
    OR (purpose <> 'signup' AND user_id IS NOT NULL)
  );

CREATE INDEX IF NOT EXISTS idx_otp_signup_phone
  ON public.phone_verification_otps (phone_number, purpose, verified)
  WHERE purpose = 'signup';

-- 2) Verify signup OTP (no auth user yet)
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
GRANT EXECUTE ON FUNCTION public.verify_signup_phone_otp(TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.verify_signup_phone_otp(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_signup_phone_otp(TEXT, TEXT) TO service_role;

COMMENT ON FUNCTION public.verify_signup_phone_otp(TEXT, TEXT) IS
  'Verifies a pre-registration SMS OTP (purpose=signup, user_id null). Callable before account exists.';

-- 3) After account create: attach phone from recently verified signup OTP
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

  PERFORM set_config('app.allow_users_phone_write', '1', TRUE);

  UPDATE public.users
  SET phone = v_norm, updated_at = NOW()
  WHERE id = v_uid;

  DELETE FROM public.phone_verification_otps WHERE id = v_otp_id;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_signup_verified_phone(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_signup_verified_phone(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_signup_verified_phone(TEXT) TO service_role;

COMMENT ON FUNCTION public.claim_signup_verified_phone(TEXT) IS
  'Sets users.phone for auth.uid() from a verified purpose=signup OTP within 30 minutes; consumes the OTP.';

COMMIT;
