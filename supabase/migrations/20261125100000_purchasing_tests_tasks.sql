-- Phase 2b: purchasing, cost and margin, batch test certificates, staff tasks

-- ───────────── Purchasing ─────────────
alter table public.company_settings add column overhead_per_m numeric(8, 2) not null default 0 check (overhead_per_m >= 0);
comment on column public.company_settings.overhead_per_m is 'Labour, power and other cost per metre, set by the owner. Added to material cost when working out margin.';

create sequence public.purchase_order_seq;
create type public.po_status as enum ('ordered', 'received', 'cancelled');

create table public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  number text not null unique default ('PO-' || lpad(nextval('public.purchase_order_seq')::text, 4, '0')),
  supplier_id uuid not null references public.parties (id) on delete restrict,
  status public.po_status not null default 'ordered',
  order_date date not null default current_date,
  expected_date date,
  notes text,
  received_on date,
  supplier_bill_no text,
  supplier_bill_date date,
  is_interstate boolean not null default false,
  taxable_value numeric(12, 2) not null default 0,
  cgst numeric(12, 2) not null default 0,
  sgst numeric(12, 2) not null default 0,
  igst numeric(12, 2) not null default 0,
  total numeric(12, 2) not null default 0,
  paid_on date,
  created_by uuid default auth.uid() references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index purchase_orders_supplier_idx on public.purchase_orders (supplier_id);
create index purchase_orders_status_idx on public.purchase_orders (status, expected_date);
create index purchase_orders_created_by_idx on public.purchase_orders (created_by);

create table public.purchase_order_items (
  id uuid primary key default gen_random_uuid(),
  po_id uuid not null references public.purchase_orders (id) on delete cascade,
  material_id uuid not null references public.raw_materials (id),
  qty numeric(12, 2) not null check (qty > 0),
  rate numeric(10, 2) not null check (rate >= 0),
  gst_percent numeric(5, 2) not null default 18 check (gst_percent between 0 and 28)
);
create index po_items_po_idx on public.purchase_order_items (po_id);
create index po_items_material_idx on public.purchase_order_items (material_id);

create trigger purchase_orders_touch before update on public.purchase_orders
  for each row execute function public.touch_updated_at();

-- A received purchase order is final. Receiving adds the goods to raw material stock.
create or replace function public.guard_purchase_order()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and old.status = 'received' then
    if new.status is distinct from 'received' or new.supplier_id is distinct from old.supplier_id
       or new.taxable_value is distinct from old.taxable_value or new.total is distinct from old.total
       or new.supplier_bill_no is distinct from old.supplier_bill_no then
      raise exception 'A received purchase order cannot be changed.';
    end if;
  end if;
  if new.status = 'received' and (tg_op = 'INSERT' or old.status is distinct from 'received') then
    if nullif(trim(coalesce(new.supplier_bill_no, '')), '') is null then
      raise exception 'Enter the supplier bill number to receive the goods.';
    end if;
    new.received_on := coalesce(new.received_on, current_date);
  end if;
  return new;
end $$;

create or replace function public.receive_purchase_order()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.status = 'received' and old.status is distinct from 'received' then
    insert into public.raw_material_movements (material_id, qty, kind, movement_date, note)
    select material_id, qty, 'receipt', new.received_on, new.number || ' · ' || coalesce(new.supplier_bill_no, '')
    from public.purchase_order_items where po_id = new.id;
  end if;
  return new;
end $$;

create trigger purchase_orders_guard before insert or update on public.purchase_orders
  for each row execute function public.guard_purchase_order();
create trigger purchase_orders_receive after update on public.purchase_orders
  for each row execute function public.receive_purchase_order();
revoke execute on function public.guard_purchase_order(), public.receive_purchase_order() from public, anon, authenticated;

alter table public.purchase_orders enable row level security;
alter table public.purchase_order_items enable row level security;
create policy "owner reads purchase orders" on public.purchase_orders for select to authenticated using (private.is_owner());
create policy "owner adds purchase orders" on public.purchase_orders for insert to authenticated with check (private.is_owner());
create policy "owner edits purchase orders" on public.purchase_orders for update to authenticated using (private.is_owner()) with check (private.is_owner());
create policy "owner reads po items" on public.purchase_order_items for select to authenticated using (private.is_owner());
create policy "owner adds po items" on public.purchase_order_items for insert to authenticated with check (private.is_owner());
create policy "owner removes po items" on public.purchase_order_items for delete to authenticated using (private.is_owner());

