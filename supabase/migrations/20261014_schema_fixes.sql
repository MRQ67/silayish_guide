alter table public.profiles alter column role drop default;

create policy "Admins can delete services"
  on public.services for delete
  using (private.is_admin());

alter table public.locations drop constraint locations_parent_id_fkey;
alter table public.locations add constraint locations_parent_id_fkey
  foreign key (parent_id) references public.locations(id) on delete restrict;

alter table public.locations add constraint locations_lat_range
  check (lat is null or lat between -90 and 90);
alter table public.locations add constraint locations_lng_range
  check (lng is null or lng between -180 and 180);

alter table public.categories add constraint categories_name_key unique (name);

alter table public.feedback_reports add constraint feedback_message_length
  check (char_length(message) between 1 and 1000);