-- Free phone after account delete: purge orphan auth users (synthetic phone emails)
-- and null phone early during delete. Tighten is_phone_registered.

BEGIN;

-- 1) Null phone immediately on delete so re-registration is not blocked mid-failure
CREATE OR REPLACE FUNCTION public.delete_user_public_data(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_phone TEXT;
  v_auth_email TEXT;
BEGIN
  -- Capture phone / synthetic auth email before wiping
  SELECT regexp_replace(COALESCE(phone, ''), '\D', '', 'g') INTO v_phone
  FROM public.users WHERE id = p_user_id;

  IF v_phone ~ '^0[0-9]{9}$' THEN
    v_auth_email := 'p' || v_phone || '@phone.kelalgateway.com';
  ELSIF v_phone ~ '^251[0-9]{9}$' THEN
    v_auth_email := 'p0' || substr(v_phone, 4) || '@phone.kelalgateway.com';
  END IF;

  -- Free the phone number immediately (even if later steps fail)
  UPDATE public.users SET phone = NULL, updated_at = NOW() WHERE id = p_user_id;

  -- Wallet / settings
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'withdrawal_requests')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'withdrawal_requests' AND column_name = 'wallet_transaction_id') THEN
    DELETE FROM public.withdrawal_requests
    WHERE wallet_transaction_id IN (
      SELECT wt.id FROM public.wallet_transactions wt
      INNER JOIN public.wallets w ON w.id = wt.wallet_id
      WHERE w.user_id = p_user_id
    );
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'withdrawal_requests')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'withdrawal_requests' AND column_name = 'user_id') THEN
    DELETE FROM public.withdrawal_requests WHERE user_id = p_user_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'wallet_transactions')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'wallets') THEN
    DELETE FROM public.wallet_transactions
    WHERE wallet_id IN (SELECT id FROM public.wallets WHERE user_id = p_user_id);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'wallets')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'wallets' AND column_name = 'user_id') THEN
    DELETE FROM public.wallets WHERE user_id = p_user_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_settings') THEN
    DELETE FROM public.user_settings WHERE id = p_user_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'auth_login_failed_attempts')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'auth_login_failed_attempts' AND column_name = 'user_id') THEN
    DELETE FROM public.auth_login_failed_attempts WHERE user_id = p_user_id;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ticket_distribution_attempts')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ticket_distribution_attempts' AND column_name = 'attempted_by_user_id') THEN
    DELETE FROM public.ticket_distribution_attempts WHERE attempted_by_user_id = p_user_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ticket_allocations') THEN
    DELETE FROM public.ticket_allocations WHERE allocated_by_user_id = p_user_id OR allocated_to_user_id = p_user_id;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tickets') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tickets' AND column_name = 'gifted_by') THEN
      UPDATE public.tickets SET gifted_by = NULL WHERE gifted_by = p_user_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tickets' AND column_name = 'transferred_from') THEN
      UPDATE public.tickets SET transferred_from = NULL WHERE transferred_from = p_user_id;
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tickets')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tickets' AND column_name = 'user_id') THEN
    DELETE FROM public.tickets WHERE user_id = p_user_id;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'gift_tickets')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'gift_tickets' AND column_name = 'sender_id') THEN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tickets')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tickets' AND column_name = 'gift_ticket_id') THEN
      UPDATE public.tickets
      SET gift_ticket_id = NULL
      WHERE gift_ticket_id IN (SELECT id FROM public.gift_tickets WHERE sender_id = p_user_id);
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'yagout_payments')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'yagout_payments' AND column_name = 'gift_ticket_id') THEN
      DELETE FROM public.yagout_payments
      WHERE gift_ticket_id IN (SELECT id FROM public.gift_tickets WHERE sender_id = p_user_id);
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'mpesa_payments')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'mpesa_payments' AND column_name = 'gift_ticket_id') THEN
      DELETE FROM public.mpesa_payments
      WHERE gift_ticket_id IN (SELECT id FROM public.gift_tickets WHERE sender_id = p_user_id);
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'telebirr_payments')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'telebirr_payments' AND column_name = 'gift_ticket_id') THEN
      DELETE FROM public.telebirr_payments
      WHERE gift_ticket_id IN (SELECT id FROM public.gift_tickets WHERE sender_id = p_user_id);
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'cbebirr_payments')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'cbebirr_payments' AND column_name = 'gift_ticket_id') THEN
      DELETE FROM public.cbebirr_payments
      WHERE gift_ticket_id IN (SELECT id FROM public.gift_tickets WHERE sender_id = p_user_id);
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'nibtera_payments')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'nibtera_payments' AND column_name = 'gift_ticket_id') THEN
      DELETE FROM public.nibtera_payments
      WHERE gift_ticket_id IN (SELECT id FROM public.gift_tickets WHERE sender_id = p_user_id);
    END IF;
    DELETE FROM public.gift_tickets WHERE sender_id = p_user_id;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'gift_tickets')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'gift_tickets' AND column_name = 'recipient_id') THEN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tickets')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tickets' AND column_name = 'gift_ticket_id') THEN
      UPDATE public.tickets
      SET gift_ticket_id = NULL
      WHERE gift_ticket_id IN (SELECT id FROM public.gift_tickets WHERE recipient_id = p_user_id);
    END IF;
    DELETE FROM public.gift_tickets WHERE recipient_id = p_user_id;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'event_staff')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'event_staff' AND column_name = 'user_id') THEN
    DELETE FROM public.event_staff WHERE user_id = p_user_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'venues')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'venues' AND column_name = 'user_id') THEN
    UPDATE public.venues SET user_id = NULL WHERE user_id = p_user_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'organization')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'organization' AND column_name = 'user_id') THEN
    UPDATE public.organization SET user_id = NULL WHERE user_id = p_user_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'organizer')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'events')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'organizer_id') THEN
    UPDATE public.events
    SET organizer_id = NULL
    WHERE organizer_id IN (SELECT id FROM public.organizer WHERE user_id = p_user_id);
    DELETE FROM public.organizer WHERE user_id = p_user_id;
  ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'organizer') THEN
    DELETE FROM public.organizer WHERE user_id = p_user_id;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notifications') THEN
    DELETE FROM public.notifications WHERE user_id = p_user_id;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'sender_id') THEN
      DELETE FROM public.notifications WHERE sender_id = p_user_id;
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'push_notification_queue')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'push_notification_queue' AND column_name = 'user_id') THEN
    DELETE FROM public.push_notification_queue WHERE user_id = p_user_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'free_drinks')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'free_drinks' AND column_name = 'user_id') THEN
    DELETE FROM public.free_drinks WHERE user_id = p_user_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'event_follows')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'event_follows' AND column_name = 'user_id') THEN
    DELETE FROM public.event_follows WHERE user_id = p_user_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'push_notification_send_logs')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'push_notification_send_logs' AND column_name = 'user_id') THEN
    DELETE FROM public.push_notification_send_logs WHERE user_id = p_user_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'typing_status') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'typing_status' AND column_name = 'user_id') THEN
      DELETE FROM public.typing_status WHERE user_id = p_user_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'typing_status' AND column_name = 'conversation_with') THEN
      DELETE FROM public.typing_status WHERE conversation_with = p_user_id;
    END IF;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_fcm_tokens')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_fcm_tokens' AND column_name = 'user_id') THEN
    DELETE FROM public.user_fcm_tokens WHERE user_id = p_user_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'yagout_payments')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'yagout_payments' AND column_name = 'user_id') THEN
    DELETE FROM public.yagout_payments WHERE user_id = p_user_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'kdc_purchases')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'kdc_purchases' AND column_name = 'user_id') THEN
    DELETE FROM public.kdc_purchases WHERE user_id = p_user_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'phone_verification_otps')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'phone_verification_otps' AND column_name = 'user_id') THEN
    DELETE FROM public.phone_verification_otps WHERE user_id = p_user_id;
  END IF;
  IF v_phone IS NOT NULL AND v_phone <> '' THEN
    DELETE FROM public.phone_verification_otps
    WHERE purpose = 'signup'
      AND user_id IS NULL
      AND phone_number IN (v_phone, CASE WHEN v_phone LIKE '0%' THEN substr(v_phone, 2) ELSE v_phone END);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'cashbox_transactions')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'cashbox_transactions' AND column_name = 'member_user_id') THEN
    DELETE FROM public.cashbox_transactions WHERE member_user_id = p_user_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payment_transactions')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'payment_transactions' AND column_name = 'user_id') THEN
    DELETE FROM public.payment_transactions WHERE user_id = p_user_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'transaction_audit_trail')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'transaction_audit_trail' AND column_name = 'user_id') THEN
    DELETE FROM public.transaction_audit_trail WHERE user_id = p_user_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'telebirr_payments')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'telebirr_payments' AND column_name = 'user_id') THEN
    DELETE FROM public.telebirr_payments WHERE user_id = p_user_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'mpesa_payments')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'mpesa_payments' AND column_name = 'user_id') THEN
    DELETE FROM public.mpesa_payments WHERE user_id = p_user_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'cbebirr_payments')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'cbebirr_payments' AND column_name = 'user_id') THEN
    DELETE FROM public.cbebirr_payments WHERE user_id = p_user_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'nibtera_payments')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'nibtera_payments' AND column_name = 'user_id') THEN
    DELETE FROM public.nibtera_payments WHERE user_id = p_user_id;
  END IF;

  DELETE FROM public.users WHERE id = p_user_id;

  -- Remove leftover Auth user for this phone-first account (if still present)
  IF v_auth_email IS NOT NULL THEN
    DELETE FROM auth.users WHERE id = p_user_id OR lower(email) = lower(v_auth_email);
  ELSE
    DELETE FROM auth.users WHERE id = p_user_id;
  END IF;
END;
$$;

COMMENT ON FUNCTION public.delete_user_public_data(uuid) IS
  'Account deletion cleanup: nulls phone first, unlinks gifts, deletes public.users, and removes matching auth.users so the phone can re-register.';

GRANT EXECUTE ON FUNCTION public.delete_user_public_data(uuid) TO service_role;

-- 2) Purge orphan auth for a phone (public.users gone / no phone, but auth email remains)
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

  v_email := 'p' || v_local || '@phone.kelalgateway.com';

  FOR r IN
    SELECT id
    FROM auth.users
    WHERE lower(email) = lower(v_email)
  LOOP
    -- Only purge if no active profile still holds this phone
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
GRANT EXECUTE ON FUNCTION public.purge_orphaned_phone_auth(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.purge_orphaned_phone_auth(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.purge_orphaned_phone_auth(TEXT) TO service_role;

-- 3) is_phone_registered: purge orphans first, then check live phones only
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

  -- Clean leftover Auth accounts from a previous delete so re-registration works
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

COMMIT;
