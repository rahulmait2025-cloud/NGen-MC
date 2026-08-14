-- Migration 00024: SLO Monitoring, Error Tracking, and Extended Audit Capabilities (renumbered from 00013 to avoid version conflict with 00013_admin_security)
-- Provides backend infrastructure for Operational and Audit Dashboards

-------------------------------------------------------------------------------
-- 1. API REQUEST LOGS & LATENCY TRACKING (SLO)
-------------------------------------------------------------------------------
create table if not exists public.api_request_logs (
  id uuid primary key default gen_random_uuid(),
  request_id text not null,
  tenant_id uuid references public.colleges(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  method text not null,
  path text not null,
  status_code integer not null,
  latency_ms integer not null,
  user_agent text,
  ip_address text,
  created_at timestamptz not null default now()
);

-- Index for slow endpoints and recent queries
create index if not exists idx_api_logs_latency on public.api_request_logs(latency_ms desc);
create index if not exists idx_api_logs_created on public.api_request_logs(created_at desc);
create index if not exists idx_api_logs_status on public.api_request_logs(status_code) where status_code >= 400;

-- Auto-cleanup job using pg_cron (keep 7 days of raw logs; skip if cron not available)
do $outer$
begin
  perform cron.schedule('cleanup_api_logs', '0 2 * * *', 'delete from public.api_request_logs where created_at < now() - interval ''7 days''');
exception when others then null;
end $outer$;

-------------------------------------------------------------------------------
-- 2. EXPLICIT ERROR EVENTS (Bugs / Exceptions)
-------------------------------------------------------------------------------
create table if not exists public.error_events (
  id uuid primary key default gen_random_uuid(),
  request_id text, -- link back to api_request_logs if available
  tenant_id uuid references public.colleges(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  error_code text not null,   -- e.g. 'VALIDATION_ERROR', 'PAYMENT_FAILED', 'DB_TIMEOUT'
  message text not null,
  stack_trace text,
  context_data jsonb,         -- Safe, scrubbed context variables
  resolved boolean not null default false,
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_error_events_unresolved on public.error_events(created_at desc) where resolved = false;

-------------------------------------------------------------------------------
-- 3. BACKGROUND JOB HEALTH
-------------------------------------------------------------------------------
-- Table to register known background job definitions
create table if not exists public.registered_jobs (
  job_name text primary key,
  description text,
  expected_schedule text,
  is_active boolean default true
);

-- Individual run outcomes
create table if not exists public.job_runs (
  id uuid primary key default gen_random_uuid(),
  job_name text not null references public.registered_jobs(job_name) on delete cascade,
  status text not null check (status in ('running', 'success', 'failed')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  runtime_ms integer,
  error_message text
);

create index if not exists idx_job_runs_failed on public.job_runs(started_at desc) where status = 'failed';

-- Pre-register the jobs created in migrations 11 & 12
insert into public.registered_jobs (job_name, description, expected_schedule) values 
  ('refresh_mv_college_kpis', 'Hourly refresh of materialized college KPI views', '0 * * * *'),
  ('refresh_mv_student_kpis', 'Hourly refresh of materialized student KPI views', '0 * * * *'),
  ('refresh_mv_platform_kpis', 'Hourly refresh of materialized platform KPI views', '0 * * * *'),
  ('generate_daily_college_snapshots', 'Midnight creation of historical analytic snapshots', '0 0 * * *')
on conflict do nothing;

-------------------------------------------------------------------------------
-- 4. EMAIL / NOTIFICATION QUEUE STUB
-------------------------------------------------------------------------------
create table if not exists public.notification_queue (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.colleges(id) on delete cascade,
  recipient_email text not null,
  notification_type text not null,
  status text not null default 'pending' check (status in ('pending', 'processing', 'sent', 'failed')),
  retry_count integer not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_notification_queue_failed on public.notification_queue(created_at asc) where status in ('failed', 'pending');

-------------------------------------------------------------------------------
-- 5. AUDIT LOG EXTENSIONS
-------------------------------------------------------------------------------
-- The `audit_logs` table exists from migration 00003. We will add tracing fields if missing.
-- Note: 'add column if not exists' is not standard postgres syntax to alter multiple columns at once simply,
-- so we use multiple independent alter table statements.

alter table public.audit_logs add column if not exists request_id text;
alter table public.audit_logs add column if not exists ip_address text;
alter table public.audit_logs add column if not exists user_agent text;
alter table public.audit_logs add column if not exists severity text default 'info' check (severity in ('info', 'warning', 'critical'));

-- Provide a constrained view for the Audit Dashboard to standardize action categories
create or replace view public.vw_audit_dashboard as
select 
  a.id,
  a.action, -- e.g., 'ROLE_CHANGE', 'STUDENT_STATUS', 'MANUAL_OVERRIDE'
  a.severity,
  u.email as actor_email,
  c.name as college_name,
  a.resource_type,
  a.resource_id,
  a.payload,
  a.ip_address,
  a.created_at
from public.audit_logs a
left join auth.users u on a.actor_id = u.id
left join public.colleges c on a.college_id = c.id
order by a.created_at desc;

-------------------------------------------------------------------------------
-- 6. SECURITY & ACCESS
-------------------------------------------------------------------------------
alter table public.api_request_logs enable row level security;
alter table public.error_events enable row level security;
alter table public.job_runs enable row level security;
alter table public.registered_jobs enable row level security;
alter table public.notification_queue enable row level security;

-- Superadmins get read access to ops tables
drop policy if exists "Superadmin ops access" on public.error_events;
create policy "Superadmin ops access" on public.error_events for select using (exists (select 1 from public.profiles where id = auth.uid() and global_role = 'superadmin'));
drop policy if exists "Superadmin ops access" on public.job_runs;
create policy "Superadmin ops access" on public.job_runs for select using (exists (select 1 from public.profiles where id = auth.uid() and global_role = 'superadmin'));
drop policy if exists "Superadmin ops access" on public.api_request_logs;
create policy "Superadmin ops access" on public.api_request_logs for select using (exists (select 1 from public.profiles where id = auth.uid() and global_role = 'superadmin'));
drop policy if exists "Superadmin ops access" on public.notification_queue;
create policy "Superadmin ops access" on public.notification_queue for select using (exists (select 1 from public.profiles where id = auth.uid() and global_role = 'superadmin'));

-- Notice that insert rules to these tables are typically handled via Service Role in APIs
-- so we don't grant INSERT to authenticated/anon to prevent log spoofing.
