-- 00049: Effective access windows (course default → assignment override → enrollment override) and expiry checks.

-------------------------------------------------------------------------------
-- A) Helpers
-------------------------------------------------------------------------------

create or replace function public.effective_validity_days_for_enrollment(
  p_course_id uuid,
  p_assignment_id uuid,
  p_enrollment_validity_override integer
)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce(
      p_enrollment_validity_override,
      a.validity_days_override,
      c.default_validity_days
    )
  from public.global_courses c
  left join public.global_course_college_assignments a
    on a.id = p_assignment_id
  where c.id = p_course_id;
$$;

comment on function public.effective_validity_days_for_enrollment(uuid, uuid, integer) is
  'Resolution order: enrollment override, college assignment override, course default. Null = unlimited.';

create or replace function public.compute_access_ends_at(
  p_access_starts timestamptz,
  p_validity_days integer
)
returns timestamptz
language sql
immutable
as $$
  select case
    when p_validity_days is null then null
    else p_access_starts + make_interval(days => p_validity_days)
  end;
$$;

-------------------------------------------------------------------------------
-- B) Enrollment: set access_ends_at from effective validity (trusted backend)
-------------------------------------------------------------------------------

create or replace function public.trg_global_course_enrollments_apply_access_window()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_days integer;
  v_starts timestamptz;
begin
  v_starts := coalesce(NEW.access_starts_at, now());
  NEW.access_starts_at := v_starts;

  v_days := public.effective_validity_days_for_enrollment(
    NEW.course_id,
    NEW.assignment_id,
    NEW.validity_days_override
  );

  NEW.access_ends_at := public.compute_access_ends_at(v_starts, v_days);
  return NEW;
end;
$$;

drop trigger if exists global_course_enrollments_apply_access_window on public.global_course_enrollments;
create trigger global_course_enrollments_apply_access_window
  before insert or update of course_id, assignment_id, validity_days_override, access_starts_at
  on public.global_course_enrollments
  for each row
  when (NEW.status = 'active')
  execute function public.trg_global_course_enrollments_apply_access_window();

-------------------------------------------------------------------------------
-- C) Refresh enrollments when course default or assignment override changes
-------------------------------------------------------------------------------

create or replace function public.refresh_enrollment_access_windows_for_course(p_course_id uuid)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated bigint := 0;
begin
  if not public.is_superadmin() then
    raise exception 'Insufficient privileges' using errcode = '42501';
  end if;

  update public.global_course_enrollments e
  set
    access_ends_at = public.compute_access_ends_at(
      e.access_starts_at,
      public.effective_validity_days_for_enrollment(e.course_id, e.assignment_id, e.validity_days_override)
    ),
    updated_at = now()
  where e.course_id = p_course_id
    and e.status = 'active';

  get diagnostics v_updated = row_count;
  return v_updated;
end;
$$;

create or replace function public.refresh_enrollment_access_windows_for_assignment(p_assignment_id uuid)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated bigint := 0;
begin
  if not public.is_superadmin() then
    raise exception 'Insufficient privileges' using errcode = '42501';
  end if;

  update public.global_course_enrollments e
  set
    access_ends_at = public.compute_access_ends_at(
      e.access_starts_at,
      public.effective_validity_days_for_enrollment(e.course_id, e.assignment_id, e.validity_days_override)
    ),
    updated_at = now()
  where e.assignment_id = p_assignment_id
    and e.status = 'active';

  get diagnostics v_updated = row_count;
  return v_updated;
end;
$$;

create or replace function public.trg_global_courses_refresh_enrollment_windows()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and (NEW.default_validity_days is distinct from OLD.default_validity_days) then
    perform public.refresh_enrollment_access_windows_for_course(NEW.id);
  end if;
  return NEW;
end;
$$;

drop trigger if exists global_courses_refresh_enrollment_windows on public.global_courses;
create trigger global_courses_refresh_enrollment_windows
  after update of default_validity_days
  on public.global_courses
  for each row
  execute function public.trg_global_courses_refresh_enrollment_windows();

