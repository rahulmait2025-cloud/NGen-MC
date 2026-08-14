-- Mentorship session audience targeting + recipient snapshots (Job Ready Bootcamp)

BEGIN;

CREATE TABLE IF NOT EXISTS public.job_ready_bootcamp_mentorship_audience_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL
    REFERENCES public.job_ready_bootcamp_mentorship_sessions(id) ON DELETE CASCADE,
  target_type text NOT NULL
    CHECK (
      target_type IN (
        'all_bootcamp_enrolled',
        'college',
        'student',
        'course',
        'bundle',
        'paid_course',
        'master_course',
        'product'
      )
    ),
  target_id uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT jrb_mentorship_audience_target_id_check
    CHECK (
      (target_type = 'all_bootcamp_enrolled' AND target_id IS NULL)
      OR (target_type <> 'all_bootcamp_enrolled' AND target_id IS NOT NULL)
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_jrb_mentorship_audience_targets_session_type_id
  ON public.job_ready_bootcamp_mentorship_audience_targets (session_id, target_type, target_id)
  WHERE target_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_jrb_mentorship_audience_targets_all_bootcamp
  ON public.job_ready_bootcamp_mentorship_audience_targets (session_id, target_type)
  WHERE target_type = 'all_bootcamp_enrolled';

CREATE INDEX IF NOT EXISTS idx_jrb_mentorship_audience_targets_session
  ON public.job_ready_bootcamp_mentorship_audience_targets (session_id);

CREATE TABLE IF NOT EXISTS public.job_ready_bootcamp_mentorship_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL
    REFERENCES public.job_ready_bootcamp_mentorship_sessions(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  college_id uuid NULL REFERENCES public.colleges(id) ON DELETE SET NULL,
  source_type text NULL,
  source_id uuid NULL,
  email_status text NOT NULL DEFAULT 'pending'
    CHECK (email_status IN ('pending', 'queued', 'sent', 'failed', 'suppressed', 'skipped')),
  email_outbox_id uuid NULL REFERENCES public.email_outbox(id) ON DELETE SET NULL,
  email_sent_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_jrb_mentorship_recipients_session
  ON public.job_ready_bootcamp_mentorship_recipients (session_id);

CREATE INDEX IF NOT EXISTS idx_jrb_mentorship_recipients_student
  ON public.job_ready_bootcamp_mentorship_recipients (student_id);

CREATE INDEX IF NOT EXISTS idx_jrb_mentorship_recipients_student_session
  ON public.job_ready_bootcamp_mentorship_recipients (student_id, session_id);

CREATE INDEX IF NOT EXISTS idx_jrb_mentorship_recipients_email_status
  ON public.job_ready_bootcamp_mentorship_recipients (email_status);

ALTER TABLE public.job_ready_bootcamp_mentorship_audience_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_ready_bootcamp_mentorship_recipients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS jrb_mentorship_audience_superadmin_all
  ON public.job_ready_bootcamp_mentorship_audience_targets;
CREATE POLICY jrb_mentorship_audience_superadmin_all
  ON public.job_ready_bootcamp_mentorship_audience_targets
  FOR ALL TO authenticated
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());

DROP POLICY IF EXISTS jrb_mentorship_recipients_superadmin_all
  ON public.job_ready_bootcamp_mentorship_recipients;
CREATE POLICY jrb_mentorship_recipients_superadmin_all
  ON public.job_ready_bootcamp_mentorship_recipients
  FOR ALL TO authenticated
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());

DROP POLICY IF EXISTS jrb_mentorship_recipients_student_read
  ON public.job_ready_bootcamp_mentorship_recipients;
CREATE POLICY jrb_mentorship_recipients_student_read
  ON public.job_ready_bootcamp_mentorship_recipients
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.students AS s
      WHERE s.id = job_ready_bootcamp_mentorship_recipients.student_id
        AND s.user_id = auth.uid()
    )
  );

-- Students see sessions only when they are in the recipient snapshot.
DROP POLICY IF EXISTS jrb_mentorship_student_read ON public.job_ready_bootcamp_mentorship_sessions;
CREATE POLICY jrb_mentorship_student_read ON public.job_ready_bootcamp_mentorship_sessions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.job_ready_bootcamp_mentorship_recipients AS r
      INNER JOIN public.students AS s ON s.id = r.student_id
      WHERE r.session_id = job_ready_bootcamp_mentorship_sessions.id
        AND s.user_id = auth.uid()
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.job_ready_bootcamp_mentorship_audience_targets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.job_ready_bootcamp_mentorship_recipients TO authenticated;

COMMIT;
