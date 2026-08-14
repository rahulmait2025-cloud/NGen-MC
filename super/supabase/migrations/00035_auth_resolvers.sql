-- Resolve auth context for callback routes with one RPC call.
-- This reduces repeated round-trips for membership/profile/tenant checks.

drop function if exists public.resolve_admin_auth_context(uuid, text);
drop function if exists public.resolve_student_auth_context(uuid, text);

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
      and (v_slug is null or lower(c.slug) = lower(v_slug))
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

create or replace function public.resolve_student_auth_context(
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
      select p_user_id, null::uuid, null::uuid, null::text, null::text, null::text, true, null::text, false, 'tenant'::text;
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
      and m.role = 'student'
      and m.status in ('active', 'invited')
      and c.status = 'active'
      and (v_slug is null or lower(c.slug) = lower(v_slug))
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
    select p_user_id, null::uuid, null::uuid, null::text, null::text, null::text, coalesce(v_profile_active, true), null::text, false, 'wrong_portal'::text;
  end if;
end;
$$;

revoke all on function public.resolve_admin_auth_context(uuid, text) from public;
revoke all on function public.resolve_student_auth_context(uuid, text) from public;

grant execute on function public.resolve_admin_auth_context(uuid, text) to authenticated;
grant execute on function public.resolve_student_auth_context(uuid, text) to authenticated;
