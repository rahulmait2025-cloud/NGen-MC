-- Content delivery system: courses, modules, lectures, resources, progress, cohorts, enrollments
-- All tenant-scoped by college_id. RLS enforces SuperAdmin / College Admin / Mentor vs Student.

-- Cohorts (college-level grouping of students)
create table if not exists public.cohorts (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references public.colleges(id) on delete cascade,
  name text not null,
  slug text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (college_id, slug)
);

create index if not exists idx_cohorts_college on public.cohorts(college_id);

-- Cohort memberships (student in a cohort)
create table if not exists public.cohort_memberships (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references public.cohorts(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  joined_at timestamptz not null default now(),
  unique (cohort_id, student_id)
);

create index if not exists idx_cohort_memberships_cohort on public.cohort_memberships(cohort_id);
create index if not exists idx_cohort_memberships_student on public.cohort_memberships(student_id);

-- Courses (college-level)
create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references public.colleges(id) on delete cascade,
  title text not null,
  slug text not null,
  description text,
  image_url text,
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (college_id, slug)
);

create index if not exists idx_courses_college on public.courses(college_id);
create index if not exists idx_courses_status on public.courses(college_id, status);

-- Course modules (sections within a course)
create table if not exists public.course_modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_course_modules_course on public.course_modules(course_id);
create index if not exists idx_course_modules_sort on public.course_modules(course_id, sort_order);

