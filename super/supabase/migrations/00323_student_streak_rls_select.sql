BEGIN;

ALTER TABLE public.student_daily_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_streaks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS student_daily_visits_select_own
ON public.student_daily_visits;

CREATE POLICY student_daily_visits_select_own
ON public.student_daily_visits
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.students s
    WHERE s.id = student_daily_visits.student_id
      AND s.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS student_streaks_select_own
ON public.student_streaks;

CREATE POLICY student_streaks_select_own
ON public.student_streaks
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.students s
    WHERE s.id = student_streaks.student_id
      AND s.user_id = auth.uid()
  )
);

COMMIT;
