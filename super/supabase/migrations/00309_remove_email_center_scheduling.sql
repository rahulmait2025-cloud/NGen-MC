-- Remove Email Center scheduling: cron jobs, scheduling columns, cron functions, email_cron_runs.
-- Instant send only via superadmin Send Now action.

begin;

-- ---------------------------------------------------------------------------
-- 7.1 Unschedule Email Center pg_cron jobs
-- ---------------------------------------------------------------------------
do $$
declare
  r record;
begin
  if not exists (select 1 from pg_extension where extname = 'pg_cron') then
    raise notice 'pg_cron not installed; skipping job cleanup';
    return;
  end if;

  for r in
    select jobid, jobname
    from cron.job
    where
      jobname ilike 'email-center%'
      or jobname ilike 'email_campaign_%'
      or jobname ilike 'email_combined%'
      or jobname ilike 'email_outbox%'
      or jobname ilike 'email_schedule%'
      or jobname ilike 'email_scheduled%'
      or command ilike '%email-center%'
      or command ilike '%invoke_email_campaign_cron%'
      or command ilike '%invoke_email_center_cron%'
  loop
    begin
      perform cron.unschedule(r.jobid);
      raise notice 'Unscheduled email center cron job: % (%)', r.jobname, r.jobid;
    exception when others then
      raise notice 'Failed to unschedule %: %', r.jobname, sqlerrm;
    end;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 7.2 Safely handle existing scheduled campaigns (do not auto-send)
-- ---------------------------------------------------------------------------

-- Cancel unsent outbox rows for campaigns that were scheduled but never started sending
update public.email_outbox o
set
  status = 'cancelled',
  last_error = coalesce(o.last_error, 'Cancelled: email scheduling removed; admin must Send Now manually'),
  updated_at = now()
from public.email_campaigns c
where o.campaign_id = c.id
  and o.status in ('queued', 'pending', 'retry', 'processing')
  and c.status in ('draft', 'test_sent', 'ready')
  and (
    c.schedule_status = 'scheduled'
    or c.scheduled_at is not null
  );

-- Revert never-started scheduled campaigns to draft
update public.email_campaigns
set
  status = 'draft',
  schedule_status = 'not_scheduled',
  scheduled_at = null,
  schedule_timezone = null,
  schedule_created_by = null,
  schedule_cancelled_by = null,
  schedule_cancelled_at = null,
  last_scheduler_run_at = null,
  cron_job_name = null,
  cron_scheduled_at = null,
  queued_count = 0,
  queued_at = null
where status in ('draft', 'test_sent', 'ready')
  and (
    schedule_status in ('scheduled', 'queued', 'due')
    or (scheduled_at is not null and status <> 'sending')
  );

-- Clear cron metadata on campaigns already in sending (preserve outbox for Continue Sending)
update public.email_campaigns
set
  schedule_status = 'not_scheduled',
  scheduled_at = null,
  schedule_timezone = null,
  schedule_created_by = null,
  schedule_cancelled_by = null,
  schedule_cancelled_at = null,
  last_scheduler_run_at = null,
  cron_job_name = null,
  cron_scheduled_at = null
where status = 'sending';

-- ---------------------------------------------------------------------------
-- 7.3 Drop scheduling / cron functions
-- ---------------------------------------------------------------------------
drop function if exists public.invoke_email_center_cron();
drop function if exists public.invoke_email_campaign_cron(uuid);
drop function if exists public.schedule_email_campaign_cron(uuid, timestamptz, boolean);
drop function if exists public.unschedule_email_campaign_cron(uuid);
drop function if exists public.email_campaign_cron_job_name(uuid);
drop function if exists public.email_campaign_cron_expression(timestamptz);
drop function if exists public.is_per_campaign_email_cron_job(text);
drop function if exists public.cleanup_legacy_email_center_pg_crons();
drop function if exists public.list_email_center_pg_cron_jobs();

-- ---------------------------------------------------------------------------
-- 7.4 Drop email_cron_runs table
-- ---------------------------------------------------------------------------
drop policy if exists "email_cron_runs_superadmin_select" on public.email_cron_runs;
drop policy if exists "email_cron_runs_service_role_full_access" on public.email_cron_runs;
drop policy if exists "email_cron_runs_sr_select" on public.email_cron_runs;

