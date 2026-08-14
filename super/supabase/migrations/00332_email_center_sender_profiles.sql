-- Email Center: persist sender snapshot on outbox rows for Custom Email sender dropdown.
-- Queue-time From / Reply-To must survive retries even if campaign defaults change later.
-- DO NOT run automatically from agent workflows — apply manually when ready.

begin;

alter table public.email_outbox
  add column if not exists sender_profile_id text;

alter table public.email_outbox
  add column if not exists from_name text;

alter table public.email_outbox
  add column if not exists from_email text;

alter table public.email_outbox
  add column if not exists reply_to text;

comment on column public.email_outbox.sender_profile_id is
  'Approved sender profile id (hello|support|anuj) frozen at queue time.';

comment on column public.email_outbox.from_name is
  'Frozen From display name resolved from sender profile at queue time.';

comment on column public.email_outbox.from_email is
  'Frozen From email resolved from sender profile at queue time.';

comment on column public.email_outbox.reply_to is
  'Frozen Reply-To resolved from sender profile at queue time.';

commit;
