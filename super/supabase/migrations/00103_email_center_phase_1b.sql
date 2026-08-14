-- Email Center Phase 1B - Audience, Queue, Batch Sending
-- Migration: 00103_email_center_phase_1b.sql

begin;

-- 1. email_campaign_recipients table
create table if not exists public.email_campaign_recipients (
    id uuid primary key default gen_random_uuid(),
    campaign_id uuid not null references email_campaigns(id) on delete cascade,
    recipient_type text not null,
    source_table text,
    source_id uuid,
    auth_user_id uuid,
    college_id uuid,
    college_name text,
    email text not null,
    full_name text,
    first_name text,
    variables jsonb not null default '{}'::jsonb,
    status text not null default 'snapshotted',
    suppression_reason text,
    created_at timestamptz not null default now()
);

create index if not exists idx_email_campaign_recipients_campaign on public.email_campaign_recipients(campaign_id);
create index if not exists idx_email_campaign_recipients_email on public.email_campaign_recipients(lower(email));
create index if not exists idx_email_campaign_recipients_status on public.email_campaign_recipients(status);
create index if not exists idx_email_campaign_recipients_college on public.email_campaign_recipients(college_id);
create index if not exists idx_email_campaign_recipients_type on public.email_campaign_recipients(recipient_type);

create unique index if not exists idx_email_campaign_recipients_unique_email
    on public.email_campaign_recipients(lower(email), campaign_id);

-- 2. email_outbox table
create table if not exists public.email_outbox (
    id uuid primary key default gen_random_uuid(),
    campaign_id uuid not null references email_campaigns(id) on delete cascade,
    recipient_id uuid not null references email_campaign_recipients(id) on delete cascade,
    to_email text not null,
    subject text not null,
    preview_text text,
    html_body text not null,
    text_body text not null,
    category text not null,
    status text not null default 'queued',
    provider text,
    provider_message_id text,
    idempotency_key text not null unique,
    attempts int not null default 0,
    max_attempts int not null default 3,
    next_attempt_at timestamptz not null default now(),
    locked_at timestamptz,
    locked_by text,
    last_error text,
    sent_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_email_outbox_campaign on public.email_outbox(campaign_id);
create index if not exists idx_email_outbox_recipient on public.email_outbox(recipient_id);
create index if not exists idx_email_outbox_status on public.email_outbox(status);
create index if not exists idx_email_outbox_next_attempt on public.email_outbox(next_attempt_at);
create index if not exists idx_email_outbox_locked on public.email_outbox(locked_at);
create index if not exists idx_email_outbox_idempotency on public.email_outbox(idempotency_key);

-- 3. email_campaign_send_runs table
create table if not exists public.email_campaign_send_runs (
    id uuid primary key default gen_random_uuid(),
    campaign_id uuid not null references email_campaigns(id) on delete cascade,
    status text not null default 'running',
    lock_token text not null,
    queued_count int not null default 0,
    sent_count int not null default 0,
    failed_count int not null default 0,
    skipped_count int not null default 0,
    started_by uuid,
    started_at timestamptz not null default now(),
    completed_at timestamptz,
    error_message text
);

create index if not exists idx_email_send_runs_campaign on public.email_campaign_send_runs(campaign_id);
create index if not exists idx_email_send_runs_status on public.email_campaign_send_runs(status);
create index if not exists idx_email_send_runs_started on public.email_campaign_send_runs(started_at desc);

-- 4. Update email_campaigns with counters
do $$
begin
    if not exists (select 1 from information_schema.columns where table_name='email_campaigns' and column_name='recipient_count') then
        alter table public.email_campaigns add column recipient_count int not null default 0;
    end if;
    if not exists (select 1 from information_schema.columns where table_name='email_campaigns' and column_name='queued_count') then
        alter table public.email_campaigns add column queued_count int not null default 0;
    end if;
    if not exists (select 1 from information_schema.columns where table_name='email_campaigns' and column_name='sent_count') then
        alter table public.email_campaigns add column sent_count int not null default 0;
    end if;
    if not exists (select 1 from information_schema.columns where table_name='email_campaigns' and column_name='failed_count') then
        alter table public.email_campaigns add column failed_count int not null default 0;
    end if;
    if not exists (select 1 from information_schema.columns where table_name='email_campaigns' and column_name='skipped_count') then
        alter table public.email_campaigns add column skipped_count int not null default 0;
    end if;
    if not exists (select 1 from information_schema.columns where table_name='email_campaigns' and column_name='queued_at') then
        alter table public.email_campaigns add column queued_at timestamptz;
    end if;
    if not exists (select 1 from information_schema.columns where table_name='email_campaigns' and column_name='sent_at') then
        alter table public.email_campaigns add column sent_at timestamptz;
    end if;
    if not exists (select 1 from information_schema.columns where table_name='email_campaigns' and column_name='cancelled_at') then
        alter table public.email_campaigns add column cancelled_at timestamptz;
    end if;
end $$;

-- 5. updated_at triggers for new tables
drop trigger if exists trg_email_outbox_updated_at on public.email_outbox;
create trigger trg_email_outbox_updated_at
    before update on public.email_outbox
    for each row execute function public.set_updated_at();

-- 6. RLS
alter table public.email_campaign_recipients enable row level security;
alter table public.email_outbox enable row level security;
alter table public.email_campaign_send_runs enable row level security;

create policy "email_campaign_recipients_service_role_full_access"
    on public.email_campaign_recipients for all using (true) with check (true);
create policy "email_outbox_service_role_full_access"
    on public.email_outbox for all using (true) with check (true);
create policy "email_campaign_send_runs_service_role_full_access"
    on public.email_campaign_send_runs for all using (true) with check (true);

-- 7. Helper RPC for safe outbox claiming
create or replace function public.claim_email_outbox_batch(
    p_limit int,
    p_lock_token text
)
returns setof public.email_outbox
language plpgsql
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
        where status in ('queued', 'failed')
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

-- 8. Helper RPC to update campaign send counts safely
create or replace function public.update_campaign_send_counts(
    p_campaign_id uuid,
    p_sent int default 0,
    p_failed int default 0,
    p_skipped int default 0
)
returns void
language plpgsql
as $$
begin
    update public.email_campaigns
    set
        sent_count = sent_count + p_sent,
        failed_count = failed_count + p_failed,
        skipped_count = skipped_count + p_skipped,
        updated_at = now()
    where id = p_campaign_id;
end;
$$;

commit;