-- 00045: Global course landing metadata, lesson content model, resource types, and validity.
-- Additive only; preserves existing columns and backfills new ones from legacy data.

-------------------------------------------------------------------------------
-- A) global_courses: landing-page and catalog metadata
-------------------------------------------------------------------------------

alter table public.global_courses
  add column if not exists short_description text,
  add column if not exists long_description text,
  add column if not exists pricing_type text not null default 'free'
    check (pricing_type in ('free', 'paid')),
  add column if not exists display_price_label text,
  add column if not exists estimated_lesson_count integer
    check (estimated_lesson_count is null or estimated_lesson_count >= 0),
  add column if not exists estimated_duration_label text,
  add column if not exists outcomes jsonb not null default '[]'::jsonb,
  add column if not exists features jsonb not null default '[]'::jsonb,
  add column if not exists curriculum_summary jsonb not null default '[]'::jsonb,
  add column if not exists landing_theme jsonb not null default '{}'::jsonb,
  add column if not exists intro_hero_image_url text,
  add column if not exists default_validity_days integer
    check (default_validity_days is null or default_validity_days >= 1);

comment on column public.global_courses.short_description is
  'Subtitle or short teaser for landing cards and SEO; distinct from legacy description when both are used.';
comment on column public.global_courses.long_description is
  'Full landing-page body copy; may contain markdown or HTML depending on app rendering.';
comment on column public.global_courses.pricing_type is
  'Catalog pricing class: free vs paid. Kept in sync with b2c_price_minor (0 => free) by convention.';
comment on column public.global_courses.display_price_label is
  'Human-facing price string for landing (e.g. "₹4,999" or "Free"); optional when using b2c_price_minor alone.';
comment on column public.global_courses.estimated_lesson_count is
  'Marketing/landing estimate; actual structure still comes from modules and lessons.';
comment on column public.global_courses.estimated_duration_label is
  'Display string such as "8 weeks" or "12 hours" for landing.';
comment on column public.global_courses.outcomes is
  'JSON array of outcome strings or objects for landing (e.g. ["Build X", "Master Y"]).';
comment on column public.global_courses.features is
  'JSON array of feature bullets or objects for landing cards.';
comment on column public.global_courses.curriculum_summary is
  'JSON array of sections: [{ "title", "duration_label", "lectures": [{ "title", "duration_label" }] }].';
comment on column public.global_courses.landing_theme is
  'Theme tokens for landing: accent colors, card variant, etc. (flexible JSON).';
comment on column public.global_courses.intro_hero_image_url is
  'Optional hero image URL; intro_banner_url may be used for wide banner separately.';
comment on column public.global_courses.default_validity_days is
  'Default access duration in days for new enrollments when no override applies; null means unlimited default.';

update public.global_courses gc
set pricing_type = case when gc.b2c_price_minor > 0 then 'paid' else 'free' end
where gc.pricing_type is distinct from case when gc.b2c_price_minor > 0 then 'paid' else 'free' end;

create index if not exists idx_global_courses_pricing_type
  on public.global_courses(pricing_type, publish_status);

create index if not exists idx_global_courses_default_validity
  on public.global_courses(default_validity_days)
  where default_validity_days is not null;

-------------------------------------------------------------------------------
-- B) global_course_lessons: lesson type, video provider, written content
-------------------------------------------------------------------------------

alter table public.global_course_lessons
  add column if not exists lesson_type text not null default 'video'
    check (lesson_type in ('video', 'article')),
  add column if not exists video_provider text
    check (video_provider is null or video_provider in ('youtube', 'tpstream')),
  add column if not exists video_url text,
  add column if not exists video_source_id text,
  add column if not exists written_content jsonb,
  add column if not exists is_preview boolean not null default false;

comment on column public.global_course_lessons.lesson_type is
  'video: primary delivery is video; article: primary delivery is written_content.';
comment on column public.global_course_lessons.video_provider is
  'Playback provider for video lessons; null when lesson_type is article or video not set.';
comment on column public.global_course_lessons.video_url is
  'Canonical playback or watch URL/embed source; preferred over legacy youtube_video_url.';
comment on column public.global_course_lessons.video_source_id is
  'Provider-native id (e.g. TPStreams asset id) when URL alone is insufficient.';
comment on column public.global_course_lessons.written_content is
  'Rich text payload: prefer { "format": "markdown"|"lexical_v1", ... } for safe rendering.';
comment on column public.global_course_lessons.is_preview is
  'When true, lesson may be shown as teaser before full access (app-defined rules).';
comment on column public.global_course_lessons.youtube_video_url is
  'Legacy column; new content should set video_url and video_provider. Kept for backward compatibility.';

update public.global_course_lessons l
set
  video_url = coalesce(nullif(trim(l.youtube_video_url), ''), l.video_url),
  video_provider = case
    when coalesce(nullif(trim(l.youtube_video_url), ''), l.video_url) is not null then 'youtube'
    else l.video_provider
  end
where l.youtube_video_url is not null
   or l.video_url is not null;

create index if not exists idx_global_course_lessons_lesson_type
  on public.global_course_lessons(lesson_type, publish_status);

create index if not exists idx_global_course_lessons_video_provider
  on public.global_course_lessons(video_provider)
  where video_provider is not null;

-------------------------------------------------------------------------------
-- C) global_course_lesson_resources: explicit resource roles (legacy values kept)
-------------------------------------------------------------------------------

