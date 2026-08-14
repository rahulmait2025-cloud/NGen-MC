-- founder-mentorship-session-invite: optional Session Notes block when Super Admin provides description.

BEGIN;

UPDATE public.email_templates
SET
  html_template = replace(
    html_template,
    '</table><p style="margin:0 0 12px 0;font-size:15px;line-height:1.7;color:#334155;">Come with a learner mindset.</p>',
    '</table>{{session_description_html_block}}<p style="margin:0 0 12px 0;font-size:15px;line-height:1.7;color:#334155;">Come with a learner mindset.</p>'
  ),
  text_template = replace(
    text_template,
    'Zoom Link: {{zoom_meeting_url}}

Come with a learner mindset.',
    'Zoom Link: {{zoom_meeting_url}}{{session_description_text_block}}

Come with a learner mindset.'
  ),
  variables = COALESCE(variables, '[]'::jsonb) || '[
    {"key":"session_description","label":"Session description (plain)","required":false,"sample":"Bring your resume draft.","inputType":"text","source":"campaign"},
    {"key":"has_session_description","label":"Has session description","required":false,"sample":"true","inputType":"text","source":"campaign"},
    {"key":"session_description_html_block","label":"Session description HTML block","required":false,"inputType":"text","source":"campaign","helpText":"Pre-rendered at send time; empty when no description."},
    {"key":"session_description_text_block","label":"Session description plain-text block","required":false,"inputType":"text","source":"campaign","helpText":"Pre-rendered at send time; empty when no description."}
  ]'::jsonb,
  updated_at = now()
WHERE slug = 'founder-mentorship-session-invite'
  AND html_template NOT LIKE '%{{session_description_html_block}}%';

COMMIT;
