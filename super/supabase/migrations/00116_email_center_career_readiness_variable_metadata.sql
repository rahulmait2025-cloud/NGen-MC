-- Email Center: normalize career readiness template variables
-- Migration: 00116_email_center_career_readiness_variable_metadata.sql

begin;

update public.email_templates
set
  variables = '[
    {"key":"first_name","label":"First name","required":false,"sample":"Anuj","inputType":"text","source":"recipient"},
    {"key":"college_name","label":"College name","required":false,"sample":"Demo College","inputType":"text","source":"recipient"},
    {"key":"program_name","label":"Program name","required":true,"sample":"NextGen CTO Career Readiness Program","inputType":"text","source":"campaign"},
    {"key":"cta_url","label":"CTA URL","required":true,"sample":"https://example.com/start","inputType":"url","source":"campaign"},
    {"key":"cta_label","label":"CTA label","required":true,"sample":"Explore the program","inputType":"text","source":"campaign"},
    {"key":"support_url","label":"Support URL","required":false,"sample":"https://example.com/support","inputType":"url","source":"system"},
    {"key":"unsubscribe_url","label":"Unsubscribe URL","required":false,"sample":"https://example.com/unsubscribe","inputType":"url","source":"system"}
  ]'::jsonb,
  is_system = true,
  is_active = true,
  updated_at = now()
where slug = 'career-readiness-program-launch';

update public.email_templates
set
  variables = '[
    {"key":"first_name","label":"First name","required":false,"sample":"Anuj","inputType":"text","source":"recipient"},
    {"key":"college_name","label":"College name","required":false,"sample":"Demo College","inputType":"text","source":"recipient"},
    {"key":"program_name","label":"Program name","required":true,"sample":"NextGen CTO Career Readiness Program","inputType":"text","source":"campaign"},
    {"key":"cta_url","label":"CTA URL","required":true,"sample":"https://example.com/roadmap","inputType":"url","source":"campaign"},
    {"key":"cta_label","label":"CTA label","required":true,"sample":"View your roadmap","inputType":"text","source":"campaign"},
    {"key":"dashboard_url","label":"Dashboard URL","required":false,"sample":"https://example.com/dashboard","inputType":"url","source":"system"},
    {"key":"support_url","label":"Support URL","required":false,"sample":"https://example.com/support","inputType":"url","source":"system"},
    {"key":"unsubscribe_url","label":"Unsubscribe URL","required":false,"sample":"https://example.com/unsubscribe","inputType":"url","source":"system"}
  ]'::jsonb,
  is_system = true,
  is_active = true,
  updated_at = now()
where slug = 'student-onboarding-career-readiness-roadmap';

update public.email_templates
set
  variables = '[
    {"key":"first_name","label":"First name","required":false,"sample":"Anuj","inputType":"text","source":"recipient"},
    {"key":"college_name","label":"College name","required":false,"sample":"Demo College","inputType":"text","source":"recipient"},
    {"key":"program_name","label":"Program name","required":true,"sample":"NextGen CTO Career Readiness Program","inputType":"text","source":"campaign"},
    {"key":"module_name","label":"Module name","required":true,"sample":"Technical Foundations","inputType":"text","source":"campaign"},
    {"key":"cta_url","label":"CTA URL","required":true,"sample":"https://example.com/module","inputType":"url","source":"campaign"},
    {"key":"cta_label","label":"CTA label","required":true,"sample":"Continue module","inputType":"text","source":"campaign"},
    {"key":"dashboard_url","label":"Dashboard URL","required":false,"sample":"https://example.com/dashboard","inputType":"url","source":"system"},
    {"key":"support_url","label":"Support URL","required":false,"sample":"https://example.com/support","inputType":"url","source":"system"},
    {"key":"unsubscribe_url","label":"Unsubscribe URL","required":false,"sample":"https://example.com/unsubscribe","inputType":"url","source":"system"}
  ]'::jsonb,
  is_system = true,
  is_active = true,
  updated_at = now()
where slug = 'technical-foundations-reminder';

