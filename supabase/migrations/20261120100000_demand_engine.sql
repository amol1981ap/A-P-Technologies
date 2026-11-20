-- Phase 3: demand engine. Source tracking, marketing spend, prospects, consultants who bring orders.

alter table public.leads
  add column campaign text,
  add column influencer_id uuid references public.parties (id) on delete set null;
create index leads_influencer_idx on public.leads (influencer_id);
create index leads_source_idx on public.leads (source, created_at desc);

-- What was spent on each source in a month (owner only).
create table public.marketing_spend (
  id uuid primary key default gen_random_uuid(),
  month date not null check (month = date_trunc('month', month)::date),
  source public.lead_source not null,
  amount numeric(12, 2) not null check (amount >= 0),
  note text,
  created_by uuid default auth.uid() references public.profiles (id),
  created_at timestamptz not null default now(),
  unique (month, source)
);
create index marketing_spend_created_by_idx on public.marketing_spend (created_by);
alter table public.marketing_spend enable row level security;
create policy "owner reads spend" on public.marketing_spend for select to authenticated using (private.is_owner());
create policy "owner adds spend" on public.marketing_spend for insert to authenticated with check (private.is_owner());
create policy "owner edits spend" on public.marketing_spend for update to authenticated using (private.is_owner()) with check (private.is_owner());
create policy "owner deletes spend" on public.marketing_spend for delete to authenticated using (private.is_owner());

-- People and companies worth approaching before they enquire.
create type public.prospect_status as enum ('new', 'contacted', 'interested', 'converted', 'dropped');
create table public.prospects (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  organisation text,
  role text,
  location text,
  phone text,
  project_note text,
  found_via text,
  status public.prospect_status not null default 'new',
  next_action_date date,
  last_contacted date,
  lead_id uuid references public.leads (id) on delete set null,
  created_by uuid default auth.uid() references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index prospects_status_idx on public.prospects (status, next_action_date);
create index prospects_lead_idx on public.prospects (lead_id);
create index prospects_created_by_idx on public.prospects (created_by);
create trigger prospects_touch before update on public.prospects
  for each row execute function public.touch_updated_at();
alter table public.prospects enable row level security;
create policy "sales reads prospects" on public.prospects for select to authenticated
  using (private.has_role(array['owner', 'sales']::public.app_role[]));
create policy "sales adds prospects" on public.prospects for insert to authenticated
  with check (private.has_role(array['owner', 'sales']::public.app_role[]));
create policy "sales edits prospects" on public.prospects for update to authenticated
  using (private.has_role(array['owner', 'sales']::public.app_role[]))
  with check (private.has_role(array['owner', 'sales']::public.app_role[]));
create policy "owner deletes prospects" on public.prospects for delete to authenticated using (private.is_owner());

-- One row per lead with how far it got and what it was worth. Respects row-level security.
create view public.lead_performance with (security_invoker = true) as
select l.id as lead_id, l.source, l.campaign, l.influencer_id, l.score, l.status, l.created_at,
  exists (select 1 from public.quotes q where q.lead_id = l.id and q.status <> 'draft') as quoted,
  exists (select 1 from public.quotes q join public.orders o on o.quote_id = q.id where q.lead_id = l.id and o.stage <> 'cancelled') as ordered,
  coalesce((
    select sum(oi.metres * oi.rate_per_m)
    from public.quotes q
    join public.orders o on o.quote_id = q.id and o.stage <> 'cancelled'
    join public.order_items oi on oi.order_id = o.id
    where q.lead_id = l.id and oi.rate_per_m is not null
  ), 0) as order_value
from public.leads l;
