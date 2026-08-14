-- Student profile fields for /student/profile
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS year_or_semester text,
  ADD COLUMN IF NOT EXISTS github_url text,
  ADD COLUMN IF NOT EXISTS linkedin_url text,
  ADD COLUMN IF NOT EXISTS resume_url text,
  ADD COLUMN IF NOT EXISTS placement_ready_status text,
  ADD COLUMN IF NOT EXISTS leetcode_username text,
  ADD COLUMN IF NOT EXISTS leetcode_stats jsonb,
  ADD COLUMN IF NOT EXISTS leetcode_stats_synced_at timestamptz;

INSERT INTO storage.buckets (id, name, public)
VALUES ('resumes', 'resumes', true)
ON CONFLICT (id) DO NOTHING;
