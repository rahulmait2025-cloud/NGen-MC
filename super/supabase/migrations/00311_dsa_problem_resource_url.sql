-- Per-problem resource links for DSA sheet imports and editing.

ALTER TABLE public.dsa_problems
  ADD COLUMN IF NOT EXISTS resource_url TEXT NOT NULL DEFAULT '';

ALTER TABLE public.dsa_problems_draft
  ADD COLUMN IF NOT EXISTS resource_url TEXT NOT NULL DEFAULT '';
