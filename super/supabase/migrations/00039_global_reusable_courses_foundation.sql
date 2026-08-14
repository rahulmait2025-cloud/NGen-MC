-- Global reusable course foundation
-- Architecture rule: SuperAdmin owns the database contract for cross-app course delivery.
-- This migration is intentionally additive. The existing tenant-scoped content tables
-- remain in place for backward compatibility and should be treated as legacy.

comment on table public.courses is
  'Legacy tenant-scoped course table. Retained for backward compatibility while global reusable courses move to public.global_courses.';

comment on table public.course_modules is
  'Legacy tenant-scoped course modules table. Future work should migrate to public.global_course_modules.';

comment on table public.lectures is
  'Legacy tenant-scoped lectures table. Future work should migrate to public.global_course_lessons.';

comment on table public.lecture_resources is
  'Legacy tenant-scoped lecture resources table. Future work should migrate to public.global_course_lesson_resources.';

comment on table public.course_enrollments is
  'Legacy tenant-scoped course enrollments table. Future work should migrate to public.global_course_enrollments.';

comment on table public.course_cohort_assignments is
  'Legacy tenant-scoped cohort assignment table. Global reusable courses use public.global_course_college_assignments.';

create or replace function public.require_superadmin()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.global_role = 'superadmin'
      and coalesce(p.is_active, true) = true
  ) then
    raise exception 'superadmin_required'
      using errcode = '42501';
  end if;
end;
$$;

create or replace function public.get_direct_learner_college_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select c.id
  from public.colleges c
  where lower(c.slug) in ('direct-learners', 'direct-learner')
  order by case when lower(c.slug) = 'direct-learners' then 0 else 1 end
  limit 1;
$$;

create or replace function public.is_direct_learner_college(p_college_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.colleges c
    where c.id = p_college_id
      and lower(c.slug) in ('direct-learners', 'direct-learner')
  );
$$;

comment on function public.require_superadmin() is
  'Raises an authorization error unless the current authenticated user is an active superadmin.';
comment on function public.get_direct_learner_college_id() is
  'Returns the dedicated B2C direct-learner tenant id when present.';
comment on function public.is_direct_learner_college(uuid) is
  'Returns true when the supplied college id is the dedicated B2C direct-learner tenant.';

do $$
declare
  v_plan_id uuid;
begin
  select p.id
    into v_plan_id
  from public.plans p
  where p.key = 'starter'
  limit 1;

  if v_plan_id is null then
    select p.id
      into v_plan_id
    from public.plans p
    order by p.created_at asc
    limit 1;
  end if;

  if v_plan_id is not null then
    insert into public.colleges (name, slug, status, plan_id)
    values ('Direct Learners', 'direct-learners', 'active', v_plan_id)
    on conflict (slug) do nothing;
  end if;
end;
$$;

comment on table public.colleges is
  'Tenant registry. Includes institutional colleges plus special internal tenants such as unknown and direct-learners.';

create table if not exists public.global_courses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  intro_thumbnail_url text,
  intro_banner_url text,
  intro_section jsonb not null default '{}'::jsonb,
  b2c_price_minor integer not null default 0 check (b2c_price_minor >= 0),
  currency_code text not null default 'INR' check (currency_code ~ '^[A-Z]{3}$'),
  publish_status text not null default 'draft' check (publish_status in ('draft', 'published', 'unpublished')),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  published_at timestamptz,
  unpublished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint global_courses_publish_timestamps_chk
    check (
      (publish_status = 'published' and published_at is not null)
      or publish_status <> 'published'
    )
);

comment on table public.global_courses is
  'Global platform-owned course catalog. Courses are not tenant-owned and may be assigned to many colleges.';
comment on column public.global_courses.intro_section is
  'Structured course intro payload for future app rendering. Suggested shape: {"headline": "...", "summary": "...", "points": [...]}';
comment on column public.global_courses.b2c_price_minor is
  'Trusted B2C list price stored in minor currency units. 0 means free.';

create index if not exists idx_global_courses_publish_status
  on public.global_courses(publish_status, published_at desc);
create index if not exists idx_global_courses_slug_lower
  on public.global_courses(lower(slug));
create index if not exists idx_global_courses_price
  on public.global_courses(currency_code, b2c_price_minor);

