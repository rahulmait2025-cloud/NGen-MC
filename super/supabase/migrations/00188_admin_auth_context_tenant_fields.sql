-- Extend resolve_admin_auth_context RPC to return tenant fields
-- This eliminates the extra colleges query after the RPC call in CollegeAdmin auth flow.
-- Expected impact: 1 fewer DB query per CollegeAdmin navigation.
--
-- NOTE: Uses DROP + CREATE because PostgreSQL does not allow changing the return
-- type of an existing function via CREATE OR REPLACE FUNCTION.

-- 1. Drop the existing function (no CASCADE — safe because no dependent objects reference it)
drop function if exists public.resolve_admin_auth_context(uuid, text);

-- 2. Recreate with extended return type
create function public.resolve_admin_auth_context(
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
  error_code text,
  -- Tenant display fields (eliminates extra colleges query)
  college_name text,
  short_name text,
  logo_url text,
  primary_color text,
  secondary_color text
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
  -- IDOR guard: caller must be the authenticated user
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
        'forbidden'::text,
        null::text,
        null::text,
        null::text,
        null::text,
        null::text;
    return;
  end if;

  v_slug := nullif(trim(p_slug), '');

  -- Check profile active status
  select coalesce(p.is_active, true)
    into v_profile_active
  from public.profiles as p
  where p.id = p_user_id;

  if coalesce(v_profile_active, true) = false then
    return query
      select
        p_user_id,
        null::uuid,
        null::uuid,
        null::text,
        null::text,
        null::text,
        false,
        null::text,
        false,
        'account_disabled'::text,
        null::text,
        null::text,
        null::text,
        null::text,
        null::text;
    return;
  end if;

  -- If slug provided, resolve college_id first
  if v_slug is not null then
    select c.id
      into v_slug_college_id
    from public.colleges as c
    where lower(c.slug) = lower(v_slug)
      and c.status = 'active'
    limit 1;

    if v_slug_college_id is null then
      return query
        select
          p_user_id,
          null::uuid,
          null::uuid,
          null::text,
          null::text,
          null::text,
          true,
          null::text,
          false,
          'tenant_not_found'::text,
          null::text,
          null::text,
          null::text,
          null::text,
          null::text;
      return;
    end if;
  end if;

  -- Find membership + tenant in one join (includes tenant display fields)
  return query
  with picked as (
    select
      m.id as membership_id,
      m.college_id,
      c.slug as college_slug,
      m.role as membership_role,
      m.status as membership_status,
      c.status as college_status,
      c.name as college_name,
      c.short_name,
      c.logo_url,
      c.primary_color,
      c.secondary_color
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
    null::text as error_code,
    picked.college_name,
    picked.short_name,
    picked.logo_url,
    picked.primary_color,
    picked.secondary_color
  from picked;

  -- Fallback: no matching membership found
  if not found then
    return query
      select
        p_user_id,
        null::uuid,
        null::uuid,
        null::text,
        null::text,
        null::text,
        coalesce(v_profile_active, true),
        null::text,
        false,
        'no_college_access'::text,
        null::text,
        null::text,
        null::text,
        null::text,
        null::text;
  end if;
end;
$$;

-- 3. Security grants (same as before)
revoke all on function public.resolve_admin_auth_context(uuid, text) from public, anon;
grant execute on function public.resolve_admin_auth_context(uuid, text) to authenticated;

-- 4. Planner hints (same as before)
alter function public.resolve_admin_auth_context(uuid, text) stable;
alter function public.resolve_admin_auth_context(uuid, text) cost 5;
alter function public.resolve_admin_auth_context(uuid, text) rows 1;

-- 5. Documentation
comment on function public.resolve_admin_auth_context(uuid, text) is
  'Returns admin auth context with membership and tenant display fields for a given user and optional college slug. '
  'Includes college_name, short_name, logo_url, primary_color, secondary_color to avoid a separate colleges query. '
  'Security: rejects IDOR (p_user_id must equal auth.uid()), blocks disabled profiles, restricts to admin roles.';
