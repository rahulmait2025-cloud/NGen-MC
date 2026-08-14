-- Migration 00100: Extend future-student entitlement trigger for variant/bundle assignments
--
-- Migration 00093 created grant_assigned_college_courses_to_student() which only
-- handles assigned_entity_type = 'master_course'. College assignments for variant
-- or bundle entities were silently skipped by the future-student trigger.
--
-- This migration replaces both functions so they also resolve:
--   variant  → course_variants.master_course_id
--   bundle   → bundle_items → master_course / variant.master_course_id / item.master_course_id
--
-- The trigger itself (trg_students_grant_assigned_college_courses) is unchanged.
-- DO NOT RUN until reviewed. This file was auto-generated for Phase 3F.

-- ─── 1. Per-student function (called by trigger + repair) ─────────────────────

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
  v_batch_count integer := 0;
begin
  -- master_course assignments (unchanged from 00093)
  insert into public.student_entitlements (
    student_id, master_course_id, source_type, college_id,
    status, valid_from, granted_by, metadata
  )
  select
    p_student_id,
    a.assigned_entity_id,
    'b2b_college',
    p_college_id,
    'active',
    now(),
    p_granted_by,
    jsonb_build_object(
      'assignment_id', a.id,
      'assigned_entity_type', 'master_course',
      'assigned_entity_id', a.assigned_entity_id,
      'assignment_source', 'b2b_college_assignment',
      'college_id', p_college_id
    )
  from public.content_assignments a
  inner join public.master_courses c   on c.id = a.assigned_entity_id
  inner join public.master_course_pillars p on p.id = c.pillar_id
  inner join public.colleges col       on col.id = p_college_id and col.status = 'active'
  inner join public.students s         on s.id = p_student_id and s.college_id = p_college_id
  inner join public.college_memberships m
    on m.user_id = s.user_id and m.college_id = p_college_id
    and m.role = 'student' and m.status in ('active','invited')
  where a.assignment_type = 'college'
    and a.target_id = p_college_id
    and a.assigned_entity_type = 'master_course'
    and a.status = 'active'
    and p.publish_status = 'published'
    and p.visible_to_college_students = true
    and c.publish_status = 'published'
    and c.visible_to_college_students = true
    and not exists (
      select 1 from public.student_entitlements e
      where e.student_id = p_student_id
        and e.master_course_id = a.assigned_entity_id
        and e.college_id = p_college_id
        and e.status = 'active'
    );

  get diagnostics v_inserted_count = row_count;

  -- variant assignments → resolve to master_course_id
  insert into public.student_entitlements (
    student_id, master_course_id, source_type, college_id,
    status, valid_from, granted_by, metadata
  )
  select
    p_student_id,
    cv.master_course_id,
    'b2b_college',
    p_college_id,
    'active',
    now(),
    p_granted_by,
    jsonb_build_object(
      'assignment_id', a.id,
      'assigned_entity_type', 'variant',
      'assigned_entity_id', a.assigned_entity_id,
      'assignment_source', 'b2b_college_assignment',
      'college_id', p_college_id
    )
  from public.content_assignments a
  inner join public.course_variants cv on cv.id = a.assigned_entity_id
  inner join public.master_courses c   on c.id = cv.master_course_id
  inner join public.master_course_pillars p on p.id = c.pillar_id
  inner join public.colleges col       on col.id = p_college_id and col.status = 'active'
  inner join public.students s         on s.id = p_student_id and s.college_id = p_college_id
  inner join public.college_memberships m
    on m.user_id = s.user_id and m.college_id = p_college_id
    and m.role = 'student' and m.status in ('active','invited')
  where a.assignment_type = 'college'
    and a.target_id = p_college_id
    and a.assigned_entity_type = 'variant'
    and a.status = 'active'
    and p.publish_status = 'published'
    and p.visible_to_college_students = true
    and c.publish_status = 'published'
    and c.visible_to_college_students = true
    and not exists (
      select 1 from public.student_entitlements e
      where e.student_id = p_student_id
        and e.master_course_id = cv.master_course_id
        and e.college_id = p_college_id
        and e.status = 'active'
    );

  get diagnostics v_batch_count = row_count;
  v_inserted_count := v_inserted_count + v_batch_count;

  -- bundle assignments → resolve bundle_items to master_course_ids
  insert into public.student_entitlements (
    student_id, master_course_id, source_type, college_id,
    status, valid_from, granted_by, metadata
  )
  select distinct
    p_student_id,
    resolved.master_course_id,
    'b2b_college',
    p_college_id,
    'active',
    now(),
    p_granted_by,
    jsonb_build_object(
      'assignment_id', resolved.assignment_id,
      'assigned_entity_type', 'bundle',
      'assigned_entity_id', resolved.assigned_entity_id,
      'bundle_item_type', resolved.item_type,
      'bundle_item_reference_id', resolved.reference_id,
      'assignment_source', 'b2b_college_assignment',
      'college_id', p_college_id
    )
  from (
    -- bundle → master_course items
    select a.id as assignment_id, a.assigned_entity_id,
           bi.item_type, bi.reference_id, bi.reference_id as master_course_id
    from public.content_assignments a
    inner join public.bundle_items bi on bi.bundle_id = a.assigned_entity_id and bi.item_type = 'master_course'
    where a.assignment_type = 'college' and a.target_id = p_college_id
      and a.assigned_entity_type = 'bundle' and a.status = 'active'

    union

    -- bundle → variant items
    select a.id, a.assigned_entity_id,
           bi.item_type, bi.reference_id, cv.master_course_id
    from public.content_assignments a
    inner join public.bundle_items bi on bi.bundle_id = a.assigned_entity_id and bi.item_type = 'variant'
    inner join public.course_variants cv on cv.id = bi.reference_id
    where a.assignment_type = 'college' and a.target_id = p_college_id
      and a.assigned_entity_type = 'bundle' and a.status = 'active'

    union

    -- bundle → master_course_item items
    select a.id, a.assigned_entity_id,
           bi.item_type, bi.reference_id, mci.master_course_id
    from public.content_assignments a
    inner join public.bundle_items bi on bi.bundle_id = a.assigned_entity_id and bi.item_type = 'master_course_item'
    inner join public.master_course_items mci on mci.id = bi.reference_id
    where a.assignment_type = 'college' and a.target_id = p_college_id
      and a.assigned_entity_type = 'bundle' and a.status = 'active'
  ) resolved
  inner join public.master_courses c on c.id = resolved.master_course_id
  inner join public.master_course_pillars p on p.id = c.pillar_id
  inner join public.colleges col on col.id = p_college_id and col.status = 'active'
  inner join public.students s on s.id = p_student_id and s.college_id = p_college_id
  inner join public.college_memberships m
    on m.user_id = s.user_id and m.college_id = p_college_id
    and m.role = 'student' and m.status in ('active','invited')
  where p.publish_status = 'published'
    and p.visible_to_college_students = true
    and c.publish_status = 'published'
    and c.visible_to_college_students = true
    and not exists (
      select 1 from public.student_entitlements e
      where e.student_id = p_student_id
        and e.master_course_id = resolved.master_course_id
        and e.college_id = p_college_id
        and e.status = 'active'
    );

  get diagnostics v_batch_count = row_count;
  v_inserted_count := v_inserted_count + v_batch_count;

  return coalesce(v_inserted_count, 0);
