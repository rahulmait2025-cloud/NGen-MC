-- Allow college admins to read profiles of users in the same college (roster: students + peers).
-- Superseded for correctness by 00051 when peer membership rows are not visible under RLS (post-00008).
-- Kept as a numbered step so existing databases that already applied this filename stay consistent.

drop policy if exists "College admin can read profiles in their college" on public.profiles;

create policy "College admin can read profiles in their college"
  on public.profiles for select
  using (
    exists (
      select 1
      from public.college_memberships viewer_cm
      where viewer_cm.user_id = auth.uid()
        and viewer_cm.role = 'college_admin'
        and viewer_cm.status = 'active'
        and exists (
          select 1
          from public.college_memberships peer_cm
          where peer_cm.college_id = viewer_cm.college_id
            and peer_cm.user_id = profiles.id
            and peer_cm.status in ('active', 'invited')
        )
    )
  );

comment on policy "College admin can read profiles in their college" on public.profiles is
  'Lets tenant college_admin load full_name/email for students and other members via college_memberships join; 00051 replaces evaluation with SECURITY DEFINER when RLS hides peer rows.';
