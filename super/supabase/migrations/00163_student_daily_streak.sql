-- Daily visit streak: one counted visit per student per calendar day.

CREATE TABLE IF NOT EXISTS public.student_daily_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  visit_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, visit_date)
);

CREATE INDEX IF NOT EXISTS idx_student_daily_visits_student_id
  ON public.student_daily_visits (student_id);

CREATE TABLE IF NOT EXISTS public.student_streaks (
  student_id uuid PRIMARY KEY REFERENCES public.students(id) ON DELETE CASCADE,
  current_streak integer NOT NULL DEFAULT 0 CHECK (current_streak >= 0),
  longest_streak integer NOT NULL DEFAULT 0 CHECK (longest_streak >= 0),
  last_visit_date date,
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.student_daily_visits IS 'One row per student per calendar day they opened the LMS (deduped).';
COMMENT ON TABLE public.student_streaks IS 'Cached consecutive-day visit streak for fast reads.';
