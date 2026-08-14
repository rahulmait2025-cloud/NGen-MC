-- LMS transactional email: pg_cron job `lms-transactional-email-cron` → POST /api/cron/lms-transactional-email.
-- Does NOT modify email-center-cron. Configure Vault per LMS_TRANSACTIONAL_EMAIL_CRON_SETUP.md.

begin;

create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron with schema extensions;

-- ---------------------------------------------------------------------------
-- Invoker: Vault secrets at runtime (no literals in migration).
--   lms_transactional_app_url      e.g. https://your-lms-domain.vercel.app
--   lms_transactional_cron_secret  same value as LMS Vercel CRON_SECRET
-- ---------------------------------------------------------------------------
create or replace function public.invoke_lms_transactional_email_cron()
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
  where name = 'lms_transactional_cron_secret'
  limit 1;

  select decrypted_secret
  into v_app_url
  from vault.decrypted_secrets
  where name = 'lms_transactional_app_url'
  limit 1;

  if coalesce(v_cron_secret, '') = '' then
    raise warning '[lms-transactional-email-cron] vault secret lms_transactional_cron_secret missing; skipping HTTP call';
    return;
  end if;

  if coalesce(v_app_url, '') = '' then
    raise warning '[lms-transactional-email-cron] vault secret lms_transactional_app_url missing; skipping HTTP call';
    return;
  end if;

  v_url := rtrim(v_app_url, '/') || '/api/cron/lms-transactional-email';

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

  raise notice '[lms-transactional-email-cron] net.http_post request_id=% url=%', v_request_id, v_url;
exception
  when others then
    raise warning '[lms-transactional-email-cron] net.http_post failed: %', sqlerrm;
end;
$$;

comment on function public.invoke_lms_transactional_email_cron() is
  'POST LMS /api/cron/lms-transactional-email using Vault secrets lms_transactional_app_url and lms_transactional_cron_secret.';

revoke all on function public.invoke_lms_transactional_email_cron() from public;
grant execute on function public.invoke_lms_transactional_email_cron() to postgres, service_role;
revoke execute on function public.invoke_lms_transactional_email_cron() from anon;
revoke execute on function public.invoke_lms_transactional_email_cron() from authenticated;

-- Schedule LMS job only (do not touch email-center-cron).
do $$
declare
  j record;
begin
  for j in
    select jobid
    from cron.job
    where jobname = 'lms-transactional-email-cron'
  loop
    perform cron.unschedule(j.jobid);
  end loop;
end;
$$;

select cron.schedule(
  'lms-transactional-email-cron',
  '*/5 * * * *',
  $$select public.invoke_lms_transactional_email_cron();$$
);

commit;
