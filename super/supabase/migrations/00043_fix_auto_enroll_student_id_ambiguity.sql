-- Fix ambiguous "student_id" reference in auto-enrollment helper.
-- Keep existing function signature to avoid return-type replacement error.

create or replace function public.auto_enroll_new_student_into_assigned_courses(
  p_student_id uuid
)
returns table (
  student_id uuid,
  enrolled_courses bigint
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student public.students%rowtype;
  v_enrolled_courses bigint := 0;
begin
  select *
    into v_student
  from public.students s
  where s.id = p_student_id;

  if v_student.id is null then
    raise exception 'student_not_found'
      using errcode = '22023';
  end if;

  with eligible_assignments as (
    select
      a.id as assignment_id,
      a.course_id,
      a.assignment_mode,
      c.b2c_price_minor
    from public.global_course_college_assignments a
    join public.global_courses c on c.id = a.course_id
    where a.college_id = v_student.college_id
      and a.status = 'active'
      and c.publish_status = 'published'
      and (
        a.assignment_mode = 'b2b_included'
        or (a.assignment_mode = 'b2c_catalog' and c.b2c_price_minor = 0)
      )
  ),
  inserted as (
    insert into public.global_course_enrollments (
      course_id,
      student_id,
      college_id,
      assignment_id,
      status,
      enrollment_source,
      funding_source
    )
    select
      ea.course_id,
      v_student.id,
      v_student.college_id,
      ea.assignment_id,
      'active',
      case
        when ea.assignment_mode = 'b2c_catalog' then 'direct_free'
        else 'college_assignment'
      end,
      case
        when ea.assignment_mode = 'b2c_catalog' then 'b2c_free'
        else 'b2b'
      end
    from eligible_assignments ea
    on conflict on constraint global_course_enrollments_student_id_course_id_key do nothing
    returning 1
  )
  select count(*)
    into v_enrolled_courses
  from inserted;

  return query
  select p_student_id, v_enrolled_courses;
end;
$$;

comment on function public.auto_enroll_new_student_into_assigned_courses(uuid) is
  'Security-definer helper used by the students trigger and future backfills. Auto-enrolls a new student into all eligible active assignments for their college. (Ambiguity fix applied without signature change)';
