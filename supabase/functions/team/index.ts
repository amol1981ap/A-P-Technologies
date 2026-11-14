// Owner-only team management: add a member, change role/access, reset a password.
import { adminClient, corsHeaders, json, loginToEmail, ROLES, type Role, validPassword } from '../_shared/common.ts';

type Body =
  | { action: 'create'; full_name: string; login: string; password: string; role: Role; phone?: string }
  | { action: 'update'; user_id: string; role?: Role; active?: boolean; full_name?: string }
  | { action: 'reset_password'; user_id: string; password: string };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const admin = adminClient();
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  const { data: caller } = await admin.auth.getUser(token);
  if (!caller?.user) return json({ error: 'Sign in again.' }, 401);

  const { data: me } = await admin.from('profiles').select('role, active').eq('id', caller.user.id).single();
  if (!me || me.role !== 'owner' || !me.active) return json({ error: 'Only the owner can manage the team.' }, 403);

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid request' }, 400);
  }

  if (body.action === 'create') {
    const fullName = (body.full_name ?? '').trim();
    const email = loginToEmail(body.login ?? '');
    if (!fullName) return json({ error: 'Enter a name.' }, 400);
    if (!email) return json({ error: 'Enter a valid email or 10-digit mobile number.' }, 400);
    if (!validPassword(body.password)) return json({ error: 'Password must be at least 8 characters.' }, 400);
    if (!ROLES.includes(body.role) || body.role === 'owner') return json({ error: 'Choose a role.' }, 400);

    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: body.password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });
    if (error || !data.user) {
      const exists = /already/i.test(error?.message ?? '');
      return json({ error: exists ? 'Someone already uses this login.' : (error?.message ?? 'Could not add member.') }, 400);
    }
    const phone = body.phone?.trim() || (/^\d{10}@/.test(email) ? email.slice(0, 10) : null);
    const { error: profileError } = await admin
      .from('profiles')
      .update({ full_name: fullName, role: body.role, active: true, phone })
      .eq('id', data.user.id);
    if (profileError) {
      await admin.auth.admin.deleteUser(data.user.id);
      return json({ error: 'Could not add member. Try again.' }, 500);
    }
    return json({ ok: true, user_id: data.user.id });
  }

  if (body.action === 'update') {
    if (body.user_id === caller.user.id && (body.active === false || (body.role && body.role !== 'owner'))) {
      return json({ error: 'You cannot remove your own owner access.' }, 400);
    }
    const patch: Record<string, unknown> = {};
    if (body.role !== undefined) {
      if (!ROLES.includes(body.role)) return json({ error: 'Unknown role.' }, 400);
      patch.role = body.role;
    }
    if (body.active !== undefined) patch.active = !!body.active;
    if (body.full_name !== undefined) patch.full_name = String(body.full_name).trim();
    const { error } = await admin.from('profiles').update(patch).eq('id', body.user_id);
    if (error) return json({ error: 'Could not update member.' }, 400);
    return json({ ok: true });
  }

  if (body.action === 'reset_password') {
    if (!validPassword(body.password)) return json({ error: 'Password must be at least 8 characters.' }, 400);
    const { error } = await admin.auth.admin.updateUserById(body.user_id, { password: body.password });
    if (error) return json({ error: 'Could not reset password.' }, 400);
    return json({ ok: true });
  }

  return json({ error: 'Unknown action' }, 400);
});
