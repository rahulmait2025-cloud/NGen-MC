-- Migration 00324: Student Multi-Platform Coding Stats & GitHub OAuth Integration
--
-- DO NOT RUN AUTOMATICALLY — Saved in SuperAdmin migrations for manual review.

BEGIN;

-- 1. Profile extensions on public.students
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS codeforces_handle text,
  ADD COLUMN IF NOT EXISTS gfg_username text,
  ADD COLUMN IF NOT EXISTS coding_stats_synced_at timestamptz;

COMMENT ON COLUMN public.students.codeforces_handle IS 'Codeforces profile handle';
COMMENT ON COLUMN public.students.gfg_username IS 'GeeksforGeeks username';
COMMENT ON COLUMN public.students.coding_stats_synced_at IS 'Last timestamp multi-platform coding stats were synced';

-- 2. Multi-platform daily activity records
CREATE TABLE IF NOT EXISTS public.student_platform_daily_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  date date NOT NULL,
  platform text NOT NULL CHECK (platform IN ('github', 'leetcode', 'codeforces', 'gfg')),
  activity_count integer NOT NULL DEFAULT 0 CHECK (activity_count >= 0),
  points integer NOT NULL DEFAULT 0 CHECK (points >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, date, platform)
);

CREATE INDEX IF NOT EXISTS idx_student_platform_daily_activities_student_date
  ON public.student_platform_daily_activities (student_id, date);

CREATE INDEX IF NOT EXISTS idx_student_platform_daily_activities_platform_date
  ON public.student_platform_daily_activities (student_id, platform, date);

COMMENT ON TABLE public.student_platform_daily_activities IS 'Daily coding submissions and contribution records per platform.';

-- 3. Multi-platform coding streaks (distinct from LMS platform visit streaks in public.student_streaks)
CREATE TABLE IF NOT EXISTS public.student_coding_streaks (
  student_id uuid PRIMARY KEY REFERENCES public.students(id) ON DELETE CASCADE,
  current_streak integer NOT NULL DEFAULT 0 CHECK (current_streak >= 0),
  longest_streak integer NOT NULL DEFAULT 0 CHECK (longest_streak >= 0),
  total_points integer NOT NULL DEFAULT 0 CHECK (total_points >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.student_coding_streaks IS 'Cached multi-platform coding submission streak metrics.';

-- 4. Private platform OAuth connections (Encrypted server-only storage)
CREATE TABLE IF NOT EXISTS public.student_platform_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  platform text NOT NULL CHECK (platform IN ('github')),
  provider_user_id text NOT NULL,
  provider_username text NOT NULL,
  profile_url text,
  encrypted_access_token text NOT NULL,
  token_iv text NOT NULL,
  token_auth_tag text NOT NULL,
  token_scopes text[] NOT NULL DEFAULT '{}',
  connected_at timestamptz NOT NULL DEFAULT now(),
  last_verified_at timestamptz,
  last_synced_at timestamptz,
  last_sync_error text,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, platform),
  UNIQUE (platform, provider_user_id)
);

CREATE INDEX IF NOT EXISTS idx_student_platform_connections_student
  ON public.student_platform_connections (student_id, platform)
  WHERE revoked_at IS NULL;

COMMENT ON TABLE public.student_platform_connections IS 'Encrypted OAuth access tokens for third-party platform integrations.';

-- 5. OAuth state tracking (Server-side CSRF protection)
CREATE TABLE IF NOT EXISTS public.platform_oauth_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  state_hash text NOT NULL UNIQUE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  platform text NOT NULL CHECK (platform IN ('github')),
  redirect_path text NOT NULL DEFAULT '/student/stats',
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_platform_oauth_states_lookup
  ON public.platform_oauth_states (state_hash, expires_at)
  WHERE consumed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_platform_oauth_states_expires_at
  ON public.platform_oauth_states (expires_at);

-- 6. Enable Row Level Security (RLS)
ALTER TABLE public.student_platform_daily_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_coding_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_platform_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_oauth_states ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies (Idempotent with DROP POLICY IF EXISTS)
DROP POLICY IF EXISTS student_platform_daily_activities_select_policy
  ON public.student_platform_daily_activities;

CREATE POLICY student_platform_daily_activities_select_policy
  ON public.student_platform_daily_activities
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.students s
      WHERE s.id = student_platform_daily_activities.student_id
        AND s.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS student_coding_streaks_select_policy
  ON public.student_coding_streaks;

CREATE POLICY student_coding_streaks_select_policy
  ON public.student_coding_streaks
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.students s
      WHERE s.id = student_coding_streaks.student_id
        AND s.user_id = auth.uid()
    )
  );

COMMIT;
