import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';

import { round2 } from './calc';
import type { Party, PurchaseOrder, PurchaseOrderItem } from './database.types';
import { supabase } from './supabase';

function unwrap<R extends { data: unknown; error: { message: string } | null }>(res: R): NonNullable<R['data']> {
  if (res.error) throw new Error(res.error.message);
  return res.data as NonNullable<R['data']>;
}

export const PO_STATUS_LABEL = { ordered: 'Ordered', received: 'Received', cancelled: 'Cancelled' } as const;

const invalidate = (qc: QueryClient) => {
  for (const k of ['purchases', 'purchase', 'raw', 'material-cost', 'gst']) qc.invalidateQueries({ queryKey: [k] });
};

export type PoRow = { po: PurchaseOrder; supplier: Party | null; items: PurchaseOrderItem[]; subtotal: number };

export const poSubtotal = (items: { qty: number; rate: number }[]) => round2(items.reduce((s, i) => s + i.qty * i.rate, 0));

async function load(pos: PurchaseOrder[]): Promise<PoRow[]> {
  if (pos.length === 0) return [];
  const [items, parties] = await Promise.all([
    supabase.from('purchase_order_items').select('*').in('po_id', pos.map((p) => p.id)),
    supabase.from('parties').select('*').in('id', [...new Set(pos.map((p) => p.supplier_id))]),
  ]);
  const itemRows = unwrap(items);
  const partyRows = unwrap(parties);
  return pos.map((po) => {
    const its = itemRows.filter((i) => i.po_id === po.id);
    return { po, supplier: partyRows.find((p) => p.id === po.supplier_id) ?? null, items: its, subtotal: poSubtotal(its) };
  });
}

export function usePurchaseOrders() {
  return useQuery({
    queryKey: ['purchases'],
    queryFn: async () => load(unwrap(await supabase.from('purchase_orders').select('*').order('created_at', { ascending: false }).limit(300))),
  });
}

export function usePurchaseOrder(id: string | undefined) {
  return useQuery({
    queryKey: ['purchase', id],
    enabled: !!id,
    queryFn: async () => (await load([unwrap(await supabase.from('purchase_orders').select('*').eq('id', id!).single())]))[0],
  });
}

export function useCreatePurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (a: { supplierId: string; expectedDate: string | null; notes: string | null; items: { material_id: string; qty: number; rate: number; gst_percent: number }[] }) => {
      if (a.items.length === 0) throw new Error('Add at least one item.');
      const po = unwrap(await supabase.from('purchase_orders').insert({ supplier_id: a.supplierId, expected_date: a.expectedDate, notes: a.notes }).select().single());
      try {
        unwrap(await supabase.from('purchase_order_items').insert(a.items.map((i) => ({ po_id: po.id, ...i }))).select());
      } catch (e) {
        await supabase.from('purchase_orders').update({ status: 'cancelled' }).eq('id', po.id);
        throw e;
      }
      return po.id;
    },
    onSuccess: () => invalidate(qc),
  });
}

/** Receiving fixes the supplier's bill amounts (for input tax credit) and adds the goods to stock. */
export function useReceivePurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (a: { id: string; items: { qty: number; rate: number; gst_percent: number }[]; interstate: boolean; billNo: string; billDate: string | null }) => {
      const taxable = round2(a.items.reduce((s, i) => s + i.qty * i.rate, 0));
      const tax = round2(a.items.reduce((s, i) => s + (i.qty * i.rate * i.gst_percent) / 100, 0));
      const half = round2(tax / 2);
      return unwrap(
        await supabase
          .from('purchase_orders')
          .update({
            status: 'received',
            supplier_bill_no: a.billNo.trim(),
            supplier_bill_date: a.billDate,
            is_interstate: a.interstate,
            taxable_value: taxable,
            cgst: a.interstate ? 0 : half,
            sgst: a.interstate ? 0 : round2(tax - half),
            igst: a.interstate ? tax : 0,
            total: round2(taxable + tax),
          })
          .eq('id', a.id)
          .select()
          .single(),
      );
    },
    onSuccess: () => invalidate(qc),
  });
}

export function useUpdatePurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...fields }: { id: string } & Partial<Pick<PurchaseOrder, 'status' | 'paid_on' | 'notes'>>) =>
      unwrap(await supabase.from('purchase_orders').update(fields).eq('id', id).select().single()),
    onSuccess: () => invalidate(qc),
  });
}

/** Average price paid per unit of each material (before GST), from goods received. */
export function useMaterialCost() {
  return useQuery({
    queryKey: ['material-cost'],
    queryFn: async () => {
      const rows = unwrap(await supabase.from('material_cost').select('*'));
      return new Map(rows.map((r) => [r.material_id!, Number(r.avg_rate ?? 0)]));
    },
  });
}
