-- Owner's weight per metre table (kg/m) is the default for new products; other sizes use about 2,000 kg/m3.
create or replace function public.set_kg_per_m()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.kg_per_m is null or new.kg_per_m <= 0 then
    new.kg_per_m := case new.diameter_mm
      when 8 then 0.105 when 10 then 0.158 when 12 then 0.23 when 16 then 0.41
      when 18 then 0.506 when 20 then 0.625 when 22 then 0.756 when 24 then 0.9
      else round(((pi() / 4) * new.diameter_mm * new.diameter_mm * 1e-6 * 2000)::numeric, 4)
    end;
  end if;
  return new;
end $$;
revoke execute on function public.set_kg_per_m() from public, anon, authenticated;