update public.email_templates
set
  variables = '[
    {"key":"first_name","label":"First name","required":false,"sample":"Anuj","inputType":"text","source":"recipient"},
    {"key":"college_name","label":"College name","required":false,"sample":"Demo College","inputType":"text","source":"recipient"},
    {"key":"program_name","label":"Program name","required":true,"sample":"NextGen CTO Career Readiness Program","inputType":"text","source":"campaign"},
    {"key":"module_name","label":"Module name","required":true,"sample":"AI & Modern Development","inputType":"text","source":"campaign"},
    {"key":"cta_url","label":"CTA URL","required":true,"sample":"https://example.com/ai-module","inputType":"url","source":"campaign"},
    {"key":"cta_label","label":"CTA label","required":true,"sample":"Start the AI Module","inputType":"text","source":"campaign"},
    {"key":"dashboard_url","label":"Dashboard URL","required":false,"sample":"https://example.com/dashboard","inputType":"url","source":"system"},
    {"key":"support_url","label":"Support URL","required":false,"sample":"https://example.com/support","inputType":"url","source":"system"},
    {"key":"unsubscribe_url","label":"Unsubscribe URL","required":false,"sample":"https://example.com/unsubscribe","inputType":"url","source":"system"}
  ]'::jsonb,
  is_system = true,
  is_active = true,
  updated_at = now()
where slug = 'ai-agentic-ai-module-announcement';

update public.email_templates
set
  variables = '[
    {"key":"first_name","label":"First name","required":false,"sample":"Anuj","inputType":"text","source":"recipient"},
    {"key":"college_name","label":"College name","required":false,"sample":"Demo College","inputType":"text","source":"recipient"},
    {"key":"program_name","label":"Program name","required":true,"sample":"NextGen CTO Career Readiness Program","inputType":"text","source":"campaign"},
    {"key":"project_name","label":"Project name","required":true,"sample":"Portfolio Website","inputType":"text","source":"campaign"},
    {"key":"cta_url","label":"CTA URL","required":true,"sample":"https://example.com/project","inputType":"url","source":"campaign"},
    {"key":"cta_label","label":"CTA label","required":true,"sample":"Complete Your Project","inputType":"text","source":"campaign"},
    {"key":"dashboard_url","label":"Dashboard URL","required":false,"sample":"https://example.com/dashboard","inputType":"url","source":"system"},
    {"key":"support_url","label":"Support URL","required":false,"sample":"https://example.com/support","inputType":"url","source":"system"},
    {"key":"unsubscribe_url","label":"Unsubscribe URL","required":false,"sample":"https://example.com/unsubscribe","inputType":"url","source":"system"}
  ]'::jsonb,
  is_system = true,
  is_active = true,
  updated_at = now()
where slug = 'project-completion-nudge';

update public.email_templates
set
  variables = '[
    {"key":"first_name","label":"First name","required":false,"sample":"Anuj","inputType":"text","source":"recipient"},
    {"key":"college_name","label":"College name","required":false,"sample":"Demo College","inputType":"text","source":"recipient"},
    {"key":"program_name","label":"Program name","required":true,"sample":"NextGen CTO Career Readiness Program","inputType":"text","source":"campaign"},
    {"key":"cta_url","label":"CTA URL","required":true,"sample":"https://example.com/profile","inputType":"url","source":"campaign"},
    {"key":"cta_label","label":"CTA label","required":true,"sample":"Complete Your Profiles","inputType":"text","source":"campaign"},
    {"key":"dashboard_url","label":"Dashboard URL","required":false,"sample":"https://example.com/dashboard","inputType":"url","source":"system"},
    {"key":"support_url","label":"Support URL","required":false,"sample":"https://example.com/support","inputType":"url","source":"system"},
    {"key":"unsubscribe_url","label":"Unsubscribe URL","required":false,"sample":"https://example.com/unsubscribe","inputType":"url","source":"system"}
  ]'::jsonb,
  is_system = true,
  is_active = true,
  updated_at = now()
where slug = 'resume-github-linkedin-reminder';

