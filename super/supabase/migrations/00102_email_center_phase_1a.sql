-- Email Center Phase 1A - Foundation for SuperAdmin campaign emails
-- Migration: 00102_email_center_phase_1a.sql
-- Created: For Phase 1A MVP (draft/template/test-send foundation only)

begin;

-- 1. email_templates table
create table if not exists public.email_templates (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    slug text not null unique,
    category text not null,
    description text,
    subject_template text not null,
    preview_text_template text,
    html_template text not null,
    text_template text not null,
    variables jsonb not null default '[]'::jsonb,
    is_system boolean not null default false,
    is_active boolean not null default true,
    created_by uuid references auth.users(id) on delete set null,
    updated_by uuid references auth.users(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- 2. email_campaigns table
create table if not exists public.email_campaigns (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    campaign_type text not null,
    status text not null default 'draft',
    template_id uuid references email_templates(id) on delete set null,
    subject text not null,
    preview_text text,
    html_body text not null,
    text_body text not null,
    audience_config jsonb not null default '{}'::jsonb,
    test_last_sent_to text,
    test_last_sent_at timestamptz,
    created_by uuid references auth.users(id) on delete set null,
    updated_by uuid references auth.users(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- 3. email_campaign_tests table
create table if not exists public.email_campaign_tests (
    id uuid primary key default gen_random_uuid(),
    campaign_id uuid not null references email_campaigns(id) on delete cascade,
    sent_to text not null,
    provider text,
    message_id text,
    status text not null default 'sent',
    error_message text,
    created_by uuid references auth.users(id) on delete set null,
    created_at timestamptz not null default now()
);

-- 4. email_suppressions table
create table if not exists public.email_suppressions (
    id uuid primary key default gen_random_uuid(),
    email text not null unique,
    reason text not null,
    source text,
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_email_templates_category on public.email_templates(category);
create index if not exists idx_email_templates_is_active on public.email_templates(is_active);
create index if not exists idx_email_templates_slug on public.email_templates(slug);
create index if not exists idx_email_campaigns_status on public.email_campaigns(status);
create index if not exists idx_email_campaigns_campaign_type on public.email_campaigns(campaign_type);
create index if not exists idx_email_campaigns_created_at on public.email_campaigns(created_at desc);
create index if not exists idx_email_campaigns_template_id on public.email_campaigns(template_id);
create index if not exists idx_email_campaign_tests_campaign_id on public.email_campaign_tests(campaign_id);
create index if not exists idx_email_campaign_tests_created_at on public.email_campaign_tests(created_at desc);
create index if not exists idx_email_suppressions_email on public.email_suppressions(email);
create index if not exists idx_email_suppressions_reason on public.email_suppressions(reason);

-- RLS
alter table public.email_templates enable row level security;
alter table public.email_campaigns enable row level security;
alter table public.email_campaign_tests enable row level security;
alter table public.email_suppressions enable row level security;

create policy "email_templates_service_role_full_access" on public.email_templates for all using (true) with check (true);
create policy "email_campaigns_service_role_full_access" on public.email_campaigns for all using (true) with check (true);
create policy "email_campaign_tests_service_role_full_access" on public.email_campaign_tests for all using (true) with check (true);
create policy "email_suppressions_service_role_full_access" on public.email_suppressions for all using (true) with check (true);

commit;
