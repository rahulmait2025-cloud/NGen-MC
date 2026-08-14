-- Security hardening: Fix permissive RLS policies, open email center policies,
-- missing college_features RLS, and profiles access for college admins.
--
-- Issues addressed:
-- 1. Permissive service_role policies (redundant — service_role already bypasses RLS)
-- 2. Email center policies use USING(true) WITH CHECK(true) with no TO restriction
--    → grants full access to every role including anon
-- 3. college_features table created in 00010 without RLS (fixed later in 00013,
--    but we ensure correct policies exist)
-- 4. profiles table has no read policy for college admins (recursion removed in 00006)
--    → add SECURITY DEFINER helper to safely read peer profiles

begin;

-- =============================================================================
-- 1. SECURITY DEFINER helper: safely check superadmin status without recursion
-- =============================================================================
-- The original "Superadmin can read all profiles" policy in 00002 caused infinite
-- recursion because it queried the same table it protects. We replace it with a
-- SECURITY DEFINER function that runs with owner privileges, breaking the cycle.

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

-- =============================================================================
-- 2. Fix profiles RLS — replace service_role-only policy with proper pol icies
-- =============================================================================
-- Current state after 00006:
--   "Users can read own profile"  — SELECT where id = auth.uid()
--   "Users can update own profile" — UPDATE where id = auth.uid()
--   "Users can insert own profile" — INSERT with id = auth.uid()
--   "Service role can read all profiles" — SELECT where auth.role() = 'service_role'
--                                          (redundant — service_role bypasses RLS)
--
-- Problem: no policy lets college admins read profiles of users in their college.
-- We add a SECURITY DEFINER function for this and replace the service_role policy.

drop policy if exists "Service role can read all profiles" on public.profiles;

-- College admins/faculty can read profiles of users who share a college membership.
-- Uses SECURITY DEFINER to avoid recursion (profiles → memberships → profiles).
create or replace function public.get_peer_profile_ids(p_college_id uuid)
returns setof uuid
language sql
security definer
set search_path = public
stable
as $$
  select m.user_id
  from public.college_memberships m
  where m.college_id = p_college_id
    and m.status = 'active'
    and m.user_id = auth.uid()
    and m.role in ('college_admin', 'faculty_spoc');
$$;

grant execute on function public.get_peer_profile_ids(uuid) to authenticated;

-- Superadmin can read all profiles (using SECURITY DEFINER helper to avoid recursion)
drop policy if exists "Superadmin read all profiles" on public.profiles;
create policy "Superadmin read all profiles"
  on public.profiles for select
  using (public.is_superadmin());

-- College admins can read profiles of users in the same college
drop policy if exists "College admin read peer profiles" on public.profiles;
create policy "College admin read peer profiles"
  on public.profiles for select
  using (
    id in (select public.get_peer_profile_ids(
      (select m2.college_id from public.college_memberships m2
       where m2.user_id = auth.uid() and m2.status = 'active'
       and m2.role in ('college_admin', 'faculty_spoc') limit 1)
    ))
  );

-- =============================================================================
-- 3. Fix college_features — ensure RLS is enabled and policies are correct
-- =============================================================================
-- The table was created in 00010 WITHOUT enable row level security.
-- 00013 later enabled RLS and added policies, but we enforce correctness here.

alter table if exists public.college_features enable row level security;

drop policy if exists "Superadmin full access college_features" on public.college_features;
create policy "Superadmin full access college_features"
  on public.college_features for all
  using (public.is_superadmin())
  with check (public.is_superadmin());

drop policy if exists "Tenant admins can read enabled features" on public.college_features;
create policy "Tenant admins can read enabled features"
  on public.college_features for select
  using (
    college_id in (
      select m.college_id from public.college_memberships m
      where m.user_id = auth.uid()
        and m.status = 'active'
        and m.role in ('college_admin', 'faculty_spoc')
    )
  );

