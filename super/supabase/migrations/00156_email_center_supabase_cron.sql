-- Email Center: enable Supabase Cron + pg_net to call super-admin /api/cron/email-center.
-- Do NOT store CRON_SECRET in this migration.
-- Job + Vault-backed function: 00160_email_center_cron_job.sql
-- Setup: EMAIL_CENTER_SUPABASE_CRON_SETUP.md

begin;

create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron with schema extensions;

comment on extension pg_net is 'HTTP from Postgres (Supabase Email Center stage cron).';
comment on extension pg_cron is 'Scheduled jobs (Email Center every-minute trigger).';

commit;
