-- Gate outbox claims until campaign scheduled_at is due (per-campaign cron only).

begin;

create or replace function public.get_db_now()
returns timestamptz
language sql
stable
as $$
  select now();
$$;

revoke all on function public.get_db_now() from public;
grant execute on function public.get_db_now() to postgres, service_role;

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
        or c.scheduled_at is null
        or c.scheduled_at <= now()
        or c.schedule_status is distinct from 'scheduled'
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
      and (
        c.status = 'sending'
        or c.scheduled_at is null
        or c.scheduled_at <= now()
        or c.schedule_status is distinct from 'scheduled'
      )
    order by o2.created_at asc
    limit p_limit
    for update of o2 skip locked
  )
  returning o.*;
end;
$$;

-- Only treat campaigns as due-now when fire_at is at or before now (not within 30s window).
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

  if v_fire_at <= now() then
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

commit;