create or replace function public.trg_global_course_college_assignments_refresh_enrollment_windows()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and (NEW.validity_days_override is distinct from OLD.validity_days_override) then
    perform public.refresh_enrollment_access_windows_for_assignment(NEW.id);
  end if;
  return NEW;
end;
$$;

drop trigger if exists global_course_college_assignments_refresh_enrollment_windows on public.global_course_college_assignments;
create trigger global_course_college_assignments_refresh_enrollment_windows
  after update of validity_days_override
  on public.global_course_college_assignments
  for each row
  execute function public.trg_global_course_college_assignments_refresh_enrollment_windows();

-------------------------------------------------------------------------------
-- D) Backfill access_ends_at for existing active enrollments
-------------------------------------------------------------------------------

update public.global_course_enrollments e
set
  access_ends_at = public.compute_access_ends_at(
    e.access_starts_at,
    public.effective_validity_days_for_enrollment(e.course_id, e.assignment_id, e.validity_days_override)
  ),
  updated_at = now()
where e.status = 'active';

-------------------------------------------------------------------------------
-- E) RLS: enrollment must be within access window
-------------------------------------------------------------------------------

create or replace function public.can_current_user_view_global_course(p_course_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  with my_students as (
    select s.id, s.college_id
    from public.students s
    where s.user_id = auth.uid()
  ),
  active_enrollment as (
    select 1
    from public.global_course_enrollments e
    join my_students ms on ms.id = e.student_id
    where e.course_id = p_course_id
      and e.status = 'active'
      and (e.access_ends_at is null or e.access_ends_at >= now())
    limit 1
  ),
  visible_assignment as (
    select 1
    from public.global_course_college_assignments a
    join public.global_courses c on c.id = a.course_id
    join my_students ms on ms.college_id = a.college_id
    where a.course_id = p_course_id
      and a.status = 'active'
      and c.publish_status = 'published'
      and (
        a.assignment_mode = 'b2b_included'
        or (
          a.assignment_mode = 'b2c_catalog'
          and public.is_direct_learner_college(ms.college_id)
          and c.b2c_price_minor = 0
        )
      )
      and (
        coalesce(a.validity_days_override, c.default_validity_days) is null
        or (a.assigned_at + make_interval(days => coalesce(a.validity_days_override, c.default_validity_days))) >= now()
      )
    limit 1
  )
  select
    public.is_superadmin()
    or exists (select 1 from active_enrollment)
    or exists (select 1 from visible_assignment);
$$;

-------------------------------------------------------------------------------
-- F0) Drop RPCs before recreate: PostgreSQL cannot change RETURNS TABLE row type via REPLACE.
-------------------------------------------------------------------------------

drop function if exists public.get_student_visible_course_detail(uuid, text);
drop function if exists public.validate_course_access_for_learner(uuid, text);
drop function if exists public.list_student_visible_courses(text);

-------------------------------------------------------------------------------
-- F) list_student_visible_courses: valid enrollments, expired enrollments, assignments
-------------------------------------------------------------------------------

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
      (a.assignment_mode = 'b2b_included' or a.assignment_mode = 'b2c_catalog')
      and (
        coalesce(a.validity_days_override, gc.default_validity_days) is null
        or (a.assigned_at + make_interval(days => coalesce(a.validity_days_override, gc.default_validity_days))) >= now()
      )
      and (
        a.assignment_mode = 'b2b_included'
        or (a.assignment_mode = 'b2c_catalog')
      )
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

-------------------------------------------------------------------------------
-- G) validate_course_access_for_learner
-------------------------------------------------------------------------------

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
    if v_row.access_reason = 'assigned_paid_b2c' then
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
        join public.global_course_college_assignments a
          on a.college_id = cs.college_id
         and a.course_id = p_course_id
         and a.status = 'active'
         and a.assignment_mode = 'b2c_catalog'
        where v_course.b2c_price_minor > 0
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
-- H) get_student_visible_course_detail: access_expired → course shell, no modules
-------------------------------------------------------------------------------

