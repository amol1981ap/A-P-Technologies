import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';

import { addDaysIso } from './calc';
import type { Lead, LeadStatus, Party, Quote, QuoteItem, QuoteStatus } from './database.types';
import { supabase } from './supabase';

function unwrap<R extends { data: unknown; error: { message: string } | null }>(res: R): NonNullable<R['data']> {
  if (res.error) throw new Error(res.error.message);
  return res.data as NonNullable<R['data']>;
}

export const LEAD_SOURCE_LABEL: Record<Lead['source'], string> = {
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
export const LEAD_STATUS_LABEL: Record<LeadStatus, string> = {
  new: 'New',
  contacted: 'Contacted',
  quoted: 'Quoted',
  won: 'Won',
  lost: 'Lost',
};
export const QUOTE_STATUS_LABEL: Record<QuoteStatus, string> = {
  draft: 'Draft',
  sent: 'Sent',
  accepted: 'Accepted',
  rejected: 'Not taken',
  expired: 'Expired',
};

const invalidate = (qc: QueryClient) => {
  qc.invalidateQueries({ queryKey: ['leads'] });
  qc.invalidateQueries({ queryKey: ['lead'] });
  qc.invalidateQueries({ queryKey: ['quotes'] });
  qc.invalidateQueries({ queryKey: ['quote'] });
};

// ───────── Leads ─────────
export function useLeads() {
  return useQuery({
    queryKey: ['leads'],
    queryFn: async () => unwrap(await supabase.from('leads').select('*').order('created_at', { ascending: false }).limit(300)),
  });
}

export function useLead(id: string | undefined) {
  return useQuery({
    queryKey: ['lead', id],
    enabled: !!id,
    queryFn: async () => unwrap(await supabase.from('leads').select('*').eq('id', id!).single()),
  });
}

export type LeadInput = Omit<Lead, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'party_id' | 'assigned_to' | 'lost_reason'>;

export function useSaveLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...fields }: LeadInput & { id?: string }) => {
      if (id) return unwrap(await supabase.from('leads').update(fields).eq('id', id).select().single());
      return unwrap(await supabase.from('leads').insert(fields).select().single());
    },
    onSuccess: () => invalidate(qc),
  });
}

export function useUpdateLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...fields }: { id: string } & Partial<Pick<Lead, 'status' | 'lost_reason' | 'next_follow_up' | 'score'>>) =>
      unwrap(await supabase.from('leads').update(fields).eq('id', id).select().single()),
    onSuccess: () => invalidate(qc),
  });
}

// ───────── Quotes ─────────
export type QuoteListItem = {
  quote: Quote;
  items: QuoteItem[];
  customer: string;
  lead: Lead | null;
  party: Party | null;
};

async function loadQuoteBundle(quotes: Quote[]): Promise<QuoteListItem[]> {
  if (quotes.length === 0) return [];
  const ids = quotes.map((q) => q.id);
  const partyIds = [...new Set(quotes.map((q) => q.party_id).filter((x): x is string => !!x))];
  const leadIds = [...new Set(quotes.map((q) => q.lead_id).filter((x): x is string => !!x))];
  const [items, parties, leads] = await Promise.all([
    supabase.from('quote_items').select('*').in('quote_id', ids),
    partyIds.length ? supabase.from('parties').select('*').in('id', partyIds) : Promise.resolve({ data: [] as Party[], error: null }),
    leadIds.length ? supabase.from('leads').select('*').in('id', leadIds) : Promise.resolve({ data: [] as Lead[], error: null }),
  ]);
  const itemRows = unwrap(items);
  const partyRows = unwrap(parties);
  const leadRows = unwrap(leads);
  return quotes.map((quote) => {
    const party = partyRows.find((p) => p.id === quote.party_id) ?? null;
    const lead = leadRows.find((l) => l.id === quote.lead_id) ?? null;
    return {
      quote,
      items: itemRows.filter((i) => i.quote_id === quote.id),
      party,
      lead,
      customer: party?.name ?? lead?.company ?? lead?.contact_name ?? 'Customer',
    };
  });
}

export function useQuotes() {
  return useQuery({
    queryKey: ['quotes'],
    queryFn: async () => {
      const quotes = unwrap(await supabase.from('quotes').select('*').order('created_at', { ascending: false }).limit(300));
      return loadQuoteBundle(quotes);
    },
  });
}

export function useQuote(id: string | undefined) {
  return useQuery({
    queryKey: ['quote', id],
    enabled: !!id,
    queryFn: async () => {
      const q = unwrap(await supabase.from('quotes').select('*').eq('id', id!).single());
      const [bundle] = await loadQuoteBundle([q]);
      return bundle;
    },
  });
}

/** Creates a draft quote for a lead, adding the customer record first if the lead has none. */
export function useCreateQuoteFromLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ lead, terms }: { lead: Lead; terms: string | null }) => {
      let partyId = lead.party_id;
      if (!partyId) {
        const party = unwrap(
          await supabase
            .from('parties')
            .insert({
              type: 'customer',
              name: lead.company?.trim() || lead.contact_name,
              contact_person: lead.contact_name,
              phone: lead.phone,
              whatsapp: lead.phone,
              city: lead.location,
            })
            .select()
            .single(),
        );
        partyId = party.id;
        unwrap(await supabase.from('leads').update({ party_id: partyId }).eq('id', lead.id).select().single());
      }
      return unwrap(
        await supabase
          .from('quotes')
          .insert({ lead_id: lead.id, party_id: partyId, terms, valid_until: addDaysIso(15) })
          .select()
          .single(),
      );
    },
    onSuccess: () => {
      invalidate(qc);
      qc.invalidateQueries({ queryKey: ['parties'] });
    },
  });
}

export function useUpdateQuote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...fields }: { id: string } & Partial<Pick<Quote, 'status' | 'followups_done' | 'closed_reason' | 'valid_until' | 'terms' | 'notes' | 'sent_at'>>) =>
      unwrap(await supabase.from('quotes').update(fields).eq('id', id).select().single()),
    onSuccess: () => invalidate(qc),
  });
}

export function useAddItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (item: { quote_id: string; product_id: string; metres: number; rate_per_m?: number | null; gst_percent?: number | null }) =>
      unwrap(await supabase.from('quote_items').insert(item).select().single()),
    onSuccess: () => invalidate(qc),
  });
}

export function useUpdateItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...fields }: { id: string } & Partial<Pick<QuoteItem, 'metres' | 'rate_per_m' | 'gst_percent' | 'product_id'>>) =>
      unwrap(await supabase.from('quote_items').update(fields).eq('id', id).select().single()),
    onSuccess: () => invalidate(qc),
  });
}

export function useDeleteItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('quote_items').delete().eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => invalidate(qc),
  });
}
