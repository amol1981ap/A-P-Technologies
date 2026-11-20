import { formatDate, formatInr } from './calc';
import type { CompanySettings, Invoice, InvoiceItem, Party, PurchaseOrder } from './database.types';
import type { InvoiceRow } from './money-queries';

// ───────── Bakaya ageing ─────────
export type Band = 'notdue' | 'd30' | 'd60' | 'd90' | 'over';
export const BAND_LABEL: Record<Band, string> = { notdue: 'Not due yet', d30: '1–30 days late', d60: '31–60 days late', d90: '61–90 days late', over: 'Over 90 days late' };
export const BANDS: Band[] = ['notdue', 'd30', 'd60', 'd90', 'over'];

export const bandOf = (daysOverdue: number): Band => (daysOverdue <= 0 ? 'notdue' : daysOverdue <= 30 ? 'd30' : daysOverdue <= 60 ? 'd60' : daysOverdue <= 90 ? 'd90' : 'over');

export function ageing(rows: InvoiceRow[]) {
  const open = rows.filter((r) => r.invoice.status === 'issued' && r.balance > 0);
  const bands: Record<Band, number> = { notdue: 0, d30: 0, d60: 0, d90: 0, over: 0 };
  for (const r of open) bands[bandOf(r.daysOverdue)] += r.balance;
  const byParty = new Map<string, { party: Party | null; balance: number; oldest: number; count: number }>();
  for (const r of open) {
    const cur = byParty.get(r.invoice.party_id) ?? { party: r.party, balance: 0, oldest: 0, count: 0 };
    cur.balance += r.balance;
    cur.oldest = Math.max(cur.oldest, r.daysOverdue);
    cur.count += 1;
    byParty.set(r.invoice.party_id, cur);
  }
  const total = open.reduce((s, r) => s + r.balance, 0);
  const overdue = open.filter((r) => r.daysOverdue > 0).reduce((s, r) => s + r.balance, 0);
  return { open, bands, total, overdue, parties: [...byParty.values()].sort((a, b) => b.oldest - a.oldest || b.balance - a.balance) };
}

export type StatusTone = 'calm' | 'attention' | 'neutral';

export function invoiceStatus(r: InvoiceRow): { text: string; tone: StatusTone } {
  if (r.invoice.status === 'cancelled') return { text: 'Cancelled', tone: 'neutral' };
  if (r.invoice.status === 'draft') return { text: 'Draft', tone: 'neutral' };
  if (r.balance <= 0) return { text: 'Paid', tone: 'calm' };
  if (r.daysOverdue > 0) return { text: `${r.daysOverdue} d late`, tone: 'attention' };
  const d = daysToDue(r.invoice.due_date);
  return { text: r.paid > 0 ? 'Part paid' : d != null ? `Due in ${d} d` : 'Open', tone: 'neutral' };
}

// ───────── Reminders ─────────
export const REMIND_BEFORE_DAYS = 3;

export function daysToDue(dueDate: string | null) {
  if (!dueDate) return null;
  const a = new Date(new Date().toDateString()).getTime();
  const b = new Date(dueDate).getTime();
  return Math.round((b - a) / 86400000);
}

/** An invoice is up for a reminder 3 days before the due date, and again if it is late and none went in the last 5 days. */
export function reminderDue(r: InvoiceRow): boolean {
  if (r.invoice.status !== 'issued' || r.balance <= 0) return false;
  const d = daysToDue(r.invoice.due_date);
  if (d == null || d > REMIND_BEFORE_DAYS) return false;
  if (!r.invoice.last_reminder_at) return true;
  const since = Math.floor((Date.now() - new Date(r.invoice.last_reminder_at).getTime()) / 86400000);
  return d < 0 ? since >= 5 : false;
}

export function reminderMessage(r: { invoice: Invoice; party: Party | null; balance: number }, company: CompanySettings) {
  const who = r.party?.contact_person || r.party?.name || 'Sir/Madam';
  const d = daysToDue(r.invoice.due_date);
  const amount = formatInr(r.balance).replace(/\.00$/, '');
  const bank = company.bank_name && company.bank_account ? ` Bank: ${company.bank_name}, A/c ${company.bank_account}, IFSC ${company.bank_ifsc ?? ''}.` : '';
  const head = `Hello ${who},`;
  const sign = `— ${company.name}`;
  if (d != null && d < 0) {
    return `${head} invoice ${r.invoice.number} for ${amount} was due on ${formatDate(r.invoice.due_date)} and is ${-d} day${d === -1 ? '' : 's'} overdue. Please arrange the payment, or let us know when to expect it.${bank} ${sign}`;
  }
  return `${head} a gentle reminder that invoice ${r.invoice.number} for ${amount} is due on ${formatDate(r.invoice.due_date)}.${bank} ${sign}`;
}

export function receiptMessage(a: { party: Party | null; invoice: Invoice; amount: number; balance: number; company: CompanySettings }) {
  const who = a.party?.contact_person || a.party?.name || 'Sir/Madam';
  const got = formatInr(a.amount).replace(/\.00$/, '');
  const rest = a.balance > 0 ? ` Balance on this invoice: ${formatInr(a.balance).replace(/\.00$/, '')}.` : ' This invoice is now fully paid.';
  return `Hello ${who}, we have received ${got} against invoice ${a.invoice.number}. Thank you.${rest} — ${a.company.name}`;
}

