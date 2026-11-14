-- Control Centre · Phase 0 foundation (GFRP rebars)
-- Roles, company settings, products, owner-only rate card, parties,
-- and the shared record: lead → quote → order → despatch → invoice → payment.

-- ───────────────────────── Types ─────────────────────────
create type public.app_role as enum ('owner', 'sales', 'despatch', 'factory');
create type public.party_type as enum ('customer', 'consultant', 'supplier', 'transporter');
create type public.rebar_surface as enum ('sand_coated', 'ribbed');
create type public.lead_source as enum ('instagram', 'facebook', 'whatsapp', 'website', 'indiamart', 'referral', 'phone', 'walk_in', 'other');
create type public.lead_score as enum ('hot', 'warm', 'cold');
create type public.lead_status as enum ('new', 'contacted', 'quoted', 'won', 'lost');
create type public.quote_status as enum ('draft', 'sent', 'accepted', 'rejected', 'expired');
create type public.order_stage as enum ('new', 'in_production', 'ready', 'dispatched', 'delivered', 'cancelled');
create type public.despatch_status as enum ('pending', 'loaded', 'delivered');
create type public.invoice_status as enum ('draft', 'issued', 'cancelled');
create type public.payment_mode as enum ('bank_transfer', 'upi', 'cheque', 'cash', 'other');

-- ───────────────────────── Helpers ─────────────────────────
create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ───────────────────────── People ─────────────────────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  phone text,
  role public.app_role not null default 'sales',
  active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.profiles is 'Team members. New sign-ups are inactive until the owner activates them.';

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- Every new auth user gets an inactive profile.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''), new.raw_user_meta_data ->> 'phone');
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Role of the signed-in user, or null if inactive / unknown.
create or replace function public.my_role()
returns public.app_role language sql stable security definer set search_path = '' as $$
  select role from public.profiles where id = (select auth.uid()) and active
$$;

create or replace function public.is_owner()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(public.my_role() = 'owner', false)
$$;

create or replace function public.is_member()
returns boolean language sql stable security definer set search_path = '' as $$
  select public.my_role() is not null
$$;

create or replace function public.has_role(roles public.app_role[])
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(public.my_role() = any (roles), false)
$$;

-- Members may edit their own name/phone, never their role or active flag.
create or replace function public.guard_profile_update()
returns trigger language plpgsql set search_path = '' as $$
begin
  -- No signed-in user means the service role or an admin session (RLS already blocks anon).
  if (select auth.uid()) is null then return new; end if;
  if not public.is_owner() and (new.role is distinct from old.role or new.active is distinct from old.active) then
    raise exception 'Only the owner can change roles or access';
  end if;
  return new;
end $$;

create trigger profiles_guard before update on public.profiles
  for each row execute function public.guard_profile_update();

alter table public.profiles enable row level security;
create policy "members read team" on public.profiles for select to authenticated
  using (public.is_member() or id = (select auth.uid()));
create policy "self or owner update" on public.profiles for update to authenticated
  using (id = (select auth.uid()) or public.is_owner())
  with check (id = (select auth.uid()) or public.is_owner());

-- ───────────────────────── Company ─────────────────────────
create table public.company_settings (
  id smallint primary key default 1 check (id = 1),
  name text not null default 'A P Technologies',
  gstin text,
  address text,
  city text,
  state text,
  state_code text,
  phone text,
  whatsapp text,
  email text,
  bank_name text,
  bank_account text,
  bank_ifsc text,
  quote_terms text,
  updated_at timestamptz not null default now()
);
insert into public.company_settings (id) values (1);

create trigger company_touch before update on public.company_settings
  for each row execute function public.touch_updated_at();

alter table public.company_settings enable row level security;
create policy "members read company" on public.company_settings for select to authenticated using (public.is_member());
create policy "owner edits company" on public.company_settings for update to authenticated
  using (public.is_owner()) with check (public.is_owner());

