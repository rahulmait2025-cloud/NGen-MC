-- Phase 12: Fix potential recursion in college_memberships RLS policies
-- Uses SECURITY DEFINER helper so policies don't self-query the same table directly.

create or replace function public.is_current_user_college_admin(target_college_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.college_memberships cm
    where cm.user_id = auth.uid()
      and cm.college_id = target_college_id
      and cm.role = 'college_admin'
      and cm.status = 'active'
  );
$$;

revoke all on function public.is_current_user_college_admin(uuid) from public;
grant execute on function public.is_current_user_college_admin(uuid) to authenticated;

drop policy if exists "College admin can read memberships for their college" on public.college_memberships;
create policy "College admin can read memberships for their college"
  on public.college_memberships for select
  using (public.is_current_user_college_admin(college_id));

drop policy if exists "College admin can insert memberships in their college" on public.college_memberships;
create policy "College admin can insert memberships in their college"
  on public.college_memberships for insert
  with check (public.is_current_user_college_admin(college_id));
