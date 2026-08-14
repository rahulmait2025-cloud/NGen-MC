-- Phase 10: RBAC/session hardening for admin auth
-- Adds revocable admin sessions, account security controls, feature flags,
-- and an RPC audit hook usable from apps without service-role key.

alter table public.profiles
  add column if not exists requires_2fa boolean not null default false,
  add column if not exists suspended_at timestamptz,
  add column if not exists suspension_reason text,
  add column if not exists force_logout_after timestamptz,
  add column if not exists last_password_reset_at timestamptz;

create table if not exists public.college_features (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references public.colleges(id) on delete cascade,
  feature_key text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (college_id, feature_key)
);

create index if not exists idx_college_features_college_id on public.college_features(college_id);
create index if not exists idx_college_features_key on public.college_features(feature_key);

drop trigger if exists college_features_updated_at on public.college_features;
create trigger college_features_updated_at
  before update on public.college_features
  for each row execute function public.set_updated_at();

create table if not exists public.admin_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  college_id uuid references public.colleges(id) on delete set null,
  role text not null check (role in ('superadmin', 'college_admin', 'faculty_spoc', 'mentor')),
  session_token_hash text not null unique,
  device_id text,
  ip_address text,
  user_agent text,
  status text not null default 'active' check (status in ('active', 'revoked', 'expired')),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  revoked_by uuid references auth.users(id) on delete set null,
  revoke_reason text,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists idx_admin_sessions_user_id on public.admin_sessions(user_id);
create index if not exists idx_admin_sessions_college_id on public.admin_sessions(college_id);
create index if not exists idx_admin_sessions_status on public.admin_sessions(status);
create index if not exists idx_admin_sessions_last_seen on public.admin_sessions(last_seen_at desc);

alter table public.college_features enable row level security;
alter table public.admin_sessions enable row level security;

-- college_features policies
drop policy if exists "Superadmin full access college_features" on public.college_features;
create policy "Superadmin full access college_features"
  on public.college_features for all
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.global_role = 'superadmin')
  )
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.global_role = 'superadmin')
  );

drop policy if exists "Tenant admins can read enabled features" on public.college_features;
create policy "Tenant admins can read enabled features"
  on public.college_features for select
  using (
    college_id in (
      select m.college_id from public.college_memberships m
      where m.user_id = auth.uid()
        and m.status = 'active'
        and m.role in ('college_admin', 'faculty_spoc')
    )
  );

-- admin_sessions policies
drop policy if exists "Users can read own admin sessions" on public.admin_sessions;
create policy "Users can read own admin sessions"
  on public.admin_sessions for select
  using (user_id = auth.uid());

drop policy if exists "Users can insert own admin sessions" on public.admin_sessions;
create policy "Users can insert own admin sessions"
  on public.admin_sessions for insert
  with check (user_id = auth.uid());

drop policy if exists "Users can update own admin sessions" on public.admin_sessions;
create policy "Users can update own admin sessions"
  on public.admin_sessions for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Superadmin full access admin_sessions" on public.admin_sessions;
create policy "Superadmin full access admin_sessions"
  on public.admin_sessions for all
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.global_role = 'superadmin')
  )
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.global_role = 'superadmin')
  );

create or replace function public.log_security_event(
  p_action text,
  p_resource_type text default 'auth',
  p_resource_id text default null,
  p_college_id uuid default null,
  p_payload jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  insert into public.audit_logs (
    actor_id,
    action,
    resource_type,
    resource_id,
    college_id,
    payload
  )
  values (
    auth.uid(),
    p_action,
    p_resource_type,
    p_resource_id,
    p_college_id,
    coalesce(p_payload, '{}'::jsonb)
  );
end;
$$;

grant execute on function public.log_security_event(text, text, text, uuid, jsonb) to authenticated;