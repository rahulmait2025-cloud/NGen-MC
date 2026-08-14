-- Migration 00187: Job Posting / Placement Portal — database foundation
--
-- Tables: job_posts, job_post_colleges, job_applications, job_application_status_history
-- Storage: private job-resumes bucket (PDF only, 2 MB limit)
-- Security: RLS with SuperAdmin full access + student-scoped read/write
--
-- Visibility scope meanings enforced here:
--   all_lms           → any authenticated student can see (DB-level)
--   college_only      → any authenticated student can see (Phase 3 enforces college-only audience)
--   selected_colleges → only students whose college_id is in job_post_colleges
--   global_only       → DB exposes to all authenticated; Phase 3 app-layer filters to global/direct students only

BEGIN;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. TABLES
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── job_posts ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.job_posts (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title              text        NOT NULL,
  company_name       text        NOT NULL,
  company_logo_url   text        NULL,
  company_website    text        NULL,
  location           text        NULL,
  work_mode          text        NULL CHECK (work_mode IN ('remote', 'onsite', 'hybrid')),
  employment_type    text        NULL CHECK (employment_type IN ('internship', 'full_time', 'part_time', 'contract')),
  experience_level   text        NULL,
  salary_min_minor   integer     NULL,
  salary_max_minor   integer     NULL,
  salary_currency    text        NOT NULL DEFAULT 'INR',
  openings           integer     NULL,
  application_deadline timestamptz NULL,
  description        text        NOT NULL,
  responsibilities   text[]      NOT NULL DEFAULT '{}',
  requirements       text[]      NOT NULL DEFAULT '{}',
  skills             text[]      NOT NULL DEFAULT '{}',
  perks              text[]      NOT NULL DEFAULT '{}',
  status             text        NOT NULL DEFAULT 'draft'
                       CHECK (status IN ('draft', 'open', 'paused', 'closed', 'archived')),
  visibility_scope   text        NOT NULL DEFAULT 'all_lms'
                       CHECK (visibility_scope IN ('all_lms', 'selected_colleges', 'global_only', 'college_only')),
  created_by         uuid        NULL,
  updated_by         uuid        NULL,
  published_at       timestamptz NULL,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.job_posts IS 'SuperAdmin-managed job postings visible to students based on visibility_scope.';
COMMENT ON COLUMN public.job_posts.visibility_scope IS
  'all_lms = any student; selected_colleges = only colleges in job_post_colleges; '
  'global_only = direct/Google-auth students only (enforced in Phase 3 app layer); '
  'college_only = any college student (enforced in Phase 3 app layer).';
COMMENT ON COLUMN public.job_posts.salary_min_minor IS 'Salary lower bound in minor currency units (e.g. paise for INR).';
COMMENT ON COLUMN public.job_posts.salary_max_minor IS 'Salary upper bound in minor currency units (e.g. paise for INR).';

-- ─── job_post_colleges ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.job_post_colleges (
  job_id      uuid NOT NULL REFERENCES public.job_posts(id)  ON DELETE CASCADE,
  college_id  uuid NOT NULL REFERENCES public.colleges(id)   ON DELETE CASCADE,
  PRIMARY KEY (job_id, college_id)
);

COMMENT ON TABLE public.job_post_colleges IS
  'Maps a job_post to specific colleges when visibility_scope = selected_colleges.';

-- ─── job_applications ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.job_applications (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id             uuid        NOT NULL REFERENCES public.job_posts(id)  ON DELETE CASCADE,
  student_id         uuid        NOT NULL REFERENCES public.students(id)   ON DELETE CASCADE,
  user_id            uuid        NOT NULL,
  college_id         uuid        NULL     REFERENCES public.colleges(id)   ON DELETE SET NULL,
  status             text        NOT NULL DEFAULT 'applied'
                       CHECK (status IN (
                         'applied', 'under_review', 'shortlisted', 'assessment',
                         'interview', 'selected', 'rejected', 'on_hold', 'withdrawn'
                       )),
  resume_path        text        NULL,
  resume_file_name   text        NULL,
  resume_size_bytes  integer     NULL
                       CHECK (resume_size_bytes IS NULL OR resume_size_bytes <= 2097152),
  resume_mime_type   text        NULL
                       CHECK (resume_mime_type IS NULL OR resume_mime_type = 'application/pdf'),
  cover_note         text        NULL,
  github_url         text        NULL,
  linkedin_url       text        NULL,
  portfolio_url      text        NULL,
  answers            jsonb       NOT NULL DEFAULT '{}'::jsonb,
  student_edit_count integer     NOT NULL DEFAULT 0,
  applied_at         timestamptz NOT NULL DEFAULT now(),
  last_edited_at     timestamptz NULL,
  withdrawn_at       timestamptz NULL,
  reviewed_by        uuid        NULL,
  reviewed_at        timestamptz NULL,
  admin_notes        text        NULL,
  rejection_reason   text        NULL,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT job_applications_job_student_unique UNIQUE (job_id, student_id)
);

COMMENT ON TABLE  public.job_applications IS 'Student applications to job postings. One application per student per job.';
COMMENT ON COLUMN public.job_applications.user_id IS
  'auth.users id of the applicant. Set by app layer from the authenticated session.';
COMMENT ON COLUMN public.job_applications.college_id IS
  'Denormalized from students.college_id at apply time. Kept nullable for future-proofing.';
COMMENT ON COLUMN public.job_applications.resume_size_bytes IS
  'Resume file size in bytes. Enforced ≤ 2 MB (2 097 152 bytes) by CHECK constraint.';
COMMENT ON COLUMN public.job_applications.resume_mime_type IS
  'MIME type of uploaded resume. Only application/pdf is allowed.';
COMMENT ON COLUMN public.job_applications.student_edit_count IS
  'Number of times the student has edited this application. App-layer cap enforced in Phase 3.';

-- ─── job_application_status_history ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.job_application_status_history (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id  uuid        NOT NULL REFERENCES public.job_applications(id) ON DELETE CASCADE,
  old_status      text        NULL,
  new_status      text        NOT NULL,
  changed_by      uuid        NULL,
  actor_role      text        NULL,
  note            text        NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.job_application_status_history IS
  'Immutable audit trail for job application status transitions.';


-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. INDEXES
-- ═══════════════════════════════════════════════════════════════════════════════

-- job_posts
CREATE INDEX IF NOT EXISTS idx_job_posts_status
  ON public.job_posts (status);

CREATE INDEX IF NOT EXISTS idx_job_posts_visibility_scope
  ON public.job_posts (visibility_scope);

CREATE INDEX IF NOT EXISTS idx_job_posts_application_deadline
  ON public.job_posts (application_deadline);

-- job_applications
CREATE INDEX IF NOT EXISTS idx_job_applications_job_id
  ON public.job_applications (job_id);

CREATE INDEX IF NOT EXISTS idx_job_applications_student_id
  ON public.job_applications (student_id);

CREATE INDEX IF NOT EXISTS idx_job_applications_user_id
  ON public.job_applications (user_id);

CREATE INDEX IF NOT EXISTS idx_job_applications_college_id
  ON public.job_applications (college_id);

CREATE INDEX IF NOT EXISTS idx_job_applications_status
  ON public.job_applications (status);

-- job_application_status_history
CREATE INDEX IF NOT EXISTS idx_job_application_status_history_application_id
  ON public.job_application_status_history (application_id);


-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. UPDATED-AT TRIGGERS
-- ═══════════════════════════════════════════════════════════════════════════════

-- public.set_updated_at() is already defined (00001, hardened in 00169).
-- Re-use it; do not redefine.

DROP TRIGGER IF EXISTS trg_job_posts_updated_at ON public.job_posts;
CREATE TRIGGER trg_job_posts_updated_at
  BEFORE UPDATE ON public.job_posts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_job_applications_updated_at ON public.job_applications;
CREATE TRIGGER trg_job_applications_updated_at
  BEFORE UPDATE ON public.job_applications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. ROW-LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.job_posts                        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_post_colleges                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_applications                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_application_status_history   ENABLE ROW LEVEL SECURITY;

-- ─── job_posts ───────────────────────────────────────────────────────────────

-- SuperAdmin: full CRUD
DROP POLICY IF EXISTS job_posts_superadmin_all ON public.job_posts;
CREATE POLICY job_posts_superadmin_all
  ON public.job_posts
  FOR ALL TO authenticated
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());

-- Students: read only open jobs visible to them based on visibility_scope.
--
-- Scope rules:
--   all_lms           → visible to any authenticated student
--   college_only      → visible to any authenticated student (Phase 3 enforces college-only audience)
--   global_only       → visible to any authenticated student (Phase 3 enforces global-only audience)
--   selected_colleges → visible only if student's college_id exists in job_post_colleges
--
-- NOTE: DB-level RLS exposes all_lms / college_only / global_only equally.
--       Phase 3 app-layer logic will filter global_only to non-college students only.
DROP POLICY IF EXISTS job_posts_student_select ON public.job_posts;
CREATE POLICY job_posts_student_select
  ON public.job_posts
  FOR SELECT TO authenticated
  USING (
    status = 'open'
    AND (
      visibility_scope IN ('all_lms', 'college_only', 'global_only')
      OR EXISTS (
        SELECT 1
        FROM public.job_post_colleges jpc
        WHERE jpc.job_id = public.job_posts.id
          AND jpc.college_id IN (
            SELECT s.college_id
            FROM public.students s
            WHERE s.user_id = auth.uid()
          )
      )
    )
  );

-- Students have NO INSERT / UPDATE / DELETE on job_posts (SuperAdmin only).

-- ─── job_post_colleges ───────────────────────────────────────────────────────

-- SuperAdmin: full CRUD
DROP POLICY IF EXISTS job_post_colleges_superadmin_all ON public.job_post_colleges;
CREATE POLICY job_post_colleges_superadmin_all
  ON public.job_post_colleges
  FOR ALL TO authenticated
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());

