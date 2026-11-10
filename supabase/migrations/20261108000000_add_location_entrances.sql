create table public.location_entrances (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.locations(id) on delete cascade,
  name text not null check (name = btrim(name) and char_length(name) between 1 and 80),
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  accessibility text check (accessibility is null or char_length(accessibility) <= 250),
  created_at timestamptz not null default now()
);

create index location_entrances_location_id_idx
  on public.location_entrances(location_id);

alter table public.location_entrances enable row level security;

create policy "Public can view location entrances"
  on public.location_entrances for select to anon, authenticated
  using (true);
create policy "Admins can insert location entrances"
  on public.location_entrances for insert to authenticated
  with check (
    private.is_admin()
    and exists (
      select 1 from public.locations
      where id = location_id and type = 'building'
    )
  );
create policy "Admins can update location entrances"
  on public.location_entrances for update to authenticated
  using (private.is_admin())
  with check (
    private.is_admin()
    and exists (
      select 1 from public.locations
      where id = location_id and type = 'building'
    )
  );
create policy "Admins can delete location entrances"
  on public.location_entrances for delete to authenticated
  using (private.is_admin());

create or replace function private.prevent_building_type_change_with_entrances()
returns trigger
language plpgsql
set search_path = pg_catalog, public, private, pg_temp
as $$
begin
  if new.type <> 'building' and exists (
    select 1 from public.location_entrances
    where location_id = old.id
  ) then
    raise exception 'Remove building entrances before changing the location type'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger trg_prevent_building_type_change_with_entrances
before update of type on public.locations
for each row execute function private.prevent_building_type_change_with_entrances();

create or replace function public.replace_location_entrances(
  p_location_id uuid,
  p_entrances jsonb
)
returns setof public.location_entrances
language plpgsql
set search_path = pg_catalog, public, private, pg_temp
as $$
declare
  entrance jsonb;
  entrance_count integer;
  distinct_id_count integer;
begin
  if not private.is_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;

  if jsonb_typeof(p_entrances) is distinct from 'array' then
    raise exception 'Entrances must be a JSON array' using errcode = '22023';
  end if;

  select count(*), count(distinct value->>'id')
    into entrance_count, distinct_id_count
    from jsonb_array_elements(p_entrances) as items(value);
  if entrance_count > 100 or entrance_count <> distinct_id_count then
    raise exception 'Entrances must have unique IDs and contain at most 100 items' using errcode = '22023';
  end if;

  perform id from public.locations
    where id = p_location_id and type = 'building'
    for update;
  if not found then
    raise exception 'Building not found' using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_entrances) as items(value)
    join public.location_entrances existing
      on existing.id = (items.value->>'id')::uuid
    where existing.location_id <> p_location_id
  ) then
    raise exception 'Entrance belongs to another location' using errcode = '22023';
  end if;

  delete from public.location_entrances existing
  where existing.location_id = p_location_id
    and not exists (
      select 1 from jsonb_array_elements(p_entrances) as items(value)
      where (items.value->>'id')::uuid = existing.id
    );

  for entrance in select value from jsonb_array_elements(p_entrances) as items(value)
  loop
    insert into public.location_entrances (id, location_id, name, lat, lng, accessibility)
    values (
      (entrance->>'id')::uuid,
      p_location_id,
      entrance->>'name',
      (entrance->>'lat')::double precision,
      (entrance->>'lng')::double precision,
      nullif(btrim(entrance->>'accessibility'), '')
    )
    on conflict (id) do update set
      name = excluded.name,
      lat = excluded.lat,
      lng = excluded.lng,
      accessibility = excluded.accessibility
    where public.location_entrances.location_id = p_location_id;
  end loop;

  return query
    select * from public.location_entrances
    where location_id = p_location_id
    order by created_at, id;
end;
$$;

revoke all on function public.replace_location_entrances(uuid, jsonb) from public, anon;
grant execute on function public.replace_location_entrances(uuid, jsonb) to authenticated;
