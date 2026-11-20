-- Phase 4: GST invoices, payments and the bakaya ledger

alter table public.invoices
  add column place_of_supply text,
  add column is_interstate boolean not null default false,
  add column round_off numeric(6, 2) not null default 0,
  add column eway_bill_no text,
  add column terms_days smallint not null default 15 check (terms_days between 0 and 180),
  add column last_reminder_at timestamptz,
  add column reminders_sent smallint not null default 0,
  add column notes text;

create table public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  product_id uuid references public.products (id),
  description text not null,
  hsn_code text,
  metres numeric(12, 2) not null check (metres > 0),
  rate_per_m numeric(10, 2) not null check (rate_per_m >= 0),
  gst_percent numeric(5, 2) not null check (gst_percent between 0 and 28),
  taxable numeric(12, 2) not null,
  cgst numeric(12, 2) not null default 0,
  sgst numeric(12, 2) not null default 0,
  igst numeric(12, 2) not null default 0
);
create index invoice_items_invoice_idx on public.invoice_items (invoice_id);
create index invoice_items_product_idx on public.invoice_items (product_id);

-- One running number per financial year (April to March), never reused.
create table public.invoice_counters (
  fy text primary key,
  last_no integer not null default 0
);

alter table public.invoice_items enable row level security;
alter table public.invoice_counters enable row level security;
create policy "owner reads invoice items" on public.invoice_items for select to authenticated using (private.is_owner());
create policy "owner adds invoice items" on public.invoice_items for insert to authenticated with check (private.is_owner());
create policy "owner removes invoice items" on public.invoice_items for delete to authenticated using (private.is_owner());
create policy "owner reads counters" on public.invoice_counters for select to authenticated using (private.is_owner());
create policy "owner adds counters" on public.invoice_counters for insert to authenticated with check (private.is_owner());
create policy "owner edits counters" on public.invoice_counters for update to authenticated using (private.is_owner()) with check (private.is_owner());

-- Numbers an invoice when it is issued, and freezes it afterwards.
create or replace function public.guard_invoice()
returns trigger language plpgsql set search_path = '' as $$
declare v_fy text; v_year int; v_n int;
begin
  if tg_op = 'UPDATE' and old.status = 'issued' then
    if new.number is distinct from old.number or new.party_id is distinct from old.party_id
       or new.invoice_date is distinct from old.invoice_date or new.taxable_value is distinct from old.taxable_value
       or new.cgst is distinct from old.cgst or new.sgst is distinct from old.sgst or new.igst is distinct from old.igst
       or new.total is distinct from old.total or new.round_off is distinct from old.round_off then
      raise exception 'An issued invoice cannot be changed. Cancel it and raise a new one.';
    end if;
    if new.status = 'draft' then
      raise exception 'An issued invoice cannot go back to draft.';
    end if;
  end if;
  if new.status = 'cancelled' and exists (select 1 from public.payments where invoice_id = new.id) then
    raise exception 'This invoice has payments recorded. It cannot be cancelled.';
  end if;
  if new.status = 'issued' and new.number is null and (tg_op = 'INSERT' or old.status is distinct from 'issued') then
    v_year := extract(year from new.invoice_date)::int;
    if extract(month from new.invoice_date) < 4 then v_year := v_year - 1; end if;
    v_fy := lpad((v_year % 100)::text, 2, '0') || '-' || lpad(((v_year + 1) % 100)::text, 2, '0');
    insert into public.invoice_counters as c (fy, last_no) values (v_fy, 1)
      on conflict (fy) do update set last_no = c.last_no + 1
      returning last_no into v_n;
    new.number := 'APT/' || v_fy || '/' || lpad(v_n::text, 4, '0');
  end if;
  return new;
end $$;

create trigger invoices_guard before insert or update on public.invoices
  for each row execute function public.guard_invoice();

-- A payment can only go against an issued invoice and never exceed what is owed.
create or replace function public.guard_payment()
returns trigger language plpgsql set search_path = '' as $$
declare v_total numeric; v_status public.invoice_status; v_paid numeric;
begin
  if new.invoice_id is null then return new; end if;
  select total, status into v_total, v_status from public.invoices where id = new.invoice_id;
  if v_status is distinct from 'issued' then
    raise exception 'Payments can only be recorded against an issued invoice.';
  end if;
  select coalesce(sum(amount), 0) into v_paid from public.payments where invoice_id = new.invoice_id;
  if v_paid + new.amount > v_total then
    raise exception 'This payment is more than the balance due.';
  end if;
  return new;
end $$;

create trigger payments_guard before insert on public.payments
  for each row execute function public.guard_payment();

revoke execute on function public.guard_invoice(), public.guard_payment() from public, anon, authenticated;

create view public.invoice_balances with (security_invoker = true) as
select i.id as invoice_id, i.party_id, i.status, i.total, i.due_date,
  coalesce(p.paid, 0) as paid,
  i.total - coalesce(p.paid, 0) as balance,
  greatest(0, current_date - i.due_date)::int as days_overdue
from public.invoices i
left join (select invoice_id, sum(amount) as paid from public.payments group by invoice_id) p on p.invoice_id = i.id;
