-- ============================================================
-- 00227: RLS policies for student_todos
-- ============================================================

BEGIN;

-- Enable Row Level Security (redundant but safe)
ALTER TABLE public.student_todos ENABLE ROW LEVEL SECURITY;

-- 1. Superadmin policy: full access to all todo items
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'student_todos_superadmin_all'
      AND tablename = 'student_todos'
  ) THEN
    CREATE POLICY student_todos_superadmin_all
      ON public.student_todos
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

-- 2. Student read policy: students can select their own todos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'student_todos_student_select'
      AND tablename = 'student_todos'
  ) THEN
    CREATE POLICY student_todos_student_select
      ON public.student_todos
      FOR SELECT TO authenticated
      USING (
        student_id IN (
          SELECT id FROM public.students WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- 3. Student insert policy: students can insert their own todos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'student_todos_student_insert'
      AND tablename = 'student_todos'
  ) THEN
    CREATE POLICY student_todos_student_insert
      ON public.student_todos
      FOR INSERT TO authenticated
      WITH CHECK (
        student_id IN (
          SELECT id FROM public.students WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- 4. Student update policy: students can update their own todos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'student_todos_student_update'
      AND tablename = 'student_todos'
  ) THEN
    CREATE POLICY student_todos_student_update
      ON public.student_todos
      FOR UPDATE TO authenticated
      USING (
        student_id IN (
          SELECT id FROM public.students WHERE user_id = auth.uid()
        )
      )
      WITH CHECK (
        student_id IN (
          SELECT id FROM public.students WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- 5. Student delete policy: students can delete their own todos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'student_todos_student_delete'
      AND tablename = 'student_todos'
  ) THEN
    CREATE POLICY student_todos_student_delete
      ON public.student_todos
      FOR DELETE TO authenticated
      USING (
        student_id IN (
          SELECT id FROM public.students WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_todos TO authenticated;

COMMIT;
