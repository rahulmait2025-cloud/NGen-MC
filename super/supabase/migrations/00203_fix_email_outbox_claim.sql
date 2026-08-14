-- Fix email_outbox claim: honor null next_attempt_at, pending/retry statuses, reclaim stale processing locks.

begin;

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
    where (
      status in ('queued', 'pending', 'retry', 'failed')
      or (
        status = 'processing'
        and locked_at is not null
        and locked_at < now() - interval '10 minutes'
      )
    )
      and attempts < max_attempts
      and (locked_at is null or locked_at < now() - interval '10 minutes')
      and (next_attempt_at is null or next_attempt_at <= now())
    order by created_at asc
    limit p_limit
    for update skip locked
  )
  returning *;
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
      and (
        status in ('queued', 'pending', 'retry', 'failed')
        or (
          status = 'processing'
          and locked_at is not null
          and locked_at < now() - interval '10 minutes'
        )
      )
      and attempts < max_attempts
      and (locked_at is null or locked_at < now() - interval '10 minutes')
      and (next_attempt_at is null or next_attempt_at <= now())
    order by created_at asc
    limit p_limit
    for update skip locked
  )
  returning *;
end;
$$;

drop index if exists public.idx_email_outbox_claim_batch;
create index if not exists idx_email_outbox_claim_batch
  on public.email_outbox (status, next_attempt_at, attempts, created_at)
  where status in ('queued', 'pending', 'retry', 'failed', 'processing');

commit;