-- ───────────────────────── Products & rates ─────────────────────────
create table public.products (
  id uuid primary key default gen_random_uuid(),
  diameter_mm smallint not null check (diameter_mm between 4 and 40),
  surface public.rebar_surface not null default 'sand_coated',
  standard_length_m numeric(5, 2) not null default 12 check (standard_length_m > 0),
  hsn_code text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (diameter_mm, surface)
);
comment on column public.products.hsn_code is 'Confirm with the CA before invoicing.';

create trigger products_touch before update on public.products
  for each row execute function public.touch_updated_at();

alter table public.products enable row level security;
create policy "members read products" on public.products for select to authenticated using (public.is_member());
create policy "owner manages products" on public.products for all to authenticated
  using (public.is_owner()) with check (public.is_owner());

-- Rate card history. Only the owner can see or set rates.
create table public.rates (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  rate_per_m numeric(10, 2) not null check (rate_per_m >= 0),
  gst_percent numeric(5, 2) check (gst_percent between 0 and 28),
  effective_from date not null default current_date,
  set_by uuid default auth.uid() references public.profiles (id),
  created_at timestamptz not null default now()
);
create index rates_product_idx on public.rates (product_id, effective_from desc, created_at desc);
create index rates_set_by_idx on public.rates (set_by);

alter table public.rates enable row level security;
create policy "owner reads rates" on public.rates for select to authenticated using (public.is_owner());
create policy "owner sets rates" on public.rates for insert to authenticated with check (public.is_owner());

create view public.current_rates with (security_invoker = true) as
  select distinct on (product_id) product_id, rate_per_m, gst_percent, effective_from
  from public.rates
  where effective_from <= current_date
  order by product_id, effective_from desc, created_at desc;

-- ───────────────────────── Parties ─────────────────────────
create table public.parties (
  id uuid primary key default gen_random_uuid(),
  type public.party_type not null default 'customer',
  name text not null check (length(trim(name)) > 0),
  contact_person text,
  phone text,
  whatsapp text,
  email text,
  gstin text,
  address text,
  city text,
  state text,
  notes text,
  created_by uuid default auth.uid() references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index parties_type_name_idx on public.parties (type, name);
create index parties_created_by_idx on public.parties (created_by);

create trigger parties_touch before update on public.parties
  for each row execute function public.touch_updated_at();

alter table public.parties enable row level security;
create policy "members read parties" on public.parties for select to authenticated using (public.is_member());
create policy "owner or sales add parties" on public.parties for insert to authenticated
  with check (public.has_role(array['owner', 'sales']::public.app_role[]));
create policy "owner or sales edit parties" on public.parties for update to authenticated
  using (public.has_role(array['owner', 'sales']::public.app_role[]))
  with check (public.has_role(array['owner', 'sales']::public.app_role[]));
create policy "owner deletes parties" on public.parties for delete to authenticated using (public.is_owner());

-- ───────────────────────── Leads ─────────────────────────
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  party_id uuid references public.parties (id) on delete set null,
  contact_name text not null,
  company text,
  phone text,
  buyer_role text,
  project_type text,
  location text,
  quantity_note text,
  source public.lead_source not null default 'other',
  score public.lead_score,
  status public.lead_status not null default 'new',
  assigned_to uuid references public.profiles (id),
  next_follow_up date,
  notes text,
  created_by uuid default auth.uid() references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index leads_status_idx on public.leads (status, next_follow_up);
create index leads_party_idx on public.leads (party_id);
create index leads_assigned_idx on public.leads (assigned_to);
create index leads_created_by_idx on public.leads (created_by);

create trigger leads_touch before update on public.leads
  for each row execute function public.touch_updated_at();

alter table public.leads enable row level security;
create policy "sales reads leads" on public.leads for select to authenticated
  using (public.has_role(array['owner', 'sales']::public.app_role[]));
create policy "sales writes leads" on public.leads for all to authenticated
  using (public.has_role(array['owner', 'sales']::public.app_role[]))
  with check (public.has_role(array['owner', 'sales']::public.app_role[]));

-- ───────────────────────── Quotes ─────────────────────────
create sequence public.quote_no_seq;
create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  number text not null unique default ('Q-' || lpad(nextval('public.quote_no_seq')::text, 4, '0')),
  lead_id uuid references public.leads (id) on delete set null,
  party_id uuid references public.parties (id) on delete restrict,
  status public.quote_status not null default 'draft',
  valid_until date,
  terms text,
  notes text,
  sent_at timestamptz,
  created_by uuid default auth.uid() references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index quotes_lead_idx on public.quotes (lead_id);
create index quotes_party_idx on public.quotes (party_id);
create index quotes_created_by_idx on public.quotes (created_by);

create table public.quote_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes (id) on delete cascade,
  product_id uuid not null references public.products (id),
  metres numeric(12, 2) not null check (metres > 0),
  rate_per_m numeric(10, 2) check (rate_per_m >= 0),
  gst_percent numeric(5, 2) check (gst_percent between 0 and 28)
);
comment on column public.quote_items.rate_per_m is 'Left empty in drafts. Only the owner can fill or change it.';
create index quote_items_quote_idx on public.quote_items (quote_id);
create index quote_items_product_idx on public.quote_items (product_id);

