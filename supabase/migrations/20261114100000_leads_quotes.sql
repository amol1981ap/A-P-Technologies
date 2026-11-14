-- Phase 1: leads and quotes

alter table public.leads add column lost_reason text;
alter table public.quotes
  add column followups_done smallint not null default 0 check (followups_done between 0 and 3),
  add column closed_reason text;

-- Rates and GST on a line are the owner's call.
create or replace function public.guard_price()
returns trigger language plpgsql set search_path = '' as $$
begin
  if (select auth.uid()) is null or private.is_owner() then return new; end if;
  if tg_op = 'INSERT' and (new.rate_per_m is not null or new.gst_percent is not null) then
    raise exception 'Only the owner can set a rate';
  end if;
  if tg_op = 'UPDATE' and (new.rate_per_m is distinct from old.rate_per_m or new.gst_percent is distinct from old.gst_percent) then
    raise exception 'Only the owner can change a rate';
  end if;
  return new;
end $$;

-- A quote cannot be marked sent until every line carries the owner's rate and GST.
create or replace function public.guard_quote_send()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.status = 'sent' and old.status is distinct from 'sent' then
    if not exists (select 1 from public.quote_items where quote_id = new.id) then
      raise exception 'Add at least one item before sending';
    end if;
    if exists (select 1 from public.quote_items where quote_id = new.id and (rate_per_m is null or gst_percent is null)) then
      raise exception 'The owner must set the rate and GST on every line before sending';
    end if;
    new.sent_at := coalesce(new.sent_at, now());
  end if;
  return new;
end $$;

create trigger quotes_send_guard before update on public.quotes
  for each row execute function public.guard_quote_send();

revoke execute on function public.guard_quote_send() from public, anon, authenticated;

-- Duplicate protection for the website form: the same phone and day is one lead.
create index leads_phone_idx on public.leads (phone, created_at desc);
