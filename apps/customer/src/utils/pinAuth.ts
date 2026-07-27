export const PIN_MIN_LEN = 6;
export const PIN_MAX_LEN = 12;

export function normalizePin(raw: string): string {
  return String(raw || '').replace(/\D/g, '').slice(0, PIN_MAX_LEN);
}

export function pinToSupabasePassword(pinDigits: string): string {
  // For option B we use the normalized PIN directly as the Supabase password.
  return normalizePin(pinDigits);
}

export function isValidPin(pinDigits: string): boolean {
  const normalized = normalizePin(pinDigits);
  return normalized.length >= PIN_MIN_LEN;
}
