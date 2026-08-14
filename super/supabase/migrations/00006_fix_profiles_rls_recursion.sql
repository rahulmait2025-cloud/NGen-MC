-- Phase 11: Fix RLS recursion on profiles
-- Addresses: "infinite recursion detected in policy for relation profiles"

drop policy if exists "Superadmin can read all profiles" on public.profiles;
drop policy if exists "Service role can read all profiles" on public.profiles;

create policy "Service role can read all profiles"
  on public.profiles for select
  using (auth.role() = 'service_role');
