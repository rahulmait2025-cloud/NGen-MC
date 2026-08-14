-- College Admin read access to global course assignment data
-- Adds RLS policies and a helper RPC so college admins can view
-- courses assigned to their college and related enrollment stats.

-- ─── Helper: check if current user is an admin for a given college ────
create or replace function public.is_college_admin_of(p_college_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.college_memberships cm
    where cm.user_id = auth.uid()
      and cm.college_id = p_college_id
      and cm.role in ('college_admin', 'faculty_spoc')
      and cm.status = 'active'
  );
$$;

comment on function public.is_college_admin_of(uuid) is
  'Returns true when the current authenticated user is an active college admin for the specified college.';

-- ─── RLS: college admins can read assignments for their own college ───
drop policy if exists "College admins can read own college assignments" on public.global_course_college_assignments;
create policy "College admins can read own college assignments"
on public.global_course_college_assignments for select
using (
  public.is_college_admin_of(college_id)
);

-- ─── RLS: college admins can read published courses assigned to their college ─
drop policy if exists "College admins can read assigned global_courses" on public.global_courses;
create policy "College admins can read assigned global_courses"
on public.global_courses for select
using (
  publish_status = 'published'
  and exists (
    select 1
    from public.global_course_college_assignments a
    where a.course_id = global_courses.id
      and a.status = 'active'
      and public.is_college_admin_of(a.college_id)
  )
);

-- ─── RLS: college admins can read enrollments for their own college ───
drop policy if exists "College admins can read own college enrollments" on public.global_course_enrollments;
create policy "College admins can read own college enrollments"
on public.global_course_enrollments for select
using (
  public.is_college_admin_of(college_id)
);

-- ─── RPC: list global courses assigned to a college (for college admin UI) ───
drop function if exists public.list_college_assigned_global_courses(uuid);
create or replace function public.list_college_assigned_global_courses(
  p_college_id uuid
)
returns table (
  course_id uuid,
  course_title text,
  course_slug text,
  course_description text,
  intro_thumbnail_url text,
  b2c_price_minor integer,
  currency_code text,
  publish_status text,
  assignment_id uuid,
  assignment_mode text,
  assignment_status text,
  assigned_at timestamptz,
  active_enrollment_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    gc.id as course_id,
    gc.title as course_title,
    gc.slug as course_slug,
    gc.description as course_description,
    gc.intro_thumbnail_url,
    gc.b2c_price_minor,
    gc.currency_code,
    gc.publish_status,
    a.id as assignment_id,
    a.assignment_mode,
    a.status as assignment_status,
    a.assigned_at,
    coalesce(
      (select count(*)
       from public.global_course_enrollments e
       where e.course_id = gc.id
         and e.college_id = p_college_id
         and e.status = 'active'),
      0
    ) as active_enrollment_count
  from public.global_course_college_assignments a
  join public.global_courses gc
    on gc.id = a.course_id
   and gc.publish_status = 'published'
  where a.college_id = p_college_id
    and a.status = 'active'
    and public.is_college_admin_of(p_college_id)
  order by a.assigned_at desc;
$$;

comment on function public.list_college_assigned_global_courses(uuid) is
  'College-admin-facing RPC. Returns published global courses assigned to the specified college with enrollment counts. Access is restricted to active college admins of that college.';

grant execute on function public.is_college_admin_of(uuid) to authenticated;
grant execute on function public.list_college_assigned_global_courses(uuid) to authenticated;
