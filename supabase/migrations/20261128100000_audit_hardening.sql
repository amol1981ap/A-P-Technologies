-- Audit fixes: GST % is owner-only like the rate; only owner/sales edit orders.

create or replace function public.guard_price()
returns trigger language plpgsql set search_path = '' as $$
begin
  if (select auth.uid()) is null or private.is_owner() then return new; end if;
  if tg_op = 'INSERT' and (new.rate_per_m is not null or new.gst_percent is not null) then
    raise exception 'Only the owner can set a rate or GST';
  end if;
  if tg_op = 'UPDATE' and (new.rate_per_m is distinct from old.rate_per_m or new.gst_percent is distinct from old.gst_percent) then
    raise exception 'Only the owner can change a rate or GST';
  end if;
  return new;
end $$;
revoke execute on function public.guard_price() from public, anon, authenticated;

drop policy "team updates orders" on public.orders;
create policy "sales updates orders" on public.orders for update to authenticated
  using (private.has_role(array['owner', 'sales']::public.app_role[]))
  with check (private.has_role(array['owner', 'sales']::public.app_role[]));

-- A despatch can be invoiced once. A cancelled invoice frees it for a corrected one.
create unique index invoices_one_per_despatch on public.invoices (despatch_id)
  where despatch_id is not null and status <> 'cancelled';
