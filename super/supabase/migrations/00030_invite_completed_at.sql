-- Track when a user completed the invite flow (set password). Used to invalidate invite links after first use.
alter table public.profiles
  add column if not exists invite_completed_at timestamptz;

create index if not exists idx_profiles_invite_completed_at on public.profiles(invite_completed_at) where invite_completed_at is not null;