create or replace function public.get_student_visible_course_detail(
  p_course_id uuid,
  p_college_slug text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_access record;
  v_detail jsonb;
begin
  select *
    into v_access
  from public.validate_course_access_for_learner(p_course_id, p_college_slug)
  limit 1;

  if coalesce(v_access.allowed, false) = false then
    if coalesce(v_access.access_reason, '') in ('purchase_required', 'access_expired') then
      return (
        select jsonb_build_object(
          'allowed', false,
          'reason', v_access.access_reason,
          'student_id', v_access.student_id,
          'college_id', v_access.college_id,
          'course', jsonb_build_object(
            'id', c.id,
            'slug', c.slug,
            'title', c.title,
            'description', c.description,
            'short_description', c.short_description,
            'long_description', c.long_description,
            'pricing_type', c.pricing_type,
            'intro_thumbnail_url', c.intro_thumbnail_url,
            'intro_banner_url', c.intro_banner_url,
            'intro_hero_image_url', c.intro_hero_image_url,
            'intro_section', c.intro_section,
            'display_price_label', c.display_price_label,
            'b2c_price_minor', c.b2c_price_minor,
            'currency_code', c.currency_code,
            'estimated_lesson_count', c.estimated_lesson_count,
            'estimated_duration_label', c.estimated_duration_label,
            'outcomes', c.outcomes,
            'features', c.features,
            'curriculum_summary', c.curriculum_summary,
            'landing_theme', c.landing_theme,
            'default_validity_days', c.default_validity_days,
            'publish_status', c.publish_status
          ),
          'modules', '[]'::jsonb
        )
        from public.global_courses c
        where c.id = p_course_id
      );
    end if;

    return jsonb_build_object(
      'allowed', false,
      'reason', coalesce(v_access.access_reason, 'access_denied')
    );
  end if;

  select jsonb_build_object(
    'allowed', true,
    'reason', v_access.access_reason,
    'student_id', v_access.student_id,
    'college_id', v_access.college_id,
    'assignment_id', v_access.assignment_id,
    'enrollment_id', v_access.enrollment_id,
    'order_intent_id', v_access.order_intent_id,
    'course', jsonb_build_object(
      'id', c.id,
      'slug', c.slug,
      'title', c.title,
      'description', c.description,
      'short_description', c.short_description,
      'long_description', c.long_description,
      'pricing_type', c.pricing_type,
      'intro_thumbnail_url', c.intro_thumbnail_url,
      'intro_banner_url', c.intro_banner_url,
      'intro_hero_image_url', c.intro_hero_image_url,
      'intro_section', c.intro_section,
      'display_price_label', c.display_price_label,
      'b2c_price_minor', c.b2c_price_minor,
      'currency_code', c.currency_code,
      'estimated_lesson_count', c.estimated_lesson_count,
      'estimated_duration_label', c.estimated_duration_label,
      'outcomes', c.outcomes,
      'features', c.features,
      'curriculum_summary', c.curriculum_summary,
      'landing_theme', c.landing_theme,
      'default_validity_days', c.default_validity_days,
      'publish_status', c.publish_status
    ),
    'modules', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', m.id,
          'title', m.title,
          'description', m.description,
          'sort_order', m.sort_order,
          'assignment_blocks', coalesce((
            select jsonb_agg(
              jsonb_build_object(
                'id', ab.id,
                'title', ab.title,
                'description', ab.description,
                'instructions', ab.instructions,
                'sort_order', ab.sort_order,
                'max_score', ab.max_score,
                'is_required', ab.is_required
              )
              order by ab.sort_order, ab.created_at
            )
            from public.global_course_assignment_blocks ab
            where ab.module_id = m.id
          ), '[]'::jsonb),
          'lessons', coalesce((
            select jsonb_agg(
              jsonb_build_object(
                'id', l.id,
                'title', l.title,
                'description', l.description,
                'lesson_type', l.lesson_type,
                'video_provider', l.video_provider,
                'video_url', l.video_url,
                'video_source_id', l.video_source_id,
                'youtube_video_url', l.youtube_video_url,
                'written_content', l.written_content,
                'is_preview', l.is_preview,
                'sort_order', l.sort_order,
                'publish_status', l.publish_status,
                'assignment_blocks', coalesce((
                  select jsonb_agg(
                    jsonb_build_object(
                      'id', lab.id,
                      'title', lab.title,
                      'description', lab.description,
                      'instructions', lab.instructions,
                      'sort_order', lab.sort_order,
                      'max_score', lab.max_score,
                      'is_required', lab.is_required
                    )
                    order by lab.sort_order, lab.created_at
                  )
                  from public.global_course_assignment_blocks lab
                  where lab.lesson_id = l.id
                ), '[]'::jsonb),
                'resources', coalesce((
                  select jsonb_agg(
                    jsonb_build_object(
                      'id', r.id,
                      'title', r.title,
                      'resource_type', r.resource_type,
                      'url', r.url,
                      'storage_bucket', r.storage_bucket,
                      'storage_path', r.storage_path,
                      'original_filename', r.original_filename,
                      'mime_type', r.mime_type,
                      'size_bytes', r.size_bytes,
                      'sort_order', r.sort_order
                    )
                    order by r.sort_order, r.created_at
                  )
                  from public.global_course_lesson_resources r
                  where r.lesson_id = l.id
                ), '[]'::jsonb)
              )
              order by l.sort_order, l.created_at
            )
            from public.global_course_lessons l
            where l.module_id = m.id
              and l.publish_status = 'published'
          ), '[]'::jsonb)
        )
        order by m.sort_order, m.created_at
      )
      from public.global_course_modules m
      where m.course_id = c.id
    ), '[]'::jsonb)
  )
    into v_detail
  from public.global_courses c
  where c.id = p_course_id;

  return v_detail;
