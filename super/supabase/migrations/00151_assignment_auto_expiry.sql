-- 00151: Assignment Auto-Expiry
--
-- Automatically expire content_assignments and revoke
-- student_entitlements when end_date passes.
--
-- A pg_cron job calls expire_assignments() daily at midnight.

-- ──────────────────────────────────────────────────────────────────
-- 1. Function: expire_assignments()
-- ──────────────────────────────────────────────────────────────────
create or replace function public.expire_assignments()
returns table (assignments_expired int, entitlements_revoked int)
language plpgsql security definer
as $$
declare
  a_count int;
  e_count int;
begin
  with expired as (
    update public.content_assignments
    set status = 'expired',
        updated_at = now()
    where status = 'active'
      and end_date is not null
      and end_date < now()
    returning id
  )
  select count(*) into a_count from expired;

  with revoked_ents as (
    update public.student_entitlements se
    set status = 'expired',
        revoked_at = now(),
        revoke_reason = 'assignment_expired'
    from expired
    where se.metadata->>'assignment_id' = expired.id::text
      and se.status = 'active'
    returning 1
  )
  select count(*) into e_count from revoked_ents;

  return query select a_count, e_count;
end;
$$;

-- ──────────────────────────────────────────────────────────────────
-- 2. Schedule via existing pg_cron (daily at midnight)
-- ──────────────────────────────────────────────────────────────────
select cron.schedule(
  'expire-content-assignments',
  '0 0 * * *',
  $$select public.expire_assignments();$$
);

