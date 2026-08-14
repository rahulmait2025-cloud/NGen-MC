-- Migration 00326: Platform Metadata & Per-Year Sync State Tracking
--
-- DO NOT RUN AUTOMATICALLY — Saved in SuperAdmin migrations for manual review.

BEGIN;

-- 1. Generic Platform Metadata for LeetCode, Codeforces, GFG, and GitHub
CREATE TABLE IF NOT EXISTS public.student_platform_metadata (
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  platform text NOT NULL CHECK (platform IN ('github', 'leetcode', 'codeforces', 'gfg')),
  handle_or_username text,
  account_created_at timestamptz,
  earliest_activity_date date,
  latest_activity_date date,
  last_metadata_error text,
  metadata_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (student_id, platform),
  CONSTRAINT chk_activity_date_order CHECK (
    earliest_activity_date IS NULL OR 
    latest_activity_date IS NULL OR 
    earliest_activity_date <= latest_activity_date
  )
);

COMMENT ON TABLE public.student_platform_metadata IS 'Per-platform account creation dates, usernames/handles, and activity ranges.';

-- 2. Per-platform, per-year sync state table
CREATE TABLE IF NOT EXISTS public.student_platform_year_sync_state (
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  platform text NOT NULL CHECK (platform IN ('github', 'leetcode', 'codeforces', 'gfg')),
  year integer NOT NULL CHECK (year >= 2000 AND year <= 2100),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'partial', 'failed', 'empty')),
  activity_count integer NOT NULL DEFAULT 0 CHECK (activity_count >= 0),
  last_error text,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (student_id, platform, year)
);

CREATE INDEX IF NOT EXISTS idx_student_platform_year_sync_student_year
  ON public.student_platform_year_sync_state (student_id, year);

COMMENT ON TABLE public.student_platform_year_sync_state IS 'Explicit tracking of fetched status per platform and calendar year.';

-- 3. Extend OAuth connections table with GitHub account creation metadata
ALTER TABLE public.student_platform_connections
  ADD COLUMN IF NOT EXISTS account_created_at timestamptz,
  ADD COLUMN IF NOT EXISTS earliest_activity_date date,
  ADD COLUMN IF NOT EXISTS latest_activity_date date,
  ADD COLUMN IF NOT EXISTS metadata_synced_at timestamptz;

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.student_platform_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_platform_year_sync_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS student_platform_metadata_select_policy ON public.student_platform_metadata;
CREATE POLICY student_platform_metadata_select_policy ON public.student_platform_metadata
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = student_platform_metadata.student_id
        AND s.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS student_platform_year_sync_state_select_policy ON public.student_platform_year_sync_state;
CREATE POLICY student_platform_year_sync_state_select_policy ON public.student_platform_year_sync_state
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = student_platform_year_sync_state.student_id
        AND s.user_id = auth.uid()
    )
  );

-- 5. Attach reusable updated_at triggers
DROP TRIGGER IF EXISTS set_student_platform_metadata_updated_at ON public.student_platform_metadata;
CREATE TRIGGER set_student_platform_metadata_updated_at
  BEFORE UPDATE ON public.student_platform_metadata
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_student_platform_year_sync_state_updated_at ON public.student_platform_year_sync_state;
CREATE TRIGGER set_student_platform_year_sync_state_updated_at
  BEFORE UPDATE ON public.student_platform_year_sync_state
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_student_platform_connections_updated_at ON public.student_platform_connections;
CREATE TRIGGER set_student_platform_connections_updated_at
  BEFORE UPDATE ON public.student_platform_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

COMMIT;
