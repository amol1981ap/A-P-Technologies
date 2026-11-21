import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';

import { addDaysIso } from './calc';
import type { Despatch, DespatchItem, Invoice, InvoiceItem, Order, OrderItem, Party, Payment, PaymentMode, Product } from './database.types';
import { computeInvoice, type InvoiceLineInput } from './gst';
import { productName } from './queries';
import { supabase } from './supabase';

function unwrap<R extends { data: unknown; error: { message: string } | null }>(res: R): NonNullable<R['data']> {
  if (res.error) throw new Error(res.error.message);
  return res.data as NonNullable<R['data']>;
}

export const PAYMENT_MODE_LABEL: Record<PaymentMode, string> = {
  bank_transfer: 'Bank transfer',
  upi: 'UPI',
  cheque: 'Cheque',
  cash: 'Cash',
  other: 'Other',
};

const invalidate = (qc: QueryClient) => {
  for (const k of ['invoices', 'invoice', 'uninvoiced', 'gst']) qc.invalidateQueries({ queryKey: [k] });
};

// ───────────── Invoices ─────────────
export type InvoiceRow = { invoice: Invoice; party: Party | null; paid: number; balance: number; daysOverdue: number };

export function useInvoices() {
  return useQuery({
    queryKey: ['invoices'],
    queryFn: async (): Promise<InvoiceRow[]> => {
      const [inv, bal] = await Promise.all([
        supabase.from('invoices').select('*').order('invoice_date', { ascending: false }).order('created_at', { ascending: false }).limit(1000),
        supabase.from('invoice_balances').select('*').limit(1000),
      ]);
      const invoices = unwrap(inv);
      const balances = unwrap(bal);
      const partyIds = [...new Set(invoices.map((i) => i.party_id))];
      const parties = partyIds.length ? unwrap(await supabase.from('parties').select('*').in('id', partyIds)) : [];
      return invoices.map((invoice) => {
        const b = balances.find((x) => x.invoice_id === invoice.id);
        return {
          invoice,
          party: parties.find((p) => p.id === invoice.party_id) ?? null,
          paid: Number(b?.paid ?? 0),
          balance: invoice.status === 'issued' ? Number(b?.balance ?? invoice.total) : 0,
          daysOverdue: invoice.status === 'issued' ? Number(b?.days_overdue ?? 0) : 0,
        };
      });
    },
  });
}

export type InvoiceDetail = { invoice: Invoice; items: InvoiceItem[]; payments: Payment[]; party: Party | null; order: Order | null; despatch: Despatch | null; paid: number; balance: number; daysOverdue: number };

export function useInvoice(id: string | undefined) {
  return useQuery({
    queryKey: ['invoice', id],
    enabled: !!id,
    queryFn: async (): Promise<InvoiceDetail> => {
      const invoice = unwrap(await supabase.from('invoices').select('*').eq('id', id!).single());
      const [items, payments, party, order, despatch] = await Promise.all([
        supabase.from('invoice_items').select('*').eq('invoice_id', id!),
        supabase.from('payments').select('*').eq('invoice_id', id!).order('received_on'),
        supabase.from('parties').select('*').eq('id', invoice.party_id).maybeSingle(),
        invoice.order_id ? supabase.from('orders').select('*').eq('id', invoice.order_id).maybeSingle() : Promise.resolve({ data: null, error: null }),
        invoice.despatch_id ? supabase.from('despatches').select('*').eq('id', invoice.despatch_id).maybeSingle() : Promise.resolve({ data: null, error: null }),
      ]);
      const pay = unwrap(payments);
      const paid = pay.reduce((s, p) => s + Number(p.amount), 0);
      // Whole calendar days, the same way the Money list counts them.
      const today = new Date(new Date().toDateString()).getTime();
      const days = invoice.due_date ? Math.max(0, Math.round((today - new Date(invoice.due_date).getTime()) / 86400000)) : 0;
      return {
        invoice,
        items: unwrap(items),
        payments: pay,
        party: party.data ?? null,
        order: order.data ?? null,
        despatch: despatch.data ?? null,
        paid,
        balance: invoice.status === 'issued' ? Number(invoice.total) - paid : 0,
        daysOverdue: invoice.status === 'issued' && Number(invoice.total) - paid > 0 ? days : 0,
      };
    },
  });
}

// ───────────── Despatches waiting for an invoice ─────────────
export type Uninvoiced = {
  despatch: Despatch;
  order: Order;
  party: Party;
  items: DespatchItem[];
  orderItems: OrderItem[];
  products: Product[];
};

export function useUninvoiced() {
  return useQuery({
    queryKey: ['uninvoiced'],
    queryFn: async (): Promise<Uninvoiced[]> => {
      const [desp, inv] = await Promise.all([
        supabase.from('despatches').select('*').order('created_at', { ascending: false }).limit(300),
        supabase.from('invoices').select('despatch_id, status').not('despatch_id', 'is', null),
      ]);
      const invoiced = new Set(unwrap(inv).filter((i) => i.status !== 'cancelled').map((i) => i.despatch_id));
      const open = unwrap(desp).filter((d) => !invoiced.has(d.id));
      if (open.length === 0) return [];
      const [items, orders, products] = await Promise.all([
        supabase.from('despatch_items').select('*').in('despatch_id', open.map((d) => d.id)),
        supabase.from('orders').select('*').in('id', [...new Set(open.map((d) => d.order_id))]),
        supabase.from('products').select('*'),
      ]);
      const orderRows = unwrap(orders);
      const [parties, orderItems] = await Promise.all([
        supabase.from('parties').select('*').in('id', [...new Set(orderRows.map((o) => o.party_id))]),
        supabase.from('order_items').select('*').in('order_id', orderRows.map((o) => o.id)),
      ]);
      const itemRows = unwrap(items);
      const partyRows = unwrap(parties);
      const oiRows = unwrap(orderItems);
      const productRows = unwrap(products);
      return open.flatMap((despatch) => {
        const order = orderRows.find((o) => o.id === despatch.order_id);
        const party = partyRows.find((p) => p.id === order?.party_id);
        if (!order || !party) return [];
        return [{ despatch, order, party, items: itemRows.filter((i) => i.despatch_id === despatch.id), orderItems: oiRows.filter((i) => i.order_id === order.id), products: productRows }];
      });
    },
  });
}