drop table if exists public.email_cron_runs;

-- ---------------------------------------------------------------------------
-- Restore claim RPCs without schedule gates (immediate send only)
-- ---------------------------------------------------------------------------
create or replace function public.claim_email_outbox_batch(
  p_limit int,
  p_lock_token text
)
returns setof public.email_outbox
language plpgsql
set search_path = public
as $$
begin
  return query
  update public.email_outbox o
  set
    status = 'processing',
    locked_at = now(),
    locked_by = p_lock_token,
    attempts = attempts + 1,
    updated_at = now()
  where o.id in (
    select o2.id
    from public.email_outbox o2
    left join public.email_campaigns c on c.id = o2.campaign_id
    where (
      o2.status in ('queued', 'pending', 'retry', 'failed')
      or (
        o2.status = 'processing'
        and o2.locked_at is not null
        and o2.locked_at < now() - interval '10 minutes'
      )
    )
      and o2.attempts < o2.max_attempts
      and (o2.locked_at is null or o2.locked_at < now() - interval '10 minutes')
      and (o2.next_attempt_at is null or o2.next_attempt_at <= now())
      and (
        o2.campaign_id is null
        or c.id is null
        or c.status = 'sending'
      )
    order by o2.created_at asc
    limit p_limit
    for update of o2 skip locked
  )
  returning o.*;
end;
$$;

create or replace function public.claim_email_outbox_batch_for_campaign(
  p_campaign_id uuid,
  p_limit int,
  p_lock_token text
)
returns setof public.email_outbox
language plpgsql
set search_path = public
as $$
begin
  return query
  update public.email_outbox o
  set
    status = 'processing',
    locked_at = now(),
    locked_by = p_lock_token,
    attempts = attempts + 1,
    updated_at = now()
  where o.id in (
    select o2.id
    from public.email_outbox o2
    inner join public.email_campaigns c on c.id = o2.campaign_id
    where o2.campaign_id = p_campaign_id
      and c.status = 'sending'
      and (
        o2.status in ('queued', 'pending', 'retry', 'failed')
        or (
          o2.status = 'processing'
          and o2.locked_at is not null
          and o2.locked_at < now() - interval '10 minutes'
        )
      )
      and o2.attempts < o2.max_attempts
      and (o2.locked_at is null or o2.locked_at < now() - interval '10 minutes')
      and (o2.next_attempt_at is null or o2.next_attempt_at <= now())
    order by o2.created_at asc
    limit p_limit
    for update of o2 skip locked
  )
  returning o.*;
end;
$$;

-- ---------------------------------------------------------------------------
-- 7.5 Drop scheduling columns from email_campaigns
-- ---------------------------------------------------------------------------
drop index if exists public.uq_email_campaigns_cron_job_name;
drop index if exists public.idx_email_campaigns_scheduled_at;
drop index if exists public.idx_email_campaigns_schedule_status_hot;
drop index if exists public.idx_email_campaigns_due_scheduler;
drop index if exists public.idx_email_campaigns_status_schedule_status;

alter table if exists public.email_campaigns
  drop column if exists scheduled_at,
  drop column if exists schedule_timezone,
  drop column if exists schedule_status,
  drop column if exists schedule_created_by,
  drop column if exists schedule_cancelled_by,
  drop column if exists schedule_cancelled_at,
  drop column if exists last_scheduler_run_at,
  drop column if exists cron_job_name,
  drop column if exists cron_scheduled_at;

-- ---------------------------------------------------------------------------
-- 7.6 Remove Email Center-only Vault secrets when present
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_extension where extname = 'supabase_vault') then
    delete from vault.secrets
    where name in ('email_center_app_url', 'email_center_cron_secret');
  end if;
exception
  when undefined_table then
    raise notice 'vault.secrets not available; skipping vault cleanup';
  when insufficient_privilege then
    raise notice 'insufficient privilege for vault cleanup; remove email_center_* secrets manually if needed';
end $$;

commit;