-- Guardrail: only the owner sets a price.
create or replace function public.guard_price()
returns trigger language plpgsql set search_path = '' as $$
begin
  if (select auth.uid()) is null or public.is_owner() then return new; end if;
  if tg_op = 'INSERT' and new.rate_per_m is not null then
    raise exception 'Only the owner can set a rate';
  end if;
  if tg_op = 'UPDATE' and new.rate_per_m is distinct from old.rate_per_m then
    raise exception 'Only the owner can change a rate';
  end if;
  return new;
end $$;

create trigger quote_items_price_guard before insert or update on public.quote_items
  for each row execute function public.guard_price();

create trigger quotes_touch before update on public.quotes
  for each row execute function public.touch_updated_at();

alter table public.quotes enable row level security;
alter table public.quote_items enable row level security;
create policy "sales reads quotes" on public.quotes for select to authenticated
  using (public.has_role(array['owner', 'sales']::public.app_role[]));
create policy "sales writes quotes" on public.quotes for all to authenticated
  using (public.has_role(array['owner', 'sales']::public.app_role[]))
  with check (public.has_role(array['owner', 'sales']::public.app_role[]));
create policy "sales reads quote items" on public.quote_items for select to authenticated
  using (public.has_role(array['owner', 'sales']::public.app_role[]));
create policy "sales writes quote items" on public.quote_items for all to authenticated
  using (public.has_role(array['owner', 'sales']::public.app_role[]))
  with check (public.has_role(array['owner', 'sales']::public.app_role[]));

-- ───────────────────────── Orders ─────────────────────────
create sequence public.order_no_seq;
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  number text not null unique default ('SO-' || lpad(nextval('public.order_no_seq')::text, 4, '0')),
  quote_id uuid references public.quotes (id) on delete set null,
  party_id uuid not null references public.parties (id) on delete restrict,
  po_number text,
  site_address text,
  stage public.order_stage not null default 'new',
  due_date date,
  notes text,
  created_by uuid default auth.uid() references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index orders_stage_idx on public.orders (stage, due_date);
create index orders_quote_idx on public.orders (quote_id);
create index orders_party_idx on public.orders (party_id);
create index orders_created_by_idx on public.orders (created_by);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid not null references public.products (id),
  metres numeric(12, 2) not null check (metres > 0),
  rate_per_m numeric(10, 2) check (rate_per_m >= 0),
  gst_percent numeric(5, 2) check (gst_percent between 0 and 28)
);
create index order_items_order_idx on public.order_items (order_id);
create index order_items_product_idx on public.order_items (product_id);

create trigger order_items_price_guard before insert or update on public.order_items
  for each row execute function public.guard_price();
create trigger orders_touch before update on public.orders
  for each row execute function public.touch_updated_at();

alter table public.orders enable row level security;
alter table public.order_items enable row level security;
create policy "members read orders" on public.orders for select to authenticated using (public.is_member());
create policy "sales writes orders" on public.orders for insert to authenticated
  with check (public.has_role(array['owner', 'sales']::public.app_role[]));
