-- When every despatch of an order is delivered and the full ordered quantity has gone out,
-- the order becomes Delivered. Runs with elevated rights because the despatch person cannot read order lines.
create or replace function private.order_delivered_check()
returns trigger language plpgsql security definer set search_path = '' as $$
declare ordered numeric; sent numeric; open_count int;
begin
  if new.status = 'delivered' and old.status is distinct from 'delivered' then
    select coalesce(sum(metres), 0) into ordered from public.order_items where order_id = new.order_id;
    select coalesce(sum(di.metres), 0) into sent from public.despatch_items di join public.despatches d on d.id = di.despatch_id where d.order_id = new.order_id;
    select count(*) into open_count from public.despatches where order_id = new.order_id and status <> 'delivered';
    if open_count = 0 and ordered > 0 and sent >= ordered then
      update public.orders set stage = 'delivered' where id = new.order_id and stage <> 'cancelled';
    end if;
  end if;
  return new;
end $$;

revoke execute on function private.order_delivered_check() from public, anon;
create trigger despatch_delivered after update on public.despatches
  for each row execute function private.order_delivered_check();