-- Students: can SELECT only rows that match their own college_id.
-- Prevents students from seeing which other colleges a job targets.
DROP POLICY IF EXISTS job_post_colleges_student_select ON public.job_post_colleges;
CREATE POLICY job_post_colleges_student_select
  ON public.job_post_colleges
  FOR SELECT TO authenticated
  USING (
    college_id IN (
      SELECT s.college_id
      FROM public.students s
      WHERE s.user_id = auth.uid()
    )
  );

-- Students have NO INSERT / UPDATE / DELETE on job_post_colleges.

-- ─── job_applications ────────────────────────────────────────────────────────

-- SuperAdmin: full CRUD on all applications
DROP POLICY IF EXISTS job_applications_superadmin_all ON public.job_applications;
CREATE POLICY job_applications_superadmin_all
  ON public.job_applications
  FOR ALL TO authenticated
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());

-- Students: SELECT own applications only
DROP POLICY IF EXISTS job_applications_student_select ON public.job_applications;
CREATE POLICY job_applications_student_select
  ON public.job_applications
  FOR SELECT TO authenticated
  USING (
    student_id IN (SELECT s.id FROM public.students s WHERE s.user_id = auth.uid())
  );

-- Students: INSERT own application only
-- DB enforces: unique(job_id, student_id), resume_size_bytes ≤ 2MB, resume_mime_type = 'application/pdf' or null
-- App-layer (Phase 3) enforces: PDF extension, magic header check, duplicate guard error message
DROP POLICY IF EXISTS job_applications_student_insert ON public.job_applications;
CREATE POLICY job_applications_student_insert
  ON public.job_applications
  FOR INSERT TO authenticated
  WITH CHECK (
    student_id IN (SELECT s.id FROM public.students s WHERE s.user_id = auth.uid())
  );

