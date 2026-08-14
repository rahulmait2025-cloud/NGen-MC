-- Phase 16: Add custom college name support for Unknown college students

alter table public.students add column if not exists custom_college_name text;

drop function if exists public.resolve_student_auth_context(uuid, text);

create or replace function public.resolve_student_auth_context(
  p_user_id uuid,
  p_slug text default null
)
returns table (
  user_id uuid,
  membership_id uuid,
  college_id uuid,
  student_id uuid,
  college_slug text,
  membership_role text,
  membership_status text,
  profile_is_active boolean,
  college_status text,
  allowed boolean,
  error_code text,
  college_name text,
  short_name text,
  logo_url text,
  primary_color text,
  secondary_color text,
  profile_email text,
  profile_full_name text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slug text;
  v_profile_active boolean;
  v_profile_email text;
  v_profile_full_name text;
  v_slug_college_id uuid;
begin
  v_slug := nullif(trim(p_slug), '');

  select coalesce(p.is_active, true), p.email, p.full_name
    into v_profile_active, v_profile_email, v_profile_full_name
  from public.profiles as p
  where p.id = p_user_id;

  if coalesce(v_profile_active, true) = false then
    return query
    select p_user_id, null::uuid, null::uuid, null::uuid, null::text, null::text, null::text,
           false, null::text, false, 'account_disabled'::text,
           null::text, null::text, null::text, null::text, null::text,
           v_profile_email, v_profile_full_name;
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
      select p_user_id, null::uuid, null::uuid, null::uuid, null::text, null::text, null::text,
             true, null::text, false, 'tenant'::text,
             null::text, null::text, null::text, null::text, null::text,
             v_profile_email, v_profile_full_name;
      return;
    end if;
  end if;

  return query
  with picked as (
    select
      m.id as membership_id,
      m.college_id,
      s.id as student_id,
      c.slug as college_slug,
      m.role as membership_role,
      m.status as membership_status,
      c.status as college_status,
      case 
        when c.slug = 'unknown' and s.custom_college_name is not null then s.custom_college_name
        else c.name
      end as college_name,
      c.short_name,
      c.logo_url,
      c.primary_color,
      c.secondary_color
    from public.college_memberships as m
    join public.colleges as c
      on c.id = m.college_id
    join public.students as s
      on s.user_id = m.user_id
     and s.college_id = m.college_id
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
    picked.student_id,
    picked.college_slug,
    picked.membership_role,
    picked.membership_status,
    coalesce(v_profile_active, true) as profile_is_active,
    picked.college_status,
    true as allowed,
    null::text as error_code,
    picked.college_name,
    picked.short_name,
    picked.logo_url,
    picked.primary_color,
    picked.secondary_color,
    v_profile_email,
    v_profile_full_name
  from picked;

  if not found then
    return query
    select p_user_id, null::uuid, null::uuid, null::uuid, null::text, null::text, null::text,
           coalesce(v_profile_active, true), null::text, false, 'wrong_portal'::text,
           null::text, null::text, null::text, null::text, null::text,
           v_profile_email, v_profile_full_name;
  end if;
end;
$$;

revoke all on function public.resolve_student_auth_context(uuid, text) from public;
grant execute on function public.resolve_student_auth_context(uuid, text) to authenticated;