update public.email_templates
set
  variables = '[
    {"key":"first_name","label":"First name","required":false,"sample":"Anuj","inputType":"text","source":"recipient"},
    {"key":"college_name","label":"College name","required":false,"sample":"Demo College","inputType":"text","source":"recipient"},
    {"key":"program_name","label":"Program name","required":true,"sample":"NextGen CTO Career Readiness Program","inputType":"text","source":"campaign"},
    {"key":"mentor_name","label":"Mentor name","required":false,"sample":"Anuj Kumar","inputType":"text","source":"campaign"},
    {"key":"session_date","label":"Session date","required":true,"sample":"2025-05-15","inputType":"date","source":"campaign"},
    {"key":"session_time","label":"Session time","required":true,"sample":"16:00","inputType":"time","source":"campaign"},
    {"key":"cta_url","label":"CTA URL","required":true,"sample":"https://example.com/mock-interview","inputType":"url","source":"campaign"},
    {"key":"cta_label","label":"CTA label","required":true,"sample":"Reserve your spot","inputType":"text","source":"campaign"},
    {"key":"support_url","label":"Support URL","required":false,"sample":"https://example.com/support","inputType":"url","source":"system"},
    {"key":"unsubscribe_url","label":"Unsubscribe URL","required":false,"sample":"https://example.com/unsubscribe","inputType":"url","source":"system"}
  ]'::jsonb,
  is_system = true,
  is_active = true,
  updated_at = now()
where slug = 'mock-interview-invite';

update public.email_templates
set
  variables = '[
    {"key":"first_name","label":"First name","required":false,"sample":"Anuj","inputType":"text","source":"recipient"},
    {"key":"college_name","label":"College name","required":false,"sample":"Demo College","inputType":"text","source":"recipient"},
    {"key":"program_name","label":"Program name","required":true,"sample":"NextGen CTO Career Readiness Program","inputType":"text","source":"campaign"},
    {"key":"mentor_name","label":"Mentor name","required":false,"sample":"Anuj Kumar","inputType":"text","source":"campaign"},
    {"key":"session_date","label":"Session date","required":true,"sample":"2025-05-20","inputType":"date","source":"campaign"},
    {"key":"session_time","label":"Session time","required":true,"sample":"17:00","inputType":"time","source":"campaign"},
    {"key":"cta_url","label":"CTA URL","required":true,"sample":"https://example.com/founder-session","inputType":"url","source":"campaign"},
    {"key":"cta_label","label":"CTA label","required":true,"sample":"Join the session","inputType":"text","source":"campaign"},
    {"key":"support_url","label":"Support URL","required":false,"sample":"https://example.com/support","inputType":"url","source":"system"},
    {"key":"unsubscribe_url","label":"Unsubscribe URL","required":false,"sample":"https://example.com/unsubscribe","inputType":"url","source":"system"}
  ]'::jsonb,
  is_system = true,
  is_active = true,
  updated_at = now()
where slug = 'founder-mentorship-session-invite';

update public.email_templates
set
  variables = '[
    {"key":"first_name","label":"First name","required":false,"sample":"Anuj","inputType":"text","source":"recipient"},
    {"key":"college_name","label":"College name","required":false,"sample":"Demo College","inputType":"text","source":"recipient"},
    {"key":"program_name","label":"Program name","required":true,"sample":"NextGen CTO Career Readiness Program","inputType":"text","source":"campaign"},
    {"key":"progress_percent","label":"Progress percent","required":false,"sample":"80","inputType":"number","source":"campaign"},
    {"key":"certificate_url","label":"Certificate URL","required":false,"sample":"https://example.com/certificate","inputType":"url","source":"campaign"},
    {"key":"cta_url","label":"CTA URL","required":true,"sample":"https://example.com/eligibility","inputType":"url","source":"campaign"},
    {"key":"cta_label","label":"CTA label","required":true,"sample":"View eligibility","inputType":"text","source":"campaign"},
    {"key":"dashboard_url","label":"Dashboard URL","required":false,"sample":"https://example.com/dashboard","inputType":"url","source":"system"},
    {"key":"support_url","label":"Support URL","required":false,"sample":"https://example.com/support","inputType":"url","source":"system"},
    {"key":"unsubscribe_url","label":"Unsubscribe URL","required":false,"sample":"https://example.com/unsubscribe","inputType":"url","source":"system"}
  ]'::jsonb,
  is_system = true,
  is_active = true,
  updated_at = now()
