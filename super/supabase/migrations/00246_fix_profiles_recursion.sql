-- Fix infinite recursion in public.profiles and public.college_memberships RLS policies.
-- The "College admin read peer profiles" policy on public.profiles used inline subqueries
-- on public.college_memberships which triggered RLS, causing infinite recursion.
-- We replace this with a SECURITY DEFINER helper function.

begin;

-- =============================================================================
-- 1. Helper function: check if caller is college admin for target user
-- =============================================================================
create or replace function public.is_peer_profile(p_target_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.college_memberships m1
    join public.college_memberships m2
      on m1.college_id = m2.college_id
    where m1.user_id = auth.uid()
      and m1.status = 'active'
      and m1.role in ('college_admin', 'faculty_spoc')
      and m2.user_id = p_target_user_id
      and m2.status = 'active'
  );
$$;

grant execute on function public.is_peer_profile(uuid) to authenticated;

-- =============================================================================
-- 2. Update profiles policy
-- =============================================================================
drop policy if exists "College admin read peer profiles" on public.profiles;
create policy "College admin read peer profiles"
  on public.profiles for select
  using (public.is_peer_profile(id));

-- =============================================================================
-- 3. Hardening: Update college_memberships superadmin policies to use is_superadmin()
-- =============================================================================
drop policy if exists "Superadmin full access college_memberships" on public.college_memberships;
create policy "Superadmin full access college_memberships"
  on public.college_memberships for all
  using (public.is_superadmin())
  with check (public.is_superadmin());

-- =============================================================================
-- 4. Hardening: Update students superadmin policies to use is_superadmin()
-- =============================================================================
drop policy if exists "Superadmin full access students" on public.students;
create policy "Superadmin full access students"
  on public.students for all
  using (public.is_superadmin())
  with check (public.is_superadmin());

-- =============================================================================
-- 5. Hardening: Update colleges superadmin policies to use is_superadmin()
-- =============================================================================
drop policy if exists "Superadmin full access colleges" on public.colleges;
create policy "Superadmin full access colleges"
  on public.colleges for all
  using (public.is_superadmin())
  with check (public.is_superadmin());

commit;
