-- ============================================================
-- 00207: RLS for paid_course_landing_metadata
--
-- Super Admin full access; authenticated students may read
-- published + visible rows only. LMS server uses service role.
-- ============================================================

BEGIN;

ALTER TABLE public.paid_course_landing_metadata ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'paid_course_landing_metadata_superadmin_all'
      AND tablename = 'paid_course_landing_metadata'
  ) THEN
    CREATE POLICY paid_course_landing_metadata_superadmin_all
      ON public.paid_course_landing_metadata
      FOR ALL TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.global_role = 'superadmin'
            AND p.is_active = true
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.global_role = 'superadmin'
            AND p.is_active = true
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'paid_course_landing_metadata_student_select'
      AND tablename = 'paid_course_landing_metadata'
  ) THEN
    CREATE POLICY paid_course_landing_metadata_student_select
      ON public.paid_course_landing_metadata
      FOR SELECT TO authenticated
      USING (is_published = true AND is_visible = true);
  END IF;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.paid_course_landing_metadata TO authenticated;

COMMIT;
