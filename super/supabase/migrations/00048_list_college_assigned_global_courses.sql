-- 00048: College-admin read path for global courses assigned to their tenant (visibility reporting).

create or replace function public.list_college_assigned_global_courses(p_college_id uuid)
returns table (
  course_id uuid,
  slug text,
  title text,
  description text,
  short_description text,
  publish_status text,
  pricing_type text,
  b2c_price_minor integer,
  currency_code text,
  display_price_label text,
  intro_thumbnail_url text,
  assignment_id uuid,
  assignment_mode text,
  assignment_status text,
  assigned_at timestamptz,
  validity_days_override integer,
  enrolled_active_count bigint,
  enrolled_completed_count bigint
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not (
    public.is_superadmin()
    or exists (
      select 1
      from public.college_memberships m
      where m.user_id = auth.uid()
        and m.college_id = p_college_id
        and m.status = 'active'
        and m.role in ('college_admin', 'faculty_spoc', 'mentor')
    )
  ) then
    raise exception 'Insufficient privileges for this college' using errcode = '42501';
  end if;

  return query
  select
    c.id,
    c.slug,
    c.title,
    c.description,
    c.short_description,
    c.publish_status,
    c.pricing_type,
    c.b2c_price_minor,
    c.currency_code,
    c.display_price_label,
    c.intro_thumbnail_url,
    a.id,
    a.assignment_mode,
    a.status,
    a.assigned_at,
    a.validity_days_override,
    coalesce((
      select count(*)::bigint
      from public.global_course_enrollments e
      where e.course_id = c.id
        and e.college_id = p_college_id
        and e.status = 'active'
    ), 0::bigint),
    coalesce((
      select count(*)::bigint
      from public.global_course_enrollments e
      where e.course_id = c.id
        and e.college_id = p_college_id
        and e.status = 'completed'
    ), 0::bigint)
  from public.global_course_college_assignments a
  join public.global_courses c on c.id = a.course_id
  where a.college_id = p_college_id
    and a.status = 'active'
  order by c.title asc;
end;
$$;

comment on function public.list_college_assigned_global_courses(uuid) is
  'College-admin RPC. Lists active global course assignments for a college with enrollment counts (security definer).';

grant execute on function public.list_college_assigned_global_courses(uuid) to authenticated;
