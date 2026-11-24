import type { LeadPerformance, LeadSource, MarketingSpend } from './database.types';

export type Period = 'month' | '90' | 'all';
export const PERIOD_LABEL: Record<Period, string> = { month: 'This month', '90': '90 days', all: 'All time' };

export function periodStart(p: Period, now = new Date()): Date | null {
  if (p === 'all') return null;
  if (p === 'month') return new Date(now.getFullYear(), now.getMonth(), 1);
  return new Date(now.getTime() - 90 * 86400000);
}

export const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;

export type Stat = {
  key: string;
  leads: number;
  hot: number;
  quoted: number;
  ordered: number;
  value: number;
  spend: number;
};

const blank = (key: string): Stat => ({ key, leads: 0, hot: 0, quoted: 0, ordered: 0, value: 0, spend: 0 });

function add(s: Stat, r: LeadPerformance) {
  s.leads += 1;
  if (r.score === 'hot') s.hot += 1;
  if (r.quoted) s.quoted += 1;
  if (r.ordered) s.ordered += 1;
  s.value += Number(r.order_value ?? 0);
}

export function inPeriod(iso: string | null, start: Date | null) {
  return !start || (!!iso && new Date(iso) >= start);
}

/** Leads grouped by a key (source, campaign or consultant) for the chosen period. */
export function groupBy(rows: LeadPerformance[], start: Date | null, key: (r: LeadPerformance) => string | null) {
  const map = new Map<string, Stat>();
  for (const r of rows) {
    if (!inPeriod(r.created_at, start)) continue;
    const k = key(r);
    if (!k) continue;
    if (!map.has(k)) map.set(k, blank(k));
    add(map.get(k)!, r);
  }
  return [...map.values()].sort((a, b) => b.ordered - a.ordered || b.leads - a.leads);
}

export function withSpend(stats: Stat[], spend: MarketingSpend[], start: Date | null) {
  const bySource = new Map<string, number>();
  for (const s of spend) {
    if (start && new Date(s.month) < new Date(start.getFullYear(), start.getMonth(), 1)) continue;
    bySource.set(s.source, (bySource.get(s.source) ?? 0) + Number(s.amount));
  }
  const out = stats.map((s) => ({ ...s, spend: bySource.get(s.key) ?? 0 }));
  // Spend on a source that has no leads yet still matters.
  for (const [k, v] of bySource) if (!out.some((s) => s.key === k)) out.push({ ...blank(k), spend: v });
  return out;
}

export const SOURCE_NAME: Record<LeadSource, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  whatsapp: 'WhatsApp',
  website: 'Website',
  indiamart: 'IndiaMART',
  referral: 'Referral',
  phone: 'Phone call',
  walk_in: 'Walk-in',
  other: 'Other',
};

/** One plain sentence on what the numbers say. Needs enough leads to be fair. */
export function insight(stats: Stat[]): string {
  const total = stats.reduce((s, x) => s + x.leads, 0);
  if (total === 0) return 'No leads in this period yet.';
  const top = [...stats].sort((a, b) => b.leads - a.leads)[0];
  const name = (k: string) => SOURCE_NAME[k as LeadSource] ?? k;
  const fair = stats.filter((s) => s.leads >= 3 && s.ordered > 0);
  if (fair.length > 0) {
    const best = [...fair].sort((a, b) => b.ordered / b.leads - a.ordered / a.leads)[0];
    if (best.key === top.key) return `${name(top.key)} brings the most leads (${top.leads}) and turns the best into orders: ${best.ordered} of ${best.leads}.`;
    return `${name(top.key)} brings the most leads (${top.leads}). ${name(best.key)} turns the best into orders: ${best.ordered} of ${best.leads}.`;
  }
  if (total < 10) return `${name(top.key)} brings the most leads so far (${top.leads}). Too few leads to compare sources fairly. Check again at 10 or more.`;
  return `${name(top.key)} brings the most leads (${top.leads}), but no source has turned three or more leads into an order yet.`;
}

// ───────── Funnel: enquiry → contacted → quoted → ordered ─────────
export type FunnelStage = { key: 'leads' | 'contacted' | 'quoted' | 'ordered'; label: string; count: number; ofStart: number; ofPrev: number | null };

export function funnel(rows: LeadPerformance[], start: Date | null, source: LeadSource | null) {
  const inScope = rows.filter((r) => inPeriod(r.created_at, start) && (!source || r.source === source));
  const counts = {
    leads: inScope.length,
    // Anything past "new" has been picked up, and a quote or order means it was contacted.
    contacted: inScope.filter((r) => r.status !== 'new' || r.quoted || r.ordered).length,
    quoted: inScope.filter((r) => r.quoted || r.ordered).length,
    ordered: inScope.filter((r) => r.ordered).length,
  };
  const labels = { leads: 'Enquiries', contacted: 'Contacted', quoted: 'Quoted', ordered: 'Ordered' } as const;
  const keys = ['leads', 'contacted', 'quoted', 'ordered'] as const;
  const stages: FunnelStage[] = keys.map((k, i) => ({
    key: k,
    label: labels[k],
    count: counts[k],
    ofStart: counts.leads > 0 ? Math.round((counts[k] / counts.leads) * 100) : 0,
    ofPrev: i === 0 ? null : counts[keys[i - 1]] > 0 ? Math.round((counts[k] / counts[keys[i - 1]]) * 100) : null,
  }));
  const value = inScope.reduce((t, r) => t + Number(r.order_value ?? 0), 0);
  return { stages, lost: inScope.filter((r) => r.status === 'lost').length, value, total: counts.leads };
}

/** The step where the most leads fall away, in plain words. Needs enough leads to mean something. */
export function funnelInsight(stages: FunnelStage[]): string {
  const total = stages[0].count;
  if (total === 0) return 'No enquiries in this period yet.';
  if (total < 5) return 'Too few enquiries to judge where they drop off. Check again at 5 or more.';
  let worst = { from: '', to: '', lost: 0 };
  for (let i = 1; i < stages.length; i++) {
    const lost = stages[i - 1].count - stages[i].count;
    if (lost > worst.lost) worst = { from: stages[i - 1].label, to: stages[i].label, lost };
  }
  if (worst.lost === 0) return 'Every enquiry has moved through to an order.';
  const hint =
    worst.to === 'Contacted' ? 'Call new enquiries sooner.' :
    worst.to === 'Quoted' ? 'Send quotes faster after the first call.' :
    'Follow up on sent quotes on day 3, 7 and 12.';
  return `Most enquiries are lost between ${worst.from} and ${worst.to}: ${worst.lost} of ${total}. ${hint}`;
}
