-- Email Center: per-campaign pg_cron (replaces global */5 email-center-cron polling).
-- One pg_cron job per scheduled campaign; self-unschedules when the worker runs.

begin;

create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron with schema extensions;

-- ---------------------------------------------------------------------------
-- 1. Campaign-level cron tracking
-- ---------------------------------------------------------------------------
alter table public.email_campaigns
  add column if not exists cron_job_name text,
  add column if not exists cron_scheduled_at timestamptz;

create unique index if not exists uq_email_campaigns_cron_job_name
  on public.email_campaigns (cron_job_name)
  where cron_job_name is not null;

-- ---------------------------------------------------------------------------
-- 2. Helpers
-- ---------------------------------------------------------------------------
create or replace function public.email_campaign_cron_job_name(p_campaign_id uuid)
returns text
language sql
immutable
as $$
  select 'email_campaign_' || replace(p_campaign_id::text, '-', '');
$$;

create or replace function public.email_campaign_cron_expression(p_at timestamptz)
returns text
language sql
immutable
as $$
  select format(
    '%s %s %s %s *',
    extract(minute from (p_at at time zone 'UTC'))::int,
    extract(hour from (p_at at time zone 'UTC'))::int,
    extract(day from (p_at at time zone 'UTC'))::int,
    extract(month from (p_at at time zone 'UTC'))::int
  );
$$;

-- ---------------------------------------------------------------------------
-- 3. HTTP invoker (single campaign)
-- ---------------------------------------------------------------------------
create or replace function public.invoke_email_campaign_cron(p_campaign_id uuid)
returns void
language plpgsql
security definer
set search_path = public, vault, net, extensions
as $$
declare
  v_app_url text;
  v_cron_secret text;
  v_url text;
  v_request_id bigint;
begin
  select decrypted_secret into v_cron_secret
  from vault.decrypted_secrets
  where name = 'email_center_cron_secret'
  limit 1;

  select decrypted_secret into v_app_url
  from vault.decrypted_secrets
  where name = 'email_center_app_url'
  limit 1;

  if coalesce(v_cron_secret, '') = '' then
    raise warning '[email-campaign-cron] vault secret email_center_cron_secret missing; skipping HTTP call';
    return;
  end if;

  if coalesce(v_app_url, '') = '' then
    raise warning '[email-campaign-cron] vault secret email_center_app_url missing; skipping HTTP call';
    return;
  end if;

  v_url := rtrim(v_app_url, '/') || '/api/cron/email-center/campaign';

  select net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_cron_secret,
      'x-cron-secret', v_cron_secret
    ),
    body := jsonb_build_object('campaignId', p_campaign_id::text),
    timeout_milliseconds := 120000
  )
  into v_request_id;

  raise notice '[email-campaign-cron] net.http_post request_id=% campaign=% url=%', v_request_id, p_campaign_id, v_url;
exception
  when others then
    raise warning '[email-campaign-cron] net.http_post failed for %: %', p_campaign_id, sqlerrm;
end;
$$;

comment on function public.invoke_email_campaign_cron(uuid) is
  'POST super-admin /api/cron/email-center/campaign for one campaignId.';

revoke all on function public.invoke_email_campaign_cron(uuid) from public;
grant execute on function public.invoke_email_campaign_cron(uuid) to postgres, service_role;

