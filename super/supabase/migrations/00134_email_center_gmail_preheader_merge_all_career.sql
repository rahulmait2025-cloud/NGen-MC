begin;

-- Gmail concise snippet: hidden preheader uses {{email_preheader_text}} (filled in app like career-readiness-program-launch).
update public.email_templates
set
  html_template = regexp_replace(
    html_template,
    '(<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:transparent;opacity:0;">)[^<]+(</div>)',
    '\1{{email_preheader_text}}\2',
    'g'
  ),
  updated_at = now()
where slug in (
  'career-readiness-program-launch',
  'student-onboarding-career-readiness-roadmap',
  'technical-foundations-reminder',
  'ai-agentic-ai-module-announcement',
  'project-completion-nudge',
  'resume-github-linkedin-reminder',
  'mock-interview-invite',
  'founder-mentorship-session-invite',
  'certificate-eligibility-notice',
  'program-deadline-alert',
  'advanced-addons-teaser'
)
and coalesce(html_template, '') not ilike '%>{{email_preheader_text}}</%';

-- Legacy hidden preheader blocks (older career templates).
update public.email_templates
set
  html_template = regexp_replace(
    html_template,
    '(<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;line-height:1px;font-size:1px;">\s*)[^<]+(\s*</div>)',
    '\1{{email_preheader_text}}\2',
    'g'
  ),
  updated_at = now()
where slug in (
  'student-onboarding-career-readiness-roadmap',
  'technical-foundations-reminder',
  'ai-agentic-ai-module-announcement',
  'project-completion-nudge',
  'resume-github-linkedin-reminder',
  'mock-interview-invite',
  'founder-mentorship-session-invite',
  'certificate-eligibility-notice',
  'program-deadline-alert',
  'advanced-addons-teaser'
)
and coalesce(html_template, '') ilike '%display:none;max-height:0;overflow:hidden;opacity:0%'
and coalesce(html_template, '') not ilike '%{{email_preheader_text}}%';

commit;