/** Lines for an invoice: what was despatched, at the rates on the order. */
export function linesFromDespatch(u: Uninvoiced): { lines: InvoiceLineInput[]; missing: string[] } {
  const lines: InvoiceLineInput[] = [];
  const missing: string[] = [];
  const byProduct = new Map<string, number>();
  for (const i of u.items) byProduct.set(i.product_id, (byProduct.get(i.product_id) ?? 0) + i.metres);
  for (const [pid, metres] of byProduct) {
    const p = u.products.find((x) => x.id === pid);
    const oi = u.orderItems.find((x) => x.product_id === pid);
    const name = p ? `GFRP rebar, ${productName(p)}` : 'GFRP rebar';
    if (!oi || oi.rate_per_kg == null || oi.kg_per_m == null || oi.gst_percent == null) {
      missing.push(`${name}: no rate on the order`);
      continue;
    }
    lines.push({ product_id: pid, description: name, hsn_code: p?.hsn_code ?? null, metres, kg_per_m: oi.kg_per_m, rate_per_kg: oi.rate_per_kg, gst_percent: oi.gst_percent });
  }
  return { lines, missing };
}

export function useIssueInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (a: {
      orderId: string;
      despatchId: string;
      partyId: string;
      lines: InvoiceLineInput[];
      interstate: boolean;
      placeOfSupply: string | null;
      ewayBill: string | null;
      termsDays: number;
    }) => {
      if (a.lines.some((l) => !l.hsn_code?.trim())) throw new Error('Add the HSN code for every product in More › Products & rates first.');
      const calc = computeInvoice(a.lines, a.interstate);
      const date = addDaysIso(0);
      const draft = unwrap(
        await supabase
          .from('invoices')
          .insert({
            order_id: a.orderId,
            despatch_id: a.despatchId,
            party_id: a.partyId,
            invoice_date: date,
            due_date: addDaysIso(a.termsDays),
            terms_days: a.termsDays,
            taxable_value: calc.taxable,
            cgst: calc.cgst,
            sgst: calc.sgst,
            igst: calc.igst,
            round_off: calc.roundOff,
            total: calc.total,
            status: 'draft',
            place_of_supply: a.placeOfSupply,
            is_interstate: a.interstate,
            eway_bill_no: a.ewayBill,
          })
          .select()
          .single(),
      );
      try {
        unwrap(await supabase.from('invoice_items').insert(calc.lines.map((l) => ({ invoice_id: draft.id, ...l }))).select());
      } catch (e) {
        await supabase.from('invoices').update({ status: 'cancelled' }).eq('id', draft.id);
        throw e;
      }
      const issued = unwrap(await supabase.from('invoices').update({ status: 'issued' }).eq('id', draft.id).select().single());
      return issued.id;
    },
    onSuccess: () => invalidate(qc),
  });
}

export function useRecordPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { invoice_id: string; party_id: string; amount: number; received_on: string; mode: PaymentMode; reference: string | null }) =>
      unwrap(await supabase.from('payments').insert(p).select().single()),
    onSuccess: () => invalidate(qc),
  });
}

export function useUpdateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...fields }: { id: string } & Partial<Pick<Invoice, 'status' | 'eway_bill_no' | 'last_reminder_at' | 'reminders_sent' | 'notes'>>) =>
      unwrap(await supabase.from('invoices').update(fields).eq('id', id).select().single()),
    onSuccess: () => invalidate(qc),
  });
}

// ───────────── GST sheet ─────────────
export function useGstMonth(from: string, to: string) {
  return useQuery({
    queryKey: ['gst', from, to],
    queryFn: async () => {
      const invoices = unwrap(
        await supabase.from('invoices').select('*').eq('status', 'issued').gte('invoice_date', from).lt('invoice_date', to).order('invoice_date').order('number'),
      );
      // Supplier bills counted in the month the bill is dated. Money-wise: goods received on a purchase order.
      const purchases = unwrap(
        await supabase.from('purchase_orders').select('*').eq('status', 'received').gte('supplier_bill_date', from).lt('supplier_bill_date', to).order('supplier_bill_date'),
      );
      const partyIds = [...new Set([...invoices.map((i) => i.party_id), ...purchases.map((p) => p.supplier_id)])];
      const [items, parties] = await Promise.all([
        invoices.length ? supabase.from('invoice_items').select('*').in('invoice_id', invoices.map((i) => i.id)) : Promise.resolve({ data: [] as InvoiceItem[], error: null }),
        partyIds.length ? supabase.from('parties').select('*').in('id', partyIds) : Promise.resolve({ data: [] as Party[], error: null }),
      ]);
      return { invoices, purchases, items: unwrap(items), parties: unwrap(parties) };
    },
  });
}
