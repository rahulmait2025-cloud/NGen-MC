-- Add indices for fast Auth Context lookups (Phase 3 optimization).
-- NOTE:
-- Supabase CLI db push executes migrations in pipeline mode, which cannot run
-- CREATE INDEX CONCURRENTLY. Keep migration-safe DDL here.
-- If you need truly online index builds in production, run the companion script:
-- supabase/manual/20260319_phase3_auth_indexes_concurrently.sql

CREATE INDEX IF NOT EXISTS idx_profiles_global_role ON public.profiles(global_role) WHERE global_role IS NOT NULL;

-- Composite indices strictly mapped to the RPC join parameters
CREATE UNIQUE INDEX IF NOT EXISTS idx_college_mem_user_college ON public.college_memberships(user_id, college_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_students_user_college ON public.students(user_id, college_id);

CREATE INDEX IF NOT EXISTS idx_profiles_active_suspended ON public.profiles(is_active, suspended_at);
