-- Email Center Phase 1D - Scheduling, Approval, Cron Automation
-- Migration: 00107_email_center_phase_1d.sql

begin;

-- 1. Add scheduling + approval columns to email_campaigns
do $$
begin
    if not exists (select 1 from information_schema.columns where table_name='email_campaigns' and column_name='scheduled_at') then
        alter table public.email_campaigns add column scheduled_at timestamptz;
    end if;
    if not exists (select 1 from information_schema.columns where table_name='email_campaigns' and column_name='schedule_timezone') then
        alter table public.email_campaigns add column schedule_timezone text;
    end if;
    if not exists (select 1 from information_schema.columns where table_name='email_campaigns' and column_name='approved_by') then
        alter table public.email_campaigns add column approved_by uuid references auth.users(id) on delete set null;
    end if;
    if not exists (select 1 from information_schema.columns where table_name='email_campaigns' and column_name='approved_at') then
        alter table public.email_campaigns add column approved_at timestamptz;
    end if;
    if not exists (select 1 from information_schema.columns where table_name='email_campaigns' and column_name='approval_status') then
        alter table public.email_campaigns add column approval_status text not null default 'not_required';
    end if;
    if not exists (select 1 from information_schema.columns where table_name='email_campaigns' and column_name='approval_requested_at') then
        alter table public.email_campaigns add column approval_requested_at timestamptz;
    end if;
    if not exists (select 1 from information_schema.columns where table_name='email_campaigns' and column_name='rejected_by') then
        alter table public.email_campaigns add column rejected_by uuid references auth.users(id) on delete set null;
    end if;
    if not exists (select 1 from information_schema.columns where table_name='email_campaigns' and column_name='rejected_at') then
        alter table public.email_campaigns add column rejected_at timestamptz;
    end if;
    if not exists (select 1 from information_schema.columns where table_name='email_campaigns' and column_name='rejection_reason') then
        alter table public.email_campaigns add column rejection_reason text;
    end if;
    if not exists (select 1 from information_schema.columns where table_name='email_campaigns' and column_name='schedule_status') then
        alter table public.email_campaigns add column schedule_status text not null default 'not_scheduled';
    end if;
    if not exists (select 1 from information_schema.columns where table_name='email_campaigns' and column_name='schedule_created_by') then
        alter table public.email_campaigns add column schedule_created_by uuid references auth.users(id) on delete set null;
    end if;
    if not exists (select 1 from information_schema.columns where table_name='email_campaigns' and column_name='schedule_cancelled_by') then
        alter table public.email_campaigns add column schedule_cancelled_by uuid references auth.users(id) on delete set null;
    end if;
    if not exists (select 1 from information_schema.columns where table_name='email_campaigns' and column_name='schedule_cancelled_at') then
        alter table public.email_campaigns add column schedule_cancelled_at timestamptz;
    end if;
    if not exists (select 1 from information_schema.columns where table_name='email_campaigns' and column_name='last_scheduler_run_at') then
        alter table public.email_campaigns add column last_scheduler_run_at timestamptz;
    end if;
end $$;

-- 2. email_campaign_approval_events table
create table if not exists public.email_campaign_approval_events (
    id uuid primary key default gen_random_uuid(),
    campaign_id uuid not null references public.email_campaigns(id) on delete cascade,
    event_type text not null,
    actor_id uuid references auth.users(id) on delete set null,
    note text,
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
);

create index if not exists idx_email_approval_events_campaign on public.email_campaign_approval_events(campaign_id);
create index if not exists idx_email_approval_events_type on public.email_campaign_approval_events(event_type);
create index if not exists idx_email_approval_events_created on public.email_campaign_approval_events(created_at desc);

-- 3. email_cron_runs table
create table if not exists public.email_cron_runs (
    id uuid primary key default gen_random_uuid(),
    job_name text not null,
    status text not null default 'running',
    lock_token text not null,
    processed_count int not null default 0,
    queued_count int not null default 0,
    sent_count int not null default 0,
    failed_count int not null default 0,
    skipped_count int not null default 0,
    started_at timestamptz not null default now(),
    completed_at timestamptz,
    error_message text,
    metadata jsonb not null default '{}'::jsonb
);

create index if not exists idx_email_cron_runs_job on public.email_cron_runs(job_name);
create index if not exists idx_email_cron_runs_status on public.email_cron_runs(status);
create index if not exists idx_email_cron_runs_started on public.email_cron_runs(started_at desc);

-- 4. RLS
alter table public.email_campaign_approval_events enable row level security;
alter table public.email_cron_runs enable row level security;

create policy "email_approval_events_service_role_full_access"
    on public.email_campaign_approval_events for all using (true) with check (true);
create policy "email_cron_runs_service_role_full_access"
    on public.email_cron_runs for all using (true) with check (true);

commit;