-- Lectures (within a module)
create table if not exists public.lectures (
  id uuid primary key default gen_random_uuid(),
  course_module_id uuid not null references public.course_modules(id) on delete cascade,
  title text not null,
  sort_order integer not null default 0,
  description text,
  notes text,
  video_url text,
  duration_seconds integer,
  status text not null default 'draft' check (status in ('draft', 'published')),
  drip_unlock_after_days integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_lectures_module on public.lectures(course_module_id);
create index if not exists idx_lectures_sort on public.lectures(course_module_id, sort_order);

-- Lecture resources (PDFs, links, attachments)
create table if not exists public.lecture_resources (
  id uuid primary key default gen_random_uuid(),
  lecture_id uuid not null references public.lectures(id) on delete cascade,
  title text not null,
  resource_type text not null check (resource_type in ('pdf', 'link', 'file')),
  url text not null,
  file_name text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_lecture_resources_lecture on public.lecture_resources(lecture_id);

-- Course enrollments (student enrolled in course; source = cohort or direct)
create table if not exists public.course_enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  cohort_id uuid references public.cohorts(id) on delete set null,
  enrolled_at timestamptz not null default now(),
  enrolled_by uuid references auth.users(id) on delete set null,
  source text not null check (source in ('cohort', 'direct')),
  created_at timestamptz not null default now(),
  unique (student_id, course_id)
);

create index if not exists idx_course_enrollments_student on public.course_enrollments(student_id);
create index if not exists idx_course_enrollments_course on public.course_enrollments(course_id);
create index if not exists idx_course_enrollments_cohort on public.course_enrollments(cohort_id);

-- Course-cohort assignments (assign course to cohort; used to bulk-enroll or show "assigned" in admin)
create table if not exists public.course_cohort_assignments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  cohort_id uuid not null references public.cohorts(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  assigned_by uuid references auth.users(id) on delete set null,
  unique (course_id, cohort_id)
);

create index if not exists idx_course_cohort_assignments_course on public.course_cohort_assignments(course_id);
create index if not exists idx_course_cohort_assignments_cohort on public.course_cohort_assignments(cohort_id);

-- Lecture progress (per enrollment + lecture: completion and video position)
create table if not exists public.lecture_progress (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.course_enrollments(id) on delete cascade,
  lecture_id uuid not null references public.lectures(id) on delete cascade,
  completed_at timestamptz,
  progress_percent integer not null default 0 check (progress_percent >= 0 and progress_percent <= 100),
  last_position_seconds integer not null default 0,
  updated_at timestamptz not null default now(),
  unique (enrollment_id, lecture_id)
);

create index if not exists idx_lecture_progress_enrollment on public.lecture_progress(enrollment_id);
create index if not exists idx_lecture_progress_lecture on public.lecture_progress(lecture_id);
create index if not exists idx_lecture_progress_updated on public.lecture_progress(updated_at desc);

-- Announcements (course or college-wide)
create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references public.colleges(id) on delete cascade,
  course_id uuid references public.courses(id) on delete cascade,
  cohort_id uuid references public.cohorts(id) on delete set null,
  title text not null,
  body text not null,
  author_id uuid references auth.users(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_announcements_college on public.announcements(college_id);
create index if not exists idx_announcements_course on public.announcements(course_id);
create index if not exists idx_announcements_published on public.announcements(published_at desc) where published_at is not null;

-- Triggers for updated_at
drop trigger if exists cohorts_updated_at on public.cohorts;
create trigger cohorts_updated_at before update on public.cohorts for each row execute function public.set_updated_at();
drop trigger if exists courses_updated_at on public.courses;
create trigger courses_updated_at before update on public.courses for each row execute function public.set_updated_at();
drop trigger if exists course_modules_updated_at on public.course_modules;
create trigger course_modules_updated_at before update on public.course_modules for each row execute function public.set_updated_at();
drop trigger if exists lectures_updated_at on public.lectures;
create trigger lectures_updated_at before update on public.lectures for each row execute function public.set_updated_at();
drop trigger if exists lecture_progress_updated_at on public.lecture_progress;
create trigger lecture_progress_updated_at before update on public.lecture_progress for each row execute function public.set_updated_at();
drop trigger if exists announcements_updated_at on public.announcements;
create trigger announcements_updated_at before update on public.announcements for each row execute function public.set_updated_at();

-- Enable RLS on all new tables
alter table public.cohorts enable row level security;
alter table public.cohort_memberships enable row level security;
alter table public.courses enable row level security;
alter table public.course_modules enable row level security;
alter table public.lectures enable row level security;
alter table public.lecture_resources enable row level security;
alter table public.course_enrollments enable row level security;
alter table public.course_cohort_assignments enable row level security;
alter table public.lecture_progress enable row level security;
alter table public.announcements enable row level security;

-- Helper: college admins / faculty (content managers; add 'mentor' to college_memberships.role if needed)
create or replace function public.is_college_content_manager(p_college_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.college_memberships m
    where m.college_id = p_college_id
      and m.user_id = auth.uid()
      and m.status = 'active'
      and m.role in ('college_admin', 'faculty_spoc')
  );
$$;

-- Helper: superadmin
create or replace function public.is_superadmin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and global_role = 'superadmin');
$$;

-- Cohorts: superadmin all; content managers for their college
drop policy if exists "Superadmin full access cohorts" on public.cohorts;
create policy "Superadmin full access cohorts" on public.cohorts for all
  using (public.is_superadmin()) with check (public.is_superadmin());

drop policy if exists "Content managers full access own college cohorts" on public.cohorts;
create policy "Content managers full access own college cohorts" on public.cohorts for all
  using (public.is_college_content_manager(college_id))
  with check (public.is_college_content_manager(college_id));

-- Cohort memberships: same
drop policy if exists "Superadmin full access cohort_memberships" on public.cohort_memberships;
create policy "Superadmin full access cohort_memberships" on public.cohort_memberships for all
  using (public.is_superadmin()) with check (public.is_superadmin());

drop policy if exists "Content managers full access cohort_memberships" on public.cohort_memberships;
create policy "Content managers full access cohort_memberships" on public.cohort_memberships for all
  using (
    cohort_id in (select c.id from public.cohorts c where public.is_college_content_manager(c.college_id))
  )
  with check (
    cohort_id in (select c.id from public.cohorts c where public.is_college_content_manager(c.college_id))
  );

drop policy if exists "Students read own cohort_memberships" on public.cohort_memberships;
create policy "Students read own cohort_memberships" on public.cohort_memberships for select
  using (student_id in (select s.id from public.students s where s.user_id = auth.uid()));

-- Courses: superadmin all; content managers for their college; students read published + enrolled
drop policy if exists "Superadmin full access courses" on public.courses;
create policy "Superadmin full access courses" on public.courses for all
  using (public.is_superadmin()) with check (public.is_superadmin());

drop policy if exists "Content managers full access own college courses" on public.courses;
create policy "Content managers full access own college courses" on public.courses for all
  using (public.is_college_content_manager(college_id))
  with check (public.is_college_content_manager(college_id));

drop policy if exists "Students read enrolled or published courses" on public.courses;
create policy "Students read enrolled or published courses" on public.courses for select
  using (
    status = 'published'
    or id in (
      select ce.course_id from public.course_enrollments ce
      join public.students s on s.id = ce.student_id and s.user_id = auth.uid()
    )
  );

-- course_modules: inherit from course access
drop policy if exists "Superadmin full access course_modules" on public.course_modules;
create policy "Superadmin full access course_modules" on public.course_modules for all
  using (public.is_superadmin()) with check (public.is_superadmin());

drop policy if exists "Content managers full access course_modules" on public.course_modules;
create policy "Content managers full access course_modules" on public.course_modules for all
  using (
    course_id in (select c.id from public.courses c where public.is_college_content_manager(c.college_id))
  )
  with check (
    course_id in (select c.id from public.courses c where public.is_college_content_manager(c.college_id))
  );

drop policy if exists "Students read course_modules for accessible courses" on public.course_modules;
create policy "Students read course_modules for accessible courses" on public.course_modules for select
  using (
    course_id in (
      select c.id from public.courses c
      where c.status = 'published'
         or c.id in (select ce.course_id from public.course_enrollments ce join public.students s on s.id = ce.student_id and s.user_id = auth.uid())
    )
  );

-- lectures: same pattern
drop policy if exists "Superadmin full access lectures" on public.lectures;
create policy "Superadmin full access lectures" on public.lectures for all
  using (public.is_superadmin()) with check (public.is_superadmin());

drop policy if exists "Content managers full access lectures" on public.lectures;
create policy "Content managers full access lectures" on public.lectures for all
  using (
    course_module_id in (
      select cm.id from public.course_modules cm
      join public.courses c on c.id = cm.course_id and public.is_college_content_manager(c.college_id)
    )
  )
  with check (
    course_module_id in (
      select cm.id from public.course_modules cm
      join public.courses c on c.id = cm.course_id and public.is_college_content_manager(c.college_id)
    )
  );

drop policy if exists "Students read lectures for accessible modules" on public.lectures;
create policy "Students read lectures for accessible modules" on public.lectures for select
  using (
    course_module_id in (
      select cm.id from public.course_modules cm
      join public.courses c on c.id = cm.course_id
      where c.status = 'published'
         or c.id in (select ce.course_id from public.course_enrollments ce join public.students s on s.id = ce.student_id and s.user_id = auth.uid())
    )
  );

-- lecture_resources: same as lectures
drop policy if exists "Superadmin full access lecture_resources" on public.lecture_resources;
create policy "Superadmin full access lecture_resources" on public.lecture_resources for all
  using (public.is_superadmin()) with check (public.is_superadmin());

drop policy if exists "Content managers full access lecture_resources" on public.lecture_resources;
create policy "Content managers full access lecture_resources" on public.lecture_resources for all
  using (
    lecture_id in (
      select l.id from public.lectures l
      join public.course_modules cm on cm.id = l.course_module_id
      join public.courses c on c.id = cm.course_id and public.is_college_content_manager(c.college_id)
    )
  )
  with check (
    lecture_id in (
      select l.id from public.lectures l
      join public.course_modules cm on cm.id = l.course_module_id
      join public.courses c on c.id = cm.course_id and public.is_college_content_manager(c.college_id)
    )
  );

drop policy if exists "Students read lecture_resources for accessible lectures" on public.lecture_resources;
create policy "Students read lecture_resources for accessible lectures" on public.lecture_resources for select
  using (
    lecture_id in (
      select l.id from public.lectures l
      join public.course_modules cm on cm.id = l.course_module_id
      join public.courses c on c.id = cm.course_id
      where c.status = 'published'
         or c.id in (select ce.course_id from public.course_enrollments ce join public.students s on s.id = ce.student_id and s.user_id = auth.uid())
    )
  );

-- course_enrollments: superadmin + content managers manage; students read own
drop policy if exists "Superadmin full access course_enrollments" on public.course_enrollments;
create policy "Superadmin full access course_enrollments" on public.course_enrollments for all
  using (public.is_superadmin()) with check (public.is_superadmin());

drop policy if exists "Content managers full access course_enrollments" on public.course_enrollments;
create policy "Content managers full access course_enrollments" on public.course_enrollments for all
  using (
    course_id in (select c.id from public.courses c where public.is_college_content_manager(c.college_id))
  )
  with check (
    course_id in (select c.id from public.courses c where public.is_college_content_manager(c.college_id))
  );

drop policy if exists "Students read own course_enrollments" on public.course_enrollments;
create policy "Students read own course_enrollments" on public.course_enrollments for select
  using (student_id in (select s.id from public.students s where s.user_id = auth.uid()));

-- lecture_progress: students insert/update own (via their enrollment)
drop policy if exists "Superadmin full access lecture_progress" on public.lecture_progress;
create policy "Superadmin full access lecture_progress" on public.lecture_progress for all
  using (public.is_superadmin()) with check (public.is_superadmin());

drop policy if exists "Content managers read lecture_progress" on public.lecture_progress;
create policy "Content managers read lecture_progress" on public.lecture_progress for select
  using (
    enrollment_id in (
      select ce.id from public.course_enrollments ce
      join public.courses c on c.id = ce.course_id and public.is_college_content_manager(c.college_id)
    )
  );

drop policy if exists "Students read own lecture_progress" on public.lecture_progress;
create policy "Students read own lecture_progress" on public.lecture_progress for select
  using (
    enrollment_id in (
      select ce.id from public.course_enrollments ce
      join public.students s on s.id = ce.student_id and s.user_id = auth.uid()
    )
  );

drop policy if exists "Students insert own lecture_progress" on public.lecture_progress;
create policy "Students insert own lecture_progress" on public.lecture_progress for insert
  with check (
    enrollment_id in (
      select ce.id from public.course_enrollments ce
      join public.students s on s.id = ce.student_id and s.user_id = auth.uid()
    )
  );

drop policy if exists "Students update own lecture_progress" on public.lecture_progress;
create policy "Students update own lecture_progress" on public.lecture_progress for update
  using (
    enrollment_id in (
      select ce.id from public.course_enrollments ce
      join public.students s on s.id = ce.student_id and s.user_id = auth.uid()
    )
  )
  with check (
    enrollment_id in (
      select ce.id from public.course_enrollments ce
      join public.students s on s.id = ce.student_id and s.user_id = auth.uid()
    )
  );

-- course_cohort_assignments: superadmin + content managers
drop policy if exists "Superadmin full access course_cohort_assignments" on public.course_cohort_assignments;
create policy "Superadmin full access course_cohort_assignments" on public.course_cohort_assignments for all
  using (public.is_superadmin()) with check (public.is_superadmin());

drop policy if exists "Content managers full access course_cohort_assignments" on public.course_cohort_assignments;
create policy "Content managers full access course_cohort_assignments" on public.course_cohort_assignments for all
  using (
    course_id in (select c.id from public.courses c where public.is_college_content_manager(c.college_id))
  )
  with check (
    course_id in (select c.id from public.courses c where public.is_college_content_manager(c.college_id))
  );

-- announcements: superadmin + content managers manage; students read published for their college/course
drop policy if exists "Superadmin full access announcements" on public.announcements;
create policy "Superadmin full access announcements" on public.announcements for all
  using (public.is_superadmin()) with check (public.is_superadmin());

drop policy if exists "Content managers full access announcements" on public.announcements;
create policy "Content managers full access announcements" on public.announcements for all
  using (public.is_college_content_manager(college_id))
  with check (public.is_college_content_manager(college_id));

drop policy if exists "Students read published announcements" on public.announcements;
create policy "Students read published announcements" on public.announcements for select
  using (
    published_at is not null
    and published_at <= now()
    and (
      college_id in (select s.college_id from public.students s where s.user_id = auth.uid())
    )
  );
