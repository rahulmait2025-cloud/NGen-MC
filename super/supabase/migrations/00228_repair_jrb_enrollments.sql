-- Repair Job Ready Bootcamp enrollments table/FK/grants after partial deploys.
-- Safe to rerun.

BEGIN;

DO $$
DECLARE
  v_fk_name text;
  v_ref_table text;
BEGIN
  IF to_regclass('public.job_ready_bootcamp_enrollments') IS NULL THEN
    RAISE NOTICE 'job_ready_bootcamp_enrollments missing; apply 00225_job_ready_bootcamp_flow.sql first';
    RETURN;
  END IF;

  SELECT tc.constraint_name, ccu.table_name
  INTO v_fk_name, v_ref_table
  FROM information_schema.table_constraints AS tc
  JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
   AND tc.table_schema = kcu.table_schema
  JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
   AND ccu.table_schema = tc.table_schema
  WHERE tc.table_schema = 'public'
    AND tc.table_name = 'job_ready_bootcamp_enrollments'
    AND tc.constraint_type = 'FOREIGN KEY'
    AND kcu.column_name = 'student_id'
  LIMIT 1;

  IF v_fk_name IS NOT NULL AND v_ref_table = 'profiles' THEN
    EXECUTE format(
      'ALTER TABLE public.job_ready_bootcamp_enrollments DROP CONSTRAINT %I',
      v_fk_name
    );
    ALTER TABLE public.job_ready_bootcamp_enrollments
      ADD CONSTRAINT job_ready_bootcamp_enrollments_student_id_fkey
      FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;
  END IF;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_ready_bootcamp_enrollments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_ready_bootcamp_enrollments TO service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