end;
$$;

grant execute on function public.list_student_visible_courses(text) to authenticated;
grant execute on function public.validate_course_access_for_learner(uuid, text) to authenticated;
grant execute on function public.get_student_visible_course_detail(uuid, text) to authenticated;

-------------------------------------------------------------------------------
-- I) Storage policy: require non-expired enrollment
-------------------------------------------------------------------------------

drop policy if exists "Global course resources: enrolled students read" on storage.objects;
create policy "Global course resources: enrolled students read"
on storage.objects for select
to authenticated
using (
  bucket_id = 'global-course-resources'
  and (storage.foldername(name))[1]::uuid in (
    select e.course_id
    from public.global_course_enrollments e
    join public.students s on s.id = e.student_id
    where s.user_id = auth.uid()
      and e.status = 'active'
      and (e.access_ends_at is null or e.access_ends_at >= now())
  )
);

grant execute on function public.effective_validity_days_for_enrollment(uuid, uuid, integer) to authenticated;
grant execute on function public.compute_access_ends_at(timestamptz, integer) to authenticated;
grant execute on function public.refresh_enrollment_access_windows_for_course(uuid) to authenticated;
grant execute on function public.refresh_enrollment_access_windows_for_assignment(uuid) to authenticated;

-------------------------------------------------------------------------------
-- J0) Drop RPCs before recreate: list_published_assignable_courses row type changed; dashboard depends on it.
-------------------------------------------------------------------------------

drop function if exists public.get_college_dashboard_extended(uuid, integer, integer, integer);
drop function if exists public.list_published_assignable_courses(uuid);

-------------------------------------------------------------------------------
-- J) Superadmin assignable list: include course default validity (for UI summary)
-------------------------------------------------------------------------------

create or replace function public.list_published_assignable_courses(
  p_college_id uuid default null
)
returns table (
  course_id uuid,
  slug text,
  title text,
  description text,
  short_description text,
  pricing_type text,
  intro_thumbnail_url text,
  intro_banner_url text,
  intro_hero_image_url text,
  b2c_price_minor integer,
  currency_code text,
  display_price_label text,
  published_at timestamptz,
  default_validity_days integer,
  is_assigned_to_college boolean,
  assignment_mode text,
  assignment_status text,
  assignment_id uuid,
  validity_days_override integer
)
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.require_superadmin();

  return query
  select
    c.id,
    c.slug,
    c.title,
    c.description,
    c.short_description,
    c.pricing_type,
    c.intro_thumbnail_url,
    c.intro_banner_url,
    c.intro_hero_image_url,
    c.b2c_price_minor,
    c.currency_code,
    c.display_price_label,
    c.published_at,
    c.default_validity_days,
    (a.id is not null and a.status = 'active') as is_assigned_to_college,
    a.assignment_mode,
    a.status as assignment_status,
    a.id as assignment_id,
    a.validity_days_override
  from public.global_courses c
  left join public.global_course_college_assignments a
    on a.course_id = c.id
   and (p_college_id is null or a.college_id = p_college_id)
  where c.publish_status = 'published'
  order by c.title asc;
