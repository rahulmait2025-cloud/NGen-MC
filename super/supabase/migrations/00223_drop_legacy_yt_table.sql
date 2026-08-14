-- Drop legacy YouTube enrollment table (replaced by master_courses + student_entitlements)
-- All data should be cleaned up manually via SQL before running this migration

DROP TABLE IF EXISTS public.free_youtube_playlist_enrollments CASCADE;
