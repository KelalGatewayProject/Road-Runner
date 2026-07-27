BEGIN;

CREATE OR REPLACE FUNCTION public.verify_phone_otp(
    p_user_id UUID,
    p_phone_number TEXT,
    p_otp_code TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_otp_record RECORD;
    v_phone_normalized TEXT;
BEGIN
    v_phone_normalized := regexp_replace(COALESCE(p_phone_number, ''), '\D', '', 'g');

    -- Lock the latest active OTP so every failed guess consumes an attempt on the same row.
    SELECT *
    INTO v_otp_record
    FROM public.phone_verification_otps
    WHERE user_id = p_user_id
      AND phone_number = v_phone_normalized
      AND verified = FALSE
      AND expires_at > NOW()
    ORDER BY created_at DESC
    LIMIT 1
    FOR UPDATE;

    IF v_otp_record.id IS NULL THEN
        RETURN FALSE;
    END IF;

    IF v_otp_record.attempts >= v_otp_record.max_attempts THEN
        RETURN FALSE;
    END IF;

    IF v_otp_record.otp_code = p_otp_code THEN
        UPDATE public.phone_verification_otps
        SET verified = TRUE,
            verified_at = NOW()
        WHERE id = v_otp_record.id;

        RETURN TRUE;
    END IF;

    UPDATE public.phone_verification_otps
    SET attempts = attempts + 1
    WHERE id = v_otp_record.id;

    RETURN FALSE;
END;
$$;

COMMENT ON FUNCTION public.verify_phone_otp(UUID, TEXT, TEXT) IS
  'Verifies the latest active OTP for a user/phone and consumes an attempt on every failed guess to enforce OTP verification rate limiting.';

COMMIT;