// ───────── Monthly GST sheet ─────────
export type GstRow = { invoice: Invoice; party: Party | null };

export function gstTotals(rows: GstRow[]) {
  return rows.reduce(
    (t, r) => ({ taxable: t.taxable + r.invoice.taxable_value, cgst: t.cgst + r.invoice.cgst, sgst: t.sgst + r.invoice.sgst, igst: t.igst + r.invoice.igst, total: t.total + r.invoice.total }),
    { taxable: 0, cgst: 0, sgst: 0, igst: 0, total: 0 },
  );
}

const q = (s: string | number | null | undefined) => `"${String(s ?? '').replace(/"/g, '""')}"`;

/** Invoice register plus HSN summary, the two tables a CA needs for the sales return. */
export type PurchaseRow = { po: PurchaseOrder; supplier: Party | null };

export function purchaseTotals(rows: PurchaseRow[]) {
  return rows.reduce((t, r) => ({ taxable: t.taxable + r.po.taxable_value, cgst: t.cgst + r.po.cgst, sgst: t.sgst + r.po.sgst, igst: t.igst + r.po.igst }), { taxable: 0, cgst: 0, sgst: 0, igst: 0 });
}

export function gstCsv(rows: GstRow[], items: InvoiceItem[], company: CompanySettings, monthLabel: string, purchases: PurchaseRow[] = []) {
  const out: string[] = [];
  out.push(`${q(company.name)},${q('GSTIN ' + (company.gstin ?? ''))},${q('Sales register ' + monthLabel)}`);
  out.push('');
  out.push(['Invoice no', 'Date', 'Customer', 'Customer GSTIN', 'Place of supply', 'Taxable value', 'CGST', 'SGST', 'IGST', 'Round off', 'Invoice value'].map(q).join(','));
  for (const r of rows) {
    const v = r.invoice;
    out.push([v.number, v.invoice_date, r.party?.name, r.party?.gstin ?? 'Unregistered', v.place_of_supply, v.taxable_value, v.cgst, v.sgst, v.igst, v.round_off, v.total].map(q).join(','));
  }
  const t = gstTotals(rows);
  out.push(['Total', '', '', '', '', t.taxable.toFixed(2), t.cgst.toFixed(2), t.sgst.toFixed(2), t.igst.toFixed(2), '', t.total.toFixed(2)].map(q).join(','));
  out.push('');
  out.push(['HSN', 'Unit', 'Quantity', 'Taxable value', 'CGST', 'SGST', 'IGST'].map(q).join(','));
  const byHsn = new Map<string, { qty: number; taxable: number; cgst: number; sgst: number; igst: number }>();
  const ids = new Set(rows.map((r) => r.invoice.id));
  for (const i of items.filter((x) => ids.has(x.invoice_id))) {
    const k = i.hsn_code ?? '';
    const cur = byHsn.get(k) ?? { qty: 0, taxable: 0, cgst: 0, sgst: 0, igst: 0 };
    cur.qty += i.metres;
    cur.taxable += i.taxable;
    cur.cgst += i.cgst;
    cur.sgst += i.sgst;
    cur.igst += i.igst;
    byHsn.set(k, cur);
  }
  for (const [hsn, h] of byHsn) out.push([hsn, 'MTR', h.qty.toFixed(2), h.taxable.toFixed(2), h.cgst.toFixed(2), h.sgst.toFixed(2), h.igst.toFixed(2)].map(q).join(','));
  out.push('');
  out.push(q('Purchase register (supplier bills received)'));
  out.push(['Supplier bill no', 'Bill date', 'Supplier', 'Supplier GSTIN', 'Taxable value', 'CGST', 'SGST', 'IGST', 'Bill value'].map(q).join(','));
  for (const r of purchases) {
    const v = r.po;
    out.push([v.supplier_bill_no, v.supplier_bill_date, r.supplier?.name, r.supplier?.gstin ?? 'Unregistered', v.taxable_value, v.cgst, v.sgst, v.igst, v.total].map(q).join(','));
  }
  const pt = purchaseTotals(purchases);
  out.push(['Total', '', '', '', pt.taxable.toFixed(2), pt.cgst.toFixed(2), pt.sgst.toFixed(2), pt.igst.toFixed(2), ''].map(q).join(','));
  out.push('');
  out.push(q(`Output tax ${(t.cgst + t.sgst + t.igst).toFixed(2)}, input tax ${(pt.cgst + pt.sgst + pt.igst).toFixed(2)}, ${t.cgst + t.sgst + t.igst - pt.cgst - pt.sgst - pt.igst >= 0 ? 'net payable ' + (t.cgst + t.sgst + t.igst - pt.cgst - pt.sgst - pt.igst).toFixed(2) : 'credit to carry forward ' + (pt.cgst + pt.sgst + pt.igst - t.cgst - t.sgst - t.igst).toFixed(2)}. Input credit is only valid for suppliers who are registered and have filed; your CA confirms.`));
  return out.join('\n');
}
