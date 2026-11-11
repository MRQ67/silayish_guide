-- Run against a disposable database after all migrations with `supabase test db`.
-- This pgTAP regression checks deletion protection and orphan cleanup.
begin;
select plan(7);

create temp table pedestrian_test_ids (
  building_id uuid,
  entrance_id uuid,
  entrance_node_id uuid,
  entrance_b_id uuid,
  entrance_node_b_id uuid,
  path_a_id uuid,
  path_b_id uuid,
  path_c_id uuid,
  junction_id uuid
) on commit drop;
insert into pedestrian_test_ids values (
  gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
  gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
  gen_random_uuid()
);

insert into public.locations (id, name, type)
select building_id, 'Connectivity regression fixture', 'building'
from pedestrian_test_ids;
insert into public.location_entrances (id, location_id, name, lat, lng)
select entrance_id, building_id, 'Fixture entrance', 10, 120
from pedestrian_test_ids;
insert into public.location_entrances (id, location_id, name, lat, lng)
select entrance_b_id, building_id, 'Fixture entrance B', 10, 120
from pedestrian_test_ids;
insert into public.pedestrian_paths (id, name, geometry, path_type, wheelchair_accessible)
select path_a_id, 'Fixture path A', '{"type":"LineString","coordinates":[[120,10],[120.001,10]]}', 'walkway', true from pedestrian_test_ids
union all
select path_b_id, 'Fixture path B', '{"type":"LineString","coordinates":[[120.001,10],[120.002,10]]}', 'walkway', true from pedestrian_test_ids;
insert into public.pedestrian_paths (id, name, geometry, path_type, wheelchair_accessible)
select path_c_id, 'Fixture path C', '{"type":"LineString","coordinates":[[120,10.0000135],[120.001,10.0000135]]}', 'walkway', true from pedestrian_test_ids;
insert into public.pedestrian_graph_nodes (id, kind, name, lat, lng, entrance_id)
select entrance_node_id, 'entrance', 'Fixture entrance', 10, 120, entrance_id from pedestrian_test_ids;
insert into public.pedestrian_graph_nodes (id, kind, name, lat, lng, entrance_id)
select entrance_node_b_id, 'entrance', 'Fixture entrance B', 10, 120, entrance_b_id from pedestrian_test_ids;
insert into public.pedestrian_path_connections (path_id, vertex_index, node_id)
select path_a_id, 0, entrance_node_id from pedestrian_test_ids;
insert into public.pedestrian_path_connections (path_id, vertex_index, node_id)
select path_c_id, 0, entrance_node_b_id from pedestrian_test_ids;

select throws_ok(
  format('update public.pedestrian_graph_nodes set lat = 10.000027 where id = %L', entrance_node_b_id),
  'P0001',
  'an entrance node cannot move away from its entrance even when it remains near its path vertex'
) from pedestrian_test_ids;

select throws_ok(
  format('delete from public.location_entrances where id = %L', entrance_id),
  '23503',
  'a linked entrance cannot be removed implicitly'
) from pedestrian_test_ids;
select throws_ok(
  format('delete from public.locations where id = %L', building_id),
  '23503',
  'a building with a linked entrance cannot be removed implicitly'
) from pedestrian_test_ids;

delete from public.pedestrian_path_connections c using pedestrian_test_ids ids
where c.path_id = ids.path_a_id and c.vertex_index = 0;
delete from public.pedestrian_path_connections c using pedestrian_test_ids ids
where c.path_id = ids.path_c_id and c.vertex_index = 0;
select ok(
  not exists (select 1 from public.pedestrian_graph_nodes n, pedestrian_test_ids ids where n.id = ids.entrance_node_id),
  'unlinking the last path removes only its obsolete entrance node'
);
select lives_ok(
  format('delete from public.locations where id = %L', building_id),
  'an unlinked entrance and its building can be deleted'
) from pedestrian_test_ids;

insert into public.pedestrian_graph_nodes (id, kind, name, lat, lng)
select junction_id, 'junction', 'Fixture junction', 10, 120.001 from pedestrian_test_ids;
insert into public.pedestrian_path_connections (path_id, vertex_index, node_id)
select path_a_id, 1, junction_id from pedestrian_test_ids
union all
select path_b_id, 0, junction_id from pedestrian_test_ids;
delete from public.pedestrian_path_connections c using pedestrian_test_ids ids
where c.path_id = ids.path_a_id and c.vertex_index = 1;
select ok(
  exists (select 1 from public.pedestrian_graph_nodes n, pedestrian_test_ids ids where n.id = ids.junction_id)
  and exists (select 1 from public.pedestrian_path_connections c, pedestrian_test_ids ids where c.path_id = ids.path_b_id and c.node_id = ids.junction_id),
  'unlinking one junction edge retains the shared junction and its other edge'
);
delete from public.pedestrian_path_connections c using pedestrian_test_ids ids
where c.path_id = ids.path_b_id and c.vertex_index = 0;
select ok(
  exists (select 1 from public.pedestrian_graph_nodes n, pedestrian_test_ids ids where n.id = ids.junction_id),
  'orphan cleanup never deletes junction nodes'
);

select * from finish();
rollback;