end;
$$;

comment on function public.grant_assigned_college_courses_to_student(uuid, uuid, uuid) is
  'Grants active college-assigned master courses (including variant and bundle resolution) to one student idempotently.';

-- ─── 2. Bulk backfill function ────────────────────────────────────────────────

create or replace function public.grant_assigned_college_courses_to_existing_students(
  p_college_id uuid,
  p_granted_by uuid default null
)
returns integer
language plpgsql
as $$
declare
  v_inserted_count integer := 0;
  v_batch_count integer := 0;
begin
  -- master_course assignments (unchanged from 00093)
  insert into public.student_entitlements (
    student_id, master_course_id, source_type, college_id,
    status, valid_from, granted_by, metadata
  )
  select
    s.id,
    a.assigned_entity_id,
    'b2b_college',
    p_college_id,
    'active',
    now(),
    p_granted_by,
    jsonb_build_object(
      'assignment_id', a.id,
      'assigned_entity_type', 'master_course',
      'assigned_entity_id', a.assigned_entity_id,
      'assignment_source', 'b2b_college_assignment',
      'college_id', p_college_id
    )
  from public.students s
  inner join public.colleges col on col.id = s.college_id and col.status = 'active'
  inner join public.college_memberships m
    on m.user_id = s.user_id and m.college_id = s.college_id
    and m.role = 'student' and m.status in ('active','invited')
  inner join public.content_assignments a
    on a.assignment_type = 'college' and a.target_id = s.college_id
    and a.assigned_entity_type = 'master_course' and a.status = 'active'
  inner join public.master_courses c on c.id = a.assigned_entity_id
  inner join public.master_course_pillars p on p.id = c.pillar_id
  where s.college_id = p_college_id
    and p.publish_status = 'published'
    and p.visible_to_college_students = true
    and c.publish_status = 'published'
    and c.visible_to_college_students = true
    and not exists (
      select 1 from public.student_entitlements e
      where e.student_id = s.id
        and e.master_course_id = a.assigned_entity_id
        and e.college_id = s.college_id
        and e.status = 'active'
    );

  get diagnostics v_inserted_count = row_count;

  -- variant assignments
  insert into public.student_entitlements (
    student_id, master_course_id, source_type, college_id,
    status, valid_from, granted_by, metadata
  )
  select
    s.id,
    cv.master_course_id,
    'b2b_college',
    p_college_id,
    'active',
    now(),
    p_granted_by,
    jsonb_build_object(
      'assignment_id', a.id,
      'assigned_entity_type', 'variant',
      'assigned_entity_id', a.assigned_entity_id,
      'assignment_source', 'b2b_college_assignment',
      'college_id', p_college_id
    )
  from public.students s
  inner join public.colleges col on col.id = s.college_id and col.status = 'active'
  inner join public.college_memberships m
    on m.user_id = s.user_id and m.college_id = s.college_id
    and m.role = 'student' and m.status in ('active','invited')
  inner join public.content_assignments a
    on a.assignment_type = 'college' and a.target_id = s.college_id
    and a.assigned_entity_type = 'variant' and a.status = 'active'
  inner join public.course_variants cv on cv.id = a.assigned_entity_id
  inner join public.master_courses c on c.id = cv.master_course_id
  inner join public.master_course_pillars p on p.id = c.pillar_id
  where s.college_id = p_college_id
    and p.publish_status = 'published'
    and p.visible_to_college_students = true
    and c.publish_status = 'published'
    and c.visible_to_college_students = true
    and not exists (
      select 1 from public.student_entitlements e
      where e.student_id = s.id
        and e.master_course_id = cv.master_course_id
        and e.college_id = s.college_id
        and e.status = 'active'
    );

  get diagnostics v_batch_count = row_count;
  v_inserted_count := v_inserted_count + v_batch_count;

  -- bundle assignments
  insert into public.student_entitlements (
    student_id, master_course_id, source_type, college_id,
    status, valid_from, granted_by, metadata
  )
  select distinct
    s.id,
    resolved.master_course_id,
    'b2b_college',
    p_college_id,
    'active',
    now(),
    p_granted_by,
    jsonb_build_object(
      'assignment_id', resolved.assignment_id,
      'assigned_entity_type', 'bundle',
      'assigned_entity_id', resolved.assigned_entity_id,
      'bundle_item_type', resolved.item_type,
      'bundle_item_reference_id', resolved.reference_id,
      'assignment_source', 'b2b_college_assignment',
      'college_id', p_college_id
    )
  from public.students s
  inner join public.colleges col on col.id = s.college_id and col.status = 'active'
  inner join public.college_memberships m
    on m.user_id = s.user_id and m.college_id = s.college_id
    and m.role = 'student' and m.status in ('active','invited')
  cross join lateral (
    select a.id as assignment_id, a.assigned_entity_id,
           bi.item_type, bi.reference_id, bi.reference_id as master_course_id
    from public.content_assignments a
    inner join public.bundle_items bi on bi.bundle_id = a.assigned_entity_id and bi.item_type = 'master_course'
    where a.assignment_type = 'college' and a.target_id = s.college_id
      and a.assigned_entity_type = 'bundle' and a.status = 'active'

    union

    select a.id, a.assigned_entity_id,
           bi.item_type, bi.reference_id, cv.master_course_id
    from public.content_assignments a
    inner join public.bundle_items bi on bi.bundle_id = a.assigned_entity_id and bi.item_type = 'variant'
    inner join public.course_variants cv on cv.id = bi.reference_id
    where a.assignment_type = 'college' and a.target_id = s.college_id
      and a.assigned_entity_type = 'bundle' and a.status = 'active'

    union

    select a.id, a.assigned_entity_id,
           bi.item_type, bi.reference_id, mci.master_course_id
    from public.content_assignments a
    inner join public.bundle_items bi on bi.bundle_id = a.assigned_entity_id and bi.item_type = 'master_course_item'
    inner join public.master_course_items mci on mci.id = bi.reference_id
    where a.assignment_type = 'college' and a.target_id = s.college_id
      and a.assigned_entity_type = 'bundle' and a.status = 'active'
  ) resolved
  inner join public.master_courses c on c.id = resolved.master_course_id
  inner join public.master_course_pillars p on p.id = c.pillar_id
  where s.college_id = p_college_id
    and p.publish_status = 'published'
    and p.visible_to_college_students = true
    and c.publish_status = 'published'
    and c.visible_to_college_students = true
    and not exists (
      select 1 from public.student_entitlements e
      where e.student_id = s.id
        and e.master_course_id = resolved.master_course_id
        and e.college_id = s.college_id
        and e.status = 'active'
    );

  get diagnostics v_batch_count = row_count;
  v_inserted_count := v_inserted_count + v_batch_count;

  return coalesce(v_inserted_count, 0);
end;
$$;

comment on function public.grant_assigned_college_courses_to_existing_students(uuid, uuid) is
  'Backfills missing active B2B college-course entitlements (including variant and bundle resolution) for all current students in one college.';
