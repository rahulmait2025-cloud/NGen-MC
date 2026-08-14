-- Track when the latest invite was sent (per-profile, independent of auth.users.created_at).
-- Used for invite-link expiry: re-inviting a user resets this timestamp.
alter table public.profiles
  add column if not exists invited_at timestamptz;

-- Allow SuperAdmin to configure how many hours an invite link stays valid (default 24).
alter table public.platform_settings
  add column if not exists invite_expiry_hours integer not null default 24;
