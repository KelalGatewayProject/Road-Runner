-- Align Road Runner The Bank with Kelal gateway keys + service-fee cashbox.
-- Apply in RoadRunner Supabase SQL Editor after 20260727010000_*.

BEGIN;

-- Prefer Kelal-style keys (telebirr, mpesa, cbe, …)
INSERT INTO public.platform_cashbox (gateway_key, label, balance_etb) VALUES
  ('telebirr', 'TELEBIRR', 0),
  ('mpesa', 'M-PESA', 0),
  ('cbe', 'CBEBirr Plus', 0),
  ('ebirr', 'eBirr', 0),
  ('nib', 'NIBtera', 0),
  ('awashBirr', 'AwashBirr Pro', 0),
  ('boa', 'BoA', 0),
  ('zeman', 'Zemen', 0),
  ('platform_cashbox', 'Platform Cashbox', 0)
ON CONFLICT (gateway_key) DO UPDATE SET
  label = EXCLUDED.label,
  updated_at = NOW();

-- Drop legacy alias keys if present (optional cleanup)
DELETE FROM public.platform_cashbox
WHERE gateway_key IN ('cbe_birr', 'awash', 'cashbox', 'NIB');

-- Tracked income per gateway (from accounting_records) + service fee entries
ALTER TABLE public.accounting_records
  DROP CONSTRAINT IF EXISTS accounting_records_entry_type_check;

ALTER TABLE public.accounting_records
  ADD CONSTRAINT accounting_records_entry_type_check
  CHECK (entry_type IN (
    'income',
    'expense',
    'adjustment',
    'withdrawal',
    'gateway_payment',
    'service_fee',
    'wht'
  ));

COMMIT;
