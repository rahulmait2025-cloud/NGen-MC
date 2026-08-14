-- Migration 00186: Free YouTube playlist enrollment + mark-as-done tracking (Phase 2)
--
-- Stores mandatory free YouTube playlist enrollments and per-video completion rows
-- for student progress and future SuperAdmin playlist analytics.

BEGIN;

-- ─── free_youtube_playlist_enrollments ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.free_youtube_playlist_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  college_id uuid NULL REFERENCES public.colleges(id) ON DELETE SET NULL,
  playlist_id text NOT NULL,
  playlist_title text NULL,
  playlist_thumbnail_url text NULL,
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT free_youtube_playlist_enrollments_playlist_id_not_empty
    CHECK (char_length(trim(playlist_id)) > 0),
  CONSTRAINT free_youtube_playlist_enrollments_student_playlist_unique
    UNIQUE (student_id, playlist_id)
);

COMMENT ON TABLE public.free_youtube_playlist_enrollments IS
  'One enrollment row per student per free YouTube playlist (mandatory before watch).';

CREATE INDEX IF NOT EXISTS idx_free_youtube_playlist_enrollments_playlist_id
  ON public.free_youtube_playlist_enrollments (playlist_id);

CREATE INDEX IF NOT EXISTS idx_free_youtube_playlist_enrollments_student_id
  ON public.free_youtube_playlist_enrollments (student_id);

CREATE INDEX IF NOT EXISTS idx_free_youtube_playlist_enrollments_college_id
  ON public.free_youtube_playlist_enrollments (college_id);

CREATE INDEX IF NOT EXISTS idx_free_youtube_playlist_enrollments_enrolled_at_desc
  ON public.free_youtube_playlist_enrollments (enrolled_at DESC);

CREATE INDEX IF NOT EXISTS idx_free_youtube_playlist_enrollments_playlist_enrolled_at_desc
  ON public.free_youtube_playlist_enrollments (playlist_id, enrolled_at DESC);

-- ─── free_youtube_video_completions ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.free_youtube_video_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  college_id uuid NULL REFERENCES public.colleges(id) ON DELETE SET NULL,
  playlist_id text NOT NULL,
  youtube_video_id text NOT NULL,
  video_title text NULL,
  completed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT free_youtube_video_completions_playlist_id_not_empty
    CHECK (char_length(trim(playlist_id)) > 0),
  CONSTRAINT free_youtube_video_completions_youtube_video_id_not_empty
    CHECK (char_length(trim(youtube_video_id)) > 0),
  CONSTRAINT free_youtube_video_completions_student_playlist_video_unique
    UNIQUE (student_id, playlist_id, youtube_video_id)
);

COMMENT ON TABLE public.free_youtube_video_completions IS
  'Per-student mark-as-done rows for videos inside a free YouTube playlist.';

CREATE INDEX IF NOT EXISTS idx_free_youtube_video_completions_student_id
  ON public.free_youtube_video_completions (student_id);

CREATE INDEX IF NOT EXISTS idx_free_youtube_video_completions_college_id
  ON public.free_youtube_video_completions (college_id);

CREATE INDEX IF NOT EXISTS idx_free_youtube_video_completions_playlist_id
  ON public.free_youtube_video_completions (playlist_id);

CREATE INDEX IF NOT EXISTS idx_free_youtube_video_completions_completed_at_desc
  ON public.free_youtube_video_completions (completed_at DESC);

CREATE INDEX IF NOT EXISTS idx_free_youtube_video_completions_playlist_completed_at_desc
  ON public.free_youtube_video_completions (playlist_id, completed_at DESC);

CREATE INDEX IF NOT EXISTS idx_free_youtube_video_completions_student_playlist
  ON public.free_youtube_video_completions (student_id, playlist_id);

-- ─── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE public.free_youtube_playlist_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.free_youtube_video_completions ENABLE ROW LEVEL SECURITY;

-- SuperAdmin: full access
DROP POLICY IF EXISTS free_youtube_playlist_enrollments_superadmin_all ON public.free_youtube_playlist_enrollments;
CREATE POLICY free_youtube_playlist_enrollments_superadmin_all
  ON public.free_youtube_playlist_enrollments
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.global_role = 'superadmin'
        AND p.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.global_role = 'superadmin'
        AND p.is_active = true
    )
  );

DROP POLICY IF EXISTS free_youtube_video_completions_superadmin_all ON public.free_youtube_video_completions;
CREATE POLICY free_youtube_video_completions_superadmin_all
  ON public.free_youtube_video_completions
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.global_role = 'superadmin'
        AND p.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.global_role = 'superadmin'
        AND p.is_active = true
    )
  );

-- Students: read own rows
DROP POLICY IF EXISTS free_youtube_playlist_enrollments_student_select ON public.free_youtube_playlist_enrollments;
CREATE POLICY free_youtube_playlist_enrollments_student_select
  ON public.free_youtube_playlist_enrollments
  FOR SELECT TO authenticated
  USING (
    student_id IN (SELECT s.id FROM public.students s WHERE s.user_id = auth.uid())
  );

DROP POLICY IF EXISTS free_youtube_video_completions_student_select ON public.free_youtube_video_completions;
CREATE POLICY free_youtube_video_completions_student_select
  ON public.free_youtube_video_completions
  FOR SELECT TO authenticated
  USING (
    student_id IN (SELECT s.id FROM public.students s WHERE s.user_id = auth.uid())
  );

-- Students: insert own rows only
DROP POLICY IF EXISTS free_youtube_playlist_enrollments_student_insert ON public.free_youtube_playlist_enrollments;
CREATE POLICY free_youtube_playlist_enrollments_student_insert
  ON public.free_youtube_playlist_enrollments
  FOR INSERT TO authenticated
  WITH CHECK (
    student_id IN (SELECT s.id FROM public.students s WHERE s.user_id = auth.uid())
  );

DROP POLICY IF EXISTS free_youtube_video_completions_student_insert ON public.free_youtube_video_completions;
CREATE POLICY free_youtube_video_completions_student_insert
  ON public.free_youtube_video_completions
  FOR INSERT TO authenticated
  WITH CHECK (
    student_id IN (SELECT s.id FROM public.students s WHERE s.user_id = auth.uid())
  );

-- Grants (service_role bypasses RLS for server-side admin client)
GRANT SELECT, INSERT ON public.free_youtube_playlist_enrollments TO authenticated;
GRANT SELECT, INSERT ON public.free_youtube_video_completions TO authenticated;

COMMIT;