create table if not exists public.global_course_modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.global_courses(id) on delete cascade,
  title text not null,
  description text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (course_id, sort_order)
);

comment on table public.global_course_modules is
  'Ordered module/section structure for global courses.';

create index if not exists idx_global_course_modules_course
  on public.global_course_modules(course_id, sort_order);

create table if not exists public.global_course_lessons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.global_course_modules(id) on delete cascade,
  title text not null,
  description text,
  youtube_video_url text,
  sort_order integer not null default 0,
  publish_status text not null default 'draft' check (publish_status in ('draft', 'published', 'unpublished')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint global_course_lessons_youtube_url_chk
    check (
      youtube_video_url is null
      or youtube_video_url ~* '^https?://(www\\.)?(youtube\\.com|youtu\\.be)/'
    ),
  unique (module_id, sort_order)
);

comment on table public.global_course_lessons is
  'Ordered lessons for a global course module. Stores canonical lesson-level content metadata.';

create index if not exists idx_global_course_lessons_module
  on public.global_course_lessons(module_id, sort_order);
create index if not exists idx_global_course_lessons_status
  on public.global_course_lessons(publish_status);

create table if not exists public.global_course_lesson_resources (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.global_course_lessons(id) on delete cascade,
  title text not null,
  resource_type text not null check (resource_type in ('pdf', 'link', 'file')),
  url text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (lesson_id, sort_order)
);

comment on table public.global_course_lesson_resources is
  'Supplemental resources for a lesson such as PDFs, links, and downloadable files.';

create index if not exists idx_global_course_lesson_resources_lesson
  on public.global_course_lesson_resources(lesson_id, sort_order);

create table if not exists public.global_course_assignment_blocks (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.global_courses(id) on delete cascade,
  module_id uuid references public.global_course_modules(id) on delete cascade,
  lesson_id uuid references public.global_course_lessons(id) on delete cascade,
  title text not null,
  description text,
  instructions jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  max_score numeric(10,2),
  is_required boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint global_course_assignment_blocks_scope_chk
    check (
      (module_id is not null and lesson_id is null)
      or (module_id is null and lesson_id is not null)
    )
);

comment on table public.global_course_assignment_blocks is
  'Assignment content blocks embedded within the course structure at module or lesson scope.';
comment on column public.global_course_assignment_blocks.instructions is
  'Structured assignment payload for future LMS rendering. Suggested shape: {"prompt": "...", "resource_links": [...], "submission_type": "..."}';

create index if not exists idx_global_course_assignment_blocks_course
  on public.global_course_assignment_blocks(course_id, sort_order);
create index if not exists idx_global_course_assignment_blocks_module
  on public.global_course_assignment_blocks(module_id, sort_order)
  where module_id is not null;
create index if not exists idx_global_course_assignment_blocks_lesson
  on public.global_course_assignment_blocks(lesson_id, sort_order)
  where lesson_id is not null;

create table if not exists public.global_course_college_assignments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.global_courses(id) on delete cascade,
  college_id uuid not null references public.colleges(id) on delete cascade,
  assignment_mode text not null check (assignment_mode in ('b2b_included', 'b2c_catalog')),
  status text not null default 'active' check (status in ('active', 'inactive')),
  assigned_at timestamptz not null default now(),
  unassigned_at timestamptz,
  assigned_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (course_id, college_id)
);

comment on table public.global_course_college_assignments is
  'Assignment bridge between global courses and colleges. B2B colleges use b2b_included; the direct-learner tenant uses b2c_catalog.';

create index if not exists idx_global_course_college_assignments_college
  on public.global_course_college_assignments(college_id, status, assigned_at desc);
create index if not exists idx_global_course_college_assignments_course
  on public.global_course_college_assignments(course_id, status, assigned_at desc);
create index if not exists idx_global_course_college_assignments_active
  on public.global_course_college_assignments(college_id, course_id)
  where status = 'active';

