-- Phase 13: Remove recursive-prone college-wide membership policies
-- Keep login-safe policies only: own-membership select + superadmin full access.

drop policy if exists "College admin can read memberships for their college" on public.college_memberships;
drop policy if exists "College admin can insert memberships in their college" on public.college_memberships;
