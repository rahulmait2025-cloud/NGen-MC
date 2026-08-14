-- ──────────────────────────────────────────────────────────────────────────────
-- Migration 00298: Grant Profiles RLS Functions
--
-- Re-grants EXECUTE privileges to authenticated users on SECURITY DEFINER
-- functions that are referenced in RLS policies for the public.profiles table.
-- Without these, standard queries that trigger profiles policy evaluation
-- (e.g. assessments queries referencing profiles) fail with permission denied.
-- ──────────────────────────────────────────────────────────────────────────────

-- 1. college_peer_can_view_profile
GRANT EXECUTE ON FUNCTION public.college_peer_can_view_profile(uuid) TO authenticated;

-- 2. is_peer_profile
GRANT EXECUTE ON FUNCTION public.is_peer_profile(uuid) TO authenticated;
