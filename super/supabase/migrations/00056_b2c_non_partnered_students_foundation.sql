-- B2C / non-partnered student foundation (additive only).
-- Does not drop columns, alter assignment_mode, or remove unknown-college data.

-- ─── 1) non_partnered_students: direct learners not tied to a partnered college ───
create table if not exists public.non_partnered_students (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null unique references public.students(id) on delete cascade,
  user_id uuid not null unique references auth.users(id) on delete cascade,
  self_reported_college_name text null,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.non_partnered_students is
  'Metadata for students who signed in directly and are not mapped to a partnered college; does not create partner colleges.';

comment on column public.non_partnered_students.student_id is
  'Canonical LMS student row (public.students); typically not a partnered-college mapping.';

comment on column public.non_partnered_students.user_id is
  'Same auth user as public.students.user_id for student_id; enforced by trigger.';

comment on column public.non_partnered_students.self_reported_college_name is
  'Optional label the learner entered (e.g. institution name); not a colleges row.';

create index if not exists idx_non_partnered_students_user_id
  on public.non_partnered_students(user_id);

create index if not exists idx_non_partnered_students_student_id
  on public.non_partnered_students(student_id);

-- Ensure student_id and user_id refer to the same students row (Postgres CHECK cannot reference other tables).
create or replace function public.trg_non_partnered_students_match_student_user()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.students s
    where s.id = new.student_id
      and s.user_id = new.user_id
  ) then
    raise exception 'non_partnered_students: student_id and user_id must match public.students(id, user_id)'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

comment on function public.trg_non_partnered_students_match_student_user() is
  'Rejects rows where student_id does not belong to user_id per public.students.';

drop trigger if exists non_partnered_students_match_student_user on public.non_partnered_students;
create trigger non_partnered_students_match_student_user
  before insert or update of student_id, user_id on public.non_partnered_students
  for each row execute function public.trg_non_partnered_students_match_student_user();

drop trigger if exists non_partnered_students_updated_at on public.non_partnered_students;
create trigger non_partnered_students_updated_at
  before update on public.non_partnered_students
  for each row execute function public.set_updated_at();

alter table public.non_partnered_students enable row level security;

drop policy if exists "Superadmin full access non_partnered_students" on public.non_partnered_students;
create policy "Superadmin full access non_partnered_students"
  on public.non_partnered_students for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and global_role = 'superadmin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and global_role = 'superadmin'
    )
  );

drop policy if exists "Users can read own non_partnered_student row" on public.non_partnered_students;
create policy "Users can read own non_partnered_student row"
  on public.non_partnered_students for select
  using (user_id = auth.uid());

-- ─── 2) global_courses: explicit catalog audience (additive) ───
alter table public.global_courses
  add column if not exists audience_scope text;

update public.global_courses
set audience_scope = 'both'
where audience_scope is null;

alter table public.global_courses
  alter column audience_scope set default 'both';

alter table public.global_courses
  alter column audience_scope set not null;

alter table public.global_courses
  drop constraint if exists global_courses_audience_scope_chk;

alter table public.global_courses
  add constraint global_courses_audience_scope_chk
  check (audience_scope in ('b2b', 'b2c', 'both'));

comment on column public.global_courses.audience_scope is
  'Who may see/use this course in catalog flows: partnered (b2b), direct learners (b2c), or both. Complements assignment_mode on college assignments.';

create index if not exists idx_global_courses_published_audience_scope
  on public.global_courses(publish_status, audience_scope)
  where publish_status = 'published';
