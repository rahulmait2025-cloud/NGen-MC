-- Migration 00093: future_student_college_entitlements
-- Adds automatic B2B college-course entitlements for future students joining a
-- college after a course has already been assigned there.
--
-- IMPORTANT:
-- - Visibility is not entitlement.
-- - Future college students receive access only for active college assignments.
-- - Global/B2C access is separate and is never granted here.
-- - Unassignment relies on assignment_id metadata for surgical revoke.

create or replace function public.grant_assigned_college_courses_to_student(
  p_student_id uuid,
  p_college_id uuid,
  p_granted_by uuid default null
)
returns integer
language plpgsql
as $$
declare
  v_inserted_count integer := 0;
begin
  insert into public.student_entitlements (
    student_id,
    master_course_id,
    source_type,
    college_id,
    status,
    valid_from,
    granted_by,
    metadata
  )
  select
    p_student_id,
    assignment.assigned_entity_id,
    'b2b_college',
    p_college_id,
    'active',
    now(),
    p_granted_by,
    jsonb_build_object(
      'assignment_id', assignment.id,
      'assigned_entity_type', 'master_course',
      'assigned_entity_id', assignment.assigned_entity_id,
      'assignment_source', 'b2b_college_assignment',
      'college_id', p_college_id
    )
  from public.content_assignments assignment
  inner join public.master_courses course
    on course.id = assignment.assigned_entity_id
  inner join public.master_course_pillars pillar
    on pillar.id = course.pillar_id
  inner join public.colleges college
    on college.id = p_college_id
   and college.status = 'active'
  inner join public.students student
    on student.id = p_student_id
   and student.college_id = p_college_id
  inner join public.college_memberships membership
    on membership.user_id = student.user_id
   and membership.college_id = p_college_id
   and membership.role = 'student'
   and membership.status in ('active', 'invited')
  where assignment.assignment_type = 'college'
    and assignment.target_id = p_college_id
    and assignment.assigned_entity_type = 'master_course'
    and assignment.status = 'active'
    and pillar.publish_status = 'published'
    and pillar.visible_to_college_students = true
    and course.publish_status = 'published'
    and course.visible_to_college_students = true
    and not exists (
      select 1
      from public.student_entitlements entitlement
      where entitlement.student_id = p_student_id
        and entitlement.master_course_id = assignment.assigned_entity_id
        and entitlement.college_id = p_college_id
        and entitlement.status = 'active'
    );

  get diagnostics v_inserted_count = row_count;
  return coalesce(v_inserted_count, 0);
end;
$$;

comment on function public.grant_assigned_college_courses_to_student(uuid, uuid, uuid) is
  'Grants active college-assigned master courses to one student idempotently. Honors course/pillar student visibility and stores assignment_id metadata for surgical revoke.';

create or replace function public.grant_assigned_college_courses_to_existing_students(
  p_college_id uuid,
  p_granted_by uuid default null
)
returns integer
language plpgsql
as $$
declare
  v_inserted_count integer := 0;
begin
  insert into public.student_entitlements (
    student_id,
    master_course_id,
    source_type,
    college_id,
    status,
    valid_from,
    granted_by,
    metadata
  )
  select
    student.id,
    assignment.assigned_entity_id,
    'b2b_college',
    p_college_id,
    'active',
    now(),
    p_granted_by,
    jsonb_build_object(
      'assignment_id', assignment.id,
      'assigned_entity_type', 'master_course',
      'assigned_entity_id', assignment.assigned_entity_id,
      'assignment_source', 'b2b_college_assignment',
      'college_id', p_college_id
    )
  from public.students student
  inner join public.colleges college
    on college.id = student.college_id
   and college.status = 'active'
  inner join public.college_memberships membership
    on membership.user_id = student.user_id
   and membership.college_id = student.college_id
   and membership.role = 'student'
   and membership.status in ('active', 'invited')
  inner join public.content_assignments assignment
    on assignment.assignment_type = 'college'
   and assignment.target_id = student.college_id
   and assignment.assigned_entity_type = 'master_course'
   and assignment.status = 'active'
  inner join public.master_courses course
    on course.id = assignment.assigned_entity_id
  inner join public.master_course_pillars pillar
    on pillar.id = course.pillar_id
  where student.college_id = p_college_id
    and pillar.publish_status = 'published'
    and pillar.visible_to_college_students = true
    and course.publish_status = 'published'
    and course.visible_to_college_students = true
    and not exists (
      select 1
      from public.student_entitlements entitlement
      where entitlement.student_id = student.id
        and entitlement.master_course_id = assignment.assigned_entity_id
        and entitlement.college_id = student.college_id
        and entitlement.status = 'active'
    );

  get diagnostics v_inserted_count = row_count;
  return coalesce(v_inserted_count, 0);
end;
$$;

comment on function public.grant_assigned_college_courses_to_existing_students(uuid, uuid) is
  'Backfills missing active B2B college-course entitlements for all current students in one college. Preserves manual/B2C/global entitlements.';

create or replace function public.handle_student_college_course_entitlements()
returns trigger
language plpgsql
as $$
begin
  if new.college_id is null then
    return new;
  end if;

  if tg_op = 'UPDATE' and new.college_id is not distinct from old.college_id then
    return new;
  end if;

  perform public.grant_assigned_college_courses_to_student(new.id, new.college_id, null);
  return new;
end;
$$;

drop trigger if exists trg_students_grant_assigned_college_courses on public.students;

create trigger trg_students_grant_assigned_college_courses
  after insert or update of college_id
  on public.students
  for each row
  execute function public.handle_student_college_course_entitlements();
