-- Allow college admins to read mentorship recipients scoped to their college
-- Migration 00243

-- Recipients: college admins see only their college's recipient rows
CREATE POLICY jrb_mentorship_recipients_college_read
  ON public.job_ready_bootcamp_mentorship_recipients
  FOR SELECT TO authenticated
  USING (
    public.is_college_admin_of(college_id)
  );

-- Sessions: college admins see sessions where they have at least one recipient
CREATE POLICY jrb_mentorship_sessions_college_read
  ON public.job_ready_bootcamp_mentorship_sessions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.job_ready_bootcamp_mentorship_recipients r
      WHERE r.session_id = job_ready_bootcamp_mentorship_sessions.id
        AND public.is_college_admin_of(r.college_id)
    )
  );
