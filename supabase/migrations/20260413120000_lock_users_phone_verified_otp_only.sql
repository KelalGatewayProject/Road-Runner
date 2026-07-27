-- Server-side: public.users.phone can only change after a recently verified SMS OTP.
-- Blocks REST/PATCH/Postman direct updates and removes phone writes from profile upsert RPC.

BEGIN;

-- 1) Apply phone update only when a matching OTP row was verified within the last 30 minutes.
CREATE OR REPLACE FUNCTION public.set_user_phone_after_verified_otp(p_phone TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_norm TEXT;
  v_otp_id UUID;
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

  SELECT id INTO v_otp_id
  FROM public.phone_verification_otps
  WHERE user_id = v_uid
    AND phone_number = v_norm
    AND verified = TRUE
    AND verified_at IS NOT NULL
    AND verified_at > NOW() - INTERVAL '30 minutes'
  ORDER BY verified_at DESC
  LIMIT 1;

  IF v_otp_id IS NULL THEN
    RAISE EXCEPTION 'No verified SMS code for this number in the allowed time window. Request a new code and verify again.'
      USING ERRCODE = '42501';
  END IF;

  PERFORM set_config('app.allow_users_phone_write', '1', TRUE);

  UPDATE public.users
  SET phone = v_norm, updated_at = NOW()
  WHERE id = v_uid;

  DELETE FROM public.phone_verification_otps WHERE id = v_otp_id;
END;
$$;

REVOKE ALL ON FUNCTION public.set_user_phone_after_verified_otp(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_user_phone_after_verified_otp(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_user_phone_after_verified_otp(TEXT) TO service_role;

COMMENT ON FUNCTION public.set_user_phone_after_verified_otp(TEXT) IS
  'Sets public.users.phone for auth.uid() only after verify_phone_otp succeeded within 30 minutes; consumes the OTP row.';

-- 2) Block direct UPDATE of phone unless allow flag (set only inside RPC) or service_role JWT.
CREATE OR REPLACE FUNCTION public.enforce_users_phone_update_gate()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT := COALESCE(current_setting('request.jwt.claim.role', TRUE), '');
  v_allow TEXT := COALESCE(current_setting('app.allow_users_phone_write', TRUE), '');
BEGIN
  IF NEW.phone IS NOT DISTINCT FROM OLD.phone THEN
    RETURN NEW;
  END IF;

  IF v_allow = '1' THEN
    RETURN NEW;
  END IF;

  IF v_role = 'service_role' THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Phone number cannot be changed directly. Complete SMS verification and use the official app flow.'
    USING ERRCODE = '42501';
END;
$$;

DROP TRIGGER IF EXISTS enforce_users_phone_update_gate ON public.users;

CREATE TRIGGER enforce_users_phone_update_gate
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_users_phone_update_gate();

COMMENT ON FUNCTION public.enforce_users_phone_update_gate() IS
  'Rejects public.users.phone changes except via set_user_phone_after_verified_otp (session flag) or service_role.';

-- 3) Profile upsert must not set or change phone (phone only via OTP RPC).
CREATE OR REPLACE FUNCTION public.upsert_user_profile_for_ticket(
  p_user_id UUID,
  p_first_name TEXT,
  p_last_name TEXT,
  p_full_name TEXT,
  p_email TEXT,
  p_phone TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_exists BOOLEAN;
  v_wallet_account_number TEXT;
  v_auth_number INTEGER;
  v_reference_no TEXT;
  v_full_name TEXT := NULLIF(TRIM(COALESCE(p_full_name, '')), '');
BEGIN
  IF v_full_name IS NULL OR v_full_name = '' THEN
    v_full_name := TRIM(COALESCE(p_first_name, '') || ' ' || COALESCE(p_last_name, ''));
    IF v_full_name = '' THEN
      v_full_name := COALESCE(SPLIT_PART(NULLIF(TRIM(p_email), ''), '@', 1), 'User');
    END IF;
  END IF;

  SELECT EXISTS (SELECT 1 FROM public.users WHERE id = p_user_id) INTO v_exists;

  IF v_exists THEN
    UPDATE public.users
    SET
      first_name = COALESCE(NULLIF(TRIM(p_first_name), ''), first_name),
      last_name = COALESCE(NULLIF(TRIM(p_last_name), ''), last_name),
      full_name = COALESCE(v_full_name, full_name),
      email = COALESCE(NULLIF(TRIM(p_email), ''), email),
      updated_at = NOW()
    WHERE id = p_user_id;
    RETURN;
  END IF;

  LOOP
    v_wallet_account_number := LPAD(FLOOR(RANDOM() * 10000000000)::TEXT, 10, '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.wallets WHERE account_number = v_wallet_account_number);
  END LOOP;

  LOOP
    v_auth_number := FLOOR(RANDOM() * 900000 + 100000);
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.users WHERE auth_number = v_auth_number::TEXT);
  END LOOP;
  v_reference_no := LPAD(v_auth_number::TEXT, 8, '0');

  INSERT INTO public.users (
    id,
    email,
    first_name,
    last_name,
    full_name,
    phone,
    reference_no,
    auth_number,
    wallet_account_number,
    role,
    created_at,
    updated_at
  ) VALUES (
    p_user_id,
    NULLIF(TRIM(p_email), ''),
    NULLIF(TRIM(p_first_name), ''),
    NULLIF(TRIM(p_last_name), ''),
    v_full_name,
    NULL,
    v_reference_no,
    v_auth_number::TEXT,
    v_wallet_account_number,
    'user',
    NOW(),
    NOW()
  );

  INSERT INTO public.wallets (user_id, account_number, balance, created_at, updated_at)
  VALUES (p_user_id, v_wallet_account_number, 0.00, NOW(), NOW());
EXCEPTION
  WHEN unique_violation THEN
    UPDATE public.users
    SET
      first_name = COALESCE(NULLIF(TRIM(p_first_name), ''), first_name),
      last_name = COALESCE(NULLIF(TRIM(p_last_name), ''), last_name),
      full_name = COALESCE(v_full_name, full_name),
      email = COALESCE(NULLIF(TRIM(p_email), ''), email),
      updated_at = NOW()
    WHERE id = p_user_id;
END;
$$;

COMMENT ON FUNCTION public.upsert_user_profile_for_ticket(UUID, TEXT, TEXT, TEXT, TEXT, TEXT) IS
  'Creates or updates public.users (name, email). Phone is never set here; use set_user_phone_after_verified_otp after SMS OTP.';

COMMIT;
