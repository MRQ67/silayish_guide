alter table public.locations add column outline jsonb;
alter table public.locations add constraint locations_outline_is_polygon
  check (outline is null or (jsonb_typeof(outline) = 'object'
    and outline->>'type' in ('Polygon', 'MultiPolygon')
    and jsonb_typeof(outline->'coordinates') = 'array'));
