-- Migration: Add job_ready_bootcamp_enabled to platform_settings
-- Gates student-facing Job Ready Bootcamp enrollment / access surfaces.
-- Defaults to false (fail closed) until SuperAdmin enables it.

ALTER TABLE public.platform_settings
  ADD COLUMN IF NOT EXISTS job_ready_bootcamp_enabled boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.platform_settings.job_ready_bootcamp_enabled IS
  'When true, Job Ready Bootcamp enrollment and related LMS surfaces are visible to students. Defaults to false.';
