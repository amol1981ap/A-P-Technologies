import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { AppRole, CompanySettings, Party, PartyType, Product, RebarSurface } from './database.types';
import { callFunction, supabase } from './supabase';

function unwrap<R extends { data: unknown; error: { message: string } | null }>(res: R): NonNullable<R['data']> {
  if (res.error) throw new Error(res.error.message);
  return res.data as NonNullable<R['data']>;
}

// ───────── Labels ─────────
export const SURFACE_LABEL: Record<RebarSurface, string> = { sand_coated: 'Sand-coated', ribbed: 'Ribbed' };
export const PARTY_TYPE_LABEL: Record<PartyType, string> = {
  customer: 'Customers',
  consultant: 'Consultants',
  supplier: 'Suppliers',
  transporter: 'Transporters',
};
export const productName = (p: Pick<Product, 'diameter_mm' | 'surface'>) => `${p.diameter_mm} mm ${SURFACE_LABEL[p.surface].toLowerCase()}`;

// ───────── Products & rates ─────────
export type ProductWithRate = Product & { rate_per_kg: number | null; gst_percent: number | null };

export function useProducts(withRates: boolean) {
  return useQuery({
    queryKey: ['products', withRates],
    queryFn: async (): Promise<ProductWithRate[]> => {
      const products = unwrap(await supabase.from('products').select('*').order('diameter_mm').order('surface'));
      if (!withRates) return products.map((p) => ({ ...p, rate_per_kg: null, gst_percent: null }));
      const rates = unwrap(await supabase.from('current_rates').select('*'));
      const byId = new Map(rates.map((r) => [r.product_id, r]));
      return products.map((p) => ({
        ...p,
        rate_per_kg: byId.get(p.id)?.rate_per_kg ?? null,
        gst_percent: byId.get(p.id)?.gst_percent ?? null,
      }));
    },
  });
}

export function useSaveProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { id?: string; diameter_mm: number; surface: RebarSurface; standard_length_m: number; hsn_code: string | null; kg_per_m?: number; active?: boolean; reorder_level_m?: number }) => {
      const { id, ...fields } = p;
      if (id) unwrap(await supabase.from('products').update(fields).eq('id', id).select().single());
      else unwrap(await supabase.from('products').insert(fields).select().single());
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  });
}

/** Adds the usual GFRP diameters for one surface in one go. Skips any that already exist. */
export const STANDARD_DIAMETERS = [8, 10, 12, 16, 18, 20, 22, 24];
export function useAddStandardSizes() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (surface: RebarSurface) => {
      const rows = STANDARD_DIAMETERS.map((d) => ({ diameter_mm: d, surface, standard_length_m: 12, hsn_code: '70193900' }));
      unwrap(await supabase.from('products').upsert(rows, { onConflict: 'diameter_mm,surface', ignoreDuplicates: true }).select());
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  });
}

export function useSetRate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (r: { product_id: string; rate_per_kg: number; gst_percent: number | null }) => {
      unwrap(await supabase.from('rates').insert(r).select().single());
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  });
}

// ───────── Parties ─────────
export function useParties(type: PartyType) {
  return useQuery({
    queryKey: ['parties', type],
    queryFn: async () => unwrap(await supabase.from('parties').select('*').eq('type', type).order('name')),
  });
}

export function useParty(id: string | undefined) {
  return useQuery({
    queryKey: ['party', id],
    enabled: !!id,
    queryFn: async () => unwrap(await supabase.from('parties').select('*').eq('id', id!).single()),
  });
}

export type PartyInput = Omit<Party, 'id' | 'created_at' | 'updated_at' | 'created_by'>;

export function useSaveParty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...fields }: PartyInput & { id?: string }) => {
      if (id) return unwrap(await supabase.from('parties').update(fields).eq('id', id).select().single());
      return unwrap(await supabase.from('parties').insert(fields).select().single());
    },
    onSuccess: (p) => {
      qc.invalidateQueries({ queryKey: ['parties'] });
      qc.setQueryData(['party', p.id], p);
    },
  });
}

// ───────── Team ─────────
export function useTeam() {
  return useQuery({
    queryKey: ['team'],
    queryFn: async () => unwrap(await supabase.from('profiles').select('*').order('active', { ascending: false }).order('full_name')),
  });
}

export function useTeamAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body:
      | { action: 'create'; full_name: string; login: string; password: string; role: Exclude<AppRole, 'owner'> }
      | { action: 'update'; user_id: string; role?: AppRole; active?: boolean }
      | { action: 'reset_password'; user_id: string; password: string }) => callFunction('team', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['team'] }),
  });
}

// ───────── Company ─────────
export function useCompany() {
  return useQuery({
    queryKey: ['company'],
    queryFn: async () => unwrap(await supabase.from('company_settings').select('*').eq('id', 1).single()),
  });
}

export function useSaveCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (fields: Partial<Omit<CompanySettings, 'id' | 'updated_at'>>) =>
      unwrap(await supabase.from('company_settings').update(fields).eq('id', 1).select().single()),
    onSuccess: (data) => qc.setQueryData(['company'], data),
  });
}

// ───────── Validation ─────────
export const GSTIN_PATTERN = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
export const blankToNull = (s: string) => (s.trim() === '' ? null : s.trim());
