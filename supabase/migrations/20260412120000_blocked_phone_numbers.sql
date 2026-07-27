-- Blocklist for phone numbers: OTP Edge Function returns 403 with a clear message; app shows a modal.
-- Store normalized form: 10 digits starting with 0 (Ethiopia local), e.g. 0911324365.

CREATE TABLE IF NOT EXISTS public.blocked_phone_numbers (
  phone_normalized TEXT PRIMARY KEY,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blocked_phone_numbers_phone ON public.blocked_phone_numbers (phone_normalized);

ALTER TABLE public.blocked_phone_numbers ENABLE ROW LEVEL SECURITY;

-- No SELECT/INSERT for clients; Edge Function uses service role (bypasses RLS).
REVOKE ALL ON public.blocked_phone_numbers FROM PUBLIC, anon, authenticated;

COMMENT ON TABLE public.blocked_phone_numbers IS
  'Admin blocklist: send-phone-otp rejects these numbers (403).';

-- Abuse case: Michael Taye / abcd@abcd.com (2026-04-09)
INSERT INTO public.blocked_phone_numbers (phone_normalized, reason)
SELECT '0911324365', 'Abuse / fraudulent activity — blocked 2026-04-12'
WHERE NOT EXISTS (
  SELECT 1 FROM public.blocked_phone_numbers WHERE phone_normalized = '0911324365'
);
