// One-time creation of the owner account.
// Requires the SETUP_CODE secret (set by the owner in the Supabase dashboard) and refuses once an owner exists.
import { adminClient, corsHeaders, json, loginToEmail, validPassword } from '../_shared/common.ts';

function safeEqual(a: string, b: string) {
  const ea = new TextEncoder().encode(a);
  const eb = new TextEncoder().encode(b);
  let diff = ea.length ^ eb.length;
  for (let i = 0; i < Math.max(ea.length, eb.length); i++) diff |= (ea[i] ?? 0) ^ (eb[i] ?? 0);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const expected = Deno.env.get('SETUP_CODE');
  if (!expected) return json({ error: 'Setup is not enabled yet.' }, 503);

  let body: { code?: string; full_name?: string; login?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid request' }, 400);
  }

  if (!body.code || !safeEqual(body.code.trim(), expected)) return json({ error: 'Setup code is not correct.' }, 403);
  const fullName = (body.full_name ?? '').trim();
  const email = loginToEmail(body.login ?? '');
  if (!fullName) return json({ error: 'Enter your name.' }, 400);
  if (!email) return json({ error: 'Enter a valid email or 10-digit mobile number.' }, 400);
  if (!validPassword(body.password)) return json({ error: 'Password must be at least 8 characters.' }, 400);

  const admin = adminClient();
  const { count, error: countError } = await admin
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('role', 'owner');
  if (countError) return json({ error: 'Could not check setup state.' }, 500);
  if ((count ?? 0) > 0) return json({ error: 'The owner account already exists. Sign in instead.' }, 409);

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: body.password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (error || !data.user) return json({ error: error?.message ?? 'Could not create the account.' }, 400);

  const { error: profileError } = await admin
    .from('profiles')
    .update({ role: 'owner', active: true, full_name: fullName })
    .eq('id', data.user.id);
  if (profileError) {
    await admin.auth.admin.deleteUser(data.user.id);
    return json({ error: 'Could not finish setup. Try again.' }, 500);
  }

  return json({ ok: true, email });
});
