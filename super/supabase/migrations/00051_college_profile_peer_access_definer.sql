-- Replace inline EXISTS on college_memberships (00050) with SECURITY DEFINER helper.
-- After migration 00008, college admins often cannot SELECT other users' membership rows under RLS,
-- so the 00050 policy's peer EXISTS evaluates false and breaks student profile reads in college-admin.
-- This function runs as definer and bypasses RLS only for the membership join check.

create or replace function public.college_peer_can_view_profile(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.global_role = 'superadmin'
    )
    or exists (
      select 1
      from public.college_memberships viewer_cm
      join public.college_memberships peer_cm
        on peer_cm.college_id = viewer_cm.college_id
      where viewer_cm.user_id = auth.uid()
        and viewer_cm.role in ('college_admin', 'faculty_spoc')
        and viewer_cm.status = 'active'
        and peer_cm.user_id = p_profile_id
        and peer_cm.status in ('active', 'invited')
    );
$$;

revoke all on function public.college_peer_can_view_profile(uuid) from public;
grant execute on function public.college_peer_can_view_profile(uuid) to authenticated;

drop policy if exists "College admin can read profiles in their college" on public.profiles;

create policy "College admin can read profiles in their college"
  on public.profiles for select
  using (public.college_peer_can_view_profile(profiles.id));

comment on function public.college_peer_can_view_profile(uuid) is
  'True for platform superadmin, or when the current user is active college_admin/faculty_spoc in the same college as p_profile_id. Used by profiles SELECT RLS.';
