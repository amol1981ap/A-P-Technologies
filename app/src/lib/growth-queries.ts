import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';

import type { LeadSource, Prospect, ProspectStatus } from './database.types';
import type { ProspectRow } from './prospect-import';
import { supabase } from './supabase';

function unwrap<R extends { data: unknown; error: { message: string } | null }>(res: R): NonNullable<R['data']> {
  if (res.error) throw new Error(res.error.message);
  return res.data as NonNullable<R['data']>;
}

export const PROSPECT_STATUS_LABEL: Record<ProspectStatus, string> = {
  new: 'New',
  contacted: 'Contacted',
  interested: 'Interested',
  converted: 'Became a lead',
  dropped: 'Dropped',
};

const invalidate = (qc: QueryClient) => {
  for (const k of ['prospects', 'performance', 'spend', 'leads', 'lead']) qc.invalidateQueries({ queryKey: [k] });
};

// ───────────── Performance by source ─────────────
export function usePerformance() {
  return useQuery({
    queryKey: ['performance'],
    queryFn: async () => unwrap(await supabase.from('lead_performance').select('*').limit(5000)),
  });
}

export function useSpend() {
  return useQuery({
    queryKey: ['spend'],
    queryFn: async () => unwrap(await supabase.from('marketing_spend').select('*').order('month', { ascending: false }).limit(500)),
  });
}

export function useSaveSpend() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (a: { month: string; source: LeadSource; amount: number; note: string | null }) =>
      unwrap(await supabase.from('marketing_spend').upsert(a, { onConflict: 'month,source' }).select().single()),
    onSuccess: () => invalidate(qc),
  });
}

// ───────────── Prospects ─────────────
export function useProspects() {
  return useQuery({
    queryKey: ['prospects'],
    queryFn: async () =>
      unwrap(await supabase.from('prospects').select('*').order('next_action_date', { ascending: true, nullsFirst: false }).order('created_at', { ascending: false }).limit(500)),
  });
}

export type ProspectInput = Omit<Prospect, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'lead_id'>;

export function useSaveProspect() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...fields }: Partial<ProspectInput> & { id?: string; name?: string }) => {
      if (id) return unwrap(await supabase.from('prospects').update(fields).eq('id', id).select().single());
      return unwrap(await supabase.from('prospects').insert({ ...fields, name: fields.name ?? '' }).select().single());
    },
    onSuccess: () => invalidate(qc),
  });
}

/** Turns a prospect who showed interest into a lead, and links the two. */
export function useConvertProspect() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: Prospect) => {
      const lead = unwrap(
        await supabase
          .from('leads')
          .insert({
            contact_name: p.name,
            company: p.organisation,
            phone: p.phone,
            buyer_role: p.role,
            location: p.location,
            notes: p.project_note,
            source: 'other',
            campaign: 'prospecting',
            status: 'contacted',
          })
          .select()
          .single(),
      );
      unwrap(await supabase.from('prospects').update({ status: 'converted', lead_id: lead.id }).eq('id', p.id).select().single());
      return lead.id;
    },
    onSuccess: () => invalidate(qc),
  });
}

/** Saves a checked CSV import. Rows go in batches of 100 so a big file does not time out. */
export function useImportProspects() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rows: ProspectRow[]) => {
      for (let i = 0; i < rows.length; i += 100) {
        unwrap(await supabase.from('prospects').insert(rows.slice(i, i + 100)).select('id'));
      }
      return rows.length;
    },
    onSuccess: () => invalidate(qc),
  });
}
