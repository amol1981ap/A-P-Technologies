-- Phase 2: orders to despatch, production batches, finished stock, raw materials

alter table public.products add column reorder_level_m numeric(12, 2) not null default 0 check (reorder_level_m >= 0);

-- ───────────── Production ─────────────
create table public.production_entries (
  id uuid primary key default gen_random_uuid(),
  entry_date date not null default current_date,
  product_id uuid not null references public.products (id),
  batch_no text not null default '',
  good_m numeric(12, 2) not null check (good_m >= 0),
  scrap_m numeric(12, 2) not null default 0 check (scrap_m >= 0),
  resin_kg numeric(10, 2) check (resin_kg >= 0),
  roving_kg numeric(10, 2) check (roving_kg >= 0),
  notes text,
  created_by uuid default auth.uid() references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (entry_date, product_id)
);
create index production_entries_product_idx on public.production_entries (product_id, entry_date desc);
create index production_entries_created_by_idx on public.production_entries (created_by);

-- Batch number: date + diameter + surface, for example 261114-12S.
create or replace function public.set_batch_no()
returns trigger language plpgsql set search_path = '' as $$
declare p record;
begin
  select diameter_mm, surface into p from public.products where id = new.product_id;
  new.batch_no := to_char(new.entry_date, 'YYMMDD') || '-' || p.diameter_mm || case p.surface when 'sand_coated' then 'S' else 'R' end;
  return new;
end $$;

create trigger production_batch_no before insert or update of entry_date, product_id on public.production_entries
  for each row execute function public.set_batch_no();
create trigger production_touch before update on public.production_entries
  for each row execute function public.touch_updated_at();

-- ───────────── Raw materials ─────────────
create table public.raw_materials (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  unit text not null default 'kg',
  sort smallint not null default 0
);
insert into public.raw_materials (name, sort) values
  ('Glass fibre roving', 1), ('Resin', 2), ('Hardener', 3), ('Silica sand', 4);

create table public.raw_material_movements (
  id uuid primary key default gen_random_uuid(),
  material_id uuid not null references public.raw_materials (id) on delete cascade,
  qty numeric(12, 2) not null check (qty <> 0),
  kind text not null check (kind in ('receipt', 'usage', 'adjustment')),
  movement_date date not null default current_date,
  production_entry_id uuid references public.production_entries (id) on delete cascade,
  note text,
  created_by uuid default auth.uid() references public.profiles (id),
  created_at timestamptz not null default now()
);
create index rm_movements_material_idx on public.raw_material_movements (material_id, movement_date desc);
create index rm_movements_production_idx on public.raw_material_movements (production_entry_id);
create index rm_movements_created_by_idx on public.raw_material_movements (created_by);

-- Resin and roving used in a production entry are deducted from stock automatically.
create or replace function public.sync_production_usage()
returns trigger language plpgsql set search_path = '' as $$
begin
  delete from public.raw_material_movements where production_entry_id = new.id;
  insert into public.raw_material_movements (material_id, qty, kind, movement_date, production_entry_id, note)
  select m.id, -u.qty, 'usage', new.entry_date, new.id, 'Batch ' || new.batch_no
  from (values ('Resin', new.resin_kg), ('Glass fibre roving', new.roving_kg)) as u(name, qty)
  join public.raw_materials m on m.name = u.name
  where u.qty is not null and u.qty > 0;
  return new;
end $$;

create trigger production_usage after insert or update on public.production_entries
  for each row execute function public.sync_production_usage();

-- ───────────── Despatch lines ─────────────
create table public.despatch_items (
  id uuid primary key default gen_random_uuid(),
  despatch_id uuid not null references public.despatches (id) on delete cascade,
  product_id uuid not null references public.products (id),
  metres numeric(12, 2) not null check (metres > 0),
  batch_no text
);
create index despatch_items_despatch_idx on public.despatch_items (despatch_id);
create index despatch_items_product_idx on public.despatch_items (product_id);

-- ───────────── Row-level security ─────────────
alter table public.production_entries enable row level security;
alter table public.raw_materials enable row level security;
alter table public.raw_material_movements enable row level security;
alter table public.despatch_items enable row level security;

create policy "members read production" on public.production_entries for select to authenticated using (private.is_member());
create policy "factory adds production" on public.production_entries for insert to authenticated
  with check (private.has_role(array['owner', 'factory']::public.app_role[]));
create policy "factory edits production" on public.production_entries for update to authenticated
  using (private.has_role(array['owner', 'factory']::public.app_role[]))
  with check (private.has_role(array['owner', 'factory']::public.app_role[]));
create policy "owner deletes production" on public.production_entries for delete to authenticated using (private.is_owner());

create policy "members read materials" on public.raw_materials for select to authenticated using (private.is_member());
create policy "owner manages materials" on public.raw_materials for update to authenticated using (private.is_owner()) with check (private.is_owner());

create policy "factory reads movements" on public.raw_material_movements for select to authenticated
  using (private.has_role(array['owner', 'factory']::public.app_role[]));
create policy "factory adds movements" on public.raw_material_movements for insert to authenticated
  with check (private.has_role(array['owner', 'factory']::public.app_role[]));
create policy "factory removes own usage" on public.raw_material_movements for delete to authenticated
  using (private.has_role(array['owner', 'factory']::public.app_role[]));

create policy "members read despatch items" on public.despatch_items for select to authenticated using (private.is_member());
create policy "owner adds despatch items" on public.despatch_items for insert to authenticated with check (private.is_owner());
create policy "owner removes despatch items" on public.despatch_items for delete to authenticated using (private.is_owner());

-- ───────────── Views ─────────────
create view public.finished_stock with (security_invoker = true) as
  select p.id as product_id,
         coalesce(pr.produced, 0) as produced_m,
         coalesce(d.despatched, 0) as despatched_m,
         coalesce(pr.produced, 0) - coalesce(d.despatched, 0) as on_hand_m,
         p.reorder_level_m
  from public.products p
  left join (select product_id, sum(good_m) as produced from public.production_entries group by product_id) pr on pr.product_id = p.id
  left join (select product_id, sum(metres) as despatched from public.despatch_items group by product_id) d on d.product_id = p.id;

create view public.raw_material_stock with (security_invoker = true) as
  select m.id as material_id, m.name, m.unit, m.sort,
         coalesce(sum(mv.qty), 0) as on_hand,
         coalesce(-sum(mv.qty) filter (where mv.kind = 'usage' and mv.movement_date > current_date - 14), 0) / 14.0 as avg_daily_use
  from public.raw_materials m
  left join public.raw_material_movements mv on mv.material_id = m.id
  group by m.id, m.name, m.unit, m.sort;

-- ───────────── Delivery proof photos ─────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('delivery-proofs', 'delivery-proofs', false, 8388608, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "members read delivery proofs" on storage.objects for select to authenticated
  using (bucket_id = 'delivery-proofs' and private.is_member());
create policy "members upload delivery proofs" on storage.objects for insert to authenticated
  with check (bucket_id = 'delivery-proofs' and private.is_member());
create policy "members replace delivery proofs" on storage.objects for update to authenticated
  using (bucket_id = 'delivery-proofs' and private.is_member())
  with check (bucket_id = 'delivery-proofs' and private.is_member());

revoke execute on function public.set_batch_no(), public.sync_production_usage() from public, anon, authenticated;