-- ---------------------------------------------------------------------------
-- 4. Unschedule + clear campaign cron fields
-- ---------------------------------------------------------------------------
create or replace function public.unschedule_email_campaign_cron(p_campaign_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, cron, extensions
as $$
declare
  v_job_name text;
  v_existing text;
begin
  select cron_job_name into v_existing
  from public.email_campaigns
  where id = p_campaign_id;

  v_job_name := coalesce(v_existing, public.email_campaign_cron_job_name(p_campaign_id));

  if exists (select 1 from cron.job where jobname = v_job_name) then
    perform cron.unschedule(v_job_name);
  end if;

  update public.email_campaigns
  set cron_job_name = null,
      cron_scheduled_at = null
  where id = p_campaign_id;

  return jsonb_build_object('ok', true, 'job_name', v_job_name);
end;
$$;

revoke all on function public.unschedule_email_campaign_cron(uuid) from public;
grant execute on function public.unschedule_email_campaign_cron(uuid) to postgres, service_role;

-- ---------------------------------------------------------------------------
-- 5. Schedule campaign cron at scheduled_at (UTC one-shot expression)
-- ---------------------------------------------------------------------------
create or replace function public.schedule_email_campaign_cron(
  p_campaign_id uuid,
  p_fire_at timestamptz default null,
  p_force boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public, cron, extensions
as $$
declare
  v_campaign record;
  v_fire_at timestamptz;
  v_job_name text;
  v_expr text;
begin
  select id, schedule_status, scheduled_at, cron_job_name, status
  into v_campaign
  from public.email_campaigns
  where id = p_campaign_id;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'campaign_not_found');
  end if;

  if v_campaign.status in ('cancelled', 'sent') then
    perform public.unschedule_email_campaign_cron(p_campaign_id);
    return jsonb_build_object('ok', true, 'scheduled', false, 'reason', 'terminal_status');
  end if;

  if not p_force and v_campaign.schedule_status is distinct from 'scheduled' then
    perform public.unschedule_email_campaign_cron(p_campaign_id);
    return jsonb_build_object('ok', true, 'scheduled', false, 'reason', 'not_scheduled');
  end if;

  v_fire_at := coalesce(p_fire_at, v_campaign.scheduled_at);
  if v_fire_at is null then
    return jsonb_build_object('ok', false, 'error', 'missing_scheduled_at');
  end if;

  v_job_name := public.email_campaign_cron_job_name(p_campaign_id);

  perform public.unschedule_email_campaign_cron(p_campaign_id);

  if v_fire_at <= (now() + interval '30 seconds') then
    return jsonb_build_object(
      'ok', true,
      'scheduled', false,
      'immediate', true,
      'job_name', v_job_name,
      'fire_at', v_fire_at
    );
  end if;

  v_expr := public.email_campaign_cron_expression(v_fire_at);

  perform cron.schedule(
    v_job_name,
    v_expr,
    format('select public.invoke_email_campaign_cron(%L::uuid)', p_campaign_id)
  );

  update public.email_campaigns
  set cron_job_name = v_job_name,
      cron_scheduled_at = v_fire_at
  where id = p_campaign_id;

  return jsonb_build_object(
    'ok', true,
    'scheduled', true,
    'immediate', false,
    'job_name', v_job_name,
    'cron_expression', v_expr,
    'fire_at', v_fire_at
  );
end;
$$;

revoke all on function public.schedule_email_campaign_cron(uuid, timestamptz, boolean) from public;
grant execute on function public.schedule_email_campaign_cron(uuid, timestamptz, boolean) to postgres, service_role;

-- ---------------------------------------------------------------------------
-- 6. Campaign-scoped outbox claim (batch send for one campaign)
-- ---------------------------------------------------------------------------
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
  update public.email_outbox
  set
    status = 'processing',
    locked_at = now(),
    locked_by = p_lock_token,
    attempts = attempts + 1,
    updated_at = now()
  where id in (
    select id
    from public.email_outbox
    where campaign_id = p_campaign_id
      and status in ('queued', 'failed')
      and next_attempt_at <= now()
      and attempts < max_attempts
      and (locked_at is null or locked_at < now() - interval '10 minutes')
    order by created_at asc
    limit p_limit
    for update skip locked
  )
  returning *;
end;
$$;

revoke all on function public.claim_email_outbox_batch_for_campaign(uuid, int, text) from public;
grant execute on function public.claim_email_outbox_batch_for_campaign(uuid, int, text) to postgres, service_role;

-- ---------------------------------------------------------------------------
-- 7. Remove global email-center polling cron (keep other cron jobs intact)
-- ---------------------------------------------------------------------------
do $$
declare
  j record;
begin
  for j in
    select jobid
    from cron.job
    where jobname in ('email-center-cron', 'email-center-every-minute')
  loop
    perform cron.unschedule(j.jobid);
  end loop;
end;
$$;

-- Backfill per-campaign crons for already-scheduled future campaigns.
do $$
declare
  c record;
  v_result jsonb;
begin
  for c in
    select id, scheduled_at
    from public.email_campaigns
    where schedule_status = 'scheduled'
      and scheduled_at is not null
      and scheduled_at > (now() + interval '30 seconds')
  loop
    v_result := public.schedule_email_campaign_cron(c.id, c.scheduled_at);
    raise notice '[email-campaign-cron] backfill campaign=% result=%', c.id, v_result;
  end loop;
end;
$$;

commit;
