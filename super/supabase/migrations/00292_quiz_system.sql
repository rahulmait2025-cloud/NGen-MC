-- ──────────────────────────────────────────────────────────────────────────────
-- Migration 00292: Quiz System (Phase 4)
--
-- Links master_course_items (quiz_placeholder) to assessments and adds quiz
-- configuration fields. The existing assessment engine (00016) is reused.
--
-- Changes:
-- 1. master_course_items.assessment_id (nullable FK -> assessments.id)
--    • When set, the item acts as the quiz entry point in the course player.
-- 2. assessments: add quiz configuration fields
--    • shuffle_questions, shuffle_options, show_correct_answers
-- 3. assessments: allow NULL time_limit_minutes for "no time limit" quizzes
--    (already nullable, no change needed)
-- 4. assessment_sessions (new) — server-side session for direct quiz attempts
--    that are NOT routed through assessment_assignments. This lets us skip
--    the assignment-per-cohort dance and keep the link simple:
--    master_course_item -> assessment -> session -> attempt -> responses -> result
-- 5. RLS: SuperAdmin manages everything. Students can interact with attempts
--    they own. Assumes tenant_id is set on assessments created from SuperAdmin
--    (we'll write a platform tenant id).
-- ──────────────────────────────────────────────────────────────────────────────

-- ─── 1. master_course_items.assessment_id ──────────────────────────────────────

alter table public.master_course_items
  add column if not exists assessment_id uuid references public.assessments (id) on delete set null;

create index if not exists idx_master_course_items_assessment
  on public.master_course_items (assessment_id);

-- ─── 2. assessments: quiz configuration fields ────────────────────────────────

alter table public.assessments
  add column if not exists shuffle_questions   boolean not null default true,
  add column if not exists shuffle_options     boolean not null default true,
  add column if not exists show_correct_answers boolean not null default true;

-- ─── 3. assessment_sessions (direct quiz link from master_course_items) ──────

create table if not exists public.assessment_sessions (
  id              uuid primary key default gen_random_uuid(),
  assessment_id   uuid not null references public.assessments (id) on delete cascade,
  student_id      uuid not null references public.profiles (id)   on delete cascade,
  status          text not null default 'in_progress'
                  check (status in ('in_progress','submitted','time_expired','auto_submitted')),
  start_time      timestamptz not null default now(),
  end_time        timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create unique index if not exists uq_assessment_session_active
  on public.assessment_sessions (assessment_id, student_id)
  where status = 'in_progress';

create index if not exists idx_assessment_sessions_student
  on public.assessment_sessions (student_id);

create index if not exists idx_assessment_sessions_assessment
  on public.assessment_sessions (assessment_id);

create trigger trg_assessment_sessions_updated_at
  before update on public.assessment_sessions
  for each row execute function public.set_updated_at();

-- ─── 4. assessment_session_responses (final answers at submit-time) ───────────

create table if not exists public.assessment_session_responses (
  id                   uuid primary key default gen_random_uuid(),
  session_id           uuid not null references public.assessment_sessions (id) on delete cascade,
  question_id          uuid not null references public.assessment_questions (id) on delete cascade,
  selected_option_ids  uuid[],
  text_response        text,
  is_correct           boolean,
  points_awarded       numeric(5,2),
  created_at           timestamptz not null default now(),
  unique (session_id, question_id)
);

create index if not exists idx_assessment_session_responses_session
  on public.assessment_session_responses (session_id);

-- ─── 5. assessment_session_results ────────────────────────────────────────────

create table if not exists public.assessment_session_results (
  id              uuid primary key default gen_random_uuid(),
  session_id      uuid not null references public.assessment_sessions (id) on delete cascade unique,
  score           numeric(6,2),
  max_score       numeric(6,2),
  percentage      numeric(5,2),
  is_passing      boolean,
  status          text not null default 'evaluated'
                  check (status in ('evaluated','released')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_assessment_session_results_session
  on public.assessment_session_results (session_id);

create trigger trg_assessment_session_results_updated_at
  before update on public.assessment_session_results
  for each row execute function public.set_updated_at();

-- ─── 6. RLS ─────────────────────────────────────────────────────────────────────

alter table public.assessment_sessions            enable row level security;
alter table public.assessment_session_responses   enable row level security;
alter table public.assessment_session_results     enable row level security;

-- assessment_sessions: students manage their own sessions
drop policy if exists "Students manage own assessment sessions" on public.assessment_sessions;
create policy "Students manage own assessment sessions" on public.assessment_sessions
  for all to authenticated
  using (student_id = auth.uid())
  with check (student_id = auth.uid());

-- SuperAdmin + college admin can SELECT all sessions for analytics
drop policy if exists "Admins can view assessment sessions" on public.assessment_sessions;
create policy "Admins can view assessment sessions" on public.assessment_sessions
  for select to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.global_role = 'superadmin' and p.is_active = true)
    or exists (
      select 1
      from public.assessments a
      join public.college_memberships cm on cm.college_id = a.tenant_id
      where a.id = assessment_sessions.assessment_id
        and cm.user_id = auth.uid()
        and cm.role in ('college_admin','faculty_spoc')
    )
  );

-- responses: student manages their own
drop policy if exists "Students manage own assessment responses" on public.assessment_session_responses;
create policy "Students manage own assessment responses" on public.assessment_session_responses
  for all to authenticated
  using (
    exists (
      select 1 from public.assessment_sessions s
      where s.id = assessment_session_responses.session_id
        and s.student_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.assessment_sessions s
      where s.id = assessment_session_responses.session_id
        and s.student_id = auth.uid()
    )
  );

-- admins can read all responses
drop policy if exists "Admins can view assessment responses" on public.assessment_session_responses;
create policy "Admins can view assessment responses" on public.assessment_session_responses
  for select to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.global_role = 'superadmin' and p.is_active = true)
    or exists (
      select 1
      from public.assessment_sessions s
      join public.assessments a on a.id = s.assessment_id
      join public.college_memberships cm on cm.college_id = a.tenant_id
      where s.id = assessment_session_responses.session_id
        and cm.user_id = auth.uid()
        and cm.role in ('college_admin','faculty_spoc')
    )
  );

-- results: student reads own results, admins read all
drop policy if exists "Students read own assessment results" on public.assessment_session_results;
create policy "Students read own assessment results" on public.assessment_session_results
  for select to authenticated
  using (
    exists (
      select 1 from public.assessment_sessions s
      where s.id = assessment_session_results.session_id
        and s.student_id = auth.uid()
    )
  );

drop policy if exists "Students can insert own assessment results" on public.assessment_session_results;
create policy "Students can insert own assessment results" on public.assessment_session_results
  for insert to authenticated
  with check (
    exists (
      select 1 from public.assessment_sessions s
      where s.id = assessment_session_results.session_id
        and s.student_id = auth.uid()
    )
  );

drop policy if exists "Admins can view assessment results" on public.assessment_session_results;
create policy "Admins can view assessment results" on public.assessment_session_results
  for select to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.global_role = 'superadmin' and p.is_active = true)
    or exists (
      select 1
      from public.assessment_sessions s
      join public.assessments a on a.id = s.assessment_id
      join public.college_memberships cm on cm.college_id = a.tenant_id
      where s.id = assessment_session_results.session_id
        and cm.user_id = auth.uid()
        and cm.role in ('college_admin','faculty_spoc')
    )
  );

-- Grants
grant select, insert, update, delete on public.assessment_sessions          to authenticated;
grant select, insert, update, delete on public.assessment_session_responses to authenticated;
grant select, insert, update, delete on public.assessment_session_results   to authenticated;
