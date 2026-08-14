-- Gate LMS access to DSA sheets by explicit publish state.

ALTER TABLE public.dsa_sheets
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

-- Treat sheets that already have live categories/problems as previously published.
UPDATE public.dsa_sheets s
SET published_at = COALESCE(s.published_at, s.updated_at, now())
WHERE s.published_at IS NULL
  AND EXISTS (
    SELECT 1
    FROM public.dsa_categories c
    WHERE c.sheet_id = s.id
  );
