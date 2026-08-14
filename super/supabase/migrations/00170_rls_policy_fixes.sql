-- ============================================================
-- 00170: Fix RLS policies with always-true WITH CHECK
-- Security fix - part 4
-- ============================================================

begin;

-- college_leads INSERT policy
drop policy if exists "Authenticated can insert college leads" on public.college_leads;
create policy "college_leads_auth_insert" on public.college_leads for insert to authenticated with check (auth.uid() is not null);

-- Email tables - Replace service_role full access with proper select-only policies
drop policy if exists "email_approval_events_service_role_full_access" on public.email_campaign_approval_events;
create policy "email_approval_events_sr_select" on public.email_campaign_approval_events for select to service_role using (true);

drop policy if exists "email_campaign_recipients_service_role_full_access" on public.email_campaign_recipients;
create policy "email_campaign_recipients_sr_select" on public.email_campaign_recipients for select to service_role using (true);

drop policy if exists "email_campaign_send_runs_service_role_full_access" on public.email_campaign_send_runs;
create policy "email_campaign_send_runs_sr_select" on public.email_campaign_send_runs for select to service_role using (true);

drop policy if exists "email_campaign_tests_service_role_full_access" on public.email_campaign_tests;
create policy "email_campaign_tests_sr_select" on public.email_campaign_tests for select to service_role using (true);

drop policy if exists "email_campaigns_service_role_full_access" on public.email_campaigns;
create policy "email_campaigns_sr_select" on public.email_campaigns for select to service_role using (true);

drop policy if exists "email_click_links_service_role_full_access" on public.email_click_links;
create policy "email_click_links_sr_select" on public.email_click_links for select to service_role using (true);

drop policy if exists "email_cron_runs_service_role_full_access" on public.email_cron_runs;
create policy "email_cron_runs_sr_select" on public.email_cron_runs for select to service_role using (true);

drop policy if exists "email_events_service_role_full_access" on public.email_events;
create policy "email_events_sr_select" on public.email_events for select to service_role using (true);

drop policy if exists "email_open_tokens_service_role_full_access" on public.email_open_tokens;
create policy "email_open_tokens_sr_select" on public.email_open_tokens for select to service_role using (true);

drop policy if exists "email_outbox_service_role_full_access" on public.email_outbox;
create policy "email_outbox_sr_select" on public.email_outbox for select to service_role using (true);

drop policy if exists "email_preferences_service_role_full_access" on public.email_preferences;
create policy "email_preferences_sr_select" on public.email_preferences for select to service_role using (true);

drop policy if exists "email_suppressions_service_role_full_access" on public.email_suppressions;
create policy "email_suppressions_sr_select" on public.email_suppressions for select to service_role using (true);

drop policy if exists "email_templates_service_role_full_access" on public.email_templates;
create policy "email_templates_sr_select" on public.email_templates for select to service_role using (true);

drop policy if exists "email_unsubscribe_tokens_service_role_full_access" on public.email_unsubscribe_tokens;
create policy "email_unsubscribe_tokens_sr_select" on public.email_unsubscribe_tokens for select to service_role using (true);

commit;