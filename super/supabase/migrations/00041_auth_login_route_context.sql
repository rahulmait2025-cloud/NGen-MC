create or replace function public.resolve_login_route_context(
  p_user_id uuid
)
returns table (
  user_id uuid,
  profile_is_active boolean,
  profile_email text,
  profile_full_name text,
  profile_global_role text,
  admin_membership_id uuid,
  admin_college_id uuid,
  admin_college_slug text,
  admin_membership_status text,
  student_membership_id uuid,
  student_college_id uuid,
  student_college_slug text,
  student_membership_status text,
  student_id uuid
)
language sql
security definer
set search_path = public
as $$
  with seed as (
    select p_user_id as user_id
  ),
  profile_row as (
    select
      p.id,
      coalesce(p.is_active, true) as is_active,
      p.email,
      p.full_name,
      p.global_role
    from public.profiles p
    where p.id = p_user_id
  ),
  admin_choice as (
    select
      m.id as membership_id,
      m.college_id,
      c.slug as college_slug,
      m.status as membership_status
    from public.college_memberships m
    join public.colleges c
      on c.id = m.college_id
    where m.user_id = p_user_id
      and m.role in ('college_admin', 'faculty_spoc', 'mentor')
      and m.status in ('active', 'invited')
      and c.status = 'active'
    order by m.created_at asc
    limit 1
  ),
  student_choice as (
    select
      m.id as membership_id,
      m.college_id,
      c.slug as college_slug,
      m.status as membership_status,
      s.id as student_id
    from public.college_memberships m
    join public.colleges c
      on c.id = m.college_id
    left join public.students s
      on s.user_id = m.user_id
     and s.college_id = m.college_id
    where m.user_id = p_user_id
      and m.role = 'student'
      and m.status in ('active', 'invited')
      and c.status = 'active'
    order by m.created_at asc
    limit 1
  )
  select
    seed.user_id,
    profile_row.is_active,
    profile_row.email,
    profile_row.full_name,
    profile_row.global_role,
    admin_choice.membership_id,
    admin_choice.college_id,
    admin_choice.college_slug,
    admin_choice.membership_status,
    student_choice.membership_id,
    student_choice.college_id,
    student_choice.college_slug,
    student_choice.membership_status,
    student_choice.student_id
  from seed
  left join profile_row on true
  left join admin_choice on true
  left join student_choice on true;
$$;

revoke all on function public.resolve_login_route_context(uuid) from public;
grant execute on function public.resolve_login_route_context(uuid) to authenticated;
