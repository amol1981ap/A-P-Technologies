import type { ProductionEntry } from './database.types';
import { lineKg, round2 } from './calc';

/**
 * Cost per metre of each product, from what its production runs actually used.
 * Resin and roving are tracked per run; labour, power and the rest come from the owner's
 * "other cost per metre". Hardener and sand are not tracked per run, so the owner includes them there.
 */
export function costPerMetre(args: {
  entries: ProductionEntry[];
  resinRate: number | null;
  rovingRate: number | null;
  overheadPerM: number;
}) {
  const byProduct = new Map<string, { metres: number; material: number }>();
  for (const e of args.entries) {
    if (!(e.good_m > 0)) continue;
    const cur = byProduct.get(e.product_id) ?? { metres: 0, material: 0 };
    cur.metres += e.good_m;
    cur.material += (e.resin_kg ?? 0) * (args.resinRate ?? 0) + (e.roving_kg ?? 0) * (args.rovingRate ?? 0);
    byProduct.set(e.product_id, cur);
  }
  const out = new Map<string, number>();
  for (const [pid, v] of byProduct) out.set(pid, round2(v.material / v.metres + args.overheadPerM));
  return out;
}

export type Margin = {
  revenue: number;
  cost: number;
  margin: number;
  pct: number;
  /** Products with no production history, left out of the cost. */
  missing: string[];
};

export function orderMargin(items: { product_id: string; name: string; metres: number; kg_per_m: number | null; rate_per_kg: number | null }[], perMetre: Map<string, number>): Margin | null {
  const priced = items.filter((i) => i.rate_per_kg != null && i.kg_per_m != null);
  if (priced.length === 0) return null;
  let revenue = 0;
  let cost = 0;
  const missing: string[] = [];
  for (const i of priced) {
    revenue += lineKg(i) * (i.rate_per_kg ?? 0);
    const c = perMetre.get(i.product_id);
    if (c == null) missing.push(i.name);
    else cost += i.metres * c;
  }
  revenue = round2(revenue);
  cost = round2(cost);
  const margin = round2(revenue - cost);
  return { revenue, cost, margin, pct: revenue > 0 ? Math.round((margin / revenue) * 100) : 0, missing };
}
