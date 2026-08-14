-- Migration: 00198_auth_and_performance_optimizations.sql
-- Phase 14: Missing indexes, helper functions, RLS policy optimizations
-- Run in Supabase SQL Editor or via Supabase CLI (supabase db push)
--
-- SAFETY NOTES:
-- - is_superadmin_fast() reads profiles table (source of truth), NOT JWT claims.
--   JWT custom claims were NOT used because the app does not yet reliably populate
--   global_role into app_metadata on sign-up, so JWT claims cannot be trusted.
-- - No auth.users triggers created — auth.users mutation from triggers can cause
--   infinite recursion and is not needed since profiles.global_role is the source.
-- - RLS policy replacements are additive; only named policies with exact matches
--   are dropped, preserving all other existing policies.
-- - Index creation uses IF NOT EXISTS to be idempotent and skip missing tables.
-- - ANALYZE wrapped in DO block so missing tables don't fail the migration.

-- ═══════════════════════════════════════════════════════════════
-- PART 1: SECURITY DEFINER HELPER FUNCTIONS
-- Bypass RLS recursion via SECURITY DEFINER, use profiles.global_role
-- as the single source of truth for superadmin status.
-- ═══════════════════════════════════════════════════════════════

-- is_superadmin_fast: reads profiles.global_role (NOT JWT claims).
-- JWT claims are skipped because the app does not yet reliably set global_role
-- in app_metadata on sign-up, so relying on JWT would give false negatives.
create or replace function public.is_superadmin_fast()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.global_role = 'superadmin'
      and p.is_active = true
  );
$$;

-- is_college_admin_fast: checks active college_admin membership
create or replace function public.is_college_admin_fast(p_college_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.college_memberships cm
    where cm.user_id = auth.uid()
      and cm.college_id = p_college_id
      and cm.role = 'college_admin'
      and cm.status = 'active'
  );
$$;

-- is_content_manager_fast: checks college_admin or faculty_spoc membership
create or replace function public.is_content_manager_fast(p_college_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.college_memberships cm
    where cm.user_id = auth.uid()
      and cm.college_id = p_college_id
      and cm.role in ('college_admin', 'faculty_spoc')
      and cm.status = 'active'
  );
$$;

-- is_student_fast: checks active student membership
create or replace function public.is_student_fast(p_college_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.college_memberships cm
    where cm.user_id = auth.uid()
      and cm.college_id = p_college_id
      and cm.role = 'student'
      and cm.status in ('active', 'invited')
  );
$$;

-- get_user_primary_college: returns the most-privileged active college for the user
create or replace function public.get_user_primary_college()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select cm.college_id
  from public.college_memberships cm
  where cm.user_id = auth.uid() and cm.status = 'active'
  order by
    case cm.role
      when 'college_admin' then 1
      when 'faculty_spoc' then 2
      when 'mentor' then 3
      when 'student' then 4
      else 5
    end
  limit 1;
$$;

-- get_user_college_ids: returns all active college IDs for the user
create or replace function public.get_user_college_ids()
returns uuid[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(array_agg(cm.college_id), array[]::uuid[])
  from public.college_memberships cm
  where cm.user_id = auth.uid() and cm.status = 'active';
$$;

-- Revoke execute from public, grant to authenticated
revoke execute on function public.is_superadmin_fast() from public;
revoke execute on function public.is_college_admin_fast(uuid) from public;
revoke execute on function public.is_content_manager_fast(uuid) from public;
revoke execute on function public.is_student_fast(uuid) from public;
revoke execute on function public.get_user_primary_college() from public;
revoke execute on function public.get_user_college_ids() from public;

grant execute on function public.is_superadmin_fast() to authenticated;
grant execute on function public.is_college_admin_fast(uuid) to authenticated;
grant execute on function public.is_content_manager_fast(uuid) to authenticated;
grant execute on function public.is_student_fast(uuid) to authenticated;
grant execute on function public.get_user_primary_college() to authenticated;
grant execute on function public.get_user_college_ids() to authenticated;

-- ═══════════════════════════════════════════════════════════════
-- PART 2: MISSING PERFORMANCE INDEXES
-- All use IF NOT EXISTS so this migration is idempotent.
-- Tables and columns are verified against the base schema (00001).
-- Optional/legacy tables use DO $$ block so missing tables don't fail.
-- ═══════════════════════════════════════════════════════════════

-- Students: placement_ready_status filter (used heavily in placement dashboard)
-- Column confirmed: placement_ready_status text (line 64 of 00001)
create index if not exists idx_students_college_placement_status
  on public.students(college_id, placement_ready_status)
  where placement_ready_status is not null;

-- Lecture progress: enrollment + completed_at (used in completion rate queries)
-- Table confirmed: lecture_progress with enrollment_id, completed_at (00014)
create index if not exists idx_lecture_progress_enrollment_completed
  on public.lecture_progress(enrollment_id, completed_at);

-- Assessment attempts: student's active attempt lookup
-- Table confirmed: assessment_attempts with student_id, status (00016)
create index if not exists idx_assessment_attempts_student_status
  on public.assessment_attempts(student_id, status)
  where status = 'in_progress';

-- Profiles: superadmin lookup (existing partial index is on global_role WHERE NOT NULL;
-- this one is specifically for superadmin = true scans)
-- Table confirmed: profiles with global_role (00001)
create index if not exists idx_profiles_global_role_superadmin
  on public.profiles(global_role)
  where global_role = 'superadmin';

-- College memberships: user + status for session validation
-- Table confirmed: college_memberships with user_id, status (00001)
create index if not exists idx_college_memberships_user_active
  on public.college_memberships(user_id, status)
  where status = 'active';

-- Course enrollments: course + student for access checks
-- Table confirmed: course_enrollments with course_id, student_id (00014)
create index if not exists idx_course_enrollments_course_student
  on public.course_enrollments(course_id, student_id);

-- Audit logs: tenant + time (table confirmed in 00003)
-- DO $$ block in case audit_logs table doesn't exist in this DB yet
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'audit_logs'
  ) then
    create index if not exists idx_audit_logs_college_created
      on public.audit_logs(college_id, created_at desc);
  end if;
