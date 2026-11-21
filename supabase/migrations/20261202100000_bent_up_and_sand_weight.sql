-- Bent-up bars are a separate product (own rate, own stock). Sand-coated bars weigh 10 g per metre more.
create type public.rebar_shape as enum ('straight', 'bent_up');
alter table public.products add column shape public.rebar_shape not null default 'straight';
alter table public.products drop constraint products_diameter_mm_surface_key;
alter table public.products add constraint products_diameter_surface_shape_key unique (diameter_mm, surface, shape);

-- Default weight per metre: owner's table for the plain bar, plus 0.010 kg/m when sand-coated.
create or replace function public.set_kg_per_m()
returns trigger language plpgsql set search_path = '' as $$
declare base numeric;
begin
  if new.kg_per_m is null or new.kg_per_m <= 0 then
    base := case new.diameter_mm
      when 8 then 0.105 when 10 then 0.158 when 12 then 0.23 when 16 then 0.41
      when 18 then 0.506 when 20 then 0.625 when 22 then 0.756 when 24 then 0.9
      else round(((pi() / 4) * new.diameter_mm * new.diameter_mm * 1e-6 * 2000)::numeric, 4)
    end;
    new.kg_per_m := base + case when new.surface = 'sand_coated' then 0.01 else 0 end;
  end if;
  return new;
end $$;
revoke execute on function public.set_kg_per_m() from public, anon, authenticated;

-- Batch number: date + diameter + S/R, with B for bent-up, for example 261114-12SB.
create or replace function public.set_batch_no()
returns trigger language plpgsql set search_path = '' as $$
declare p record;
begin
  select diameter_mm, surface, shape into p from public.products where id = new.product_id;
  new.batch_no := to_char(new.entry_date, 'YYMMDD') || '-' || p.diameter_mm
    || case p.surface when 'sand_coated' then 'S' else 'R' end
    || case p.shape when 'bent_up' then 'B' else '' end;
  return new;
end $$;
revoke execute on function public.set_batch_no() from public, anon, authenticated;