create policy "team updates orders" on public.orders for update to authenticated
  using (public.is_member()) with check (public.is_member());
create policy "owner deletes orders" on public.orders for delete to authenticated using (public.is_owner());
-- Item lines carry prices, so only owner and sales see them.
create policy "sales reads order items" on public.order_items for select to authenticated
  using (public.has_role(array['owner', 'sales']::public.app_role[]));
create policy "sales writes order items" on public.order_items for all to authenticated
  using (public.has_role(array['owner', 'sales']::public.app_role[]))
  with check (public.has_role(array['owner', 'sales']::public.app_role[]));

-- ───────────────────────── Despatches ─────────────────────────
create sequence public.despatch_no_seq;
create table public.despatches (
  id uuid primary key default gen_random_uuid(),
  number text not null unique default ('D-' || lpad(nextval('public.despatch_no_seq')::text, 3, '0')),
  order_id uuid not null references public.orders (id) on delete restrict,
  assigned_to uuid references public.profiles (id),
  status public.despatch_status not null default 'pending',
  vehicle_no text,
  batch_numbers text[] not null default '{}',
  proof_path text,
  delivered_at timestamptz,
  released_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index despatches_order_idx on public.despatches (order_id);
create index despatches_assigned_idx on public.despatches (assigned_to, status);
create index despatches_released_by_idx on public.despatches (released_by);

create trigger despatches_touch before update on public.despatches
  for each row execute function public.touch_updated_at();

alter table public.despatches enable row level security;
create policy "members read despatches" on public.despatches for select to authenticated using (public.is_member());
create policy "owner releases despatches" on public.despatches for insert to authenticated with check (public.is_owner());
create policy "owner or despatch updates" on public.despatches for update to authenticated
  using (public.is_owner() or (public.has_role(array['despatch']::public.app_role[]) and assigned_to = (select auth.uid())))
  with check (public.is_owner() or (public.has_role(array['despatch']::public.app_role[]) and assigned_to = (select auth.uid())));

-- ───────────────────────── Invoices & payments ─────────────────────────
create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  number text unique,
  order_id uuid references public.orders (id) on delete restrict,
  despatch_id uuid references public.despatches (id) on delete set null,
  party_id uuid not null references public.parties (id) on delete restrict,
  invoice_date date not null default current_date,
  due_date date,
  taxable_value numeric(12, 2) not null default 0,
  cgst numeric(12, 2) not null default 0,
  sgst numeric(12, 2) not null default 0,
  igst numeric(12, 2) not null default 0,
  total numeric(12, 2) not null default 0,
  status public.invoice_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on column public.invoices.number is 'Assigned when issued, in the financial-year series the CA confirms.';
create index invoices_order_idx on public.invoices (order_id);
create index invoices_despatch_idx on public.invoices (despatch_id);
create index invoices_party_idx on public.invoices (party_id, due_date);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid references public.invoices (id) on delete restrict,
  party_id uuid not null references public.parties (id) on delete restrict,
  amount numeric(12, 2) not null check (amount > 0),
  received_on date not null default current_date,
  mode public.payment_mode not null default 'bank_transfer',
  reference text,
  recorded_by uuid default auth.uid() references public.profiles (id),
  created_at timestamptz not null default now()
);
create index payments_invoice_idx on public.payments (invoice_id);
create index payments_party_idx on public.payments (party_id);
create index payments_recorded_by_idx on public.payments (recorded_by);

create trigger invoices_touch before update on public.invoices
  for each row execute function public.touch_updated_at();

alter table public.invoices enable row level security;
alter table public.payments enable row level security;
create policy "owner manages invoices" on public.invoices for all to authenticated
  using (public.is_owner()) with check (public.is_owner());
create policy "owner manages payments" on public.payments for all to authenticated
  using (public.is_owner()) with check (public.is_owner());

-- ───────────────────────── Grants ─────────────────────────
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.my_role(), public.is_owner(), public.is_member(), public.has_role(public.app_role[]) from anon;