create table if not exists public.global_course_order_intents (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.global_courses(id) on delete restrict,
  college_id uuid not null references public.colleges(id) on delete restrict,
  student_id uuid references public.students(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'razorpay',
  provider_order_id text,
  provider_payment_id text,
  currency_code text not null default 'INR' check (currency_code ~ '^[A-Z]{3}$'),
  amount_minor integer not null check (amount_minor >= 0),
  status text not null default 'created' check (status in ('created', 'paid', 'failed', 'cancelled', 'refunded', 'expired')),
  pricing_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  paid_at timestamptz,
  unique (provider, provider_order_id)
);

comment on table public.global_course_order_intents is
  'Payment/order-linkage readiness table for B2C course purchases. Stores trusted price snapshots and provider references.';

create index if not exists idx_global_course_order_intents_user
  on public.global_course_order_intents(user_id, created_at desc);
create index if not exists idx_global_course_order_intents_student
  on public.global_course_order_intents(student_id, created_at desc)
  where student_id is not null;
create index if not exists idx_global_course_order_intents_status
  on public.global_course_order_intents(status, created_at desc);
create index if not exists idx_global_course_order_intents_course_college
  on public.global_course_order_intents(course_id, college_id, created_at desc);

create table if not exists public.global_course_enrollments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.global_courses(id) on delete restrict,
  student_id uuid not null references public.students(id) on delete cascade,
  college_id uuid not null references public.colleges(id) on delete cascade,
  assignment_id uuid references public.global_course_college_assignments(id) on delete set null,
  order_intent_id uuid references public.global_course_order_intents(id) on delete set null,
  status text not null default 'active' check (status in ('active', 'completed', 'revoked')),
  enrollment_source text not null check (enrollment_source in ('college_assignment', 'direct_purchase', 'direct_free', 'manual_grant', 'legacy_bridge')),
  funding_source text not null check (funding_source in ('b2b', 'b2c_free', 'b2c_paid', 'manual')),
  enrolled_at timestamptz not null default now(),
  access_starts_at timestamptz not null default now(),
  access_ends_at timestamptz,
  revoked_at timestamptz,
  revoked_reason text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, course_id),
  constraint global_course_enrollments_status_dates_chk
    check (
      (status <> 'revoked')
      or (revoked_at is not null)
    )
);

comment on table public.global_course_enrollments is
  'Canonical enrollment/access table for global reusable courses. Assignment-sourced B2B enrollments and direct B2C purchases both land here.';
comment on column public.global_course_enrollments.enrollment_source is
  'Tracks why the enrollment exists so access, audit, and future analytics remain explainable.';

create index if not exists idx_global_course_enrollments_student
  on public.global_course_enrollments(student_id, status, enrolled_at desc);
create index if not exists idx_global_course_enrollments_course
  on public.global_course_enrollments(course_id, status, enrolled_at desc);
create index if not exists idx_global_course_enrollments_college
  on public.global_course_enrollments(college_id, status, enrolled_at desc);
create index if not exists idx_global_course_enrollments_assignment
  on public.global_course_enrollments(assignment_id, status)
  where assignment_id is not null;
create unique index if not exists idx_global_course_enrollments_active_unique
  on public.global_course_enrollments(student_id, course_id)
  where status in ('active', 'completed');
create index if not exists idx_gce_course_college_status
  on public.global_course_enrollments(course_id, college_id, status);

drop trigger if exists global_courses_updated_at on public.global_courses;
create trigger global_courses_updated_at
  before update on public.global_courses
  for each row execute function public.set_updated_at();

drop trigger if exists global_course_modules_updated_at on public.global_course_modules;
create trigger global_course_modules_updated_at
  before update on public.global_course_modules
  for each row execute function public.set_updated_at();

drop trigger if exists global_course_lessons_updated_at on public.global_course_lessons;
create trigger global_course_lessons_updated_at
  before update on public.global_course_lessons
  for each row execute function public.set_updated_at();

drop trigger if exists global_course_assignment_blocks_updated_at on public.global_course_assignment_blocks;
create trigger global_course_assignment_blocks_updated_at
  before update on public.global_course_assignment_blocks
  for each row execute function public.set_updated_at();

drop trigger if exists global_course_college_assignments_updated_at on public.global_course_college_assignments;
create trigger global_course_college_assignments_updated_at
  before update on public.global_course_college_assignments
  for each row execute function public.set_updated_at();

