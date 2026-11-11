-- Follow-up integrity fixes. Keep the entrance FK RESTRICT: linked entrances
-- must be explicitly unlinked before replacement or location deletion.

create or replace function private.pedestrian_distance_meters(
  p_lat_a double precision,
  p_lng_a double precision,
  p_lat_b double precision,
  p_lng_b double precision
)
returns double precision
language sql
immutable
strict
set search_path = pg_catalog, public, private, pg_temp
as $$
  select 6371000 * 2 * asin(sqrt(least(1.0,
    power(sin(radians(p_lat_b - p_lat_a) / 2), 2)
    + cos(radians(p_lat_a)) * cos(radians(p_lat_b))
      * power(sin(radians(p_lng_b - p_lng_a) / 2), 2)
  )))
$$;
revoke all on function private.pedestrian_distance_meters(double precision, double precision, double precision, double precision)
  from public, anon, authenticated;

-- Reconcile the locally recorded duplicate DECLARE with a valid function body.
-- This is additive and does not rerun or alter the November 11 migration.
create or replace function private.validate_pedestrian_connection_position()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private, pg_temp
as $$
declare
  path_geometry jsonb;
  point jsonb;
  node public.pedestrian_graph_nodes%rowtype;
  entrance public.location_entrances%rowtype;
  path_lat double precision;
  path_lng double precision;
begin
  select geometry into path_geometry
  from public.pedestrian_paths where id = new.path_id;
  if path_geometry is null
     or jsonb_array_length(path_geometry->'coordinates') <= new.vertex_index then
    raise exception 'Path vertex index does not exist';
  end if;

  point := path_geometry->'coordinates'->new.vertex_index;
  path_lng := (point->>0)::double precision;
  path_lat := (point->>1)::double precision;
  select * into node from public.pedestrian_graph_nodes where id = new.node_id;
  if node.id is null then raise exception 'Graph node does not exist'; end if;

  if node.kind = 'entrance' then
    select * into entrance from public.location_entrances where id = node.entrance_id;
    if entrance.id is null then raise exception 'Entrance graph node has no canonical entrance'; end if;
    if private.pedestrian_distance_meters(node.lat, node.lng, entrance.lat, entrance.lng) > 2 then
      raise exception 'Entrance graph node is more than 2 meters from its canonical entrance';
    end if;
  end if;

  if private.pedestrian_distance_meters(path_lat, path_lng, node.lat, node.lng) > 2 then
    raise exception 'Path vertex must be within 2 meters of graph node';
  end if;
  return new;
end;
$$;
revoke all on function private.validate_pedestrian_connection_position() from public, anon, authenticated;

create or replace function private.validate_pedestrian_graph_node_entrance()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private, pg_temp
as $$
declare
  entrance public.location_entrances%rowtype;
begin
  if tg_op = 'UPDATE'
     and (old.kind is distinct from new.kind
       or old.entrance_id is distinct from new.entrance_id) then
    raise exception 'Graph node identity is immutable; unlink and recreate the node';
  end if;

  if new.kind = 'entrance' then
    select * into entrance from public.location_entrances where id = new.entrance_id;
    if entrance.id is null then
      raise exception 'Entrance graph node must reference an existing entrance';
    end if;
    if private.pedestrian_distance_meters(new.lat, new.lng, entrance.lat, entrance.lng) > 2 then
      raise exception 'Entrance graph node must remain within 2 meters of its canonical entrance';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function private.validate_pedestrian_graph_node_entrance() from public, anon, authenticated;
create trigger pedestrian_graph_node_entrance_check
before insert or update of kind, entrance_id, lat, lng on public.pedestrian_graph_nodes
for each row execute function private.validate_pedestrian_graph_node_entrance();

drop trigger if exists pedestrian_graph_node_position_check on public.pedestrian_graph_nodes;
create trigger pedestrian_graph_node_position_check
before update of lat, lng, kind, entrance_id on public.pedestrian_graph_nodes
for each row execute function private.prevent_connected_node_drift();

-- Protect both the entrance's canonical position and all connected vertices
-- from direct administrator updates that would leave inconsistent references.
create or replace function private.prevent_connected_node_drift()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private, pg_temp
as $$
declare
  connection record;
  point jsonb;
  entrance public.location_entrances%rowtype;
begin
  if new.entrance_id is not null then
    select * into entrance from public.location_entrances where id = new.entrance_id;
    if entrance.id is null
       or private.pedestrian_distance_meters(new.lat, new.lng, entrance.lat, entrance.lng) > 2 then
      raise exception 'Entrance graph node must remain within 2 meters of its canonical entrance';
    end if;
  end if;

  for connection in
    select path_id, vertex_index
    from public.pedestrian_path_connections
    where node_id = new.id
  loop
    select geometry->'coordinates'->connection.vertex_index into point
    from public.pedestrian_paths where id = connection.path_id;
    if point is null then
      raise exception 'Disconnect graph node before removing its connected vertex';
    end if;
    if private.pedestrian_distance_meters(
      (point->>1)::double precision,
      (point->>0)::double precision,
      new.lat,
      new.lng
    ) > 2 then
      raise exception 'Disconnect or move connected path vertices before moving graph node';
    end if;
  end loop;
  return new;
end;
$$;
revoke all on function private.prevent_connected_node_drift() from public, anon, authenticated;

-- Remove only unreferenced entrance nodes. Junction nodes and entrance nodes
-- still referenced by any path connection are retained.
create or replace function private.cleanup_unlinked_entrance_graph_node()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private, pg_temp
as $$
begin
  delete from public.pedestrian_graph_nodes node
  where node.id = old.node_id
    and node.kind = 'entrance'
    and not exists (
      select 1 from public.pedestrian_path_connections connection
      where connection.node_id = old.node_id
    );
  return old;
end;
$$;
revoke all on function private.cleanup_unlinked_entrance_graph_node() from public, anon, authenticated;
create trigger pedestrian_connection_cleanup_entrance_node
after delete on public.pedestrian_path_connections
for each row
execute function private.cleanup_unlinked_entrance_graph_node();
create trigger pedestrian_connection_cleanup_replaced_entrance_node
after update of node_id on public.pedestrian_path_connections
for each row when (old.node_id is distinct from new.node_id)
execute function private.cleanup_unlinked_entrance_graph_node();

-- Also clean orphaned entrance nodes left by an interrupted/older admin flow.
-- If the node is still linked, it remains and ON DELETE RESTRICT blocks removal.
create or replace function private.cleanup_unlinked_node_before_entrance_delete()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private, pg_temp
as $$
begin
  delete from public.pedestrian_graph_nodes node
  where node.entrance_id = old.id
    and node.kind = 'entrance'
    and not exists (
      select 1 from public.pedestrian_path_connections connection
      where connection.node_id = node.id
    );
  return old;
end;
$$;
revoke all on function private.cleanup_unlinked_node_before_entrance_delete() from public, anon, authenticated;
create trigger location_entrance_cleanup_unlinked_graph_node
before delete on public.location_entrances
for each row execute function private.cleanup_unlinked_node_before_entrance_delete();