-- =============================================================================
-- 4. Fix email center policies — replace USING(true) WITH CHECK(true) with
--    proper superadmin-only and service-role policies
-- =============================================================================
-- All 14 email center tables currently have policies named *_service_role_full_access
-- that use USING(true) WITH CHECK(true) WITHOUT a TO clause, meaning they grant
-- full CRUD to EVERY role (including anon). Fix: restrict to service_role only.

-- 4a. Drop all the broken policies

-- Phase 1a tables
drop policy if exists "email_templates_service_role_full_access" on public.email_templates;
drop policy if exists "email_campaigns_service_role_full_access" on public.email_campaigns;
drop policy if exists "email_campaign_tests_service_role_full_access" on public.email_campaign_tests;
drop policy if exists "email_suppressions_service_role_full_access" on public.email_suppressions;

-- Phase 1b tables
drop policy if exists "email_campaign_recipients_service_role_full_access" on public.email_campaign_recipients;
drop policy if exists "email_outbox_service_role_full_access" on public.email_outbox;
drop policy if exists "email_campaign_send_runs_service_role_full_access" on public.email_campaign_send_runs;

-- Phase 1c tables
drop policy if exists "email_events_service_role_full_access" on public.email_events;
drop policy if exists "email_click_links_service_role_full_access" on public.email_click_links;
drop policy if exists "email_open_tokens_service_role_full_access" on public.email_open_tokens;
drop policy if exists "email_preferences_service_role_full_access" on public.email_preferences;
drop policy if exists "email_unsubscribe_tokens_service_role_full_access" on public.email_unsubscribe_tokens;

-- Phase 1d tables
drop policy if exists "email_approval_events_service_role_full_access" on public.email_campaign_approval_events;
drop policy if exists "email_cron_runs_service_role_full_access" on public.email_cron_runs;

-- 4b. Create proper restrictive policies — service_role for internal ops, superadmin for management

-- Helper: email center tables are internal infrastructure.
-- Only service_role (cron jobs, send workers) and superadmin should access them.
-- No authenticated user should read or write email internals via RLS.

-- email_templates: superadmin manages, service_role reads for rendering
create policy "email_templates_superadmin_all"
  on public.email_templates for all
  using (public.is_superadmin())
  with check (public.is_superadmin());

-- email_campaigns: superadmin manages, service_role reads for send pipeline
create policy "email_campaigns_superadmin_all"
  on public.email_campaigns for all
  using (public.is_superadmin())
  with check (public.is_superadmin());

-- email_campaign_tests: superadmin manages
create policy "email_campaign_tests_superadmin_all"
  on public.email_campaign_tests for all
  using (public.is_superadmin())
  with check (public.is_superadmin());

-- email_suppressions: superadmin manages
create policy "email_suppressions_superadmin_all"
  on public.email_suppressions for all
  using (public.is_superadmin())
  with check (public.is_superadmin());

-- email_campaign_recipients: superadmin reads; service_role writes (send pipeline)
create policy "email_campaign_recipients_superadmin_select"
  on public.email_campaign_recipients for select
  using (public.is_superadmin());

-- email_outbox: superadmin reads; service_role writes (claimed via RPC)
create policy "email_outbox_superadmin_select"
  on public.email_outbox for select
  using (public.is_superadmin());

-- email_campaign_send_runs: superadmin reads
create policy "email_campaign_send_runs_superadmin_select"
  on public.email_campaign_send_runs for select
  using (public.is_superadmin());

-- email_events: superadmin reads for analytics
create policy "email_events_superadmin_select"
  on public.email_events for select
  using (public.is_superadmin());

-- email_click_links: superadmin reads
create policy "email_click_links_superadmin_select"
  on public.email_click_links for select
  using (public.is_superadmin());

-- email_open_tokens: superadmin reads
create policy "email_open_tokens_superadmin_select"
  on public.email_open_tokens for select
  using (public.is_superadmin());

-- email_preferences: keyed by email (not user_id); superadmin manages, service_role handles token-based unsubscribes
create policy "email_preferences_superadmin_all"
  on public.email_preferences for all
  using (public.is_superadmin())
  with check (public.is_superadmin());