-- What each material has actually cost, averaged over goods received (before GST).
create view public.material_cost with (security_invoker = true) as
select i.material_id, sum(i.qty) as qty_received, sum(i.qty * i.rate) / nullif(sum(i.qty), 0) as avg_rate
from public.purchase_order_items i
join public.purchase_orders p on p.id = i.po_id and p.status = 'received'
group by i.material_id;

-- ───────────── Batch tests and certificates ─────────────
create table public.batch_tests (
  id uuid primary key default gen_random_uuid(),
  batch_no text not null,
  tested_on date not null default current_date,
  lab text,
  report_no text,
  notes text,
  created_by uuid default auth.uid() references public.profiles (id),
  created_at timestamptz not null default now()
);
create index batch_tests_batch_idx on public.batch_tests (batch_no, tested_on desc);
create index batch_tests_created_by_idx on public.batch_tests (created_by);

create table public.batch_test_values (
  id uuid primary key default gen_random_uuid(),
  test_id uuid not null references public.batch_tests (id) on delete cascade,
  property text not null,
  value text not null,
  unit text,
  requirement text,
  sort smallint not null default 0
);
create index batch_test_values_test_idx on public.batch_test_values (test_id);

alter table public.batch_tests enable row level security;
alter table public.batch_test_values enable row level security;
create policy "members read batch tests" on public.batch_tests for select to authenticated using (private.is_member());
create policy "factory adds batch tests" on public.batch_tests for insert to authenticated
  with check (private.has_role(array['owner', 'factory']::public.app_role[]));
create policy "factory edits batch tests" on public.batch_tests for update to authenticated
  using (private.has_role(array['owner', 'factory']::public.app_role[]))
  with check (private.has_role(array['owner', 'factory']::public.app_role[]));
create policy "owner deletes batch tests" on public.batch_tests for delete to authenticated using (private.is_owner());
create policy "members read test values" on public.batch_test_values for select to authenticated using (private.is_member());
create policy "factory adds test values" on public.batch_test_values for insert to authenticated
  with check (private.has_role(array['owner', 'factory']::public.app_role[]));
create policy "factory removes test values" on public.batch_test_values for delete to authenticated
  using (private.has_role(array['owner', 'factory']::public.app_role[]));

-- ───────────── Staff tasks ─────────────
create type public.task_status as enum ('open', 'done');
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) > 0),
  detail text,
  assigned_to uuid not null references public.profiles (id) on delete cascade,
  due_date date,
  status public.task_status not null default 'open',
  done_at timestamptz,
  proof_path text,
  created_by uuid default auth.uid() references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index tasks_assigned_idx on public.tasks (assigned_to, status, due_date);
create index tasks_created_by_idx on public.tasks (created_by);
create trigger tasks_touch before update on public.tasks
  for each row execute function public.touch_updated_at();

-- The person a task is given to can only mark it done and attach a photo.
create or replace function public.guard_task()
returns trigger language plpgsql set search_path = '' as $$
begin
  if (select auth.uid()) is null or private.is_owner() then return new; end if;
  if new.title is distinct from old.title or new.detail is distinct from old.detail
     or new.assigned_to is distinct from old.assigned_to or new.due_date is distinct from old.due_date then
    raise exception 'Only the owner can change what a task says or who it is for.';
  end if;
  if new.status = 'done' and old.status = 'open' then new.done_at := coalesce(new.done_at, now()); end if;
  return new;
end $$;
create trigger tasks_guard before update on public.tasks
  for each row execute function public.guard_task();
revoke execute on function public.guard_task() from public, anon, authenticated;

alter table public.tasks enable row level security;
create policy "owner or assignee reads tasks" on public.tasks for select to authenticated
  using (private.is_owner() or (private.is_member() and assigned_to = (select auth.uid())));
create policy "owner adds tasks" on public.tasks for insert to authenticated with check (private.is_owner());
create policy "owner or assignee updates tasks" on public.tasks for update to authenticated
  using (private.is_owner() or (private.is_member() and assigned_to = (select auth.uid())))
  with check (private.is_owner() or (private.is_member() and assigned_to = (select auth.uid())));
create policy "owner deletes tasks" on public.tasks for delete to authenticated using (private.is_owner());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('task-proofs', 'task-proofs', false, 8388608, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
create policy "members read task proofs" on storage.objects for select to authenticated
  using (bucket_id = 'task-proofs' and private.is_member());
create policy "members upload task proofs" on storage.objects for insert to authenticated
  with check (bucket_id = 'task-proofs' and private.is_member());
create policy "members replace task proofs" on storage.objects for update to authenticated
  using (bucket_id = 'task-proofs' and private.is_member())
  with check (bucket_id = 'task-proofs' and private.is_member());
