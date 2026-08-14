-- =====================================================================
-- Migration: 00206_fix_segment_unique_index_for_postgrest.sql
-- Description: Replaces the partial unique index on video_watch_segments
--              with a full unique index so PostgREST recognizes it for
--              ON CONFLICT upserts. PostgreSQL treats NULLs as distinct
--              in unique indexes, so existing rows with NULL
--              client_segment_id are not affected.
-- =====================================================================

-- 1. Drop the partial index that PostgREST cannot use
DROP INDEX IF EXISTS public.uq_seg_client_segment_id;

-- 2. Create a full unique index (NULLs are distinct, so safe for existing data)
CREATE UNIQUE INDEX IF NOT EXISTS uq_seg_client_segment_id
    ON public.video_watch_segments (student_id, lesson_id, client_segment_id);