alter table public.global_course_lesson_resources
  drop constraint if exists global_course_lesson_resources_resource_type_check;

alter table public.global_course_lesson_resources
  add constraint global_course_lesson_resources_resource_type_check
  check (
    resource_type in (
      'pdf',
      'link',
      'file',
      'notes_pdf',
      'assignment',
      'attachment',
      'external_link'
    )
  );

comment on column public.global_course_lesson_resources.resource_type is
  'Legacy: pdf, link, file. Preferred: notes_pdf, assignment (PDF/file), attachment (generic), external_link.';

-------------------------------------------------------------------------------
-- D) Validity overrides (enrollment access window remains access_starts_at / access_ends_at)
-------------------------------------------------------------------------------

alter table public.global_course_college_assignments
  add column if not exists validity_days_override integer
    check (validity_days_override is null or validity_days_override >= 1);

comment on column public.global_course_college_assignments.validity_days_override is
  'When set, new enrollments from this assignment use this duration (days) instead of global_courses.default_validity_days.';

alter table public.global_course_enrollments
  add column if not exists validity_days_override integer
    check (validity_days_override is null or validity_days_override >= 1);

comment on column public.global_course_enrollments.validity_days_override is
  'Per-enrollment override captured at grant time; effective window is still access_starts_at / access_ends_at.';

create index if not exists idx_global_course_college_assignments_validity
  on public.global_course_college_assignments(course_id, college_id)
  where validity_days_override is not null;

create index if not exists idx_global_course_enrollments_validity_override
  on public.global_course_enrollments(student_id, course_id)
  where validity_days_override is not null;

-------------------------------------------------------------------------------
-- E) Drop RPCs before recreate: PostgreSQL cannot change RETURNS TABLE row type via REPLACE.
-------------------------------------------------------------------------------

drop function if exists public.get_student_visible_course_detail(uuid, text);
drop function if exists public.validate_course_access_for_learner(uuid, text);
drop function if exists public.list_student_visible_courses(text);

drop function if exists public.get_college_dashboard_extended(uuid, integer, integer, integer);
drop function if exists public.list_published_assignable_courses(uuid);

-------------------------------------------------------------------------------
-- RPC: list_student_visible_courses (must exist before validate + course detail)
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
  order_intent_id uuid
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
      null::uuid as order_intent_id
    from current_students cs
    join public.global_course_college_assignments a
      on a.college_id = cs.college_id
     and a.status = 'active'
    join public.global_courses gc
      on gc.id = a.course_id
     and gc.publish_status = 'published'
    where
      a.assignment_mode = 'b2b_included'
      or (
        a.assignment_mode = 'b2c_catalog'
      )
  ),
  enrollment_visibility as (
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
      e.order_intent_id
    from current_students cs
    join public.global_course_enrollments e
      on e.student_id = cs.student_id
     and e.status = 'active'
    left join public.global_course_college_assignments a
      on a.id = e.assignment_id
  ),
  unioned as (
    select * from assignment_visibility
    union
    select * from enrollment_visibility
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
    u.order_intent_id
  from unioned u
  join public.global_courses gc on gc.id = u.course_id
  where gc.publish_status = 'published'
  order by u.student_id, u.course_id, u.enrollment_id nulls last;
$$;

comment on function public.list_student_visible_courses(text) is
  'Student-facing RPC. Returns courses visible to the current learner through active assignment or enrollment.';

-------------------------------------------------------------------------------
-- RPC: validate_course_access_for_learner (depends on list_student_visible_courses)
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

comment on function public.validate_course_access_for_learner(uuid, text) is
  'Student-facing RPC. Returns whether the current learner can access the requested published global course and why.';

-------------------------------------------------------------------------------
-- RPC: get_student_visible_course_detail (depends on validate_course_access_for_learner)
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
    if coalesce(v_access.access_reason, '') = 'purchase_required' then
      return (
        select jsonb_build_object(
          'allowed', false,
          'reason', 'purchase_required',
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

comment on function public.get_student_visible_course_detail(uuid, text) is
  'Student-facing RPC. Returns nested JSON including landing metadata and lesson_type/video/written_content.';

-------------------------------------------------------------------------------
-- RPC: super-admin assignable list — include landing hints
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

comment on function public.list_published_assignable_courses(uuid) is
  'Superadmin RPC. Lists published global courses and current assignment state for a target college.';

-------------------------------------------------------------------------------
-- RPC: get_college_dashboard_extended (depends on list_published_assignable_courses)
-- Recreated after assignable-courses row type change (see migration 00042).
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

comment on function public.get_college_dashboard_extended(uuid, integer, integer, integer) is
  'Consolidates college dashboard extended datasets (kpis, course completion, placement, notifications, activity, at-risk) into one JSON RPC.';

-------------------------------------------------------------------------------
-- Grants (re-applied after DROP FUNCTION)
-------------------------------------------------------------------------------

grant execute on function public.list_published_assignable_courses(uuid) to authenticated;
grant execute on function public.list_student_visible_courses(text) to authenticated;
grant execute on function public.get_student_visible_course_detail(uuid, text) to authenticated;
grant execute on function public.validate_course_access_for_learner(uuid, text) to authenticated;
grant execute on function public.get_college_dashboard_extended(uuid, integer, integer, integer) to authenticated;
