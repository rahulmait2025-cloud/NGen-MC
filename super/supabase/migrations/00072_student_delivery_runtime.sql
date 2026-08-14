-- ──────────────────────────────────────────────────────────────────────────────
-- Migration 00072: Student Delivery Runtime (Phase 4)
--
-- Creates the student-facing access, progress, and session tracking tables.
-- Variant/Bundle tables are deferred to Phase 5.
--
-- Tables:
--   1. student_entitlements  — access-control grants
--   2. student_progress      — per-item completion tracking
--   3. student_video_sessions — granular watch session log
-- ──────────────────────────────────────────────────────────────────────────────

-- ─── student_entitlements ─────────────────────────────────────────────────────

create table public.student_entitlements (
  id uuid primary key default gen_random_uuid(),

  student_id uuid not null references public.students (id) on delete cascade,
  master_course_id uuid not null references public.master_courses (id) on delete cascade,

  -- How was this entitlement created?
  source_type text not null default 'manual_grant'
    check (source_type in (
      'b2b_college',
      'b2c_direct',
      'bundle',
      'subscription',
      'manual_grant'
    )),

  -- Optional FK to originating college (for B2B tracking)
  college_id uuid references public.colleges (id) on delete set null,

  status text not null default 'active'
    check (status in ('active', 'expired', 'revoked', 'suspended')),

  valid_from timestamptz not null default now(),
  valid_until timestamptz, -- NULL = no expiry

  granted_by uuid references public.profiles (id) on delete set null,
  revoked_at timestamptz,
  revoked_by uuid references public.profiles (id) on delete set null,
  revoke_reason text,

  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_student_entitlements_student on public.student_entitlements (student_id);
create index idx_student_entitlements_course on public.student_entitlements (master_course_id);
create index idx_student_entitlements_status on public.student_entitlements (student_id, status);
create index idx_student_entitlements_college on public.student_entitlements (college_id);

create trigger trg_student_entitlements_updated_at
  before update on public.student_entitlements
  for each row execute function public.set_updated_at();

-- ─── student_progress ─────────────────────────────────────────────────────────

create table public.student_progress (
  id uuid primary key default gen_random_uuid(),

  student_id uuid not null references public.students (id) on delete cascade,
  item_id uuid not null references public.master_course_items (id) on delete cascade,
  entitlement_id uuid references public.student_entitlements (id) on delete set null,

  watched_seconds real not null default 0,
  total_seconds real not null default 0,
  last_position_seconds real not null default 0,

  completed boolean not null default false,
  completed_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint uq_student_item_progress unique (student_id, item_id)
);

create index idx_student_progress_student on public.student_progress (student_id);
create index idx_student_progress_item on public.student_progress (item_id);
create index idx_student_progress_entitlement on public.student_progress (entitlement_id);

create trigger trg_student_progress_updated_at
  before update on public.student_progress
  for each row execute function public.set_updated_at();

-- ─── student_video_sessions ───────────────────────────────────────────────────
-- Lean session log. No device/IP fingerprinting per Phase 4 scope.

create table public.student_video_sessions (
  id uuid primary key default gen_random_uuid(),

  student_id uuid not null references public.students (id) on delete cascade,
  video_asset_id uuid not null references public.video_assets (id) on delete cascade,
  item_id uuid references public.master_course_items (id) on delete set null,

  started_at timestamptz not null default now(),
  ended_at timestamptz,
  watched_duration_seconds real not null default 0,

  created_at timestamptz not null default now()
);

create index idx_video_sessions_student on public.student_video_sessions (student_id);
create index idx_video_sessions_asset on public.student_video_sessions (video_asset_id);
create index idx_video_sessions_item on public.student_video_sessions (item_id);

-- ─── RLS Policies ─────────────────────────────────────────────────────────────

alter table public.student_entitlements enable row level security;
alter table public.student_progress enable row level security;
alter table public.student_video_sessions enable row level security;

-- SuperAdmin: full access
create policy entitlements_superadmin_all on public.student_entitlements
  for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.global_role = 'superadmin' and p.is_active = true))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.global_role = 'superadmin' and p.is_active = true));

create policy progress_superadmin_all on public.student_progress
  for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.global_role = 'superadmin' and p.is_active = true))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.global_role = 'superadmin' and p.is_active = true));

create policy sessions_superadmin_all on public.student_video_sessions
  for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.global_role = 'superadmin' and p.is_active = true))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.global_role = 'superadmin' and p.is_active = true));

-- Students: read + write own rows only
create policy entitlements_student_read on public.student_entitlements
  for select to authenticated
  using (
    student_id in (select s.id from public.students s where s.user_id = auth.uid())
  );

create policy progress_student_all on public.student_progress
  for all to authenticated
  using (
    student_id in (select s.id from public.students s where s.user_id = auth.uid())
  )
  with check (
    student_id in (select s.id from public.students s where s.user_id = auth.uid())
  );

create policy sessions_student_all on public.student_video_sessions
  for all to authenticated
  using (
    student_id in (select s.id from public.students s where s.user_id = auth.uid())
  )
  with check (
    student_id in (select s.id from public.students s where s.user_id = auth.uid())
  );

-- Grants
grant select, insert, update, delete on public.student_entitlements to authenticated;
grant select, insert, update, delete on public.student_progress to authenticated;
grant select, insert, update, delete on public.student_video_sessions to authenticated;
