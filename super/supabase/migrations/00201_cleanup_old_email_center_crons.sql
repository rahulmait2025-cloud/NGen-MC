-- Remove legacy global Email Center pg_cron jobs and disable invoke_email_center_cron HTTP polling.

begin;

-- ---------------------------------------------------------------------------
-- 1. Deprecate global invoker (no HTTP if a legacy cron still fires)
-- ---------------------------------------------------------------------------
create or replace function public.invoke_email_center_cron()
returns void
language plpgsql
security definer
set search_path = public, vault, net, extensions
as $$
begin
  raise notice '[email-center-cron] deprecated: global polling disabled; use invoke_email_campaign_cron(uuid) per campaign';
  return;
end;
$$;

comment on function public.invoke_email_center_cron() is
  'DEPRECATED no-op. Legacy global Email Center polling removed; use invoke_email_campaign_cron(uuid).';

-- ---------------------------------------------------------------------------
-- 2. Detect per-campaign job names: email_campaign_<32 hex chars>
-- ---------------------------------------------------------------------------
create or replace function public.is_per_campaign_email_cron_job(p_jobname text)
returns boolean
language sql
immutable
as $$
  select coalesce(p_jobname, '') ~ '^email_campaign_[0-9a-f]{32}$';
$$;

-- ---------------------------------------------------------------------------
-- 3. Cleanup legacy global pg_cron jobs (by name + command; keep per-campaign)
-- ---------------------------------------------------------------------------
create or replace function public.cleanup_legacy_email_center_pg_crons()
returns jsonb
language plpgsql
security definer
set search_path = public, cron, extensions
as $$
declare
  j record;
  v_removed jsonb := '[]'::jsonb;
  v_legacy_names text[] := array[
    'email-center-cron',
    'email-center-every-minute',
    'email_combined_processor',
    'email_campaign_processor',
    'email_outbox_processor',
    'email_scheduled_campaign_processor',
    'email_schedule_processor'
  ];
begin
  for j in
    select jobid, jobname, schedule, command
    from cron.job
    where
      public.is_per_campaign_email_cron_job(jobname) = false
      and (
        jobname = any (v_legacy_names)
        or jobname ilike 'email-center%'
        or jobname ilike 'email_combined%'
        or jobname ilike 'email_outbox%'
        or jobname ilike 'email_schedule%'
        or jobname ilike 'email_scheduled%'
        or command ilike '%invoke_email_center_cron%'
        or (
          command ilike '%/api/cron/email-center%'
          and command not ilike '%/api/cron/email-center/campaign%'
        )
        or command ilike '%process-scheduled%'
        or command ilike '%process-outbox%'
        or (
          command ilike '%email-center%'
          and command not ilike '%invoke_email_campaign_cron%'
          and command not ilike '%/api/cron/email-center/campaign%'
        )
      )
  loop
    perform cron.unschedule(j.jobid);
    v_removed := v_removed || jsonb_build_array(
      jsonb_build_object(
        'jobid', j.jobid,
        'jobname', j.jobname,
        'schedule', j.schedule,
        'command', left(j.command, 500)
      )
    );
  end loop;

  return jsonb_build_object(
    'ok', true,
    'removed_count', jsonb_array_length(v_removed),
    'removed', v_removed
  );
end;
$$;

revoke all on function public.cleanup_legacy_email_center_pg_crons() from public;
grant execute on function public.cleanup_legacy_email_center_pg_crons() to postgres, service_role;

-- ---------------------------------------------------------------------------
-- 4. List Email Center pg_cron jobs for Ops UI
-- ---------------------------------------------------------------------------
create or replace function public.list_email_center_pg_cron_jobs()
returns table (
  jobid bigint,
  jobname text,
  schedule text,
  command text,
  is_per_campaign boolean,
  is_legacy_global boolean
)
language sql
security definer
set search_path = public, cron, extensions
as $$
  select
    j.jobid,
    j.jobname,
    j.schedule,
    j.command,
    public.is_per_campaign_email_cron_job(j.jobname) as is_per_campaign,
    (
      public.is_per_campaign_email_cron_job(j.jobname) = false
      and (
        j.jobname in (
          'email-center-cron',
          'email-center-every-minute',
          'email_combined_processor',
          'email_campaign_processor',
          'email_outbox_processor',
          'email_scheduled_campaign_processor',
          'email_schedule_processor'
        )
        or j.jobname ilike 'email-center%'
        or j.jobname ilike 'email_combined%'
        or j.jobname ilike 'email_outbox%'
        or j.jobname ilike 'email_schedule%'
        or j.jobname ilike 'email_scheduled%'
        or j.command ilike '%invoke_email_center_cron%'
        or (
          j.command ilike '%/api/cron/email-center%'
          and j.command not ilike '%/api/cron/email-center/campaign%'
        )
        or j.command ilike '%process-scheduled%'
        or j.command ilike '%process-outbox%'
        or (
          j.command ilike '%email-center%'
          and j.command not ilike '%invoke_email_campaign_cron%'
          and j.command not ilike '%/api/cron/email-center/campaign%'
        )
      )
    ) as is_legacy_global
  from cron.job j
  where
    public.is_per_campaign_email_cron_job(j.jobname)
    or j.jobname ilike 'email%'
    or j.command ilike '%email-center%'
    or j.command ilike '%invoke_email_center_cron%'
    or j.command ilike '%invoke_email_campaign_cron%'
    or j.command ilike '%process-scheduled%'
    or j.command ilike '%process-outbox%'
  order by j.jobname;
$$;

revoke all on function public.list_email_center_pg_cron_jobs() from public;
grant execute on function public.list_email_center_pg_cron_jobs() to postgres, service_role;

-- ---------------------------------------------------------------------------
-- 5. Run cleanup now
-- ---------------------------------------------------------------------------
select public.cleanup_legacy_email_center_pg_crons();

commit;
