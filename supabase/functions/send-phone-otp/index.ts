import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, type SupabaseClient, type User } from "https://esm.sh/@supabase/supabase-js@2";

/** Minimal schema for tables/RPC used in this function (keeps client typed without `any`). */
type PhoneOtpDatabase = {
  public: {
    Tables: {
      otp_rate_limits: {
        Row: {
          id: string;
          phone_normalized: string;
          client_key: string;
          request_count: number;
          window_start: string;
        };
        Insert: {
          phone_normalized: string;
          client_key: string;
          request_count: number;
          window_start: string;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      users: {
        Row: {
          id: string;
          email: string | null;
          phone: string | null;
        };
        Insert: {
          id: string;
          email?: string | null;
          phone?: string | null;
          first_name?: string | null;
          last_name?: string | null;
          full_name?: string | null;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      phone_verification_otps: {
        Row: Record<string, unknown>;
        Insert: {
          phone_number: string;
          otp_code: string;
          user_id: string | null;
          purpose: string;
          expires_at: string;
          verified: boolean;
          attempts: number;
          max_attempts: number;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      blocked_phone_numbers: {
        Row: { phone_normalized: string; reason: string | null; created_at: string };
        Insert: Record<string, never>;
        Update: Record<string, never>;
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          title: string;
          body: string;
          type: string;
          data: Record<string, unknown>;
          is_read: boolean;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_phone_registered: {
        Args: { p_phone: string };
        Returns: boolean;
      };
      purge_orphaned_phone_auth: {
        Args: { p_phone: string };
        Returns: undefined;
      };
    };
    Enums: Record<string, never>;
  };
};

type PhoneOtpClient = SupabaseClient<PhoneOtpDatabase>;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, x-client-platform, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Rate limit constants (penetration test remediation: OTP flooding / excessive auth attempts)
const RATE_LIMIT_PHONE_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_PHONE_MAX = 3; // max OTPs per phone per window
const RATE_LIMIT_IP_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_IP_MAX = 10; // max requests per IP per window

/** One in-app + push alert per window so OTP retries do not spam super admin */
const AFROMESSAGE_BALANCE_ALERT_COOLDOWN_MS = 6 * 60 * 60 * 1000;
const NOTIF_TYPE_AFROMESSAGE_BALANCE = 'afromessage_balance_low';

/** Shown in Message Center detail modal — confirm against AfroMessage dashboard before paying */
const AFROMESSAGE_TOP_UP_INSTRUCTIONS =
  `Reference accounts (verify on AfroMessage dashboard before transfer):

1000496320313
CBE
AfroReach Technology PLC

77886109
Abyssinia
AfroReach technology Plc`;

function isAfroMessageLowBalanceError(text: string): boolean {
  const t = text.toLowerCase();
  return (
    /401-9/.test(text) ||
    /balance\s+is\s+too\s+low|account\s+balance\s+too\s+low|balance\s+too\s+low/.test(t) ||
    /insufficient\s+balance|low\s+balance/.test(t)
  );
}

type OtpUserMeta = {
  first_name?: string;
  given_name?: string;
  last_name?: string;
  family_name?: string;
  full_name?: string;
};

function readOtpUserMetadata(user: User): OtpUserMeta {
  const m = user.user_metadata;
  if (m !== null && typeof m === 'object' && !Array.isArray(m)) {
    const o = m as Record<string, unknown>;
    const str = (k: string): string | undefined =>
      typeof o[k] === 'string' ? o[k] : undefined;
    return {
      first_name: str('first_name'),
      given_name: str('given_name'),
      last_name: str('last_name'),
      family_name: str('family_name'),
      full_name: str('full_name'),
    };
  }
  return {};
}

async function notifySuperAdminAfroMessageBalanceLow(
  supabase: PhoneOtpClient,
  detailSnippet: string,
): Promise<void> {
  const alertEmail =
    Deno.env.get('SUPABASE_SUPER_ADMIN_ALERT_EMAIL') ?? 'support@roadrunner.et';
  try {
    const { data: adminRow, error: adminErr } = await supabase
      .from('users')
      .select('id')
      .eq('email', alertEmail)
      .maybeSingle();

    if (adminErr || !adminRow?.id) {
      console.error(
        'AfroMessage balance alert: could not resolve super admin user',
        alertEmail,
        adminErr,
      );
      return;
    }

    const since = new Date(Date.now() - AFROMESSAGE_BALANCE_ALERT_COOLDOWN_MS).toISOString();
    const { data: recent } = await supabase
      .from('notifications')
      .select('id')
      .eq('user_id', adminRow.id)
      .eq('type', NOTIF_TYPE_AFROMESSAGE_BALANCE)
      .gte('created_at', since)
      .limit(1)
      .maybeSingle();

    if (recent) {
      console.log('AfroMessage balance alert: skipped (cooldown active)');
      return;
    }

    const title = 'AfroMessage SMS balance low';
    const body =
      'OTP SMS is failing: AfroMessage reported low account balance (e.g. 401-9). Top up the AfroMessage account.';

    const { error: insErr } = await supabase.from('notifications').insert({
      user_id: adminRow.id,
      title,
      body,
      type: NOTIF_TYPE_AFROMESSAGE_BALANCE,
      data: {
        send_push_notification: true,
        provider: 'afromessage',
        alert_kind: 'sms_balance_low',
        detail: detailSnippet.slice(0, 500),
        top_up_instructions: AFROMESSAGE_TOP_UP_INSTRUCTIONS,
        alerted_at: new Date().toISOString(),
      },
      is_read: false,
    });

    if (insErr) {
      console.error('AfroMessage balance alert: notification insert failed', insErr);
      return;
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({
        user_ids: [adminRow.id],
        notification: {
          title,
          body,
          data: { type: NOTIF_TYPE_AFROMESSAGE_BALANCE },
        },
      }),
    })
      .then((r) => {
        if (!r.ok) console.warn('AfroMessage balance alert: push invoke HTTP', r.status);
      })
      .catch((e) => console.warn('AfroMessage balance alert: push invoke error', e));
  } catch (e) {
    console.error('AfroMessage balance alert: unexpected error', e);
  }
}

// OTP SMS message templates by language (matches app: en, am, fr, om). Use {otpCode} and {minutes} placeholders.
const OTP_SMS_BY_LANG: Record<string, string> = {
  en: 'Your Road Runner verification code is: {otpCode}. This code expires in {minutes} minutes.',
  am: 'Your Road Runner verification code is: {otpCode}. This code expires in {minutes} minutes.',
  fr: 'Your Road Runner verification code is: {otpCode}. This code expires in {minutes} minutes.',
  om: 'Your Road Runner verification code is: {otpCode}. This code expires in {minutes} minutes.',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 200,
      headers: corsHeaders 
    });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized. Missing or invalid Authorization header.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseService = createClient<PhoneOtpDatabase>(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { phone_number, user_id, purpose, preferred_language } = await req.json();

    if (!phone_number || !purpose) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: phone_number, purpose' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const validPurposes = ['signup', 'profile_update'];
    if (!validPurposes.includes(purpose)) {
      return new Response(
        JSON.stringify({ error: `Invalid purpose. Must be one of: ${validPurposes.join(', ')}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const isSignup = purpose === 'signup';
    let user: User | null = null;

    // signup: allow anon JWT (pre-account). Other purposes require a real logged-in user.
    const supabaseAuth = createClient<PhoneOtpDatabase>(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );
    const token = authHeader.replace('Bearer ', '').trim();
    const { data: { user: authUser }, error: authError } = await supabaseAuth.auth.getUser(token);

    if (isSignup) {
      // Prefer real user if present, but do not require it for signup OTP.
      user = authUser ?? null;
    } else {
      if (authError || !authUser) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized. Invalid or expired token.' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      user = authUser;
      if (user_id !== user.id) {
        return new Response(
          JSON.stringify({ error: 'Forbidden. user_id does not match authenticated user.' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Normalize phone for rate limit key
    const cleanedPhoneForRateLimit = phone_number.replace(/\D/g, '');
    const phoneNormalized = cleanedPhoneForRateLimit.startsWith('0')
      ? cleanedPhoneForRateLimit
      : (cleanedPhoneForRateLimit.startsWith('251') ? '0' + cleanedPhoneForRateLimit.slice(3) : '0' + cleanedPhoneForRateLimit);

    const { data: blockedPhone } = await supabaseService
      .from('blocked_phone_numbers')
      .select('phone_normalized')
      .eq('phone_normalized', phoneNormalized)
      .maybeSingle();
    if (blockedPhone) {
      return new Response(
        JSON.stringify({
          error:
            'This phone number has been blocked. Registration and verification using this number are not allowed.',
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || req.headers.get('x-real-ip')
      || 'unknown';

    // RATE LIMITING: Check phone and IP limits
    const phoneWindowStart = new Date(Date.now() - RATE_LIMIT_PHONE_WINDOW_MS).toISOString();
    const ipWindowStart = new Date(Date.now() - RATE_LIMIT_IP_WINDOW_MS).toISOString();
    const { count: phoneCount } = await supabaseService
      .from('otp_rate_limits')
      .select('*', { count: 'exact', head: true })
      .eq('phone_normalized', phoneNormalized)
      .gte('window_start', phoneWindowStart);
    if (phoneCount !== null && phoneCount >= RATE_LIMIT_PHONE_MAX) {
      return new Response(
        JSON.stringify({ error: 'Too many OTP requests for this phone number. Please try again later.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const { count: ipCount } = await supabaseService
      .from('otp_rate_limits')
      .select('*', { count: 'exact', head: true })
      .eq('client_key', `ip:${clientIp}`)
      .gte('window_start', ipWindowStart);
    if (ipCount !== null && ipCount >= RATE_LIMIT_IP_MAX) {
      return new Response(
        JSON.stringify({ error: 'Too many requests. Please try again later.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // SECURITY: Block if phone already registered (signup: any account; other: different account).
    // Prefer is_phone_registered (purges orphan auth left after account delete, then checks live phones).
    const { data: phoneTaken, error: phoneTakenErr } = await supabaseService.rpc('is_phone_registered', {
      p_phone: phoneNormalized,
    });
    if (phoneTakenErr) {
      console.warn('is_phone_registered RPC failed, falling back to users lookup:', phoneTakenErr);
      const phoneNoLeadingZero = phoneNormalized.startsWith('0') ? phoneNormalized.slice(1) : phoneNormalized;
      const { data: existingByPhone } = await supabaseService
        .from('users')
        .select('id')
        .or(`phone.eq.${phoneNormalized},phone.eq.${phoneNoLeadingZero}`)
        .limit(1)
        .maybeSingle();
      if (existingByPhone && (isSignup || existingByPhone.id !== user_id)) {
        return new Response(
          JSON.stringify({ error: 'This phone number is already registered to another account. Please sign in with that account or use a different number.' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else if (phoneTaken === true) {
      if (isSignup) {
        return new Response(
          JSON.stringify({ error: 'This phone number is already registered to another account. Please sign in with that account or use a different number.' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      // Logged-in purposes: only block if a *different* account owns the phone
      const phoneNoLeadingZero = phoneNormalized.startsWith('0') ? phoneNormalized.slice(1) : phoneNormalized;
      const { data: existingByPhone } = await supabaseService
        .from('users')
        .select('id')
        .or(`phone.eq.${phoneNormalized},phone.eq.${phoneNoLeadingZero}`)
        .limit(1)
        .maybeSingle();
      if (existingByPhone && existingByPhone.id !== user_id) {
        return new Response(
          JSON.stringify({ error: 'This phone number is already registered to another account. Please sign in with that account or use a different number.' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Logged-in purposes: ensure public.users row exists BEFORE sending SMS.
    if (!isSignup && user && user_id) {
    try {
      const { data: existingProfile, error: existingProfileError } = await supabaseService
        .from('users')
        .select('id')
        .eq('id', user_id)
        .maybeSingle();

      if (existingProfileError) {
        console.error('❌ OTP: error checking users row before SMS send:', existingProfileError);
        return new Response(
          JSON.stringify({ error: 'Profile lookup failed before OTP send. Please try again.' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      if (!existingProfile) {
        const userMeta = readOtpUserMetadata(user);
        const metaFirst = userMeta.first_name ?? userMeta.given_name ?? '';
        const metaLast = userMeta.last_name ?? userMeta.family_name ?? '';
        const metaFull =
          userMeta.full_name ||
          [metaFirst, metaLast].filter(Boolean).join(' ') ||
          (user.email ? user.email.split('@')[0] : 'User');

        const { error: upsertError } = await supabaseService.from('users').upsert(
          {
            id: user_id,
            first_name: metaFirst,
            last_name: metaLast,
            full_name: metaFull,
            email: user.email ?? null,
            phone: null, // Phone is finalized only after OTP verification
          },
          { onConflict: 'id' },
        );

        if (upsertError) {
          console.error('❌ OTP: users upsert failed before SMS send:', upsertError);
          return new Response(
            JSON.stringify({
              error:
                'Could not prepare your profile for OTP verification. Please refresh and try again.',
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        }
      }
    } catch (ensureErr) {
      console.error('❌ OTP: unexpected error ensuring users row before SMS send:', ensureErr);
      return new Response(
        JSON.stringify({ error: 'Unexpected profile error before OTP send. Please try again.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    }

    // Clean phone number (remove non-digits, ensure starts with country code)
    let cleanedPhone = phone_number.replace(/\D/g, '');
    
    // If phone starts with 0, convert to +251 format
    if (cleanedPhone.startsWith('0')) {
      cleanedPhone = '+251' + cleanedPhone.substring(1);
    } else if (!cleanedPhone.startsWith('251')) {
      // If doesn't start with 251, add +251
      cleanedPhone = '+251' + cleanedPhone;
    } else {
      cleanedPhone = '+' + cleanedPhone;
    }

    // Generate 5-digit OTP code
    const otpCode = Math.floor(10000 + Math.random() * 90000).toString(); // 5-digit code (10000-99999)
    
    // Set expiry time (2 minutes from now) — short OTP lifetime for security.
    const OTP_EXPIRY_MINUTES = 2;
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + OTP_EXPIRY_MINUTES);

    // Save OTP BEFORE sending SMS so UI and verification state stay consistent.
    // If DB insert fails, do not send SMS.
    const cleanedPhoneForDB = phoneNormalized;
    // Keep only the latest active OTP for this phone+purpose (+ user when present).
    let clearQuery = supabaseService
      .from('phone_verification_otps')
      .delete()
      .eq('phone_number', cleanedPhoneForDB)
      .eq('purpose', purpose)
      .eq('verified', false);
    if (isSignup) {
      clearQuery = clearQuery.is('user_id', null);
    } else {
      clearQuery = clearQuery.eq('user_id', user_id);
    }
    const { error: clearOtpError } = await clearQuery;
    if (clearOtpError) {
      console.error('❌ Error clearing previous active OTP rows:', clearOtpError);
      return new Response(
        JSON.stringify({
          error: 'Failed to prepare OTP window.',
          details: clearOtpError.message ?? String(clearOtpError),
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const otpInsertPayload = {
      phone_number: cleanedPhoneForDB, // Store in 0XXXXXXXXX format
      otp_code: otpCode,
      user_id: isSignup ? null : user_id,
      purpose: purpose,
      expires_at: expiresAt.toISOString(),
      verified: false,
      attempts: 0,
      max_attempts: 3,
    };
    let { data: otpRow, error: dbError } = await supabaseService
      .from('phone_verification_otps')
      .insert(otpInsertPayload)
      .select('id')
      .single();

    // Safety net: if public.users row disappeared/missing, recreate and retry once (logged-in only).
    if (!isSignup && dbError?.code === '23503' && user && user_id) {
      console.warn('⚠️ OTP insert FK failed; attempting to ensure users row then retry once');
      const userMeta = readOtpUserMetadata(user);
      const metaFirst = userMeta.first_name ?? userMeta.given_name ?? '';
      const metaLast = userMeta.last_name ?? userMeta.family_name ?? '';
      const metaFull =
        userMeta.full_name ||
        [metaFirst, metaLast].filter(Boolean).join(' ') ||
        (user.email ? user.email.split('@')[0] : 'User');

      const { error: ensureRetryError } = await supabaseService.from('users').upsert(
        {
          id: user_id,
          first_name: metaFirst,
          last_name: metaLast,
          full_name: metaFull,
          email: user.email ?? null,
          phone: null,
        },
        { onConflict: 'id' },
      );
      if (!ensureRetryError) {
        const retry = await supabaseService
          .from('phone_verification_otps')
          .insert(otpInsertPayload)
          .select('id')
          .single();
        otpRow = retry.data;
        dbError = retry.error;
      } else {
        console.error('❌ OTP retry ensure users failed:', ensureRetryError);
      }
    }

    if (dbError) {
      console.error('❌ Error saving OTP to database before SMS send:', dbError);
      return new Response(
        JSON.stringify({
          error: 'Failed to prepare OTP.',
          details: dbError.message ?? String(dbError),
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const otpRowId = otpRow?.id;

    // Get AfroMessage API credentials from environment variables
    const AFROMESSAGE_API_TOKEN = Deno.env.get('AFROMESSAGE_API_TOKEN');
    const AFROMESSAGE_API_URL = Deno.env.get('AFROMESSAGE_API_URL') || 'https://api.afromessage.com';
    const AFROMESSAGE_SENDER_NAME = Deno.env.get('AFROMESSAGE_SENDER_NAMES') || 'roadrunner';
    const AFROMESSAGE_IDENTIFIER_ID = Deno.env.get('AFROMESSAGE_IDENTIFIER_ID');

    if (!AFROMESSAGE_API_TOKEN) {
      console.error('❌ AFROMESSAGE_API_TOKEN not configured');
      return new Response(
        JSON.stringify({ error: 'SMS service not configured. Please contact support.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Pick OTP message by language (default en)
    const lang = typeof preferred_language === 'string' && OTP_SMS_BY_LANG[preferred_language]
      ? preferred_language
      : 'en';
    const template = OTP_SMS_BY_LANG[lang];
    const smsMessage = template
      .replace(/\{otpCode\}/g, otpCode)
      .replace(/\{minutes\}/g, String(OTP_EXPIRY_MINUTES));

    // Convert phone to international format (+251XXXXXXXXX) as per AfroMessage API documentation
    // The API accepts phone numbers in international format (+251XXXXXXXXX)
    let phoneForAPI = phone_number.replace(/\D/g, '');
    if (phoneForAPI.startsWith('0')) {
      // Convert 0XXXXXXXXX to +251XXXXXXXXX
      phoneForAPI = '+251' + phoneForAPI.substring(1);
    } else if (phoneForAPI.startsWith('251')) {
      // Convert 251XXXXXXXXX to +251XXXXXXXXX
      phoneForAPI = '+' + phoneForAPI;
    } else if (!phoneForAPI.startsWith('+251')) {
      // If doesn't start with +251, add it
      phoneForAPI = '+251' + phoneForAPI;
    }

    // Call AfroMessage API to send SMS
    // Using the correct endpoint from API documentation: POST https://api.afromessage.com/api/send
    try {
      const endpoint = `${AFROMESSAGE_API_URL}/api/send`;
      
      console.log(`📤 Sending SMS via AfroMessage API: ${endpoint}`);
      console.log(`📱 Phone: ${phoneForAPI}, Sender: ${AFROMESSAGE_SENDER_NAME}, Identifier: ${AFROMESSAGE_IDENTIFIER_ID || 'default'}`);
      
      // Prepare request body according to AfroMessage API documentation
      // API expects: { "from": "IDENTIFIER_ID", "sender": "SENDER_NAME", "to": "PHONE", "message": "MESSAGE", "callback": "" }
      const requestBody = {
        from: AFROMESSAGE_IDENTIFIER_ID || '', // Identifier ID from dashboard (optional, uses default if empty)
        sender: AFROMESSAGE_SENDER_NAME || '', // Sender name (optional, uses default if empty)
        to: phoneForAPI, // Recipient phone number in international format (+251XXXXXXXXX) (mandatory)
        message: smsMessage, // Message text (mandatory)
        callback: '' // Optional callback URL
      };
      
      console.log(`📦 Request body:`, JSON.stringify(requestBody, null, 2));
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${AFROMESSAGE_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      const responseText = await response.text();
      console.log(`📡 Response status: ${response.status}`);
      console.log(`📡 Response body: ${responseText}`);

      if (!response.ok) {
        throw new Error(`AfroMessage API error ${response.status}: ${responseText}`);
      }

      // Parse response according to AfroMessage API format
      // Success: { "acknowledge": "success", "response": { "message_id": "...", ... } }
      // Failure: { "acknowledge": "error", "response": { "errors": ["..."] } } — still HTTP 200
      const responseData = JSON.parse(responseText);

      if (responseData.acknowledge !== 'success') {
        const providerErrors = responseData.response?.errors;
        const providerMessage = Array.isArray(providerErrors) && providerErrors[0]
          ? providerErrors[0]
          : 'Sorry, we are unable to send your message temporarily. Please try again and contact support if problem persists.';
        console.error('❌ AfroMessage API returned error:', providerMessage);
        if (otpRowId) {
          await supabaseService.from('phone_verification_otps').delete().eq('id', otpRowId);
        }
        const balanceProbe = `${providerMessage}\n${responseText}`;
        if (isAfroMessageLowBalanceError(balanceProbe)) {
          await notifySuperAdminAfroMessageBalanceLow(supabaseService, balanceProbe);
        }
        // Return 200 with success: false so the client gets a body and can show the real message (no 500 = no null data)
        return new Response(
          JSON.stringify({
            success: false,
            error: providerMessage,
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('✅ SMS sent successfully! Message ID:', responseData.response?.message_id);

    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Error calling AfroMessage API:', errMsg, error);
      if (otpRowId) {
        await supabaseService.from('phone_verification_otps').delete().eq('id', otpRowId);
      }
      if (isAfroMessageLowBalanceError(errMsg)) {
        await notifySuperAdminAfroMessageBalanceLow(supabaseService, errMsg);
      }
      // Return a user-facing hint when possible so support can diagnose (credentials, network, provider down)
      let userError = 'Failed to send SMS. Please try again.';
      if (/balance is too low|401-9/i.test(errMsg)) {
        userError =
          'SMS credits are exhausted on our provider account. Please contact support (support@roadrunner.et) — AfroMessage balance needs a top-up.';
      } else if (/401|403|Unauthorized|invalid.*token|credentials/i.test(errMsg)) {
        userError = 'SMS service configuration error. Please contact support (support@roadrunner.et).';
      } else if (/timeout|ETIMEDOUT|network|fetch failed|Failed to fetch/i.test(errMsg)) {
        userError = 'SMS service temporarily unreachable. Please try again in a moment or contact support.';
      } else if (/AfroMessage API error/i.test(errMsg)) {
        userError = 'SMS provider could not send the message. Please try again or contact support.';
      }
      return new Response(
        JSON.stringify({
          success: false,
          error: userError,
          details: errMsg
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Record this request for rate limiting only after SMS was sent successfully (failed attempts do not count)
    await supabaseService.from('otp_rate_limits').insert([
      { phone_normalized: phoneNormalized, client_key: `ip:${clientIp}`, request_count: 1, window_start: new Date().toISOString() },
    ]);

    // Return success response (don't include OTP code in response for security)
    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'OTP sent successfully',
        expires_at: expiresAt.toISOString()
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'An unexpected error occurred. Please try again.',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