drop trigger if exists global_course_order_intents_updated_at on public.global_course_order_intents;
create trigger global_course_order_intents_updated_at
  before update on public.global_course_order_intents
  for each row execute function public.set_updated_at();

drop trigger if exists global_course_enrollments_updated_at on public.global_course_enrollments;
create trigger global_course_enrollments_updated_at
  before update on public.global_course_enrollments
  for each row execute function public.set_updated_at();

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
    limit 1
  )
  select
    public.is_superadmin()
    or exists (select 1 from active_enrollment)
    or exists (select 1 from visible_assignment);
$$;

comment on function public.can_current_user_view_global_course(uuid) is
  'RLS helper for global course visibility. Students can view a course only through active enrollment or an eligible active assignment.';

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
          access_ends_at = null,
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
    on conflict (student_id, course_id) do nothing
    returning 1
  )
  select count(*)
    into v_enrolled_courses
  from inserted;

  return query
  select p_student_id, v_enrolled_courses;
end;
$$;

create or replace function public.handle_student_global_course_auto_enrollment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.auto_enroll_new_student_into_assigned_courses(new.id);
  return new;
end;
$$;

drop trigger if exists students_global_course_auto_enrollment on public.students;
create trigger students_global_course_auto_enrollment
  after insert on public.students
  for each row execute function public.handle_student_global_course_auto_enrollment();

comment on function public.enroll_existing_students_of_college_into_assigned_course(uuid, uuid) is
  'Superadmin RPC. Backfills B2B/free B2C enrollments for an active course assignment.';
comment on function public.auto_enroll_new_student_into_assigned_courses(uuid) is
  'Security-definer helper used by the students trigger and future backfills. Auto-enrolls a new student into all eligible active assignments for their college.';
comment on function public.handle_student_global_course_auto_enrollment() is
  'AFTER INSERT trigger for students. Ensures future students inherit all eligible assigned global courses automatically.';

