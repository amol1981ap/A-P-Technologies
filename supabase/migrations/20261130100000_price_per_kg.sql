-- Pricing moves from per metre to per kg. Production, stock and despatch stay in metres.
-- Each product has a weight per metre; lines snapshot it so later edits never change an old quote or invoice.

alter table public.products add column kg_per_m numeric(8, 4);

-- Typical estimate (about 2,100 kg/m3 times the bar's cross-section). The owner corrects it per product.
create or replace function public.set_kg_per_m()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.kg_per_m is null or new.kg_per_m <= 0 then
    new.kg_per_m := round(((pi() / 4) * new.diameter_mm * new.diameter_mm * 1e-6 * 2100)::numeric, 4);
  end if;
  return new;
end $$;
revoke execute on function public.set_kg_per_m() from public, anon, authenticated;
create trigger products_kg_per_m before insert or update on public.products
  for each row execute function public.set_kg_per_m();
alter table public.products alter column hsn_code set default '70193900';

-- Rate card, quote lines, order lines: the rate is now per kg.
drop view public.current_rates;
alter table public.rates rename column rate_per_m to rate_per_kg;
create view public.current_rates with (security_invoker = true) as
  select distinct on (product_id) product_id, rate_per_kg, gst_percent, effective_from
  from public.rates
  order by product_id, effective_from desc, created_at desc;

alter table public.quote_items rename column rate_per_m to rate_per_kg;
alter table public.order_items rename column rate_per_m to rate_per_kg;
alter table public.quote_items add column kg_per_m numeric(8, 4);
alter table public.order_items add column kg_per_m numeric(8, 4);

-- A line takes the product's weight when it is created. Only the owner can override or change it.
create or replace function public.snapshot_kg_per_m()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE' then
    if not private.is_owner() and (select auth.uid()) is not null then new.kg_per_m := old.kg_per_m; end if;
    return new;
  end if;
  if new.kg_per_m is null or ((select auth.uid()) is not null and not private.is_owner()) then
    new.kg_per_m := (select kg_per_m from public.products where id = new.product_id);
  end if;
  return new;
end $$;
revoke execute on function public.snapshot_kg_per_m() from public, anon, authenticated;
create trigger quote_items_kg before insert or update on public.quote_items for each row execute function public.snapshot_kg_per_m();
create trigger order_items_kg before insert or update on public.order_items for each row execute function public.snapshot_kg_per_m();

-- Invoice lines keep metres, weight per metre, kg billed and the rate per kg.
alter table public.invoice_items rename column rate_per_m to rate_per_kg;
alter table public.invoice_items add column kg_per_m numeric(8, 4) not null;
alter table public.invoice_items add column kg numeric(12, 3) not null check (kg > 0);

-- Guards, renamed to the new column.
create or replace function public.guard_price()
returns trigger language plpgsql set search_path = '' as $$
begin
  if (select auth.uid()) is null or private.is_owner() then return new; end if;
  if tg_op = 'INSERT' and (new.rate_per_kg is not null or new.gst_percent is not null) then
    raise exception 'Only the owner can set a rate or GST';
  end if;
  if tg_op = 'UPDATE' and (new.rate_per_kg is distinct from old.rate_per_kg or new.gst_percent is distinct from old.gst_percent) then
    raise exception 'Only the owner can change a rate or GST';
  end if;
  return new;
end $$;
revoke execute on function public.guard_price() from public, anon, authenticated;

create or replace function public.guard_quote_send()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.status = 'sent' and old.status is distinct from 'sent' then
    if not exists (select 1 from public.quote_items where quote_id = new.id) then
      raise exception 'Add at least one item before sending';
    end if;
    if exists (select 1 from public.quote_items where quote_id = new.id and (rate_per_kg is null or gst_percent is null)) then
      raise exception 'The owner must set the rate and GST on every line before sending';
    end if;
    new.sent_at := coalesce(new.sent_at, now());
  end if;
  return new;
end $$;
revoke execute on function public.guard_quote_send() from public, anon, authenticated;

drop view public.lead_performance;
create view public.lead_performance with (security_invoker = true) as
select l.id as lead_id, l.source, l.campaign, l.influencer_id, l.score, l.status, l.created_at,
  exists (select 1 from public.quotes q where q.lead_id = l.id and q.status <> 'draft') as quoted,
  exists (select 1 from public.quotes q join public.orders o on o.quote_id = q.id where q.lead_id = l.id and o.stage <> 'cancelled') as ordered,
  coalesce((
    select sum(oi.metres * oi.kg_per_m * oi.rate_per_kg)
    from public.quotes q
    join public.orders o on o.quote_id = q.id and o.stage <> 'cancelled'
    join public.order_items oi on oi.order_id = o.id
    where q.lead_id = l.id and oi.rate_per_kg is not null
  ), 0) as order_value
from public.leads l;
