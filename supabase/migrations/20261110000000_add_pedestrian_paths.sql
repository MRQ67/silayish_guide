create or replace function private.is_valid_pedestrian_path_geometry(
  p_geometry jsonb
)
returns boolean
language plpgsql
immutable
security definer
set search_path = pg_catalog, public, private, pg_temp
as $$
declare
  coordinates jsonb;
  coordinate jsonb;
  longitude double precision;
  latitude double precision;
  first_longitude double precision;
  first_latitude double precision;
  point_count integer := 0;
  point_index integer := 0;
  has_distinct_points boolean := false;
begin
  if jsonb_typeof(p_geometry) is distinct from 'object'
     or p_geometry->>'type' is distinct from 'LineString' then
    return false;
  end if;

  coordinates := p_geometry->'coordinates';
  if jsonb_typeof(coordinates) is distinct from 'array' then
    return false;
  end if;

  point_count := jsonb_array_length(coordinates);
  if point_count < 2 or point_count > 500 then
    return false;
  end if;

  for coordinate in
    select value from jsonb_array_elements(coordinates) as points(value)
  loop
    if jsonb_typeof(coordinate) is distinct from 'array' then
      return false;
    end if;
    if jsonb_array_length(coordinate) <> 2
       or jsonb_typeof(coordinate->0) is distinct from 'number'
       or jsonb_typeof(coordinate->1) is distinct from 'number' then
      return false;
    end if;

    begin
      longitude := (coordinate->>0)::double precision;
      latitude := (coordinate->>1)::double precision;
    exception when others then
      return false;
    end;

    if longitude < -180 or longitude > 180
       or latitude < -90 or latitude > 90 then
      return false;
    end if;

    if point_index = 0 then
      first_longitude := longitude;
      first_latitude := latitude;
    elsif longitude <> first_longitude or latitude <> first_latitude then
      has_distinct_points := true;
    end if;

    point_index := point_index + 1;
  end loop;

  return has_distinct_points;
end;
$$;

revoke all on function private.is_valid_pedestrian_path_geometry(jsonb)
  from public, anon, authenticated;
grant execute on function private.is_valid_pedestrian_path_geometry(jsonb)
  to authenticated;

create table public.pedestrian_paths (
  id uuid primary key default gen_random_uuid(),
  name text not null
    check (name = btrim(name) and char_length(name) between 1 and 120),
  geometry jsonb not null
    check (private.is_valid_pedestrian_path_geometry(geometry)),
  path_type text not null
    check (path_type in ('walkway', 'ramp', 'stairs', 'other')),
  wheelchair_accessible boolean not null,
  surface text check (surface is null or char_length(surface) <= 100),
  notes text check (notes is null or char_length(notes) <= 1000),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index pedestrian_paths_active_idx
  on public.pedestrian_paths (is_active, name);

create trigger trg_pedestrian_paths_updated_at
before update on public.pedestrian_paths
for each row execute function public.set_updated_at();

alter table public.pedestrian_paths enable row level security;
grant select on public.pedestrian_paths to anon, authenticated;
grant insert, update, delete on public.pedestrian_paths to authenticated;

create policy "Public can view active pedestrian paths"
  on public.pedestrian_paths for select to anon, authenticated
  using (is_active or private.is_admin());
create policy "Admins can insert pedestrian paths"
  on public.pedestrian_paths for insert to authenticated
  with check (private.is_admin());
create policy "Admins can update pedestrian paths"
  on public.pedestrian_paths for update to authenticated
  using (private.is_admin()) with check (private.is_admin());
create policy "Admins can delete pedestrian paths"
  on public.pedestrian_paths for delete to authenticated
  using (private.is_admin());
