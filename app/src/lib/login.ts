/**
 * Staff can sign in with a 10-digit mobile number instead of an email.
 * Keep in sync with supabase/functions/_shared/common.ts.
 */
export const PHONE_LOGIN_DOMAIN = 'phone.controlcentre.app';

export function loginToEmail(login: string): string | null {
  const trimmed = login.trim().toLowerCase();
  const digits = trimmed.replace(/[\s+-]/g, '').replace(/^91(?=\d{10}$)/, '');
  if (/^\d{10}$/.test(digits)) return `${digits}@${PHONE_LOGIN_DOMAIN}`;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return trimmed;
  return null;
}

/** What to show for a login: the mobile number for phone logins, else the email. */
export function displayLogin(email: string | undefined | null): string {
  if (!email) return '';
  return email.endsWith(`@${PHONE_LOGIN_DOMAIN}`) ? email.split('@')[0] : email;
}
