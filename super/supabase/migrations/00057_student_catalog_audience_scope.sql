-- Student catalog visibility: B2C direct learners use global_courses.audience_scope ('b2c','both'),
-- not college assignments to the direct-learner tenant. Partnered colleges keep assignment-based rules.

-------------------------------------------------------------------------------
-- list_student_visible_courses
-------------------------------------------------------------------------------

drop function if exists public.list_student_visible_courses(text);

create or replace function public.list_student_visible_courses(
  p_college_slug text default null
)
returns table (
  student_id uuid,
  college_id uuid,
  course_id uuid,
  slug text,
  title text,
  description text,
  short_description text,
  intro_thumbnail_url text,
  publish_status text,
  pricing_type text,
  display_price_label text,
  estimated_duration_label text,
  b2c_price_minor integer,
  currency_code text,
  assignment_mode text,
  access_reason text,
  enrollment_id uuid,
  order_intent_id uuid,
  access_expires_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  with current_students as (
    select s.id as student_id, s.college_id
    from public.students s
    join public.colleges col on col.id = s.college_id
    where s.user_id = auth.uid()
      and (p_college_slug is null or lower(col.slug) = lower(p_college_slug))
  ),
  assignment_visibility as (
    select
      cs.student_id,
      cs.college_id,
      a.course_id,
      a.assignment_mode,
      case
        when a.assignment_mode = 'b2b_included' then 'assigned_b2b'
        when gc.b2c_price_minor = 0 then 'assigned_free_b2c'
        else 'assigned_paid_b2c'
      end as access_reason,
      null::uuid as enrollment_id,
      null::uuid as order_intent_id,
      null::timestamptz as access_expires_at
    from current_students cs
    join public.global_course_college_assignments a
      on a.college_id = cs.college_id
     and a.status = 'active'
    join public.global_courses gc
      on gc.id = a.course_id
     and gc.publish_status = 'published'
    where
      not public.is_direct_learner_college(cs.college_id)
      and (a.assignment_mode = 'b2b_included' or a.assignment_mode = 'b2c_catalog')
      and (
        coalesce(a.validity_days_override, gc.default_validity_days) is null
        or (a.assigned_at + make_interval(days => coalesce(a.validity_days_override, gc.default_validity_days))) >= now()
      )
  ),
  b2c_audience_visibility as (
    select
      cs.student_id,
      cs.college_id,
      gc.id as course_id,
      'b2c_catalog'::text as assignment_mode,
      case
        when gc.b2c_price_minor = 0 then 'b2c_open_free'
        else 'b2c_open_paid'
      end as access_reason,
      null::uuid as enrollment_id,
      null::uuid as order_intent_id,
      null::timestamptz as access_expires_at
    from current_students cs
    join public.global_courses gc on true
    where public.is_direct_learner_college(cs.college_id)
      and gc.publish_status = 'published'
      and gc.audience_scope in ('b2c', 'both')
  ),
  enrollment_valid as (
    select
      cs.student_id,
      cs.college_id,
      e.course_id,
      coalesce(a.assignment_mode, case when e.funding_source = 'b2b' then 'b2b_included' else 'b2c_catalog' end) as assignment_mode,
      case
        when e.enrollment_source = 'direct_purchase' then 'purchased_b2c'
        when e.enrollment_source = 'direct_free' then 'claimed_free_b2c'
        when e.enrollment_source = 'manual_grant' then 'manual_grant'
        else 'enrolled'
      end as access_reason,
      e.id as enrollment_id,
      e.order_intent_id,
      e.access_ends_at as access_expires_at
    from current_students cs
    join public.global_course_enrollments e
      on e.student_id = cs.student_id
     and e.status = 'active'
     and (e.access_ends_at is null or e.access_ends_at >= now())
    left join public.global_course_college_assignments a
      on a.id = e.assignment_id
  ),
  enrollment_expired as (
    select
      cs.student_id,
      cs.college_id,
      e.course_id,
      coalesce(a.assignment_mode, case when e.funding_source = 'b2b' then 'b2b_included' else 'b2c_catalog' end) as assignment_mode,
      'access_expired'::text as access_reason,
      e.id as enrollment_id,
      e.order_intent_id,
      e.access_ends_at as access_expires_at
    from current_students cs
    join public.global_course_enrollments e
      on e.student_id = cs.student_id
     and e.status = 'active'
     and e.access_ends_at is not null
     and e.access_ends_at < now()
    left join public.global_course_college_assignments a
      on a.id = e.assignment_id
  ),
  unioned as (
    select * from assignment_visibility
    union all
    select * from b2c_audience_visibility
    union all
    select * from enrollment_valid
    union all
    select * from enrollment_expired
  )
  select distinct on (u.student_id, u.course_id)
    u.student_id,
    u.college_id,
    gc.id as course_id,
    gc.slug,
    gc.title,
    gc.description,
    gc.short_description,
    gc.intro_thumbnail_url,
    gc.publish_status,
    gc.pricing_type,
    gc.display_price_label,
    gc.estimated_duration_label,
    gc.b2c_price_minor,
    gc.currency_code,
    u.assignment_mode,
    u.access_reason,
    u.enrollment_id,
    u.order_intent_id,
    u.access_expires_at
  from unioned u
  join public.global_courses gc on gc.id = u.course_id
  where gc.publish_status = 'published'
  order by
    u.student_id,
    u.course_id,
    case
      when u.access_reason = 'access_expired' then 2
      when u.enrollment_id is not null then 0
      else 1
    end,
    u.enrollment_id nulls last;
$$;

comment on function public.list_student_visible_courses(text) is
  'Partnered students: assignment-based visibility. Direct learners: published courses with audience_scope b2c or both, plus enrollments.';

-------------------------------------------------------------------------------
-- validate_course_access_for_learner
-------------------------------------------------------------------------------

drop function if exists public.validate_course_access_for_learner(uuid, text);

create or replace function public.validate_course_access_for_learner(
  p_course_id uuid,
  p_college_slug text default null
)
returns table (
  allowed boolean,
  access_reason text,
  student_id uuid,
  college_id uuid,
  assignment_id uuid,
  enrollment_id uuid,
  order_intent_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_course public.global_courses%rowtype;
  v_row record;
begin
  select *
    into v_course
  from public.global_courses c
  where c.id = p_course_id;

  if v_course.id is null then
    return query select false, 'course_not_found'::text, null::uuid, null::uuid, null::uuid, null::uuid, null::uuid;
    return;
  end if;

  if v_course.publish_status <> 'published' then
    return query select false, 'course_not_published'::text, null::uuid, null::uuid, null::uuid, null::uuid, null::uuid;
    return;
  end if;

  select
    lsvc.student_id,
    lsvc.college_id,
    a.id as assignment_id,
    lsvc.enrollment_id,
    lsvc.order_intent_id,
    lsvc.access_reason
    into v_row
  from public.list_student_visible_courses(p_college_slug) lsvc
  left join public.global_course_college_assignments a
    on a.course_id = lsvc.course_id
   and a.college_id = lsvc.college_id
   and a.status = 'active'
  where lsvc.course_id = p_course_id
  limit 1;

  if v_row.student_id is not null then
    if v_row.access_reason in ('assigned_paid_b2c', 'b2c_open_paid') then
      return query
      select false, 'purchase_required'::text, v_row.student_id, v_row.college_id, v_row.assignment_id, v_row.enrollment_id, v_row.order_intent_id;
      return;
    end if;

    if v_row.access_reason = 'access_expired' then
      return query
      select false, 'access_expired'::text, v_row.student_id, v_row.college_id, v_row.assignment_id, v_row.enrollment_id, v_row.order_intent_id;
      return;
    end if;

    return query
    select true, v_row.access_reason, v_row.student_id, v_row.college_id, v_row.assignment_id, v_row.enrollment_id, v_row.order_intent_id;
    return;
  end if;

  return query
  with current_students as (
    select s.id as student_id, s.college_id
    from public.students s
    join public.colleges c on c.id = s.college_id
    where s.user_id = auth.uid()
      and (p_college_slug is null or lower(c.slug) = lower(p_college_slug))
  )
  select
    false as allowed,
    case
      when exists (
        select 1
        from current_students cs
        where public.is_direct_learner_college(cs.college_id)
          and v_course.b2c_price_minor > 0
          and v_course.audience_scope in ('b2c', 'both')
      ) then 'purchase_required'
      when exists (
        select 1
        from current_students cs
        join public.global_course_college_assignments a
          on a.college_id = cs.college_id
         and a.course_id = p_course_id
         and a.status = 'active'
         and a.assignment_mode = 'b2c_catalog'
        where not public.is_direct_learner_college(cs.college_id)
          and v_course.b2c_price_minor > 0
      ) then 'purchase_required'
      when exists (select 1 from current_students) then 'not_assigned'
      else 'student_context_not_found'
    end,
    (select cs.student_id from current_students cs limit 1),
    (select cs.college_id from current_students cs limit 1),
    null::uuid,
    null::uuid,
    null::uuid;
end;
$$;

-------------------------------------------------------------------------------
-- compute_trusted_course_price_for_payment (B2C: audience_scope, not assignment)
-------------------------------------------------------------------------------

drop function if exists public.compute_trusted_course_price_for_payment(uuid, text);

create or replace function public.compute_trusted_course_price_for_payment(
  p_course_id uuid,
  p_college_slug text default null
)
returns table (
  can_purchase boolean,
  reason text,
  student_id uuid,
  college_id uuid,
  amount_minor integer,
  currency_code text,
  assignment_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_course public.global_courses%rowtype;
  v_assignment_id uuid;
  v_student_id uuid;
  v_college_id uuid;
begin
  select *
    into v_course
  from public.global_courses c
  where c.id = p_course_id;

  if v_course.id is null then
    return query select false, 'course_not_found'::text, null::uuid, null::uuid, null::integer, null::text, null::uuid;
    return;
  end if;

  select s.id, s.college_id
    into v_student_id, v_college_id
  from public.students s
  join public.colleges col on col.id = s.college_id
  where s.user_id = auth.uid()
    and (p_college_slug is null or lower(col.slug) = lower(p_college_slug))
  limit 1;

  if v_student_id is null then
    return query select false, 'student_context_not_found'::text, null::uuid, null::uuid, null::integer, null::text, null::uuid;
    return;
  end if;

  if not public.is_direct_learner_college(v_college_id) then
    return query select false, 'b2b_students_do_not_pay'::text, v_student_id, v_college_id, 0, v_course.currency_code, null::uuid;
    return;
  end if;

  if v_course.publish_status <> 'published' then
    return query select false, 'course_not_published'::text, v_student_id, v_college_id, null::integer, v_course.currency_code, null::uuid;
    return;
  end if;

  if v_course.audience_scope is null or v_course.audience_scope not in ('b2c', 'both') then
    return query select false, 'course_not_available_in_b2c_catalog'::text, v_student_id, v_college_id, null::integer, v_course.currency_code, null::uuid;
    return;
  end if;

  select a.id
    into v_assignment_id
  from public.global_course_college_assignments a
  where a.course_id = p_course_id
    and a.college_id = v_college_id
    and a.status = 'active'
    and a.assignment_mode = 'b2c_catalog'
  limit 1;

  if exists (
    select 1
    from public.global_course_enrollments e
    where e.student_id = v_student_id
      and e.course_id = p_course_id
      and e.status = 'active'
  ) then
    return query select false, 'already_enrolled'::text, v_student_id, v_college_id, 0, v_course.currency_code, v_assignment_id;
    return;
  end if;

  if v_course.b2c_price_minor = 0 then
    return query select false, 'course_is_free'::text, v_student_id, v_college_id, 0, v_course.currency_code, v_assignment_id;
    return;
  end if;

  return query
  select true, 'ok'::text, v_student_id, v_college_id, v_course.b2c_price_minor, v_course.currency_code, v_assignment_id;
end;
$$;

comment on function public.compute_trusted_course_price_for_payment(uuid, text) is
  'Direct learners: purchase allowed when course is published and audience_scope is b2c or both. Optional legacy b2c_catalog assignment_id for audit only.';

grant execute on function public.list_student_visible_courses(text) to authenticated;
grant execute on function public.validate_course_access_for_learner(uuid, text) to authenticated;
grant execute on function public.compute_trusted_course_price_for_payment(uuid, text) to authenticated;
