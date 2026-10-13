-- 1. Pin the search_path
alter function public.is_admin() set search_path = public, pg_temp;
alter function public.set_updated_at() set search_path = public, pg_temp;

-- 2. Move is_admin out of the exposed API schema
create schema if not exists private;
grant usage on schema private to anon, authenticated;
alter function public.is_admin() set schema private;

-- 3. rls_auto_enable should not be callable through the API
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;

-- 4. Tighten the public insert policy
drop policy if exists "Public can submit feedback reports" on public.feedback_reports;
create policy "Public can submit feedback reports"
on public.feedback_reports
for insert
to anon, authenticated
with check (status = 'open' and char_length(message) between 1 and 1000);