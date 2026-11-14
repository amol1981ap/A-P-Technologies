/** Weights, money and date helpers shared by quotes, PDFs and screens. */

/** Typical GFRP bar density. Actual weight comes from the batch test certificate. */
export const GFRP_DENSITY_KG_M3 = 2100;

/** Weight per metre of a steel bar of nominal diameter d (mm): d² / 162. */
export const steelKgPerM = (d: number) => (d * d) / 162;
/** Weight per metre of a GFRP bar of nominal diameter d (mm). */
export const gfrpKgPerM = (d: number) => ((Math.PI / 4) * d * d * 1e-6 * GFRP_DENSITY_KG_M3);

export type PricedLine = { metres: number; rate_per_m: number | null; gst_percent: number | null };

export function lineTaxable(l: PricedLine) {
  return l.rate_per_m == null ? 0 : round2(l.metres * l.rate_per_m);
}
export function lineGst(l: PricedLine) {
  return l.gst_percent == null ? 0 : round2((lineTaxable(l) * l.gst_percent) / 100);
}

export function totals(lines: PricedLine[]) {
  const taxable = round2(lines.reduce((s, l) => s + lineTaxable(l), 0));
  const gst = round2(lines.reduce((s, l) => s + lineGst(l), 0));
  return { taxable, gst, total: round2(taxable + gst) };
}

export const round2 = (n: number) => Math.round(n * 100) / 100;

export function isPriced(l: PricedLine) {
  return l.rate_per_m != null && l.gst_percent != null;
}

const inr = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const formatInr = (n: number) => `₹${inr.format(n)}`;
export const formatNum = (n: number, dp = 0) =>
  n.toLocaleString('en-IN', { minimumFractionDigits: dp, maximumFractionDigits: dp });

// ───────── Dates ─────────
const DAY = 24 * 3600 * 1000;

export function daysSince(iso: string | null | undefined, now = new Date()) {
  if (!iso) return 0;
  const start = new Date(iso);
  const a = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const b = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.max(0, Math.round((b - a) / DAY));
}

export function addDaysIso(days: number, from = new Date()) {
  const d = new Date(from.getTime() + days * DAY);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function formatDate(iso: string | null | undefined) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Digits only, with India's country code added to a bare 10-digit number. */
export function waNumber(phone: string | null | undefined) {
  const d = (phone ?? '').replace(/\D/g, '');
  if (d.length === 10) return `91${d}`;
  return d.length >= 11 ? d : '';
}
