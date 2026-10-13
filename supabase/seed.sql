-- Seed data for Dire Dawa University Campus Guide
-- Provides initial categories, 5 sample campus locations, and core services for map testing

-- 1. Insert Categories
insert into public.categories (id, name, icon)
values
  ('11111111-1111-1111-1111-111111111101', 'Academics', 'graduation-cap'),
  ('11111111-1111-1111-1111-111111111102', 'Administration', 'building-2'),
  ('11111111-1111-1111-1111-111111111103', 'Student Life', 'users'),
  ('11111111-1111-1111-1111-111111111104', 'Healthcare & Facilities', 'heart-pulse')
on conflict (id) do update set
  name = excluded.name,
  icon = excluded.icon;

-- 2. Insert 5 Sample Locations
-- Sample 1: Main Administration Building (building)
insert into public.locations (
  id,
  name,
  type,
  parent_id,
  category_id,
  description,
  lat,
  lng,
  floor,
  opening_hours,
  photo_url
)
values (
  '22222222-2222-2222-2222-222222222201',
  'Main Administration Building',
  'building',
  null,
  '11111111-1111-1111-1111-111111111102',
  'Central administrative headquarters housing the President office, Registrar, and Academic Affairs.',
  9.6178,
  41.8362,
  null,
  'Mon - Fri 08:00 - 17:00',
  null
)
on conflict (id) do nothing;

-- Sample 2: Central University Library (facility)
insert into public.locations (
  id,
  name,
  type,
  parent_id,
  category_id,
  description,
  lat,
  lng,
  floor,
  opening_hours,
  photo_url
)
values (
  '22222222-2222-2222-2222-222222222202',
  'Central University Library',
  'facility',
  null,
  '11111111-1111-1111-1111-111111111101',
  'Main library facility featuring study areas, reference collections, and a digital learning center.',
  9.6185,
  41.8358,
  null,
  'Mon - Sat 08:00 - 22:00',
  null
)
on conflict (id) do nothing;

-- Sample 3: Institute of Technology Complex (building)
insert into public.locations (
  id,
  name,
  type,
  parent_id,
  category_id,
  description,
  lat,
  lng,
  floor,
  opening_hours,
  photo_url
)
values (
  '22222222-2222-2222-2222-222222222203',
  'Institute of Technology Complex',
  'building',
  null,
  '11111111-1111-1111-1111-111111111101',
  'Academic complex containing lecture halls, computing labs, and engineering faculty departments.',
  9.6192,
  41.8375,
  null,
  'Mon - Sat 08:00 - 18:00',
  null
)
on conflict (id) do nothing;

-- Sample 4: Computing & AI Laboratory (lab, nested under IoT Complex)
insert into public.locations (
  id,
  name,
  type,
  parent_id,
  category_id,
  description,
  lat,
  lng,
  floor,
  opening_hours,
  photo_url
)
values (
  '22222222-2222-2222-2222-222222222204',
  'Computing and AI Laboratory',
  'lab',
  '22222222-2222-2222-2222-222222222203',
  '11111111-1111-1111-1111-111111111101',
  'Dedicated computing lab for software engineering, networks, and artificial intelligence coursework.',
  9.6192,
  41.8375,
  2,
  'Mon - Fri 08:30 - 17:30',
  null
)
on conflict (id) do nothing;

-- Sample 5: Campus Health Center (facility)
insert into public.locations (
  id,
  name,
  type,
  parent_id,
  category_id,
  description,
  lat,
  lng,
  floor,
  opening_hours,
  photo_url
)
values (
  '22222222-2222-2222-2222-222222222205',
  'Campus Health Center',
  'facility',
  null,
  '11111111-1111-1111-1111-111111111104',
  'Campus outpatient clinic providing primary healthcare and medical triage for students and staff.',
  9.6165,
  41.8349,
  1,
  '24/7 Emergency, Outpatient 08:00 - 18:00',
  null
)
on conflict (id) do nothing;

-- 3. Insert Sample Services Linked to Locations
insert into public.services (
  id,
  name,
  description,
  location_id,
  hours,
  contact
)
values
  (
    '33333333-3333-3333-3333-333333333301',
    'Student Registrar Office',
    'Handles student enrollment, ID issuance, academic transcripts, and official records.',
    '22222222-2222-2222-2222-222222222201',
    'Mon - Fri 08:30 - 16:30',
    'registrar@ddu.edu.et'
  ),
  (
    '33333333-3333-3333-3333-333333333302',
    'Library Circulation & Digital Access Desk',
    'Book borrowing, study room bookings, and university digital portal support.',
    '22222222-2222-2222-2222-222222222202',
    'Mon - Sat 08:00 - 21:00',
    'library@ddu.edu.et'
  ),
  (
    '33333333-3333-3333-3333-333333333303',
    'Student Outpatient Care',
    'General medical consultations, basic lab testing, and emergency first aid response.',
    '22222222-2222-2222-2222-222222222205',
    '24 Hours',
    'clinic@ddu.edu.et'
  )
on conflict (id) do nothing;