-- Students: UPDATE own application only
-- App-layer (Phase 3) enforces: students cannot update admin-only fields
--   (status, reviewed_by, reviewed_at, admin_notes, rejection_reason)
-- App-layer enforces: edit count cap, withdraw-only after certain states
DROP POLICY IF EXISTS job_applications_student_update ON public.job_applications;
CREATE POLICY job_applications_student_update
  ON public.job_applications
  FOR UPDATE TO authenticated
  USING (
    student_id IN (SELECT s.id FROM public.students s WHERE s.user_id = auth.uid())
  )
  WITH CHECK (
    student_id IN (SELECT s.id FROM public.students s WHERE s.user_id = auth.uid())
  );

-- Students have NO DELETE on job_applications (soft-delete via status='withdrawn').

-- ─── job_application_status_history ──────────────────────────────────────────

-- SuperAdmin: full CRUD (audit trail writes are admin-only)
DROP POLICY IF EXISTS job_application_status_history_superadmin_all ON public.job_application_status_history;
CREATE POLICY job_application_status_history_superadmin_all
  ON public.job_application_status_history
  FOR ALL TO authenticated
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());

-- Students: SELECT own application's history only
DROP POLICY IF EXISTS job_application_status_history_student_select ON public.job_application_status_history;
CREATE POLICY job_application_status_history_student_select
  ON public.job_application_status_history
  FOR SELECT TO authenticated
  USING (
    application_id IN (
      SELECT ja.id
      FROM public.job_applications ja
      JOIN public.students s ON s.id = ja.student_id
      WHERE s.user_id = auth.uid()
    )
  );

