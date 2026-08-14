-- Email Center: pg_cron job `email-center-cron` → POST /api/cron/email-center via pg_net.
-- Secrets are NOT stored here. Configure Vault (preferred) per EMAIL_CENTER_SUPABASE_CRON_SETUP.md.

begin;

create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron with schema extensions;

-- ---------------------------------------------------------------------------
-- Invoker: reads Vault secrets at runtime (no literals in migration).
--   email_center_app_url      e.g. https://admin-nextgen-cto.vercel.app
--   email_center_cron_secret  same value as Vercel CRON_SECRET
-- ---------------------------------------------------------------------------
create or replace function public.invoke_email_center_cron()
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
  select decrypted_secret
  into v_cron_secret
  from vault.decrypted_secrets
  where name = 'email_center_cron_secret'
  limit 1;

  select decrypted_secret
  into v_app_url
  from vault.decrypted_secrets
  where name = 'email_center_app_url'
  limit 1;

  if coalesce(v_cron_secret, '') = '' then
    raise warning '[email-center-cron] vault secret email_center_cron_secret missing; skipping HTTP call';
    return;
  end if;

  if coalesce(v_app_url, '') = '' then
    raise warning '[email-center-cron] vault secret email_center_app_url missing; skipping HTTP call';
    return;
  end if;

  v_url := rtrim(v_app_url, '/') || '/api/cron/email-center';

  select net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', v_cron_secret
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  )
  into v_request_id;

  raise notice '[email-center-cron] net.http_post request_id=% url=%', v_request_id, v_url;
exception
  when others then
    raise warning '[email-center-cron] net.http_post failed: %', sqlerrm;
end;
$$;

comment on function public.invoke_email_center_cron() is
  'POST super-admin /api/cron/email-center using Vault secrets email_center_app_url and email_center_cron_secret.';

revoke all on function public.invoke_email_center_cron() from public;
grant execute on function public.invoke_email_center_cron() to postgres, service_role;

-- Remove legacy / duplicate job names before scheduling.
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

-- Production default: every 5 minutes. For 1-minute testing, see setup doc.
select cron.schedule(
  'email-center-cron',
  '*/5 * * * *',
  $$select public.invoke_email_center_cron();$$
);

commit;
