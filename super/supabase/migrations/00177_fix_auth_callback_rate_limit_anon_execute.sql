-- ============================================================
-- 00177: Fix OAuth callback rate limiter after anon revoke
-- ============================================================
-- Problem:
-- OAuth callback calls rate_limit_consume() before exchangeCodeForSession(),
-- so the request is still role=anon.
--
-- If anon cannot execute rate_limit_consume(), your app-level
-- failClosed rate limiter can return:
-- { ok:false, error:"Too many auth requests" }
--
-- Fix:
-- 1. Harden rate_limit_consume()
-- 2. Keep direct table access blocked
-- 3. Allow anon to execute ONLY this safe limiter RPC
-- ============================================================

begin;

-- Keep the rate_limits table private.
revoke all on table public.rate_limits from public;
revoke all on table public.rate_limits from anon;
revoke all on table public.rate_limits from authenticated;

-- Replace with hardened atomic upsert version.
create or replace function public.rate_limit_consume(
  p_key text,
  p_window_ms integer
)
returns table (
  new_count integer,
  out_window_start timestamptz,
  out_window_ms integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := now();
  v_key text;
  v_window_ms integer;
begin
  v_key := nullif(btrim(p_key), '');

  if v_key is null then
    raise exception 'rate-limit key required' using errcode = '22023';
  end if;

  -- Prevent abuse via huge/random keys or extreme windows.
  v_key := substring(v_key from 1 for 300);
  v_window_ms := greatest(1000, least(coalesce(p_window_ms, 60000), 86400000));

  insert into public.rate_limits as rl (
    key,
    count,
    window_start,
    window_ms
  )
  values (
    v_key,
    1,
    v_now,
    v_window_ms
  )
  on conflict (key) do update
  set
    count = case
      when rl.window_start + (rl.window_ms || ' milliseconds')::interval <= v_now
        then 1
      else rl.count + 1
    end,
    window_start = case
      when rl.window_start + (rl.window_ms || ' milliseconds')::interval <= v_now
        then v_now
      else rl.window_start
    end,
    window_ms = v_window_ms
  returning
    rl.count,
    rl.window_start,
    rl.window_ms
  into
    new_count,
    out_window_start,
    out_window_ms;

  return next;
end;
$$;

comment on function public.rate_limit_consume(text, integer) is
  'Distributed rate limiter RPC. Safe for anon because direct table access remains revoked and inputs are bounded. Needed before OAuth session exchange.';

-- OAuth callback is pre-session, so anon must be allowed to execute this RPC.
-- Do NOT grant anon direct table access.
revoke execute on function public.rate_limit_consume(text, integer) from public;

grant execute on function public.rate_limit_consume(text, integer) to anon;
grant execute on function public.rate_limit_consume(text, integer) to authenticated;
grant execute on function public.rate_limit_consume(text, integer) to service_role;

-- Clear existing callback counters so testing starts clean.
delete from public.rate_limits
where key like 'auth_callback:%'
   or key like 'auth-callback:%';

commit;