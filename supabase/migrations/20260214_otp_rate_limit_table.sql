-- =====================================================
-- OTP RATE LIMITING TABLE
-- =====================================================
-- Prevents OTP flooding: limits requests per phone number
-- and per IP. Used by send-phone-otp Edge Function.
-- =====================================================

CREATE TABLE IF NOT EXISTS public.otp_rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Normalized phone (digits only, 0XXXXXXXXX format)
    phone_normalized TEXT,
    -- Client identifier (IP or fingerprint)
    client_key TEXT NOT NULL,
    -- Request count in current window
    request_count INTEGER NOT NULL DEFAULT 1,
    -- Window start timestamp
    window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast lookup by phone + window
CREATE INDEX IF NOT EXISTS idx_otp_rate_limits_phone_window
    ON public.otp_rate_limits (phone_normalized, window_start)
    WHERE phone_normalized IS NOT NULL;

-- Index for fast lookup by client + window
CREATE INDEX IF NOT EXISTS idx_otp_rate_limits_client_window
    ON public.otp_rate_limits (client_key, window_start);

-- Enable RLS (service role bypasses for Edge Function)
ALTER TABLE public.otp_rate_limits ENABLE ROW LEVEL SECURITY;

-- No direct user access - Edge Function uses service role
CREATE POLICY "Service role only for otp_rate_limits" ON public.otp_rate_limits
    FOR ALL USING (false) WITH CHECK (false);

COMMENT ON TABLE public.otp_rate_limits IS 'Rate limiting for OTP sends. Service role only.';
