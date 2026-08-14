-- Email Center: add template variable values to campaigns
-- Migration: 00115_email_center_campaign_template_variables.sql

begin;

alter table public.email_campaigns
add column if not exists template_variable_values jsonb not null default '{}'::jsonb;

commit;
