-- Migration: Initial database schema for Dire Dawa University Campus Guide
-- Creates categories, locations, services, feedback_reports, profiles tables and RLS policies

-- 1. Profiles Table (Linked to Supabase auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'admin' check (role in ('admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Helper function to check if the current user is an admin
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

-- 2. Categories Table
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  icon text,
  created_at timestamptz not null default now()
);

-- 3. Locations Table (Supports hierarchical relationships: building > floor > room)
create table if not exists public.locations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('building', 'office', 'dorm', 'lab', 'facility')),
  parent_id uuid references public.locations(id) on delete set null,
  category_id uuid references public.categories(id) on delete set null,
  description text,
  lat double precision,
  lng double precision,
  floor integer,
  opening_hours text,
  photo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4. Services Table
create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  location_id uuid references public.locations(id) on delete set null,
  hours text,
  contact text,
  created_at timestamptz not null default now()
);

-- 5. Feedback Reports Table
create table if not exists public.feedback_reports (
  id uuid primary key default gen_random_uuid(),
  location_id uuid references public.locations(id) on delete set null,
  message text not null,
  status text not null default 'open' check (status in ('open', 'reviewed', 'resolved')),
  created_at timestamptz not null default now()
);

-- Indexes for performance
create index if not exists idx_locations_parent_id on public.locations(parent_id);
create index if not exists idx_locations_category_id on public.locations(category_id);
create index if not exists idx_locations_type on public.locations(type);
create index if not exists idx_services_location_id on public.services(location_id);
create index if not exists idx_feedback_reports_location_id on public.feedback_reports(location_id);
create index if not exists idx_feedback_reports_status on public.feedback_reports(status);

-- Updated at trigger function
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_locations_updated_at
before update on public.locations
for each row
execute function public.set_updated_at();

create trigger trg_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

-- Enable Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.locations enable row level security;
alter table public.services enable row level security;
alter table public.feedback_reports enable row level security;

-- Profiles Policies
create policy "Allow users to read their own profile or admins to read all"
  on public.profiles for select
  using (auth.uid() = id or public.is_admin());

create policy "Admins can manage profiles"
  on public.profiles for all
  using (public.is_admin())
  with check (public.is_admin());

-- Categories Policies: Public read, Admin write
create policy "Public can view categories"
  on public.categories for select
  using (true);

create policy "Admins can insert categories"
  on public.categories for insert
  with check (public.is_admin());

create policy "Admins can update categories"
  on public.categories for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins can delete categories"
  on public.categories for delete
  using (public.is_admin());

-- Locations Policies: Public read, Admin write
create policy "Public can view locations"
  on public.locations for select
  using (true);

create policy "Admins can insert locations"
  on public.locations for insert
  with check (public.is_admin());

create policy "Admins can update locations"
  on public.locations for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins can delete locations"
  on public.locations for delete
  using (public.is_admin());

-- Services Policies: Public read, Admin write
create policy "Public can view services"
  on public.services for select
  using (true);

create policy "Admins can insert services"
  on public.services for insert
  with check (public.is_admin());

create policy "Admins can update services"
  on public.services for update
  using (public.is_admin())
  with check (public.is_admin());

-- Feedback Reports Policies: Public insert only, Admin full access
create policy "Public can submit feedback reports"
  on public.feedback_reports for insert
  with check (true);

create policy "Admins can view feedback reports"
  on public.feedback_reports for select
  using (public.is_admin());

create policy "Admins can update feedback reports"
  on public.feedback_reports for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins can delete feedback reports"
  on public.feedback_reports for delete
  using (public.is_admin());