-- Students have NO INSERT / UPDATE / DELETE on status history (admin-only audit trail).


-- ═══════════════════════════════════════════════════════════════════════════════
-- 5. STORAGE: private job-resumes bucket
-- ═══════════════════════════════════════════════════════════════════════════════

-- Bucket: private, PDF only, 2 MB max
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'job-resumes',
  'job-resumes',
  false,
  2097152,                                         -- 2 MB
  ARRAY['application/pdf']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public            = excluded.public,
  file_size_limit   = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ─── Storage RLS policies ────────────────────────────────────────────────────

-- SuperAdmin: full access to all job-resumes objects
DROP POLICY IF EXISTS "Job resumes: superadmin full access" ON storage.objects;
CREATE POLICY "Job resumes: superadmin full access"
  ON storage.objects FOR ALL TO authenticated
  USING (
    bucket_id = 'job-resumes'
    AND public.is_superadmin()
  )
  WITH CHECK (
    bucket_id = 'job-resumes'
    AND public.is_superadmin()
  );

-- Students: can INSERT their own resume into job-resumes/{student_id}/{job_id}/{application_id}.pdf
-- Validates: path[0] matches student's own ID, MIME type is PDF
DROP POLICY IF EXISTS "Job resumes: student insert own" ON storage.objects;
CREATE POLICY "Job resumes: student insert own"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'job-resumes'
    AND (storage.foldername(name))[1]::uuid IN (
      SELECT s.id FROM public.students s WHERE s.user_id = auth.uid()
    )
    AND (metadata ->> 'mimetype') = 'application/pdf'
  );

-- Students: can SELECT (download) their own resumes only
DROP POLICY IF EXISTS "Job resumes: student read own" ON storage.objects;
CREATE POLICY "Job resumes: student read own"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'job-resumes'
    AND (storage.foldername(name))[1]::uuid IN (
      SELECT s.id FROM public.students s WHERE s.user_id = auth.uid()
    )
  );

-- Students: can DELETE their own resumes (used during withdraw)
DROP POLICY IF EXISTS "Job resumes: student delete own" ON storage.objects;
CREATE POLICY "Job resumes: student delete own"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'job-resumes'
    AND (storage.foldername(name))[1]::uuid IN (
      SELECT s.id FROM public.students s WHERE s.user_id = auth.uid()
    )
  );

COMMIT;
