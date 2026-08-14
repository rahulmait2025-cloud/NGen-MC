-- Phase A: Cleanup archived legacy auth backup tables
-- These tables were renamed from public.username and public.user_credentials in migration 00033
-- Verified: Zero runtime references exist in TypeScript, JavaScript, or other SQL code
-- This is a forward-only migration that does NOT edit old migrations

do $$
begin
  raise notice 'Phase A: Dropping archived legacy auth backup tables after verification';
  raise notice '  - z_backup_user_credentials: No references in codebase';
  raise notice '  - z_backup_username: No references in codebase';
end $$;

-- Drop the archived backup tables if they exist
drop table if exists public.z_backup_user_credentials;
drop table if exists public.z_backup_username;

-- Log completion
do $$
begin
  raise notice 'Phase A complete: Archived legacy auth backup tables removed';
end $$;