-- Email Center: ensure first_name / full_name template variable metadata stays recipient-sourced.
-- Idempotent: only adjusts variables JSONB on career readiness templates; does not change HTML/body.

update public.email_templates t
set variables = sub.fixed
from (
  select
    et.id,
    coalesce(
      jsonb_agg(
        case
          when elem->>'key' in ('first_name', 'full_name')
            and coalesce(elem->>'source', '') in ('', 'campaign', 'system')
          then jsonb_set(
            jsonb_set(elem, '{source}', '"recipient"'::jsonb, true),
            '{required}',
            'false'::jsonb,
            true
          )
          when elem->>'key' = 'first_name'
          then jsonb_set(
            jsonb_set(
              jsonb_set(
                coalesce(elem, '{}'::jsonb),
                '{source}',
                '"recipient"'::jsonb,
                true
              ),
              '{required}',
              'false'::jsonb,
              true
            ),
            '{sample}',
            coalesce(elem->'sample', '"Student"'::jsonb),
            true
          )
          else elem
        end
        order by ord
      ),
      et.variables
    ) as fixed
  from public.email_templates et
  cross join lateral jsonb_array_elements(
    case
      when jsonb_typeof(et.variables) = 'array' then et.variables
      else '[]'::jsonb
    end
  ) with ordinality as arr(elem, ord)
  where et.slug in (
    'career-readiness-program-launch',
    'student-onboarding-career-readiness-roadmap',
    'technical-foundations-reminder',
    'ai-agentic-ai-module-announcement',
    'project-completion-nudge',
    'resume-github-linkedin-reminder',
    'mock-interview-invite',
    'founder-mentorship-session-invite',
    'certificate-eligibility-notice',
    'college-admin-progress-report',
    'program-deadline-alert',
    'advanced-addons-teaser'
  )
  group by et.id, et.variables
) sub
where t.id = sub.id
  and t.variables is distinct from sub.fixed;