end;
$$;

-------------------------------------------------------------------------------
-- J1) get_college_dashboard_extended (recreated after list_published_assignable_courses; see migration 00045)
-------------------------------------------------------------------------------

create or replace function public.get_college_dashboard_extended(
  p_college_id uuid,
  p_activity_limit integer default 15,
  p_at_risk_limit integer default 20,
  p_notification_limit integer default 10
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_payload jsonb;
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
    raise exception 'forbidden' using errcode = '42501';
  end if;

  with
  kpis as (
    select to_jsonb(k) as row_json
    from public.mv_college_kpis k
    where k.college_id = p_college_id
    limit 1
  ),
  cohort_performance as (
    select coalesce(
      jsonb_agg(jsonb_build_object('cohort_id', t.cohort_id, 'student_count', t.student_count)),
      '[]'::jsonb
    ) as rows_json
    from (
      select s.cohort_id, count(*)::int as student_count
      from public.students s
      where s.college_id = p_college_id
        and s.cohort_id is not null
      group by s.cohort_id
    ) t
  ),
  course_completion as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'course_id', c.course_id,
          'course_title', c.title,
          'enrolled_count', c.enrolled_count,
          'completed_count', c.completed_count,
          'completion_rate_pct', c.completion_rate_pct
        )
      ),
      '[]'::jsonb
    ) as rows_json
    from (
      select
        lac.course_id,
        lac.title,
        count(*) filter (where gce.status in ('active', 'completed'))::int as enrolled_count,
        count(*) filter (where gce.status = 'completed')::int as completed_count,
        case
          when count(*) filter (where gce.status in ('active', 'completed')) = 0 then 0
          else round(
            (
              count(*) filter (where gce.status = 'completed')::numeric
              / nullif(count(*) filter (where gce.status in ('active', 'completed')), 0)::numeric
            ) * 100
          )::int
        end as completion_rate_pct
      from public.list_published_assignable_courses(p_college_id) lac
      left join public.global_course_enrollments gce
        on gce.course_id = lac.course_id
       and gce.college_id = p_college_id
       and gce.status in ('active', 'completed')
      where lac.is_assigned_to_college = true
      group by lac.course_id, lac.title
      order by lac.title
    ) c
  ),
  placement_funnel as (
    select coalesce(
      jsonb_build_object(
        'not_ready_count', v.not_ready_count,
        'needs_improvement_count', v.needs_improvement_count,
        'interview_ready_count', v.interview_ready_count,
        'placed_count', v.placed_count,
        'total_profiles', v.total_profiles
      ),
      'null'::jsonb
    ) as row_json
    from public.v_placement_readiness_funnel v
    where v.college_id = p_college_id
    limit 1
  ),
  pending_reviews as (
    select coalesce(
      sum(coalesce(v.pending_resume, 0) + coalesce(v.pending_linkedin, 0) + coalesce(v.pending_github, 0)),
      0
    )::int as total_count
    from public.v_placement_pending_reviews v
    where v.college_id = p_college_id
  ),
  notifications as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', n.id,
          'notification_type', n.notification_type,
          'status', n.status,
          'created_at', n.created_at
        )
        order by n.created_at desc
      ),
      '[]'::jsonb
    ) as rows_json
    from (
      select id, notification_type, status, created_at
      from public.notification_queue
      where tenant_id = p_college_id
        and status in ('pending', 'failed')
      order by created_at desc
      limit greatest(1, least(p_notification_limit, 100))
    ) n
  ),
  recent_activity as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', a.id,
          'action', a.action,
          'created_at', a.created_at
        )
        order by a.created_at desc
      ),
      '[]'::jsonb
    ) as rows_json
    from (
      select id, action, created_at
      from public.audit_logs
      where college_id = p_college_id
      order by created_at desc
      limit greatest(1, least(p_activity_limit, 100))
    ) a
  ),
  at_risk as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'student_id', r.student_id,
          'course_title', r.course_title,
          'days_inactive', r.days_inactive
        )
      ),
      '[]'::jsonb
    ) as rows_json
    from (
      select student_id, course_title, days_inactive
      from public.v_inactive_students_by_course
      where college_id = p_college_id
      limit greatest(1, least(p_at_risk_limit, 200))
    ) r
  )
  select jsonb_build_object(
    'collegeKpis', (select row_json from kpis),
    'cohortPerformance', (select rows_json from cohort_performance),
    'courseCompletion', (select rows_json from course_completion),
    'placementFunnel', (select row_json from placement_funnel),
    'pendingReviewsCount', (select total_count from pending_reviews),
    'notifications', (select rows_json from notifications),
    'recentActivity', (select rows_json from recent_activity),
    'atRiskStudents', (select rows_json from at_risk)
  )
  into v_payload;

  return coalesce(v_payload, '{}'::jsonb);
