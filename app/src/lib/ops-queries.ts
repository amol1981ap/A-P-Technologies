import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';

import type {
  Despatch,
  DespatchItem,
  DespatchStatus,
  Order,
  OrderItem,
  OrderStage,
  Party,
  Product,
  ProductionEntry,
} from './database.types';
import { supabase } from './supabase';

function unwrap<R extends { data: unknown; error: { message: string } | null }>(res: R): NonNullable<R['data']> {
  if (res.error) throw new Error(res.error.message);
  return res.data as NonNullable<R['data']>;
}

export const STAGE_LABEL: Record<OrderStage, string> = {
  new: 'New',
  in_production: 'In production',
  ready: 'Ready',
  dispatched: 'Dispatched',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};
/** The five stages shown as a progress strip, in order. */
export const STAGES: OrderStage[] = ['new', 'in_production', 'ready', 'dispatched', 'delivered'];
export const STAGE_BAND = ['#D6E7DF', '#9CCBB8', '#5E9E84', '#2F7259', '#1F5C46'];
export const DESPATCH_LABEL: Record<DespatchStatus, string> = { pending: 'To load', loaded: 'Loaded', delivered: 'Delivered' };

const invalidate = (qc: QueryClient) => {
  for (const k of ['orders', 'order', 'despatches', 'despatch', 'stock', 'production', 'raw']) qc.invalidateQueries({ queryKey: [k] });
};

// ───────────── Orders ─────────────
export type OrderBundle = {
  order: Order;
  party: Party | null;
  items: OrderItem[];
  despatches: (Despatch & { items: DespatchItem[] })[];
};

async function loadOrders(orders: Order[]): Promise<OrderBundle[]> {
  if (orders.length === 0) return [];
  const ids = orders.map((o) => o.id);
  const partyIds = [...new Set(orders.map((o) => o.party_id))];
  const [items, parties, despatches] = await Promise.all([
    supabase.from('order_items').select('*').in('order_id', ids),
    supabase.from('parties').select('*').in('id', partyIds),
    supabase.from('despatches').select('*').in('order_id', ids),
  ]);
  const dRows = unwrap(despatches);
  const dItems = dRows.length ? unwrap(await supabase.from('despatch_items').select('*').in('despatch_id', dRows.map((d) => d.id))) : [];
  const itemRows = unwrap(items);
  const partyRows = unwrap(parties);
  return orders.map((order) => ({
    order,
    party: partyRows.find((p) => p.id === order.party_id) ?? null,
    items: itemRows.filter((i) => i.order_id === order.id),
    despatches: dRows.filter((d) => d.order_id === order.id).map((d) => ({ ...d, items: dItems.filter((i) => i.despatch_id === d.id) })),
  }));
}

export function useOrders() {
  return useQuery({
    queryKey: ['orders'],
    queryFn: async () => loadOrders(unwrap(await supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(300))),
  });
}

export function useOrder(id: string | undefined) {
  return useQuery({
    queryKey: ['order', id],
    enabled: !!id,
    queryFn: async () => {
      const o = unwrap(await supabase.from('orders').select('*').eq('id', id!).single());
      return (await loadOrders([o]))[0];
    },
  });
}

/** Owner only: turns an accepted quote into an order, copying lines with the approved rates. */
export function useCreateOrderFromQuote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (a: { quoteId: string; partyId: string; poNumber: string | null; siteAddress: string | null; dueDate: string | null }) => {
      const existing = unwrap(await supabase.from('orders').select('id').eq('quote_id', a.quoteId).limit(1));
      if (existing.length) return existing[0].id;
      const items = unwrap(await supabase.from('quote_items').select('*').eq('quote_id', a.quoteId));
      if (items.length === 0) throw new Error('This quote has no items.');
      const order = unwrap(
        await supabase
          .from('orders')
          .insert({ quote_id: a.quoteId, party_id: a.partyId, po_number: a.poNumber, site_address: a.siteAddress, due_date: a.dueDate })
          .select()
          .single(),
      );
      unwrap(
        await supabase
          .from('order_items')
          .insert(items.map((i) => ({ order_id: order.id, product_id: i.product_id, metres: i.metres, rate_per_m: i.rate_per_m, gst_percent: i.gst_percent })))
          .select(),
      );
      return order.id;
    },
    onSuccess: () => invalidate(qc),
  });
}

export function useSetStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, stage }: { id: string; stage: OrderStage }) => unwrap(await supabase.from('orders').update({ stage }).eq('id', id).select().single()),
    onSuccess: () => invalidate(qc),
  });
}

// ───────────── Despatch ─────────────
export function useReleaseDespatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (a: { orderId: string; assignedTo: string; releasedBy: string; lines: { product_id: string; metres: number; batch_no: string | null }[] }) => {
      const d = unwrap(
        await supabase
          .from('despatches')
          .insert({ order_id: a.orderId, assigned_to: a.assignedTo, released_by: a.releasedBy, batch_numbers: [...new Set(a.lines.map((l) => l.batch_no).filter((b): b is string => !!b))] })
          .select()
          .single(),
      );
      unwrap(await supabase.from('despatch_items').insert(a.lines.map((l) => ({ despatch_id: d.id, ...l }))).select());
      unwrap(await supabase.from('orders').update({ stage: 'dispatched' }).eq('id', a.orderId).select().single());
      return d.id;
    },
    onSuccess: () => invalidate(qc),
  });
}

export type DespatchBundle = { despatch: Despatch; items: DespatchItem[]; order: Order | null; party: Party | null; products: Product[] };

