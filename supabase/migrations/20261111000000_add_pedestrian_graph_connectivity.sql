-- Explicit graph topology. Geometry crossings and proximity never create links.
create table public.pedestrian_graph_nodes (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('junction', 'entrance')),
  name text check (name is null or char_length(name) <= 120),
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  level text check (level is null or char_length(level) <= 80),
  entrance_id uuid unique references public.location_entrances(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((kind = 'entrance') = (entrance_id is not null))
);

create table public.pedestrian_path_connections (
  path_id uuid not null references public.pedestrian_paths(id) on delete cascade,
  vertex_index integer not null check (vertex_index >= 0 and vertex_index < 500),
  node_id uuid not null references public.pedestrian_graph_nodes(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (path_id, vertex_index),
  unique (path_id, vertex_index, node_id)
);
create index pedestrian_path_connections_node_idx
  on public.pedestrian_path_connections (node_id);

alter table public.pedestrian_graph_nodes enable row level security;
alter table public.pedestrian_path_connections enable row level security;
grant select on public.pedestrian_graph_nodes, public.pedestrian_path_connections to anon, authenticated;
grant insert, update, delete on public.pedestrian_graph_nodes, public.pedestrian_path_connections to authenticated;

create policy "Public can view graph nodes used by active paths"
  on public.pedestrian_graph_nodes for select to anon, authenticated
  using (private.is_admin() or exists (
    select 1 from public.pedestrian_path_connections c
    join public.pedestrian_paths p on p.id = c.path_id
    where c.node_id = pedestrian_graph_nodes.id and p.is_active
  ));
create policy "Admins manage pedestrian graph nodes"
  on public.pedestrian_graph_nodes for all to authenticated
  using (private.is_admin()) with check (private.is_admin());
create policy "Public can view connections for active paths"
  on public.pedestrian_path_connections for select to anon, authenticated
  using (private.is_admin() or exists (
    select 1 from public.pedestrian_paths p
    where p.id = pedestrian_path_connections.path_id and p.is_active
  ));
create policy "Admins manage pedestrian path connections"
  on public.pedestrian_path_connections for all to authenticated
  using (private.is_admin()) with check (private.is_admin());

-- Prevent a vertex from being linked to a node at a materially different position.
-- 2m is a validation tolerance only; it never creates topology.
create or replace function private.validate_pedestrian_connection_position()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public, private, pg_temp as $$
declare path_geometry jsonb; point jsonb; node_lat double precision; node_lng double precision;
declare path_lat double precision; path_lng double precision; distance_m double precision;
begin
  select geometry into path_geometry from public.pedestrian_paths where id = new.path_id;
  if path_geometry is null or jsonb_array_length(path_geometry->'coordinates') <= new.vertex_index then
    raise exception 'Path vertex index does not exist';
  end if;
  point := path_geometry->'coordinates'->new.vertex_index;
  select lat, lng into node_lat, node_lng from public.pedestrian_graph_nodes where id = new.node_id;
  if node_lat is null then raise exception 'Graph node does not exist'; end if;
  path_lng := (point->>0)::double precision; path_lat := (point->>1)::double precision;
  distance_m := 6371000 * 2 * asin(sqrt(
    power(sin(radians(path_lat-node_lat)/2),2) + cos(radians(node_lat))*cos(radians(path_lat))*power(sin(radians(path_lng-node_lng)/2),2)
  ));
  if distance_m > 2 then raise exception 'Path vertex must be within 2 meters of graph node'; end if;
  return new;
end; $$;
create trigger pedestrian_connection_position_check
before insert or update on public.pedestrian_path_connections
for each row execute function private.validate_pedestrian_connection_position();
revoke all on function private.validate_pedestrian_connection_position() from public, anon, authenticated;

-- Keep existing references valid when path coordinates or entrances are edited.
create or replace function private.prevent_connected_path_geometry_drift()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public, private, pg_temp as $$
declare c record; point jsonb; n public.pedestrian_graph_nodes%rowtype; distance_m double precision;
begin
  for c in select vertex_index,node_id from public.pedestrian_path_connections where path_id = new.id loop
    if jsonb_array_length(new.geometry->'coordinates') <= c.vertex_index then
      raise exception 'Disconnect graph nodes before removing connected path vertices';
    end if;
    point := new.geometry->'coordinates'->c.vertex_index;
    select * into n from public.pedestrian_graph_nodes where id = c.node_id;
    distance_m := 6371000 * 2 * asin(sqrt(power(sin(radians((point->>1)::double precision-n.lat)/2),2) + cos(radians(n.lat))*cos(radians((point->>1)::double precision))*power(sin(radians((point->>0)::double precision-n.lng)/2),2)));
    if distance_m > 2 then raise exception 'Disconnect or move graph node before moving connected path vertex'; end if;
  end loop;
  return new;
end; $$;
create trigger pedestrian_path_connected_geometry_check before update of geometry on public.pedestrian_paths
for each row execute function private.prevent_connected_path_geometry_drift();
revoke all on function private.prevent_connected_path_geometry_drift() from public, anon, authenticated;

create or replace function private.prevent_connected_node_drift()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public, private, pg_temp as $$
declare c record; point jsonb; distance_m double precision;
begin
  for c in select path_id, vertex_index from public.pedestrian_path_connections where node_id = new.id loop
    select geometry->'coordinates'->c.vertex_index into point from public.pedestrian_paths where id = c.path_id;
    if point is null then raise exception 'Disconnect graph node before removing its connected vertex'; end if;
    distance_m := 6371000 * 2 * asin(sqrt(power(sin(radians((point->>1)::double precision-new.lat)/2),2) + cos(radians(new.lat))*cos(radians((point->>1)::double precision))*power(sin(radians((point->>0)::double precision-new.lng)/2),2)));
    if distance_m > 2 then raise exception 'Disconnect or move connected path vertices before moving graph node'; end if;
  end loop;
  return new;
end; $$;
create trigger pedestrian_graph_node_position_check before update of lat,lng on public.pedestrian_graph_nodes
for each row execute function private.prevent_connected_node_drift();
revoke all on function private.prevent_connected_node_drift() from public, anon, authenticated;

-- Graph nodes at entrances follow the canonical entrance point and reject silent drift.
create or replace function private.sync_graph_entrance_node()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public, private, pg_temp as $$
begin
  update public.pedestrian_graph_nodes set lat = new.lat, lng = new.lng, updated_at = now()
  where entrance_id = new.id;
  return new;
end; $$;
create trigger location_entrance_sync_graph_node after update of lat,lng on public.location_entrances
for each row execute function private.sync_graph_entrance_node();
revoke all on function private.sync_graph_entrance_node() from public, anon, authenticated;