end $$;

-- Activity events: tenant + actor + time (table confirmed in 00011)
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'activity_events'
  ) then
    create index if not exists idx_activity_events_tenant_actor
      on public.activity_events(tenant_id, actor_user_id, created_at desc);
  end if;
end $$;

-- Admin sessions: user + status for session lookup (table confirmed in 00013)
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'admin_sessions'
  ) then
    create index if not exists idx_admin_sessions_user_status
      on public.admin_sessions(user_id, status)
      where status = 'active';
  end if;
end $$;

-- video_watch_sessions: student + started_at for learning analytics
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'video_watch_sessions'
  ) then
    create index if not exists idx_video_watch_sessions_student_started
      on public.video_watch_sessions(student_id, started_at desc);
  end if;
end $$;

-- student_video_progress: student + lesson_id for unique lookup
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'student_video_progress'
  ) then
    create index if not exists idx_student_video_progress_student_lesson
      on public.student_video_progress(student_id, lesson_id);
  end if;
end $$;

-- ═══════════════════════════════════════════════════════════════
-- PART 3: RLS POLICY REFINEMENTS (additive only)
-- Only exact-named policies are replaced. No policy is blindly dropped.
-- Existing policies not mentioned here are left completely untouched.
-- ═══════════════════════════════════════════════════════════════

-- Replacement 1: profiles "Superadmin can read all profiles"
-- Uses is_superadmin_fast() which reads profiles table directly (no JWT reliance)
-- Only replaces if policy already exists with this exact name.
do $$
begin
  if exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'Superadmin can read all profiles'
  ) then
    drop policy if exists "Superadmin can read all profiles" on public.profiles;
    create policy "Superadmin can read all profiles"
      on public.profiles for select
      using (public.is_superadmin_fast());
  end if;
end $$;

-- Replacement 2: college_memberships "Users can read own memberships"
-- Simplifies to direct user_id check (already optimal, just making explicit)
-- Only replaces if policy already exists with this exact name.
do $$
begin
  if exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'college_memberships'
      and policyname = 'Users can read own memberships'
  ) then
    drop policy if exists "Users can read own memberships" on public.college_memberships;
    create policy "Users can read own memberships"
      on public.college_memberships for select
      using (user_id = auth.uid());
  end if;
end $$;

-- ═══════════════════════════════════════════════════════════════
-- PART 4: ANALYZE (wrapped so missing tables don't fail migration)
-- ═══════════════════════════════════════════════════════════════

do $$
declare
  tables_to_analyze text[] := array[
    'profiles',
    'college_memberships',
    'students',
    'lecture_progress',
    'course_enrollments',
    'assessment_attempts'
  ];
  t text;
begin
  foreach t in array tables_to_analyze loop
    if exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = t
    ) then
      execute 'analyze public.' || t;
    end if;
  end loop;
end $$;

-- ═══════════════════════════════════════════════════════════════
-- VERIFICATION QUERIES (run manually in SQL Editor)
-- ═══════════════════════════════════════════════════════════════

-- 1. Test helper functions
-- select public.is_superadmin_fast();                          -- should return true for superadmin, false otherwise
-- select public.is_college_admin_fast('<college_uuid>');       -- replace with actual college ID
-- select public.is_content_manager_fast('<college_uuid>');    -- replace with actual college ID
-- select public.is_student_fast('<college_uuid>');              -- replace with actual college ID
-- select public.get_user_primary_college();                    -- returns user's most-privileged college UUID
-- select public.get_user_college_ids();                        -- returns array of all user's college UUIDs

-- 2. Inspect policies after migration
-- select schemaname, tablename, policyname, cmd, qual, with_check
-- from pg_policies
-- where schemaname = 'public'
--   and tablename in ('profiles', 'college_memberships', 'students')
-- order by tablename, policyname;

-- 3. List created indexes
-- select schemaname, tablename, indexname
-- from pg_indexes
-- where schemaname = 'public'
--   and indexname like 'idx_%'
-- order by tablename, indexname;

-- 4. Check for duplicate/conflicting indexes on college_memberships
-- select tablename, indexname, indexdef
-- from pg_indexes
-- where schemaname = 'public'
--   and tablename = 'college_memberships';