create or replace function public.list_published_assignable_courses(
  p_college_id uuid default null
)
returns table (
  course_id uuid,
  slug text,
  title text,
  description text,
  intro_thumbnail_url text,
  intro_banner_url text,
  b2c_price_minor integer,
  currency_code text,
  published_at timestamptz,
  is_assigned_to_college boolean,
  assignment_mode text,
  assignment_status text,
  assignment_id uuid
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
    c.intro_thumbnail_url,
    c.intro_banner_url,
    c.b2c_price_minor,
    c.currency_code,
    c.published_at,
    (a.id is not null and a.status = 'active') as is_assigned_to_college,
    a.assignment_mode,
    a.status as assignment_status,
    a.id as assignment_id
  from public.global_courses c
  left join public.global_course_college_assignments a
    on a.course_id = c.id
   and (p_college_id is null or a.college_id = p_college_id)
  where c.publish_status = 'published'
  order by c.title asc;
end;
$$;

create or replace function public.assign_course_to_college(
  p_course_id uuid,
  p_college_id uuid,
  p_assignment_mode text default null
)
returns table (
  assignment_id uuid,
  assignment_mode text,
  assignment_status text,
  auto_enrolled_students bigint
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_assignment_mode text;
  v_assignment_id uuid;
  v_auto_enrolled bigint := 0;
  v_publish_status text;
begin
  perform public.require_superadmin();

  select c.publish_status
    into v_publish_status
  from public.global_courses c
  where c.id = p_course_id;

  if v_publish_status is null then
    raise exception 'course_not_found'
      using errcode = '22023';
  end if;

  if v_publish_status <> 'published' then
    raise exception 'only_published_courses_can_be_assigned'
      using errcode = '22023';
  end if;

  v_assignment_mode := coalesce(
    nullif(trim(p_assignment_mode), ''),
    case
      when public.is_direct_learner_college(p_college_id) then 'b2c_catalog'
      else 'b2b_included'
    end
  );

  if v_assignment_mode not in ('b2b_included', 'b2c_catalog') then
    raise exception 'invalid_assignment_mode'
      using errcode = '22023';
  end if;

  if public.is_direct_learner_college(p_college_id) and v_assignment_mode <> 'b2c_catalog' then
    raise exception 'direct_learner_tenant_must_use_b2c_catalog'
      using errcode = '22023';
  end if;

  if not public.is_direct_learner_college(p_college_id) and v_assignment_mode <> 'b2b_included' then
    raise exception 'institutional_colleges_must_use_b2b_included'
      using errcode = '22023';
  end if;

  insert into public.global_course_college_assignments (
    course_id,
    college_id,
    assignment_mode,
    status,
    assigned_by,
    unassigned_at
  )
  values (
    p_course_id,
    p_college_id,
    v_assignment_mode,
    'active',
    auth.uid(),
    null
  )
  on conflict (course_id, college_id) do update
    set assignment_mode = excluded.assignment_mode,
        status = 'active',
        assigned_by = excluded.assigned_by,
        assigned_at = now(),
        unassigned_at = null,
        updated_at = now()
  returning id
    into v_assignment_id;

  select e.enrolled_students
    into v_auto_enrolled
  from public.enroll_existing_students_of_college_into_assigned_course(p_course_id, p_college_id) e;

  return query
  select v_assignment_id, v_assignment_mode, 'active'::text, coalesce(v_auto_enrolled, 0);
end;
$$;

create or replace function public.unassign_course_from_college(
  p_course_id uuid,
  p_college_id uuid,
  p_revoke_existing_access boolean default true
)
returns table (
  assignment_id uuid,
  assignment_status text,
  revoked_enrollments bigint
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_assignment_id uuid;
  v_revoked bigint := 0;
begin
  perform public.require_superadmin();

  update public.global_course_college_assignments a
     set status = 'inactive',
         unassigned_at = now(),
         updated_at = now()
   where a.course_id = p_course_id
     and a.college_id = p_college_id
  returning a.id
    into v_assignment_id;

  if v_assignment_id is null then
    raise exception 'assignment_not_found'
      using errcode = '22023';
  end if;

  if p_revoke_existing_access then
    with updated as (
      update public.global_course_enrollments e
         set status = 'revoked',
             access_ends_at = now(),
             revoked_at = now(),
             revoked_reason = 'college_unassigned',
             updated_at = now()
       where e.assignment_id = v_assignment_id
         and e.status = 'active'
         and e.enrollment_source = 'college_assignment'
      returning 1
    )
    select count(*)
      into v_revoked
    from updated;
  end if;

  return query
  select v_assignment_id, 'inactive'::text, v_revoked;
end;
$$;

comment on function public.list_published_assignable_courses(uuid) is
  'Superadmin RPC. Lists published global courses and current assignment state for a target college.';
comment on function public.assign_course_to_college(uuid, uuid, text) is
  'Superadmin RPC. Creates or reactivates a course assignment, then auto-enrolls existing eligible students.';
comment on function public.unassign_course_from_college(uuid, uuid, boolean) is
  'Superadmin RPC. Deactivates a course assignment and can revoke assignment-sourced B2B enrollments.';

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
  intro_thumbnail_url text,
  publish_status text,
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
    gc.intro_thumbnail_url,
    gc.publish_status,
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

comment on function public.list_student_visible_courses(text) is
  'Student-facing RPC. Returns courses visible to the current learner through active assignment or enrollment.';
comment on function public.validate_course_access_for_learner(uuid, text) is
  'Student-facing RPC. Returns whether the current learner can access the requested published global course and why.';

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
            'intro_thumbnail_url', c.intro_thumbnail_url,
            'intro_banner_url', c.intro_banner_url,
            'intro_section', c.intro_section,
            'b2c_price_minor', c.b2c_price_minor,
            'currency_code', c.currency_code,
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
      'intro_thumbnail_url', c.intro_thumbnail_url,
      'intro_banner_url', c.intro_banner_url,
      'intro_section', c.intro_section,
      'b2c_price_minor', c.b2c_price_minor,
      'currency_code', c.currency_code,
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
                'youtube_video_url', l.youtube_video_url,
                'sort_order', l.sort_order,
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

  select a.id
    into v_assignment_id
  from public.global_course_college_assignments a
  where a.course_id = p_course_id
    and a.college_id = v_college_id
    and a.status = 'active'
    and a.assignment_mode = 'b2c_catalog'
  limit 1;

  if v_assignment_id is null then
    return query select false, 'course_not_available_in_b2c_catalog'::text, v_student_id, v_college_id, null::integer, v_course.currency_code, null::uuid;
    return;
  end if;

  if v_course.publish_status <> 'published' then
    return query select false, 'course_not_published'::text, v_student_id, v_college_id, null::integer, v_course.currency_code, v_assignment_id;
    return;
  end if;

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

comment on function public.get_student_visible_course_detail(uuid, text) is
  'Student-facing RPC. Returns a nested JSON course payload only when access validation passes.';
comment on function public.compute_trusted_course_price_for_payment(uuid, text) is
  'Student-facing RPC. Computes the server-trusted price for a B2C purchase attempt and blocks B2B misuse.';

create or replace view public.v_global_course_assignment_summary
with (security_invoker = true)
as
select
  c.id as course_id,
  c.slug,
  c.title,
  c.publish_status,
  c.b2c_price_minor,
  c.currency_code,
  count(distinct a.id) filter (where a.status = 'active') as active_assignment_count,
  count(distinct a.id) filter (where a.status = 'active' and a.assignment_mode = 'b2b_included') as active_b2b_assignment_count,
  count(distinct a.id) filter (where a.status = 'active' and a.assignment_mode = 'b2c_catalog') as active_b2c_catalog_count,
  count(distinct e.id) filter (where e.status = 'active') as active_enrollment_count
from public.global_courses c
left join public.global_course_college_assignments a
  on a.course_id = c.id
left join public.global_course_enrollments e
  on e.course_id = c.id
group by c.id, c.slug, c.title, c.publish_status, c.b2c_price_minor, c.currency_code;

create or replace view public.v_global_course_structure_counts
with (security_invoker = true)
as
select
  c.id as course_id,
  c.slug,
  c.title,
  count(distinct m.id) as module_count,
  count(distinct l.id) as lesson_count,
  count(distinct ab.id) as assignment_block_count
from public.global_courses c
left join public.global_course_modules m
  on m.course_id = c.id
left join public.global_course_lessons l
  on l.module_id = m.id
left join public.global_course_assignment_blocks ab
  on ab.course_id = c.id
group by c.id, c.slug, c.title;

comment on view public.v_global_course_assignment_summary is
  'Security-invoker summary view for the global catalog, assignment footprint, and active enrollments.';
comment on view public.v_global_course_structure_counts is
  'Security-invoker structural summary for modules, lessons, and assignment blocks per global course.';

grant select on public.v_global_course_assignment_summary to authenticated;
grant select on public.v_global_course_structure_counts to authenticated;

alter table public.global_courses enable row level security;
alter table public.global_course_modules enable row level security;
alter table public.global_course_lessons enable row level security;
alter table public.global_course_lesson_resources enable row level security;
alter table public.global_course_assignment_blocks enable row level security;
alter table public.global_course_college_assignments enable row level security;
alter table public.global_course_order_intents enable row level security;
alter table public.global_course_enrollments enable row level security;

drop policy if exists "Superadmin full access global_courses" on public.global_courses;
create policy "Superadmin full access global_courses"
on public.global_courses for all
using (public.is_superadmin())
with check (public.is_superadmin());

drop policy if exists "Students can read visible global_courses" on public.global_courses;
create policy "Students can read visible global_courses"
on public.global_courses for select
using (public.can_current_user_view_global_course(id));

drop policy if exists "Superadmin full access global_course_modules" on public.global_course_modules;
create policy "Superadmin full access global_course_modules"
on public.global_course_modules for all
using (public.is_superadmin())
with check (public.is_superadmin());

drop policy if exists "Students can read visible global_course_modules" on public.global_course_modules;
create policy "Students can read visible global_course_modules"
on public.global_course_modules for select
using (public.can_current_user_view_global_course(course_id));

drop policy if exists "Superadmin full access global_course_lessons" on public.global_course_lessons;
create policy "Superadmin full access global_course_lessons"
on public.global_course_lessons for all
using (public.is_superadmin())
with check (public.is_superadmin());

drop policy if exists "Students can read visible global_course_lessons" on public.global_course_lessons;
create policy "Students can read visible global_course_lessons"
on public.global_course_lessons for select
using (
  publish_status = 'published'
  and exists (
    select 1
    from public.global_course_modules m
    where m.id = global_course_lessons.module_id
      and public.can_current_user_view_global_course(m.course_id)
  )
);

drop policy if exists "Superadmin full access global_course_lesson_resources" on public.global_course_lesson_resources;
create policy "Superadmin full access global_course_lesson_resources"
on public.global_course_lesson_resources for all
using (public.is_superadmin())
with check (public.is_superadmin());

drop policy if exists "Students can read visible global_course_lesson_resources" on public.global_course_lesson_resources;
create policy "Students can read visible global_course_lesson_resources"
on public.global_course_lesson_resources for select
using (
  exists (
    select 1
    from public.global_course_lessons l
    join public.global_course_modules m on m.id = l.module_id
    where l.id = global_course_lesson_resources.lesson_id
      and l.publish_status = 'published'
      and public.can_current_user_view_global_course(m.course_id)
  )
);

drop policy if exists "Superadmin full access global_course_assignment_blocks" on public.global_course_assignment_blocks;
create policy "Superadmin full access global_course_assignment_blocks"
on public.global_course_assignment_blocks for all
using (public.is_superadmin())
with check (public.is_superadmin());

drop policy if exists "Students can read visible global_course_assignment_blocks" on public.global_course_assignment_blocks;
create policy "Students can read visible global_course_assignment_blocks"
on public.global_course_assignment_blocks for select
using (public.can_current_user_view_global_course(course_id));

drop policy if exists "Superadmin full access global_course_college_assignments" on public.global_course_college_assignments;
create policy "Superadmin full access global_course_college_assignments"
on public.global_course_college_assignments for all
using (public.is_superadmin())
with check (public.is_superadmin());

drop policy if exists "Students can read own college global_course_college_assignments" on public.global_course_college_assignments;
create policy "Students can read own college global_course_college_assignments"
on public.global_course_college_assignments for select
using (
  college_id in (
    select s.college_id
    from public.students s
    where s.user_id = auth.uid()
  )
);

drop policy if exists "Superadmin full access global_course_order_intents" on public.global_course_order_intents;
create policy "Superadmin full access global_course_order_intents"
on public.global_course_order_intents for all
using (public.is_superadmin())
with check (public.is_superadmin());

drop policy if exists "Students can read own global_course_order_intents" on public.global_course_order_intents;
create policy "Students can read own global_course_order_intents"
on public.global_course_order_intents for select
using (
  user_id = auth.uid()
  or student_id in (
    select s.id
    from public.students s
    where s.user_id = auth.uid()
  )
);

drop policy if exists "Superadmin full access global_course_enrollments" on public.global_course_enrollments;
create policy "Superadmin full access global_course_enrollments"
on public.global_course_enrollments for all
using (public.is_superadmin())
with check (public.is_superadmin());

drop policy if exists "Students can read own global_course_enrollments" on public.global_course_enrollments;
create policy "Students can read own global_course_enrollments"
on public.global_course_enrollments for select
using (
  student_id in (
    select s.id
    from public.students s
    where s.user_id = auth.uid()
  )
);

grant select on public.global_courses to authenticated;
grant select on public.global_course_modules to authenticated;
grant select on public.global_course_lessons to authenticated;
grant select on public.global_course_lesson_resources to authenticated;
grant select on public.global_course_assignment_blocks to authenticated;
grant select on public.global_course_college_assignments to authenticated;
grant select on public.global_course_order_intents to authenticated;
grant select on public.global_course_enrollments to authenticated;

grant execute on function public.enroll_existing_students_of_college_into_assigned_course(uuid, uuid) to authenticated;
grant execute on function public.auto_enroll_new_student_into_assigned_courses(uuid) to authenticated;
grant execute on function public.list_published_assignable_courses(uuid) to authenticated;
grant execute on function public.assign_course_to_college(uuid, uuid, text) to authenticated;
grant execute on function public.unassign_course_from_college(uuid, uuid, boolean) to authenticated;
grant execute on function public.list_student_visible_courses(text) to authenticated;
grant execute on function public.get_student_visible_course_detail(uuid, text) to authenticated;
grant execute on function public.validate_course_access_for_learner(uuid, text) to authenticated;
grant execute on function public.compute_trusted_course_price_for_payment(uuid, text) to authenticated;
