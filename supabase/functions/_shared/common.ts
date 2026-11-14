import { createClient } from 'npm:@supabase/supabase-js@2';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/** Service-role client. Only ever used server-side, inside these functions. */
export function adminClient() {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * Staff can sign in with a 10-digit mobile number instead of an email.
 * A mobile number maps to a fixed internal address that never receives mail.
 * Keep in sync with app/src/lib/login.ts.
 */
export const PHONE_LOGIN_DOMAIN = 'phone.controlcentre.app';

export function loginToEmail(login: string): string | null {
  const trimmed = login.trim().toLowerCase();
  const digits = trimmed.replace(/[\s+-]/g, '').replace(/^91(?=\d{10}$)/, '');
  if (/^\d{10}$/.test(digits)) return `${digits}@${PHONE_LOGIN_DOMAIN}`;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return trimmed;
  return null;
}

export const ROLES = ['owner', 'sales', 'despatch', 'factory'] as const;
export type Role = (typeof ROLES)[number];

export function validPassword(p: unknown): p is string {
  return typeof p === 'string' && p.length >= 8 && p.length <= 72;
}
