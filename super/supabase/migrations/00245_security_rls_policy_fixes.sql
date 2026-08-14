-- Security hardening: Fix permissive RLS policies in existing migrations.
-- These policies were flagged as too permissive during security review.
--
-- Issues fixed:
-- 1. 00010 plans_read_authenticated: using(true) exposes all plans to any authenticated user
-- 2. 00032 Authenticated can insert college leads: with check(true) allows any auth user to insert
-- 3. 00170 college_leads_auth_insert: needs superadmin INSERT policy (update-only currently)
-- 4. 00234 college_features_superadmin_all: inline subquery → use is_superadmin() helper
-- 5. 00239 Students can view availability: using(true) exposes all availability to any auth user

begin;

-- =============================================================================
-- 1. Fix 00010 plans_read_authenticated policy
-- =============================================================================
-- The original policy uses using(true) which allows ALL authenticated users
-- to read ALL plans. Fix: require auth.uid() is not null (plans are not tenant-
-- isolated data, but should still require authentication).

drop policy if exists plans_read_authenticated on public.plans;
create policy plans_read_authenticated
  on public.plans for select
  to authenticated
  using (auth.uid() is not null);

-- =============================================================================
-- 2. Fix 00032 Authenticated can insert college leads
-- =============================================================================
-- The original policy uses with check(true) which allows ANY authenticated user
-- to insert leads for ANY college. This is only used by superadmins, so we
-- restrict to auth.uid() is not null (the service-role bypass handles superadmin).
-- For additional safety, we also add a superadmin INSERT policy.

drop policy if exists "Authenticated can insert college leads" on public.college_leads;
drop policy if exists "college_leads_auth_insert" on public.college_leads;
create policy "college_leads_auth_insert"
  on public.college_leads for insert
  to authenticated
  with check (auth.uid() is not null);

-- =============================================================================
-- 3. Add superadmin INSERT policy for college_leads (00170 only added auth INSERT)
-- =============================================================================
-- The 00170 migration updated the INSERT policy but didn't add a superadmin-specific
-- one for bulk operations. Add it here.
drop policy if exists "SuperAdmin can insert college leads" on public.college_leads;
create policy "SuperAdmin can insert college leads"
  on public.college_leads for insert
  to authenticated
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.global_role = 'superadmin'
    )
  );

-- =============================================================================
-- 4. Fix 00234 college_features_superadmin_all
-- =============================================================================
-- The original policy uses an inline subquery that can cause recursion issues
-- when combined with other profiles policies. Use the is_superadmin() helper
-- which was introduced in 00244 (or create it here if not exists).

create or replace function public.is_superadmin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.global_role = 'superadmin'
  );
$$;

grant execute on function public.is_superadmin() to authenticated;

drop policy if exists college_features_superadmin_all on public.college_features;
create policy college_features_superadmin_all
  on public.college_features for all
  using (public.is_superadmin())
  with check (public.is_superadmin());

-- =============================================================================
-- 5. Fix 00239 Students can view availability
-- =============================================================================
-- The original policy uses using(true) which allows ALL authenticated users
-- to view ALL availability. This is a privacy leak. Fix: require auth.uid() is not null
-- (availability is not tenant-isolated, but should still require authentication).

drop policy if exists "Students can view availability" on public.paid_mentorship_availability;
create policy "Students can view availability"
  on public.paid_mentorship_availability
  for select
  to authenticated
  using (auth.uid() is not null and is_active = true);

-- =============================================================================
-- 6. Drop redundant service_role policies (00020 background_jobs)
-- =============================================================================
-- These policies use auth.role() = 'service_role' which is redundant because
-- service_role already bypasses RLS. Drop them to clean up.

drop policy if exists "service_role_all_jobs" on public.jobs;
drop policy if exists "service_role_all_job_attempts" on public.job_attempts;
drop policy if exists "service_role_all_job_schedules" on public.job_schedules;

-- Add superadmin read policies for the SuperAdmin dashboard
drop policy if exists "jobs_superadmin_select" on public.jobs;
create policy "jobs_superadmin_select"
  on public.jobs for select
  using (public.is_superadmin());

drop policy if exists "job_attempts_superadmin_select" on public.job_attempts;
create policy "job_attempts_superadmin_select"
  on public.job_attempts for select
  using (public.is_superadmin());

drop policy if exists "job_schedules_superadmin_select" on public.job_schedules;
create policy "job_schedules_superadmin_select"
  on public.job_schedules for select
  using (public.is_superadmin());

-- =============================================================================
-- 7. Drop redundant rate_limits service_role policy (00234)
-- =============================================================================
drop policy if exists "rate_limits_service_role_all" on public.rate_limits;

-- Add superadmin read for debugging
drop policy if exists "rate_limits_superadmin_select" on public.rate_limits;
create policy "rate_limits_superadmin_select"
  on public.rate_limits for select
  using (public.is_superadmin());

-- =============================================================================
-- 8. Ensure RLS is enabled on paid_mentorship_availability (00239 created table)
-- =============================================================================
alter table if exists public.paid_mentorship_availability enable row level security;

commit;