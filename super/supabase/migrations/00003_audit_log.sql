-- Phase 9: Audit log for platform actions (optional hardening).
-- Run after 00001 and 00002. Insert from app/backend; query by superadmin or own actor.

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  resource_type text,
  resource_id text,
  college_id uuid references public.colleges(id) on delete set null,
  payload jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_logs_actor on public.audit_logs(actor_id);
create index if not exists idx_audit_logs_college on public.audit_logs(college_id);
create index if not exists idx_audit_logs_created on public.audit_logs(created_at desc);

alter table public.audit_logs enable row level security;

drop policy if exists "Users can read own audit logs" on public.audit_logs;
create policy "Users can read own audit logs"
  on public.audit_logs for select
  using (actor_id = auth.uid());

drop policy if exists "Superadmin can read all audit logs" on public.audit_logs;
create policy "Superadmin can read all audit logs"
  on public.audit_logs for select
  using (
    exists (select 1 from public.profiles where id = auth.uid() and global_role = 'superadmin')
  );

-- Insert allowed via service role or from backend (no direct user insert policy for security).