end;
$$;

grant execute on function public.list_published_assignable_courses(uuid) to authenticated;
grant execute on function public.get_college_dashboard_extended(uuid, integer, integer, integer) to authenticated;

-------------------------------------------------------------------------------
-- K) Backfill enroll: do not clear access_ends_at on revive (trigger recomputes)
-------------------------------------------------------------------------------

create or replace function public.enroll_existing_students_of_college_into_assigned_course(
  p_course_id uuid,
  p_college_id uuid
)
returns table (
  assignment_id uuid,
  candidate_students bigint,
  enrolled_students bigint
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_assignment_id uuid;
  v_assignment_mode text;
  v_publish_status text;
  v_price_minor integer;
  v_candidate_students bigint := 0;
  v_enrolled_students bigint := 0;
begin
  perform public.require_superadmin();

  select a.id, a.assignment_mode
    into v_assignment_id, v_assignment_mode
  from public.global_course_college_assignments a
  where a.course_id = p_course_id
    and a.college_id = p_college_id
    and a.status = 'active'
  limit 1;

  if v_assignment_id is null then
    raise exception 'active_assignment_required'
      using errcode = '22023';
  end if;

  select c.publish_status, c.b2c_price_minor
    into v_publish_status, v_price_minor
  from public.global_courses c
  where c.id = p_course_id;

  if v_publish_status <> 'published' then
    raise exception 'only_published_courses_can_be_enrolled'
      using errcode = '22023';
  end if;

  select count(*)
    into v_candidate_students
  from public.students s
  where s.college_id = p_college_id;

  if v_assignment_mode = 'b2c_catalog' and v_price_minor > 0 then
    return query
    select v_assignment_id, v_candidate_students, 0::bigint;
    return;
  end if;

  with inserted as (
    insert into public.global_course_enrollments (
      course_id,
      student_id,
      college_id,
      assignment_id,
      status,
      enrollment_source,
      funding_source,
      created_by
    )
    select
      p_course_id,
      s.id,
      s.college_id,
      v_assignment_id,
      'active',
      case
        when v_assignment_mode = 'b2c_catalog' then 'direct_free'
        else 'college_assignment'
      end,
      case
        when v_assignment_mode = 'b2c_catalog' then 'b2c_free'
        else 'b2b'
      end,
      auth.uid()
    from public.students s
    where s.college_id = p_college_id
    on conflict (student_id, course_id) do update
      set assignment_id = excluded.assignment_id,
          college_id = excluded.college_id,
          status = 'active',
          revoked_at = null,
          revoked_reason = null,
          updated_at = now()
      where public.global_course_enrollments.status = 'revoked'
    returning 1
  )
  select count(*)
    into v_enrolled_students
  from inserted;

  return query
  select v_assignment_id, v_candidate_students, v_enrolled_students;
end;
$$;
