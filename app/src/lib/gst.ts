/** GST maths for tax invoices. All money is rounded to paise per line, then the invoice to the nearest rupee. */
import { lineKg, round2 } from './calc';

export type InvoiceLineInput = {
  product_id: string | null;
  description: string;
  hsn_code: string | null;
  metres: number;
  kg_per_m: number;
  rate_per_kg: number;
  gst_percent: number;
};

export type InvoiceLine = InvoiceLineInput & { kg: number; taxable: number; cgst: number; sgst: number; igst: number };

export function computeLine(l: InvoiceLineInput, interstate: boolean): InvoiceLine {
  const kg = lineKg(l);
  const taxable = round2(kg * l.rate_per_kg);
  if (interstate) return { ...l, kg, taxable, cgst: 0, sgst: 0, igst: round2((taxable * l.gst_percent) / 100) };
  // Inside the state the tax splits equally into CGST and SGST.
  const half = round2((taxable * l.gst_percent) / 200);
  return { ...l, kg, taxable, cgst: half, sgst: half, igst: 0 };
}

export function computeInvoice(lines: InvoiceLineInput[], interstate: boolean) {
  const out = lines.map((l) => computeLine(l, interstate));
  const taxable = round2(out.reduce((s, l) => s + l.taxable, 0));
  const cgst = round2(out.reduce((s, l) => s + l.cgst, 0));
  const sgst = round2(out.reduce((s, l) => s + l.sgst, 0));
  const igst = round2(out.reduce((s, l) => s + l.igst, 0));
  const exact = round2(taxable + cgst + sgst + igst);
  const total = Math.round(exact);
  return { lines: out, taxable, cgst, sgst, igst, roundOff: round2(total - exact), total };
}

/** First two digits of a GSTIN are the state code. */
export const stateCodeOf = (gstin: string | null | undefined) => (gstin && /^\d{2}/.test(gstin.trim()) ? gstin.trim().slice(0, 2) : null);

/**
 * Supply is inter-state when the buyer's state differs from ours.
 * Uses the buyer's GSTIN when there is one, else the state name. Returns null when it cannot tell.
 */
export function detectInterstate(company: { state_code: string | null; state: string | null }, party: { gstin: string | null; state: string | null }): boolean | null {
  const theirs = stateCodeOf(party.gstin);
  if (theirs && company.state_code) return theirs !== company.state_code;
  if (party.state && company.state) return party.state.trim().toLowerCase() !== company.state.trim().toLowerCase();
  return null;
}

/** Indian financial year label for a date, for example 26-27 for November 2026. */
export function financialYear(d: Date) {
  const y = d.getMonth() < 3 ? d.getFullYear() - 1 : d.getFullYear();
  return `${String(y % 100).padStart(2, '0')}-${String((y + 1) % 100).padStart(2, '0')}`;
}

// ───────── Amount in words (Indian system) ─────────
const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function below1000(n: number): string {
  const parts: string[] = [];
  if (n >= 100) {
    parts.push(`${ONES[Math.floor(n / 100)]} Hundred`);
    n %= 100;
  }
  if (n >= 20) {
    parts.push(TENS[Math.floor(n / 10)] + (n % 10 ? ` ${ONES[n % 10]}` : ''));
  } else if (n > 0) {
    parts.push(ONES[n]);
  }
  return parts.join(' ');
}

export function rupeesInWords(amount: number): string {
  const rupees = Math.floor(Math.round(amount * 100) / 100);
  const paise = Math.round((amount - rupees) * 100);
  if (rupees === 0 && paise === 0) return 'Zero Rupees Only';
  const crore = Math.floor(rupees / 10000000);
  const lakh = Math.floor((rupees % 10000000) / 100000);
  const thousand = Math.floor((rupees % 100000) / 1000);
  const rest = rupees % 1000;
  const words: string[] = [];
  if (crore) words.push(`${below1000(crore)} Crore`);
  if (lakh) words.push(`${below1000(lakh)} Lakh`);
  if (thousand) words.push(`${below1000(thousand)} Thousand`);
  if (rest) words.push(below1000(rest));
  let out = rupees > 0 ? `${words.join(' ')} ${rupees === 1 ? 'Rupee' : 'Rupees'}` : '';
  if (paise) out += `${out ? ' and ' : ''}${below1000(paise)} Paise`;
  return `${out} Only`;
}