where slug = 'certificate-eligibility-notice';

update public.email_templates
set
  variables = '[
    {"key":"full_name","label":"Full name","required":false,"sample":"Anuj Kumar","inputType":"text","source":"recipient"},
    {"key":"college_name","label":"College name","required":false,"sample":"Demo College","inputType":"text","source":"recipient"},
    {"key":"program_name","label":"Program name","required":true,"sample":"NextGen CTO Career Readiness Program","inputType":"text","source":"campaign"},
    {"key":"progress_percent","label":"Progress percent","required":false,"sample":"68","inputType":"number","source":"campaign"},
    {"key":"cta_url","label":"CTA URL","required":true,"sample":"https://example.com/admin-progress","inputType":"url","source":"campaign"},
    {"key":"cta_label","label":"CTA label","required":true,"sample":"View full report","inputType":"text","source":"campaign"},
    {"key":"dashboard_url","label":"Dashboard URL","required":false,"sample":"https://example.com/dashboard","inputType":"url","source":"system"},
    {"key":"support_url","label":"Support URL","required":false,"sample":"https://example.com/support","inputType":"url","source":"system"}
  ]'::jsonb,
  is_system = true,
  is_active = true,
  updated_at = now()
where slug = 'college-admin-progress-report';

update public.email_templates
set
  variables = '[
    {"key":"first_name","label":"First name","required":false,"sample":"Anuj","inputType":"text","source":"recipient"},
    {"key":"college_name","label":"College name","required":false,"sample":"Demo College","inputType":"text","source":"recipient"},
    {"key":"program_name","label":"Program name","required":true,"sample":"NextGen CTO Career Readiness Program","inputType":"text","source":"campaign"},
    {"key":"deadline_date","label":"Deadline date","required":true,"sample":"2025-06-01","inputType":"date","source":"campaign"},
    {"key":"cta_url","label":"CTA URL","required":true,"sample":"https://example.com/deadline","inputType":"url","source":"campaign"},
    {"key":"cta_label","label":"CTA label","required":true,"sample":"Complete now","inputType":"text","source":"campaign"},
    {"key":"dashboard_url","label":"Dashboard URL","required":false,"sample":"https://example.com/dashboard","inputType":"url","source":"system"},
    {"key":"support_url","label":"Support URL","required":false,"sample":"https://example.com/support","inputType":"url","source":"system"},
    {"key":"unsubscribe_url","label":"Unsubscribe URL","required":false,"sample":"https://example.com/unsubscribe","inputType":"url","source":"system"}
  ]'::jsonb,
  is_system = true,
  is_active = true,
  updated_at = now()
where slug = 'program-deadline-alert';

update public.email_templates
set
  variables = '[
    {"key":"first_name","label":"First name","required":false,"sample":"Anuj","inputType":"text","source":"recipient"},
    {"key":"college_name","label":"College name","required":false,"sample":"Demo College","inputType":"text","source":"recipient"},
    {"key":"program_name","label":"Program name","required":true,"sample":"NextGen CTO Career Readiness Program","inputType":"text","source":"campaign"},
    {"key":"cta_url","label":"CTA URL","required":true,"sample":"https://example.com/addons","inputType":"url","source":"campaign"},
    {"key":"cta_label","label":"CTA label","required":true,"sample":"Explore add-ons","inputType":"text","source":"campaign"},
    {"key":"dashboard_url","label":"Dashboard URL","required":false,"sample":"https://example.com/dashboard","inputType":"url","source":"system"},
    {"key":"support_url","label":"Support URL","required":false,"sample":"https://example.com/support","inputType":"url","source":"system"},
    {"key":"unsubscribe_url","label":"Unsubscribe URL","required":false,"sample":"https://example.com/unsubscribe","inputType":"url","source":"system"}
  ]'::jsonb,
  is_system = true,
  is_active = true,
  updated_at = now()
where slug = 'advanced-addons-teaser';

commit;
