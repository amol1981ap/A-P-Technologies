// Receives enquiries from the public website form and adds them to the lead inbox.
import { adminClient, corsHeaders, json } from '../_shared/common.ts';
import { scoreLead } from '../_shared/scoring.ts';

const clip = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '') || null;

/** Maps the utm_source on an ad or post link to a lead source. Anything unknown stays "website". */
function sourceFrom(raw: unknown) {
  const s = (typeof raw === 'string' ? raw : '').trim().toLowerCase();
  if (['instagram', 'ig'].includes(s)) return 'instagram' as const;
  if (['facebook', 'fb', 'meta'].includes(s)) return 'facebook' as const;
  if (s === 'whatsapp') return 'whatsapp' as const;
  if (s === 'indiamart') return 'indiamart' as const;
  if (['referral', 'ref'].includes(s)) return 'referral' as const;
  return 'website' as const;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  let b: Record<string, unknown>;
  try {
    b = await req.json();
  } catch {
    return json({ error: 'Invalid request' }, 400);
  }

  // Hidden field that real visitors never fill. Bots do; pretend success.
  if (b.website_url) return json({ ok: true });

  const name = clip(b.name, 120);
  const phone = clip(b.phone, 20)?.replace(/[^\d+]/g, '') ?? null;
  if (!name) return json({ error: 'Enter your name.' }, 400);
  if (!phone || phone.replace(/\D/g, '').length < 10) return json({ error: 'Enter a valid phone number.' }, 400);

  const lead = {
    contact_name: name,
    company: clip(b.company, 160),
    phone,
    buyer_role: clip(b.role, 60),
    project_type: clip(b.project, 80),
    location: clip(b.location, 120),
    quantity_note: clip(b.qty, 200),
    notes: clip(b.message, 1000),
    source: sourceFrom(b.utm_source),
    campaign: clip(b.utm_campaign, 80),
  };

  const admin = adminClient();

  // The same phone within a day is the same lead.
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { data: dup } = await admin.from('leads').select('id').eq('phone', phone).gte('created_at', since).limit(1);
  if (dup && dup.length > 0) return json({ ok: true, duplicate: true });

  const { error } = await admin.from('leads').insert({ ...lead, score: scoreLead(lead) });
  if (error) return json({ error: 'Could not save your enquiry. Please try WhatsApp.' }, 500);
  return json({ ok: true });
});
