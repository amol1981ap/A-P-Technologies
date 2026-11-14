-- Move role helpers out of the exposed API schema (policies keep working: they reference functions by OID).
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

alter function public.my_role() set schema private;
alter function public.is_owner() set schema private;
alter function public.is_member() set schema private;
alter function public.has_role(public.app_role[]) set schema private;

revoke execute on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated;

-- The helpers call each other by schema-qualified name; repoint them.
create or replace function private.is_owner()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(private.my_role() = 'owner', false)
$$;
create or replace function private.is_member()
returns boolean language sql stable security definer set search_path = '' as $$
  select private.my_role() is not null
$$;
create or replace function private.has_role(roles public.app_role[])
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(private.my_role() = any (roles), false)
$$;

create or replace function public.guard_profile_update()
returns trigger language plpgsql set search_path = '' as $$
begin
  if (select auth.uid()) is null then return new; end if;
  if not private.is_owner() and (new.role is distinct from old.role or new.active is distinct from old.active) then
    raise exception 'Only the owner can change roles or access';
  end if;
  return new;
end $$;

create or replace function public.guard_price()
returns trigger language plpgsql set search_path = '' as $$
begin
  if (select auth.uid()) is null or private.is_owner() then return new; end if;
  if tg_op = 'INSERT' and new.rate_per_m is not null then
    raise exception 'Only the owner can set a rate';
  end if;
  if tg_op = 'UPDATE' and new.rate_per_m is distinct from old.rate_per_m then
    raise exception 'Only the owner can change a rate';
  end if;
  return new;
end $$;

revoke execute on function public.guard_profile_update(), public.guard_price(), public.touch_updated_at() from public, anon, authenticated;

-- One permissive policy per action (replaces the "for all" policies).
drop policy "owner manages products" on public.products;
create policy "owner adds products" on public.products for insert to authenticated with check (private.is_owner());
create policy "owner edits products" on public.products for update to authenticated using (private.is_owner()) with check (private.is_owner());
create policy "owner deletes products" on public.products for delete to authenticated using (private.is_owner());

drop policy "sales writes leads" on public.leads;
create policy "sales adds leads" on public.leads for insert to authenticated
  with check (private.has_role(array['owner', 'sales']::public.app_role[]));
create policy "sales edits leads" on public.leads for update to authenticated
  using (private.has_role(array['owner', 'sales']::public.app_role[]))
  with check (private.has_role(array['owner', 'sales']::public.app_role[]));
create policy "owner deletes leads" on public.leads for delete to authenticated using (private.is_owner());

drop policy "sales writes quotes" on public.quotes;
create policy "sales adds quotes" on public.quotes for insert to authenticated
  with check (private.has_role(array['owner', 'sales']::public.app_role[]));
create policy "sales edits quotes" on public.quotes for update to authenticated
  using (private.has_role(array['owner', 'sales']::public.app_role[]))
  with check (private.has_role(array['owner', 'sales']::public.app_role[]));
create policy "owner deletes quotes" on public.quotes for delete to authenticated using (private.is_owner());

drop policy "sales writes quote items" on public.quote_items;
create policy "sales adds quote items" on public.quote_items for insert to authenticated
  with check (private.has_role(array['owner', 'sales']::public.app_role[]));
create policy "sales edits quote items" on public.quote_items for update to authenticated
  using (private.has_role(array['owner', 'sales']::public.app_role[]))
  with check (private.has_role(array['owner', 'sales']::public.app_role[]));
create policy "sales deletes quote items" on public.quote_items for delete to authenticated
  using (private.has_role(array['owner', 'sales']::public.app_role[]));

drop policy "sales writes order items" on public.order_items;
create policy "sales adds order items" on public.order_items for insert to authenticated
  with check (private.has_role(array['owner', 'sales']::public.app_role[]));
create policy "sales edits order items" on public.order_items for update to authenticated
  using (private.has_role(array['owner', 'sales']::public.app_role[]))
  with check (private.has_role(array['owner', 'sales']::public.app_role[]));
create policy "sales deletes order items" on public.order_items for delete to authenticated
  using (private.has_role(array['owner', 'sales']::public.app_role[]));

drop policy "owner manages invoices" on public.invoices;
create policy "owner reads invoices" on public.invoices for select to authenticated using (private.is_owner());
create policy "owner adds invoices" on public.invoices for insert to authenticated with check (private.is_owner());
create policy "owner edits invoices" on public.invoices for update to authenticated using (private.is_owner()) with check (private.is_owner());

drop policy "owner manages payments" on public.payments;
create policy "owner reads payments" on public.payments for select to authenticated using (private.is_owner());
create policy "owner adds payments" on public.payments for insert to authenticated with check (private.is_owner());
create policy "owner edits payments" on public.payments for update to authenticated using (private.is_owner()) with check (private.is_owner());
