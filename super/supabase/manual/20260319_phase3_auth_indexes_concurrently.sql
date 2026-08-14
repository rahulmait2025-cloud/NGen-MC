-- Run in Supabase SQL Editor. Safe to run repeatedly due to IF NOT EXISTS.
-- Removed CONCURRENTLY so all statements can run in a single transaction block.

CREATE INDEX IF NOT EXISTS idx_profiles_global_role
ON public.profiles(global_role)
WHERE global_role IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_college_mem_user_college
ON public.college_memberships(user_id, college_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_students_user_college
ON public.students(user_id, college_id);

CREATE INDEX IF NOT EXISTS idx_profiles_active_suspended
ON public.profiles(is_active, suspended_at);
