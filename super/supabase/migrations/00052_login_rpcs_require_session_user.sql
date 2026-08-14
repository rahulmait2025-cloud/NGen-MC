-- Ensure login helper RPCs cannot be called for arbitrary user ids (IDOR).
-- Callers must pass auth.uid() as p_user_id.

create or replace function public.resolve_admin_auth_context(
  p_user_id uuid,
  p_slug text default null
)
returns table (
  user_id uuid,
  membership_id uuid,
  college_id uuid,
  college_slug text,
  membership_role text,
  membership_status text,
  profile_is_active boolean,
  college_status text,
  allowed boolean,
  error_code text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slug text;
  v_profile_active boolean;
  v_slug_college_id uuid;
begin
  if p_user_id is distinct from auth.uid() then
    return query
      select
        auth.uid(),
        null::uuid,
        null::uuid,
        null::text,
        null::text,
        null::text,
        true,
        null::text,
        false,
        'forbidden'::text;
    return;
  end if;

  v_slug := nullif(trim(p_slug), '');

  select coalesce(p.is_active, true)
    into v_profile_active
  from public.profiles as p
  where p.id = p_user_id;

  if coalesce(v_profile_active, true) = false then
    return query
      select p_user_id, null::uuid, null::uuid, null::text, null::text, null::text, false, null::text, false, 'account_disabled'::text;
    return;
  end if;

  if v_slug is not null then
    select c.id
      into v_slug_college_id
    from public.colleges as c
    where lower(c.slug) = lower(v_slug)
      and c.status = 'active'
    limit 1;

    if v_slug_college_id is null then
      return query
        select p_user_id, null::uuid, null::uuid, null::text, null::text, null::text, true, null::text, false, 'tenant_not_found'::text;
      return;
    end if;
  end if;

  return query
  with picked as (
    select
      m.id as membership_id,
      m.college_id,
      c.slug as college_slug,
      m.role as membership_role,
      m.status as membership_status,
      c.status as college_status
    from public.college_memberships as m
    join public.colleges as c
      on c.id = m.college_id
    where m.user_id = p_user_id
      and m.role in ('college_admin', 'faculty_spoc', 'mentor')
      and m.status in ('active', 'invited')
      and c.status = 'active'
      and (v_slug is null or m.college_id = v_slug_college_id)
    order by m.created_at asc
    limit 1
  )
  select
    p_user_id,
    picked.membership_id,
    picked.college_id,
    picked.college_slug,
    picked.membership_role,
    picked.membership_status,
    coalesce(v_profile_active, true) as profile_is_active,
    picked.college_status,
    true as allowed,
    null::text as error_code
  from picked;

  if not found then
    return query
      select p_user_id, null::uuid, null::uuid, null::text, null::text, null::text, coalesce(v_profile_active, true), null::text, false, 'no_college_access'::text;
  end if;
end;
$$;

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
    where p_user_id = auth.uid()
  ),
  profile_row as (
    select
      p.id,
      coalesce(p.is_active, true) as is_active,
      p.email,
      p.full_name,
      p.global_role
    from public.profiles p
    join seed on seed.user_id = p.id
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
    join seed on seed.user_id = m.user_id
    where m.role in ('college_admin', 'faculty_spoc', 'mentor')
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
    join seed on seed.user_id = m.user_id
    where m.role = 'student'
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

-- Allow invited admins/students to flip their own membership to active after first login (client + RPC flows).
drop policy if exists "Users can activate own invited membership" on public.college_memberships;
create policy "Users can activate own invited membership"
  on public.college_memberships for update
  using (user_id = auth.uid() and status = 'invited')
  with check (user_id = auth.uid() and status = 'active');
