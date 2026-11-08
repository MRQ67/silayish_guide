alter table public.categories add column color text;
alter table public.categories add constraint categories_color_hex
  check (color is null or color ~ '^#[0-9A-Fa-f]{6}$');

-- Prevent category deletion from silently detaching its locations.
alter table public.locations drop constraint locations_category_id_fkey;
alter table public.locations add constraint locations_category_id_fkey
  foreign key (category_id) references public.categories(id) on delete restrict;

-- Category RLS policies already restrict writes to admins. Replace them explicitly
-- to retain that guarantee as the category-management UI is introduced.
drop policy if exists "Admins can insert categories" on public.categories;
drop policy if exists "Admins can update categories" on public.categories;
drop policy if exists "Admins can delete categories" on public.categories;
create policy "Admins can insert categories"
  on public.categories for insert to authenticated
  with check (private.is_admin());
create policy "Admins can update categories"
  on public.categories for update to authenticated
  using (private.is_admin()) with check (private.is_admin());
create policy "Admins can delete categories"
  on public.categories for delete to authenticated
  using (private.is_admin());