async function loadDespatches(rows: Despatch[]): Promise<DespatchBundle[]> {
  if (rows.length === 0) return [];
  const [items, orders, products] = await Promise.all([
    supabase.from('despatch_items').select('*').in('despatch_id', rows.map((d) => d.id)),
    supabase.from('orders').select('*').in('id', [...new Set(rows.map((d) => d.order_id))]),
    supabase.from('products').select('*'),
  ]);
  const orderRows = unwrap(orders);
  const parties = orderRows.length ? unwrap(await supabase.from('parties').select('*').in('id', [...new Set(orderRows.map((o) => o.party_id))])) : [];
  const itemRows = unwrap(items);
  const productRows = unwrap(products);
  return rows.map((despatch) => {
    const order = orderRows.find((o) => o.id === despatch.order_id) ?? null;
    return {
      despatch,
      items: itemRows.filter((i) => i.despatch_id === despatch.id),
      order,
      party: parties.find((p) => p.id === order?.party_id) ?? null,
      products: productRows,
    };
  });
}

export function useDespatches(onlyMine: boolean, myId: string | undefined) {
  return useQuery({
    queryKey: ['despatches', onlyMine, myId],
    enabled: !onlyMine || !!myId,
    queryFn: async () => {
      let q = supabase.from('despatches').select('*').order('created_at', { ascending: false }).limit(200);
      if (onlyMine) q = q.eq('assigned_to', myId!);
      return loadDespatches(unwrap(await q));
    },
  });
}

export function useDespatch(id: string | undefined) {
  return useQuery({
    queryKey: ['despatch', id],
    enabled: !!id,
    queryFn: async () => (await loadDespatches([unwrap(await supabase.from('despatches').select('*').eq('id', id!).single())]))[0],
  });
}

export function useUpdateDespatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...fields }: { id: string } & Partial<Pick<Despatch, 'status' | 'vehicle_no' | 'proof_path' | 'delivered_at'>>) =>
      unwrap(await supabase.from('despatches').update(fields).eq('id', id).select().single()),
    onSuccess: () => invalidate(qc),
  });
}

/** Uploads a delivery challan photo and returns its storage path. */
export async function uploadProof(despatchId: string, uri: string) {
  const res = await fetch(uri);
  const body = await res.arrayBuffer();
  const path = `${despatchId}/${Date.now()}.jpg`;
  const { error } = await supabase.storage.from('delivery-proofs').upload(path, body, { contentType: 'image/jpeg', upsert: true });
  if (error) throw new Error(error.message);
  return path;
}

export function useProofUrl(path: string | null | undefined) {
  return useQuery({
    queryKey: ['proof', path],
    enabled: !!path,
    staleTime: 30 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.storage.from('delivery-proofs').createSignedUrl(path!, 3600);
      if (error) throw new Error(error.message);
      return data.signedUrl;
    },
  });
}

// ───────────── Factory ─────────────
export type StockLine = { product: Product; produced: number; despatched: number; onHand: number; reorder: number; low: boolean };

export function useFinishedStock() {
  return useQuery({
    queryKey: ['stock'],
    queryFn: async (): Promise<StockLine[]> => {
      const [products, stock] = await Promise.all([
        supabase.from('products').select('*').eq('active', true).order('diameter_mm').order('surface'),
        supabase.from('finished_stock').select('*'),
      ]);
      const s = unwrap(stock);
      return unwrap(products).map((product) => {
        const row = s.find((x) => x.product_id === product.id);
        const onHand = Number(row?.on_hand_m ?? 0);
        const reorder = Number(product.reorder_level_m ?? 0);
        return { product, produced: Number(row?.produced_m ?? 0), despatched: Number(row?.despatched_m ?? 0), onHand, reorder, low: reorder > 0 && onHand < reorder };
      });
    },
  });
}

export function useProductionEntries(since: string) {
  return useQuery({
    queryKey: ['production', since],
    queryFn: async (): Promise<ProductionEntry[]> =>
      unwrap(await supabase.from('production_entries').select('*').gte('entry_date', since).order('entry_date', { ascending: false })),
  });
}

export function useSaveProduction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (e: { entry_date: string; product_id: string; good_m: number; scrap_m: number; resin_kg: number | null; roving_kg: number | null; notes: string | null }) =>
      unwrap(await supabase.from('production_entries').upsert(e, { onConflict: 'entry_date,product_id' }).select().single()),
    onSuccess: () => invalidate(qc),
  });
}

export type RawLine = { id: string; name: string; unit: string; onHand: number; perDay: number; daysLeft: number | null; low: boolean };
export const RAW_ALERT_DAYS = 7;

export function useRawStock() {
  return useQuery({
    queryKey: ['raw'],
    queryFn: async (): Promise<RawLine[]> => {
      const rows = unwrap(await supabase.from('raw_material_stock').select('*').order('sort'));
      return rows.map((r) => {
        const perDay = Number(r.avg_daily_use ?? 0);
        const onHand = Number(r.on_hand ?? 0);
        const daysLeft = perDay > 0 ? Math.floor(onHand / perDay) : null;
        return { id: r.material_id!, name: r.name!, unit: r.unit ?? 'kg', onHand, perDay, daysLeft, low: daysLeft != null && daysLeft < RAW_ALERT_DAYS };
      });
    },
  });
}

export function useReceiveStock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (r: { material_id: string; qty: number; note: string | null }) =>
      unwrap(await supabase.from('raw_material_movements').insert({ ...r, kind: 'receipt' as const }).select().single()),
    onSuccess: () => invalidate(qc),
  });
}
