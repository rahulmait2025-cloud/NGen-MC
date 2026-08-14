-- Job Ready Bootcamp enrollments + mentorship sessions + sellable entity extension
-- Safe to rerun: IF NOT EXISTS, DROP IF EXISTS, ADD VALUE IF NOT EXISTS

BEGIN;

ALTER TYPE public.sellable_entity_type ADD VALUE IF NOT EXISTS 'job_ready_bootcamp';

-- Bootcamp product plans do not require a parent master course
ALTER TABLE public.course_price_plans
  ALTER COLUMN master_course_id DROP NOT NULL;

ALTER TABLE public.course_price_plans
  DROP CONSTRAINT IF EXISTS course_price_plans_source_lineage_check;

ALTER TABLE public.course_price_plans
  ADD CONSTRAINT course_price_plans_source_lineage_check
  CHECK (
    source_type = 'job_ready_bootcamp'
    OR master_course_id IS NOT NULL
  );

-- ─── Job Ready Bootcamp enrollments (one active per student) ────────────────

CREATE TABLE IF NOT EXISTS public.job_ready_bootcamp_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  college_id uuid REFERENCES public.colleges(id) ON DELETE SET NULL,
  bootcamp_id uuid REFERENCES public.bootcamps(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'expired', 'revoked')),
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_until timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_jrb_enrollments_active_student
  ON public.job_ready_bootcamp_enrollments (student_id)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_jrb_enrollments_college
  ON public.job_ready_bootcamp_enrollments (college_id)
  WHERE college_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_jrb_enrollments_bootcamp
  ON public.job_ready_bootcamp_enrollments (bootcamp_id);

DROP TRIGGER IF EXISTS trg_jrb_enrollments_updated_at ON public.job_ready_bootcamp_enrollments;
CREATE TRIGGER trg_jrb_enrollments_updated_at
  BEFORE UPDATE ON public.job_ready_bootcamp_enrollments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.job_ready_bootcamp_enrollments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS jrb_enrollments_superadmin_all ON public.job_ready_bootcamp_enrollments;
CREATE POLICY jrb_enrollments_superadmin_all ON public.job_ready_bootcamp_enrollments
  FOR ALL TO authenticated
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());

DROP POLICY IF EXISTS jrb_enrollments_student_read ON public.job_ready_bootcamp_enrollments;
CREATE POLICY jrb_enrollments_student_read ON public.job_ready_bootcamp_enrollments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.students
      WHERE students.id = job_ready_bootcamp_enrollments.student_id
        AND students.user_id = auth.uid()
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_ready_bootcamp_enrollments TO authenticated;

-- ─── Mentorship sessions ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.job_ready_bootcamp_mentorship_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  meeting_url text NOT NULL,
  session_date date NOT NULL,
  session_day text NOT NULL,
  start_time_ist time NOT NULL,
  end_time_ist time NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'cancelled', 'completed')),
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_jrb_mentorship_sessions_date
  ON public.job_ready_bootcamp_mentorship_sessions (session_date DESC);

CREATE INDEX IF NOT EXISTS idx_jrb_mentorship_sessions_status
  ON public.job_ready_bootcamp_mentorship_sessions (status);

DROP TRIGGER IF EXISTS trg_jrb_mentorship_updated_at ON public.job_ready_bootcamp_mentorship_sessions;
CREATE TRIGGER trg_jrb_mentorship_updated_at
  BEFORE UPDATE ON public.job_ready_bootcamp_mentorship_sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.job_ready_bootcamp_mentorship_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS jrb_mentorship_superadmin_all ON public.job_ready_bootcamp_mentorship_sessions;
CREATE POLICY jrb_mentorship_superadmin_all ON public.job_ready_bootcamp_mentorship_sessions
  FOR ALL TO authenticated
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());

DROP POLICY IF EXISTS jrb_mentorship_student_read ON public.job_ready_bootcamp_mentorship_sessions;
CREATE POLICY jrb_mentorship_student_read ON public.job_ready_bootcamp_mentorship_sessions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.job_ready_bootcamp_enrollments AS e
      JOIN public.students AS s ON s.id = e.student_id
      WHERE e.status = 'active'
        AND s.user_id = auth.uid()
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_ready_bootcamp_mentorship_sessions TO authenticated;

-- Extend course_price_plans for bootcamp product pricing
ALTER TABLE public.course_price_plans
  DROP CONSTRAINT IF EXISTS course_price_plans_source_type_check;

ALTER TABLE public.course_price_plans
  ADD CONSTRAINT course_price_plans_source_type_check
  CHECK (source_type IN ('master_course', 'course_variant', 'paid_course_builder', 'job_ready_bootcamp'));

COMMIT;
