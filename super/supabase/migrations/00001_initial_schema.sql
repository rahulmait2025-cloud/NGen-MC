-- Phase 5: Initial schema for multi-tenant college platform
-- Run in Supabase SQL Editor or via Supabase CLI (supabase db push)
-- Same schema for all 3 apps (SuperAdmin, CollegeAdmin, LMS); use one Supabase project.

-- Colleges (tenants)
create table if not exists public.colleges (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  short_name text,
  status text not null default 'active' check (status in ('active', 'inactive', 'suspended')),
  logo_url text,
  primary_color text,
  secondary_color text,
  support_email text,
  support_phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_colleges_slug on public.colleges(slug);
create index if not exists idx_colleges_status on public.colleges(status);

-- Profiles (extends auth.users; id = auth.uid())
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  global_role text check (global_role is null or global_role = 'superadmin'),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_profiles_global_role on public.profiles(global_role) where global_role is not null;

-- College memberships (user <-> college, role)
create table if not exists public.college_memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  college_id uuid not null references public.colleges(id) on delete cascade,
  role text not null check (role in ('college_admin', 'student', 'faculty_spoc')),
  status text not null default 'active' check (status in ('active', 'inactive', 'invited')),
  created_at timestamptz not null default now(),
  unique(user_id, college_id)
);

create index if not exists idx_college_memberships_user on public.college_memberships(user_id);
create index if not exists idx_college_memberships_college on public.college_memberships(college_id);

-- Students (per-college student record; links user + college)
create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  college_id uuid not null references public.colleges(id) on delete cascade,
  student_code text,
  cohort_id uuid,
  program_id uuid,
  year_or_semester text,
  github_url text,
  linkedin_url text,
  resume_url text,
  placement_ready_status text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, college_id)
);

create index if not exists idx_students_user on public.students(user_id);
create index if not exists idx_students_college on public.students(college_id);

-- Trigger to keep updated_at
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists colleges_updated_at on public.colleges;
create trigger colleges_updated_at
  before update on public.colleges
  for each row execute function public.set_updated_at();

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists students_updated_at on public.students;
create trigger students_updated_at
  before update on public.students
  for each row execute function public.set_updated_at();

-- Enable RLS on all tables
alter table public.colleges enable row level security;
alter table public.profiles enable row level security;
alter table public.college_memberships enable row level security;
alter table public.students enable row level security;