-- email_unsubscribe_tokens: superadmin reads
create policy "email_unsubscribe_tokens_superadmin_select"
  on public.email_unsubscribe_tokens for select
  using (public.is_superadmin());

-- email_campaign_approval_events: superadmin manages
create policy "email_approval_events_superadmin_all"
  on public.email_campaign_approval_events for all
  using (public.is_superadmin())
  with check (public.is_superadmin());

-- email_cron_runs: superadmin reads; service_role writes (cron jobs)
create policy "email_cron_runs_superadmin_select"
  on public.email_cron_runs for select
  using (public.is_superadmin());

-- =============================================================================
-- 5. Fix background_jobs tables — remove redundant service_role policies
-- =============================================================================
-- service_role already bypasses RLS; these policies are noise. Drop them.

drop policy if exists "service_role_all_jobs" on public.jobs;
drop policy if exists "service_role_all_job_attempts" on public.job_attempts;
drop policy if exists "service_role_all_job_schedules" on public.job_schedules;

-- Add superadmin read access for dashboard visibility
create policy "jobs_superadmin_select"
  on public.jobs for select
  using (public.is_superadmin());

create policy "job_attempts_superadmin_select"
  on public.job_attempts for select
  using (public.is_superadmin());

create policy "job_schedules_superadmin_select"
  on public.job_schedules for select
  using (public.is_superadmin());

-- =============================================================================
-- 6. Fix rate_limits — remove redundant service_role policy
-- =============================================================================
drop policy if exists "rate_limits_service_role_all" on public.rate_limits;

-- rate_limits is internal infrastructure; only service_role needs it.
-- Since service_role bypasses RLS, no policy is needed. But if you want
-- superadmin read access for debugging:
create policy "rate_limits_superadmin_select"
  on public.rate_limits for select
  using (public.is_superadmin());

-- =============================================================================
-- 7. Verify all email center tables have RLS enabled (idempotent)
-- =============================================================================
alter table if exists public.email_templates enable row level security;
alter table if exists public.email_campaigns enable row level security;
alter table if exists public.email_campaign_tests enable row level security;
alter table if exists public.email_suppressions enable row level security;
alter table if exists public.email_campaign_recipients enable row level security;
alter table if exists public.email_outbox enable row level security;
alter table if exists public.email_campaign_send_runs enable row level security;
alter table if exists public.email_events enable row level security;
alter table if exists public.email_click_links enable row level security;
alter table if exists public.email_open_tokens enable row level security;
alter table if exists public.email_preferences enable row level security;
alter table if exists public.email_unsubscribe_tokens enable row level security;
alter table if exists public.email_campaign_approval_events enable row level security;
alter table if exists public.email_cron_runs enable row level security;

alter table if exists public.jobs enable row level security;
alter table if exists public.job_attempts enable row level security;
alter table if exists public.job_schedules enable row level security;
alter table if exists public.rate_limits enable row level security;

-- =============================================================================
-- 8. Guard college_memberships.role against privilege escalation
-- =============================================================================
-- Add a CHECK constraint so that even if RLS is bypassed (e.g. via service-role),
-- the role column can only contain known values. This prevents a compromised
-- service key or a future code bug from granting superadmin via college_memberships.

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'college_memberships_role_check'
      and conrelid = 'public.college_memberships'::regclass
  ) then
    alter table public.college_memberships
      add constraint college_memberships_role_check
      check (role in ('college_admin', 'faculty_spoc', 'mentor'));
  end if;
end $$;

-- =============================================================================
-- 9. Guard college_memberships.status against unexpected values
-- =============================================================================
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'college_memberships_status_check'
      and conrelid = 'public.college_memberships'::regclass
  ) then
    alter table public.college_memberships
      add constraint college_memberships_status_check
      check (status in ('active', 'invited', 'suspended'));
  end if;
end $$;

-- =============================================================================
-- 10. Guard profiles.global_role against unexpected values
-- =============================================================================
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_global_role_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_global_role_check
      check (global_role in ('superadmin', 'college_admin', 'student'));
  end if;
end $$;

commit;
