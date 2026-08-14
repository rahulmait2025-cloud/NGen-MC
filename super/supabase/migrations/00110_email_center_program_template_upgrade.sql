-- Email Center Program Template Upgrade
-- Migration: 00110_email_center_program_template_upgrade.sql
-- Upserts 12 system templates for the NextGen CTO Career Readiness Program

begin;

-- 1. career-readiness-program-launch
insert into public.email_templates (name, slug, category, description, subject_template, preview_text_template, html_template, text_template, variables, is_system, is_active)
values (
    'Career Readiness Program Launch',
    'career-readiness-program-launch',
    'marketing',
    'Launch announcement for the NextGen CTO Career Readiness Program.',
    'Your Career Readiness Journey Starts Here',
    'Join the NextGen CTO Career Readiness Program and begin your college-aligned career readiness journey.',
    $$<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background-color:#F9FAFB;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;line-height:1px;font-size:1px;">
    Join the NextGen CTO Career Readiness Program and begin your college-aligned career readiness journey.
  </div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F9FAFB;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:600px;max-width:600px;">
          <tr>
            <td style="padding:0 16px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#111827;border-radius:12px 12px 0 0;">
                <tr>
                  <td style="padding:20px 24px;font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;color:#F9FAFB;">
                    NextGen CTO
                  </td>
                  <td style="padding:20px 24px;text-align:right;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#E5E7EB;">
                    {{college_name}}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 16px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#FFFFFF;border:1px solid #E5E7EB;border-top:0;border-radius:0 0 12px 12px;">
                <tr>
                  <td style="padding:32px 28px;font-family:Arial,Helvetica,sans-serif;color:#111827;">
                    <p style="margin:0 0 10px 0;font-size:12px;letter-spacing:0.5px;text-transform:uppercase;color:#F97316;font-weight:700;">Career Readiness Program</p>
                    <h1 style="margin:0 0 12px 0;font-size:26px;line-height:1.2;">{{program_name}}</h1>
                    <p style="margin:0 0 18px 0;font-size:15px;line-height:1.6;color:#374151;">Hi {{first_name}}, welcome to a structured career readiness program built to strengthen technical foundations, deliver real project outcomes, and make you interview-ready with mentorship and AI-powered development exposure.</p>

                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px 0;">
                      <tr>
                        <td align="left" bgcolor="#F97316" style="border-radius:8px;">
                          <a href="{{cta_url}}" style="display:inline-block;padding:12px 24px;font-size:14px;font-family:Arial,Helvetica,sans-serif;color:#FFFFFF;text-decoration:none;font-weight:700;">{{cta_label}}</a>
                        </td>
                      </tr>
                    </table>

                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F9FAFB;border:1px solid #E5E7EB;border-radius:10px;">
                      <tr>
                        <td style="padding:14px 16px;font-size:14px;color:#111827;font-weight:700;">Program pillars</td>
                      </tr>
                      <tr>
                        <td style="padding:0 16px 16px 16px;font-size:14px;color:#374151;line-height:1.6;">
                          Technical foundations, AI and modern development exposure, hands-on projects, career readiness, communication and behavioral skills, and mentorship and community support.
                        </td>
                      </tr>
                    </table>

                    <p style="margin:18px 0 0 0;font-size:13px;line-height:1.5;color:#6B7280;">Need help getting started? Visit {{support_url}} for guidance and support.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 16px 32px 16px;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#9CA3AF;">
              You are receiving this because you are part of the {{program_name}} journey.<br>
              <a href="{{unsubscribe_url}}" style="color:#6B7280;text-decoration:underline;">Unsubscribe</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>$$,
    $$Hi {{first_name}},

Welcome to {{program_name}}. This college-aligned career readiness journey helps you build strong technical foundations, complete real-world projects, and become interview-ready with mentorship and AI-powered development exposure.

Get started: {{cta_url}}

Program pillars:
- Technical foundations
- AI and modern development exposure
- Hands-on projects
- Career readiness
- Communication and behavioral skills
- Mentorship and community support

Need help? Visit {{support_url}}

Unsubscribe: {{unsubscribe_url}}$$,
    '[
      {"key":"first_name","label":"Student first name","required":false,"sample":"Anuj"},
      {"key":"college_name","label":"College name","required":false,"sample":"Demo College"},
      {"key":"program_name","label":"Program name","required":true,"sample":"NextGen CTO Career Readiness Program"},
      {"key":"cta_url","label":"CTA URL","required":true,"sample":"https://example.com/start"},
      {"key":"cta_label","label":"CTA label","required":true,"sample":"Explore the program"},
      {"key":"support_url","label":"Support URL","required":false,"sample":"https://example.com/support"},
      {"key":"unsubscribe_url","label":"Unsubscribe URL","required":false,"sample":"https://example.com/unsubscribe"}
    ]'::jsonb,
    true,
    true
)
on conflict (slug) do update set
    name = excluded.name,
    category = excluded.category,
    description = excluded.description,
    subject_template = excluded.subject_template,
    preview_text_template = excluded.preview_text_template,
    html_template = excluded.html_template,
    text_template = excluded.text_template,
    variables = excluded.variables,
    is_system = true,
    is_active = true,
    updated_at = now();

-- 2. student-onboarding-career-readiness-roadmap
insert into public.email_templates (name, slug, category, description, subject_template, preview_text_template, html_template, text_template, variables, is_system, is_active)
values (
    'Student Onboarding: Career Readiness Roadmap',
    'student-onboarding-career-readiness-roadmap',
    'announcement',
    'Onboarding roadmap for students in the career readiness journey.',
    'Welcome to your career readiness roadmap',
    'Start with technical foundations, then move to AI, projects, and profile readiness.',
    $$<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background-color:#F9FAFB;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;line-height:1px;font-size:1px;">
    Start with technical foundations, then move to AI, projects, and profile readiness.
  </div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F9FAFB;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:600px;max-width:600px;">
          <tr>
            <td style="padding:0 16px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#111827;border-radius:12px 12px 0 0;">
                <tr>
                  <td style="padding:20px 24px;font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;color:#F9FAFB;">NextGen CTO</td>
                  <td style="padding:20px 24px;text-align:right;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#E5E7EB;">{{college_name}}</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 16px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#FFFFFF;border:1px solid #E5E7EB;border-top:0;border-radius:0 0 12px 12px;">
                <tr>
                  <td style="padding:32px 28px;font-family:Arial,Helvetica,sans-serif;color:#111827;">
                    <p style="margin:0 0 10px 0;font-size:12px;letter-spacing:0.5px;text-transform:uppercase;color:#F97316;font-weight:700;">Your roadmap</p>
                    <h1 style="margin:0 0 12px 0;font-size:24px;line-height:1.2;">Welcome to {{program_name}}</h1>
                    <p style="margin:0 0 18px 0;font-size:15px;line-height:1.6;color:#374151;">Hi {{first_name}}, here is the recommended order to stay on track in your foundation-to-career readiness journey.</p>

                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px 0;">
                      <tr>
                        <td align="left" bgcolor="#F97316" style="border-radius:8px;">
                          <a href="{{cta_url}}" style="display:inline-block;padding:12px 24px;font-size:14px;font-family:Arial,Helvetica,sans-serif;color:#FFFFFF;text-decoration:none;font-weight:700;">{{cta_label}}</a>
                        </td>
                      </tr>
                    </table>

                    <ol style="margin:0;padding-left:18px;color:#374151;font-size:14px;line-height:1.7;">
                      <li>Technical foundations: programming basics, DSA thinking, web fundamentals, and APIs.</li>
                      <li>AI and modern development: AI-assisted coding, prompt engineering, and hands-on AI projects.</li>
                      <li>Projects: portfolio website and a real-world application with GitHub collaboration.</li>
                      <li>Career readiness: resume, GitHub, LinkedIn, and interview preparation.</li>
                    </ol>

                    <p style="margin:18px 0 0 0;font-size:13px;color:#6B7280;">Need help? Visit {{support_url}} for guidance and mentoring support.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 16px 32px 16px;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#9CA3AF;">
              <a href="{{dashboard_url}}" style="color:#6B7280;text-decoration:underline;">Open dashboard</a> &nbsp;|&nbsp;
              <a href="{{unsubscribe_url}}" style="color:#6B7280;text-decoration:underline;">Unsubscribe</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>$$,
    $$Hi {{first_name}},

Welcome to {{program_name}}. Follow this roadmap to stay on track:
1) Technical foundations
2) AI and modern development
3) Projects
4) Career readiness

Continue here: {{cta_url}}
Need help? {{support_url}}

Dashboard: {{dashboard_url}}
Unsubscribe: {{unsubscribe_url}}$$,
    '[
      {"key":"first_name","label":"Student first name","required":false,"sample":"Anuj"},
      {"key":"college_name","label":"College name","required":false,"sample":"Demo College"},
      {"key":"program_name","label":"Program name","required":true,"sample":"NextGen CTO Career Readiness Program"},
      {"key":"cta_url","label":"CTA URL","required":true,"sample":"https://example.com/roadmap"},
      {"key":"cta_label","label":"CTA label","required":true,"sample":"View your roadmap"},
      {"key":"dashboard_url","label":"Dashboard URL","required":false,"sample":"https://example.com/dashboard"},
      {"key":"support_url","label":"Support URL","required":false,"sample":"https://example.com/support"},
      {"key":"unsubscribe_url","label":"Unsubscribe URL","required":false,"sample":"https://example.com/unsubscribe"}
    ]'::jsonb,
    true,
    true
)
on conflict (slug) do update set
    name = excluded.name,
    category = excluded.category,
    description = excluded.description,
    subject_template = excluded.subject_template,
    preview_text_template = excluded.preview_text_template,
    html_template = excluded.html_template,
    text_template = excluded.text_template,
    variables = excluded.variables,
    is_system = true,
    is_active = true,
    updated_at = now();

-- 3. technical-foundations-reminder
insert into public.email_templates (name, slug, category, description, subject_template, preview_text_template, html_template, text_template, variables, is_system, is_active)
values (
    'Technical Foundations Reminder',
    'technical-foundations-reminder',
    'notification',
    'Reminder to complete technical foundation modules.',
    'Technical foundations: your next milestone',
    'Complete the programming and DSA foundations to stay on track in your career readiness journey.',
    $$<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background-color:#F9FAFB;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;line-height:1px;font-size:1px;">
    Complete the programming and DSA foundations to stay on track in your career readiness journey.
  </div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F9FAFB;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:600px;max-width:600px;">
          <tr>
            <td style="padding:0 16px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#111827;border-radius:12px 12px 0 0;">
                <tr>
                  <td style="padding:20px 24px;font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;color:#F9FAFB;">NextGen CTO</td>
                  <td style="padding:20px 24px;text-align:right;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#E5E7EB;">{{college_name}}</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 16px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#FFFFFF;border:1px solid #E5E7EB;border-top:0;border-radius:0 0 12px 12px;">
                <tr>
                  <td style="padding:32px 28px;font-family:Arial,Helvetica,sans-serif;color:#111827;">
                    <p style="margin:0 0 10px 0;font-size:12px;letter-spacing:0.5px;text-transform:uppercase;color:#F97316;font-weight:700;">Academic reminder</p>
                    <h1 style="margin:0 0 12px 0;font-size:24px;line-height:1.2;">{{module_name}} is waiting</h1>
                    <p style="margin:0 0 18px 0;font-size:15px;line-height:1.6;color:#374151;">Hi {{first_name}}, completing your technical foundations helps you build strong programming basics (Java or Python), DSA thinking, web fundamentals, and API/database skills.</p>

                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px 0;">
                      <tr>
                        <td align="left" bgcolor="#F97316" style="border-radius:8px;">
                          <a href="{{cta_url}}" style="display:inline-block;padding:12px 24px;font-size:14px;font-family:Arial,Helvetica,sans-serif;color:#FFFFFF;text-decoration:none;font-weight:700;">{{cta_label}}</a>
                        </td>
                      </tr>
                    </table>

                    <ul style="margin:0;padding-left:18px;font-size:14px;color:#374151;line-height:1.6;">
                      <li>Programming basics with Java or Python</li>
                      <li>Problem-solving and DSA thinking</li>
                      <li>Web development fundamentals</li>
                      <li>Backend, APIs, and databases</li>
                      <li>Git and GitHub collaboration</li>
                    </ul>

                    <p style="margin:18px 0 0 0;font-size:13px;color:#6B7280;">Need support? {{support_url}}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 16px 32px 16px;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#9CA3AF;">
              <a href="{{dashboard_url}}" style="color:#6B7280;text-decoration:underline;">Open dashboard</a> &nbsp;|&nbsp;
              <a href="{{unsubscribe_url}}" style="color:#6B7280;text-decoration:underline;">Unsubscribe</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>$$,
    $$Hi {{first_name}},

{{module_name}} is ready. Completing technical foundations helps you build programming basics, DSA thinking, web fundamentals, API/database skills, and Git collaboration.

Continue: {{cta_url}}
Support: {{support_url}}

Dashboard: {{dashboard_url}}
Unsubscribe: {{unsubscribe_url}}$$,
    '[
      {"key":"first_name","label":"Student first name","required":false,"sample":"Anuj"},
      {"key":"college_name","label":"College name","required":false,"sample":"Demo College"},
      {"key":"program_name","label":"Program name","required":false,"sample":"NextGen CTO Career Readiness Program"},
      {"key":"module_name","label":"Module name","required":true,"sample":"Technical Foundations"},
      {"key":"cta_url","label":"CTA URL","required":true,"sample":"https://example.com/module"},
      {"key":"cta_label","label":"CTA label","required":true,"sample":"Continue module"},
      {"key":"dashboard_url","label":"Dashboard URL","required":false,"sample":"https://example.com/dashboard"},
      {"key":"support_url","label":"Support URL","required":false,"sample":"https://example.com/support"},
      {"key":"unsubscribe_url","label":"Unsubscribe URL","required":false,"sample":"https://example.com/unsubscribe"}
    ]'::jsonb,
    true,
    true
)
on conflict (slug) do update set
    name = excluded.name,
    category = excluded.category,
    description = excluded.description,
    subject_template = excluded.subject_template,
    preview_text_template = excluded.preview_text_template,
    html_template = excluded.html_template,
    text_template = excluded.text_template,
    variables = excluded.variables,
    is_system = true,
    is_active = true,
    updated_at = now();

-- 4. ai-agentic-ai-module-announcement
insert into public.email_templates (name, slug, category, description, subject_template, preview_text_template, html_template, text_template, variables, is_system, is_active)
values (
    'AI and Agentic AI Module Announcement',
    'ai-agentic-ai-module-announcement',
    'announcement',
    'Introduce AI-assisted coding and modern AI concepts.',
    'AI and modern development module is open',
    'Explore AI-assisted coding, prompt engineering, and agentic AI fundamentals.',
    $$<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background-color:#F9FAFB;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;line-height:1px;font-size:1px;">
    Explore AI-assisted coding, prompt engineering, and agentic AI fundamentals.
  </div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F9FAFB;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:600px;max-width:600px;">
          <tr>
            <td style="padding:0 16px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#111827;border-radius:12px 12px 0 0;">
                <tr>
                  <td style="padding:20px 24px;font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;color:#F9FAFB;">NextGen CTO</td>
                  <td style="padding:20px 24px;text-align:right;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#E5E7EB;">{{college_name}}</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 16px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#FFFFFF;border:1px solid #E5E7EB;border-top:0;border-radius:0 0 12px 12px;">
                <tr>
                  <td style="padding:32px 28px;font-family:Arial,Helvetica,sans-serif;color:#111827;">
                    <p style="margin:0 0 10px 0;font-size:12px;letter-spacing:0.5px;text-transform:uppercase;color:#F97316;font-weight:700;">New module</p>
                    <h1 style="margin:0 0 12px 0;font-size:24px;line-height:1.2;">{{module_name}} is live</h1>
                    <p style="margin:0 0 18px 0;font-size:15px;line-height:1.6;color:#374151;">Hi {{first_name}}, this module covers AI-assisted coding tools, prompt engineering basics, generative and agentic AI introduction, and simple automation workflows.</p>

                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px 0;">
                      <tr>
                        <td align="left" bgcolor="#F97316" style="border-radius:8px;">
                          <a href="{{cta_url}}" style="display:inline-block;padding:12px 24px;font-size:14px;font-family:Arial,Helvetica,sans-serif;color:#FFFFFF;text-decoration:none;font-weight:700;">{{cta_label}}</a>
                        </td>
                      </tr>
                    </table>

                    <ul style="margin:0;padding-left:18px;font-size:14px;color:#374151;line-height:1.6;">
                      <li>AI-assisted coding tools</li>
                      <li>Prompt engineering basics</li>
                      <li>Generative and agentic AI introduction</li>
                      <li>Hands-on AI projects</li>
                    </ul>

                    <p style="margin:18px 0 0 0;font-size:13px;color:#6B7280;">Need help? {{support_url}}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 16px 32px 16px;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#9CA3AF;">
              <a href="{{dashboard_url}}" style="color:#6B7280;text-decoration:underline;">Open dashboard</a> &nbsp;|&nbsp;
              <a href="{{unsubscribe_url}}" style="color:#6B7280;text-decoration:underline;">Unsubscribe</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>$$,
    $$Hi {{first_name}},

{{module_name}} is live. Explore AI-assisted coding tools, prompt engineering basics, generative and agentic AI, and simple automation workflows.

Start now: {{cta_url}}
Support: {{support_url}}

Dashboard: {{dashboard_url}}
Unsubscribe: {{unsubscribe_url}}$$,
    '[
      {"key":"first_name","label":"Student first name","required":false,"sample":"Anuj"},
      {"key":"college_name","label":"College name","required":false,"sample":"Demo College"},
      {"key":"program_name","label":"Program name","required":false,"sample":"NextGen CTO Career Readiness Program"},
      {"key":"module_name","label":"Module name","required":true,"sample":"AI and Modern Development"},
      {"key":"cta_url","label":"CTA URL","required":true,"sample":"https://example.com/ai-module"},
      {"key":"cta_label","label":"CTA label","required":true,"sample":"Start the AI module"},
      {"key":"dashboard_url","label":"Dashboard URL","required":false,"sample":"https://example.com/dashboard"},
      {"key":"support_url","label":"Support URL","required":false,"sample":"https://example.com/support"},
      {"key":"unsubscribe_url","label":"Unsubscribe URL","required":false,"sample":"https://example.com/unsubscribe"}
    ]'::jsonb,
    true,
    true
)
on conflict (slug) do update set
    name = excluded.name,
    category = excluded.category,
    description = excluded.description,
    subject_template = excluded.subject_template,
    preview_text_template = excluded.preview_text_template,
    html_template = excluded.html_template,
    text_template = excluded.text_template,
    variables = excluded.variables,
    is_system = true,
    is_active = true,
    updated_at = now();

-- 5. project-completion-nudge
insert into public.email_templates (name, slug, category, description, subject_template, preview_text_template, html_template, text_template, variables, is_system, is_active)
values (
    'Project Completion Nudge',
    'project-completion-nudge',
    'notification',
    'Nudge students to complete portfolio and project milestones.',
    'Complete your project milestone this week',
    'Your portfolio and real-world application project are key to interview readiness.',
    $$<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background-color:#F9FAFB;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;line-height:1px;font-size:1px;">
    Your portfolio and real-world application project are key to interview readiness.
  </div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F9FAFB;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:600px;max-width:600px;">
          <tr>
            <td style="padding:0 16px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#111827;border-radius:12px 12px 0 0;">
                <tr>
                  <td style="padding:20px 24px;font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;color:#F9FAFB;">NextGen CTO</td>
                  <td style="padding:20px 24px;text-align:right;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#E5E7EB;">{{college_name}}</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 16px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#FFFFFF;border:1px solid #E5E7EB;border-top:0;border-radius:0 0 12px 12px;">
                <tr>
                  <td style="padding:32px 28px;font-family:Arial,Helvetica,sans-serif;color:#111827;">
                    <p style="margin:0 0 10px 0;font-size:12px;letter-spacing:0.5px;text-transform:uppercase;color:#F97316;font-weight:700;">Project milestone</p>
                    <h1 style="margin:0 0 12px 0;font-size:24px;line-height:1.2;">{{project_name}} needs your final push</h1>
                    <p style="margin:0 0 18px 0;font-size:15px;line-height:1.6;color:#374151;">Hi {{first_name}}, completing your portfolio website and real-world application project strengthens your GitHub profile and shows strong project completion.</p>

                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px 0;">
                      <tr>
                        <td align="left" bgcolor="#F97316" style="border-radius:8px;">
                          <a href="{{cta_url}}" style="display:inline-block;padding:12px 24px;font-size:14px;font-family:Arial,Helvetica,sans-serif;color:#FFFFFF;text-decoration:none;font-weight:700;">{{cta_label}}</a>
                        </td>
                      </tr>
                    </table>

                    <ul style="margin:0;padding-left:18px;font-size:14px;color:#374151;line-height:1.6;">
                      <li>Portfolio website completion</li>
                      <li>Real-world application project</li>
                      <li>GitHub profile readiness</li>
                    </ul>

                    <p style="margin:18px 0 0 0;font-size:13px;color:#6B7280;">Need guidance? {{support_url}}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 16px 32px 16px;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#9CA3AF;">
              <a href="{{dashboard_url}}" style="color:#6B7280;text-decoration:underline;">Open dashboard</a> &nbsp;|&nbsp;
              <a href="{{unsubscribe_url}}" style="color:#6B7280;text-decoration:underline;">Unsubscribe</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>$$,
    $$Hi {{first_name}},

{{project_name}} needs your final push. Completing your portfolio website and real-world application project strengthens your GitHub profile and shows strong project completion.

Continue: {{cta_url}}
Support: {{support_url}}

Dashboard: {{dashboard_url}}
Unsubscribe: {{unsubscribe_url}}$$,
    '[
      {"key":"first_name","label":"Student first name","required":false,"sample":"Anuj"},
      {"key":"college_name","label":"College name","required":false,"sample":"Demo College"},
      {"key":"program_name","label":"Program name","required":false,"sample":"NextGen CTO Career Readiness Program"},
      {"key":"project_name","label":"Project name","required":true,"sample":"Portfolio Website"},
      {"key":"cta_url","label":"CTA URL","required":true,"sample":"https://example.com/project"},
      {"key":"cta_label","label":"CTA label","required":true,"sample":"Complete project"},
      {"key":"dashboard_url","label":"Dashboard URL","required":false,"sample":"https://example.com/dashboard"},
      {"key":"support_url","label":"Support URL","required":false,"sample":"https://example.com/support"},
      {"key":"unsubscribe_url","label":"Unsubscribe URL","required":false,"sample":"https://example.com/unsubscribe"}
    ]'::jsonb,
    true,
    true
)
on conflict (slug) do update set
    name = excluded.name,
    category = excluded.category,
    description = excluded.description,
    subject_template = excluded.subject_template,
    preview_text_template = excluded.preview_text_template,
    html_template = excluded.html_template,
    text_template = excluded.text_template,
    variables = excluded.variables,
    is_system = true,
    is_active = true,
    updated_at = now();

-- 6. resume-github-linkedin-reminder
insert into public.email_templates (name, slug, category, description, subject_template, preview_text_template, html_template, text_template, variables, is_system, is_active)
values (
    'Resume, GitHub, LinkedIn Reminder',
    'resume-github-linkedin-reminder',
    'notification',
    'Reminder to complete resume and profile readiness tasks.',
    'Your GitHub + LinkedIn profile needs one final push',
    'Complete your resume and profile setup to improve interview readiness.',
    $$<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background-color:#F9FAFB;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;line-height:1px;font-size:1px;">
    Complete your resume and profile setup to improve interview readiness.
  </div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F9FAFB;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:600px;max-width:600px;">
          <tr>
            <td style="padding:0 16px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#111827;border-radius:12px 12px 0 0;">
                <tr>
                  <td style="padding:20px 24px;font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;color:#F9FAFB;">NextGen CTO</td>
                  <td style="padding:20px 24px;text-align:right;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#E5E7EB;">{{college_name}}</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 16px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#FFFFFF;border:1px solid #E5E7EB;border-top:0;border-radius:0 0 12px 12px;">
                <tr>
                  <td style="padding:32px 28px;font-family:Arial,Helvetica,sans-serif;color:#111827;">
                    <p style="margin:0 0 10px 0;font-size:12px;letter-spacing:0.5px;text-transform:uppercase;color:#F97316;font-weight:700;">Profile readiness</p>
                    <h1 style="margin:0 0 12px 0;font-size:24px;line-height:1.2;">Finish your resume and profiles</h1>
                    <p style="margin:0 0 18px 0;font-size:15px;line-height:1.6;color:#374151;">Hi {{first_name}}, resume completion, GitHub profile optimization, and LinkedIn setup are essential for interview readiness improvement.</p>

                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px 0;">
                      <tr>
                        <td align="left" bgcolor="#F97316" style="border-radius:8px;">
                          <a href="{{cta_url}}" style="display:inline-block;padding:12px 24px;font-size:14px;font-family:Arial,Helvetica,sans-serif;color:#FFFFFF;text-decoration:none;font-weight:700;">{{cta_label}}</a>
                        </td>
                      </tr>
                    </table>

                    <ul style="margin:0;padding-left:18px;font-size:14px;color:#374151;line-height:1.6;">
                      <li>ATS-friendly resume</li>
                      <li>GitHub profile readiness</li>
                      <li>LinkedIn profile setup</li>
                    </ul>

                    <p style="margin:18px 0 0 0;font-size:13px;color:#6B7280;">Need help? {{support_url}}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 16px 32px 16px;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#9CA3AF;">
              <a href="{{dashboard_url}}" style="color:#6B7280;text-decoration:underline;">Open dashboard</a> &nbsp;|&nbsp;
              <a href="{{unsubscribe_url}}" style="color:#6B7280;text-decoration:underline;">Unsubscribe</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>$$,
    $$Hi {{first_name}},

Please complete your resume, GitHub profile, and LinkedIn setup to boost interview readiness.

Continue: {{cta_url}}
Support: {{support_url}}

Dashboard: {{dashboard_url}}
Unsubscribe: {{unsubscribe_url}}$$,
    '[
      {"key":"first_name","label":"Student first name","required":false,"sample":"Anuj"},
      {"key":"college_name","label":"College name","required":false,"sample":"Demo College"},
      {"key":"program_name","label":"Program name","required":false,"sample":"NextGen CTO Career Readiness Program"},
      {"key":"cta_url","label":"CTA URL","required":true,"sample":"https://example.com/profile"},
      {"key":"cta_label","label":"CTA label","required":true,"sample":"Complete profiles"},
      {"key":"dashboard_url","label":"Dashboard URL","required":false,"sample":"https://example.com/dashboard"},
      {"key":"support_url","label":"Support URL","required":false,"sample":"https://example.com/support"},
      {"key":"unsubscribe_url","label":"Unsubscribe URL","required":false,"sample":"https://example.com/unsubscribe"}
    ]'::jsonb,
    true,
    true
)
on conflict (slug) do update set
    name = excluded.name,
    category = excluded.category,
    description = excluded.description,
    subject_template = excluded.subject_template,
    preview_text_template = excluded.preview_text_template,
    html_template = excluded.html_template,
    text_template = excluded.text_template,
    variables = excluded.variables,
    is_system = true,
    is_active = true,
    updated_at = now();

-- 7. mock-interview-invite
insert into public.email_templates (name, slug, category, description, subject_template, preview_text_template, html_template, text_template, variables, is_system, is_active)
values (
    'Mock Interview Invite',
    'mock-interview-invite',
    'announcement',
    'Invite students to mock interview practice.',
    'You are invited: mock interview practice',
    'Join a guided mock interview to build communication confidence.',
    $$<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background-color:#F9FAFB;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;line-height:1px;font-size:1px;">
    Join a guided mock interview to build communication confidence.
  </div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F9FAFB;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:600px;max-width:600px;">
          <tr>
            <td style="padding:0 16px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#111827;border-radius:12px 12px 0 0;">
                <tr>
                  <td style="padding:20px 24px;font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;color:#F9FAFB;">NextGen CTO</td>
                  <td style="padding:20px 24px;text-align:right;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#E5E7EB;">{{college_name}}</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 16px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#FFFFFF;border:1px solid #E5E7EB;border-top:0;border-radius:0 0 12px 12px;">
                <tr>
                  <td style="padding:32px 28px;font-family:Arial,Helvetica,sans-serif;color:#111827;">
                    <p style="margin:0 0 10px 0;font-size:12px;letter-spacing:0.5px;text-transform:uppercase;color:#F97316;font-weight:700;">Mentorship session</p>
                    <h1 style="margin:0 0 12px 0;font-size:24px;line-height:1.2;">Mock interview practice</h1>
                    <p style="margin:0 0 14px 0;font-size:15px;line-height:1.6;color:#374151;">Hi {{first_name}}, join {{mentor_name}} for mock interview practice focused on communication confidence and interview readiness improvement.</p>

                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F9FAFB;border:1px solid #E5E7EB;border-radius:10px;margin:0 0 18px 0;">
                      <tr>
                        <td style="padding:12px 16px;font-size:14px;color:#111827;font-weight:700;">Session details</td>
                      </tr>
                      <tr>
                        <td style="padding:0 16px 14px 16px;font-size:14px;color:#374151;">{{session_date}} | {{session_time}}</td>
                      </tr>
                    </table>

                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px 0;">
                      <tr>
                        <td align="left" bgcolor="#F97316" style="border-radius:8px;">
                          <a href="{{cta_url}}" style="display:inline-block;padding:12px 24px;font-size:14px;font-family:Arial,Helvetica,sans-serif;color:#FFFFFF;text-decoration:none;font-weight:700;">{{cta_label}}</a>
                        </td>
                      </tr>
                    </table>

                    <p style="margin:0;font-size:13px;color:#6B7280;">Need help? {{support_url}}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 16px 32px 16px;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#9CA3AF;">
              <a href="{{unsubscribe_url}}" style="color:#6B7280;text-decoration:underline;">Unsubscribe</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>$$,
    $$Hi {{first_name}},

Join {{mentor_name}} for mock interview practice on {{session_date}} at {{session_time}}. Build communication confidence and interview readiness improvement.

Join session: {{cta_url}}
Support: {{support_url}}

Unsubscribe: {{unsubscribe_url}}$$,
    '[
      {"key":"first_name","label":"Student first name","required":false,"sample":"Anuj"},
      {"key":"college_name","label":"College name","required":false,"sample":"Demo College"},
      {"key":"program_name","label":"Program name","required":false,"sample":"NextGen CTO Career Readiness Program"},
      {"key":"mentor_name","label":"Mentor name","required":true,"sample":"NextGen CTO Mentor"},
      {"key":"session_date","label":"Session date","required":true,"sample":"15 May"},
      {"key":"session_time","label":"Session time","required":true,"sample":"4:00 PM"},
      {"key":"cta_url","label":"CTA URL","required":true,"sample":"https://example.com/mock-interview"},
      {"key":"cta_label","label":"CTA label","required":true,"sample":"Reserve your spot"},
      {"key":"support_url","label":"Support URL","required":false,"sample":"https://example.com/support"},
      {"key":"unsubscribe_url","label":"Unsubscribe URL","required":false,"sample":"https://example.com/unsubscribe"}
    ]'::jsonb,
    true,
    true
)
on conflict (slug) do update set
    name = excluded.name,
    category = excluded.category,
    description = excluded.description,
    subject_template = excluded.subject_template,
    preview_text_template = excluded.preview_text_template,
    html_template = excluded.html_template,
    text_template = excluded.text_template,
    variables = excluded.variables,
    is_system = true,
    is_active = true,
    updated_at = now();

-- 8. founder-mentorship-session-invite
insert into public.email_templates (name, slug, category, description, subject_template, preview_text_template, html_template, text_template, variables, is_system, is_active)
values (
    'Founder Mentorship Session Invite',
    'founder-mentorship-session-invite',
    'announcement',
    'Invite students to a founder-led mentorship session.',
    'Founder mentorship session with NextGen CTO',
    'Join a founder-led session on career readiness and project strategy.',
    $$<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background-color:#F9FAFB;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;line-height:1px;font-size:1px;">
    Join a founder-led session on career readiness and project strategy.
  </div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F9FAFB;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:600px;max-width:600px;">
          <tr>
            <td style="padding:0 16px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#111827;border-radius:12px 12px 0 0;">
                <tr>
                  <td style="padding:20px 24px;font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;color:#F9FAFB;">NextGen CTO</td>
                  <td style="padding:20px 24px;text-align:right;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#E5E7EB;">{{college_name}}</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 16px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#FFFFFF;border:1px solid #E5E7EB;border-top:0;border-radius:0 0 12px 12px;">
                <tr>
                  <td style="padding:32px 28px;font-family:Arial,Helvetica,sans-serif;color:#111827;">
                    <p style="margin:0 0 10px 0;font-size:12px;letter-spacing:0.5px;text-transform:uppercase;color:#F97316;font-weight:700;">Founder session</p>
                    <h1 style="margin:0 0 12px 0;font-size:24px;line-height:1.2;">Founder-led mentorship invite</h1>
                    <p style="margin:0 0 14px 0;font-size:15px;line-height:1.6;color:#374151;">Hi {{first_name}}, join {{mentor_name}} for a session on building strong project outcomes and career readiness strategies.</p>

                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F9FAFB;border:1px solid #E5E7EB;border-radius:10px;margin:0 0 18px 0;">
                      <tr>
                        <td style="padding:12px 16px;font-size:14px;color:#111827;font-weight:700;">Session details</td>
                      </tr>
                      <tr>
                        <td style="padding:0 16px 14px 16px;font-size:14px;color:#374151;">{{session_date}} | {{session_time}}</td>
                      </tr>
                    </table>

                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px 0;">
                      <tr>
                        <td align="left" bgcolor="#F97316" style="border-radius:8px;">
                          <a href="{{cta_url}}" style="display:inline-block;padding:12px 24px;font-size:14px;font-family:Arial,Helvetica,sans-serif;color:#FFFFFF;text-decoration:none;font-weight:700;">{{cta_label}}</a>
                        </td>
                      </tr>
                    </table>

                    <p style="margin:0;font-size:13px;color:#6B7280;">Need help? {{support_url}}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 16px 32px 16px;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#9CA3AF;">
              <a href="{{unsubscribe_url}}" style="color:#6B7280;text-decoration:underline;">Unsubscribe</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>$$,
    $$Hi {{first_name}},

Join {{mentor_name}} for a founder-led mentorship session on {{session_date}} at {{session_time}}.

Reserve your seat: {{cta_url}}
Support: {{support_url}}

Unsubscribe: {{unsubscribe_url}}$$,
    '[
      {"key":"first_name","label":"Student first name","required":false,"sample":"Anuj"},
      {"key":"college_name","label":"College name","required":false,"sample":"Demo College"},
      {"key":"program_name","label":"Program name","required":false,"sample":"NextGen CTO Career Readiness Program"},
      {"key":"mentor_name","label":"Mentor name","required":true,"sample":"NextGen CTO Founder"},
      {"key":"session_date","label":"Session date","required":true,"sample":"20 May"},
      {"key":"session_time","label":"Session time","required":true,"sample":"5:00 PM"},
      {"key":"cta_url","label":"CTA URL","required":true,"sample":"https://example.com/founder-session"},
      {"key":"cta_label","label":"CTA label","required":true,"sample":"Join the session"},
      {"key":"support_url","label":"Support URL","required":false,"sample":"https://example.com/support"},
      {"key":"unsubscribe_url","label":"Unsubscribe URL","required":false,"sample":"https://example.com/unsubscribe"}
    ]'::jsonb,
    true,
    true
)
on conflict (slug) do update set
    name = excluded.name,
    category = excluded.category,
    description = excluded.description,
    subject_template = excluded.subject_template,
    preview_text_template = excluded.preview_text_template,
    html_template = excluded.html_template,
    text_template = excluded.text_template,
    variables = excluded.variables,
    is_system = true,
    is_active = true,
    updated_at = now();

-- 9. certificate-eligibility-notice
insert into public.email_templates (name, slug, category, description, subject_template, preview_text_template, html_template, text_template, variables, is_system, is_active)
values (
    'Certificate Eligibility Notice',
    'certificate-eligibility-notice',
    'operational',
    'Notify students about certificate eligibility steps.',
    'Certificate eligibility: complete these final steps',
    'Finish remaining milestones to unlock your Industry Ready Certificate from NextGen CTO Academy.',
    $$<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background-color:#F9FAFB;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;line-height:1px;font-size:1px;">
    Finish remaining milestones to unlock your Industry Ready Certificate from NextGen CTO Academy.
  </div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F9FAFB;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:600px;max-width:600px;">
          <tr>
            <td style="padding:0 16px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#111827;border-radius:12px 12px 0 0;">
                <tr>
                  <td style="padding:20px 24px;font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;color:#F9FAFB;">NextGen CTO</td>
                  <td style="padding:20px 24px;text-align:right;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#E5E7EB;">{{college_name}}</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 16px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#FFFFFF;border:1px solid #E5E7EB;border-top:0;border-radius:0 0 12px 12px;">
                <tr>
                  <td style="padding:32px 28px;font-family:Arial,Helvetica,sans-serif;color:#111827;">
                    <p style="margin:0 0 10px 0;font-size:12px;letter-spacing:0.5px;text-transform:uppercase;color:#F97316;font-weight:700;">Certificate update</p>
                    <h1 style="margin:0 0 12px 0;font-size:24px;line-height:1.2;">Your certificate eligibility checklist</h1>
                    <p style="margin:0 0 18px 0;font-size:15px;line-height:1.6;color:#374151;">Hi {{first_name}}, you are close to earning the Industry Ready Certificate from NextGen CTO Academy. Complete the remaining steps to unlock eligibility.</p>

                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px 0;">
                      <tr>
                        <td align="left" bgcolor="#F97316" style="border-radius:8px;">
                          <a href="{{cta_url}}" style="display:inline-block;padding:12px 24px;font-size:14px;font-family:Arial,Helvetica,sans-serif;color:#FFFFFF;text-decoration:none;font-weight:700;">{{cta_label}}</a>
                        </td>
                      </tr>
                    </table>

                    <ul style="margin:0;padding-left:18px;font-size:14px;color:#374151;line-height:1.6;">
                      <li>Strong project completion</li>
                      <li>GitHub and LinkedIn profile readiness</li>
                      <li>Interview readiness improvement activities</li>
                    </ul>

                    <p style="margin:18px 0 0 0;font-size:13px;color:#6B7280;">Need help? {{support_url}}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 16px 32px 16px;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#9CA3AF;">
              <a href="{{certificate_url}}" style="color:#6B7280;text-decoration:underline;">View certificate details</a> &nbsp;|&nbsp;
              <a href="{{unsubscribe_url}}" style="color:#6B7280;text-decoration:underline;">Unsubscribe</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>$$,
    $$Hi {{first_name}},

You are close to earning the Industry Ready Certificate from NextGen CTO Academy. Complete remaining steps for eligibility.

Review checklist: {{cta_url}}
Support: {{support_url}}

Certificate details: {{certificate_url}}
Unsubscribe: {{unsubscribe_url}}$$,
    '[
      {"key":"first_name","label":"Student first name","required":false,"sample":"Anuj"},
      {"key":"college_name","label":"College name","required":false,"sample":"Demo College"},
      {"key":"program_name","label":"Program name","required":true,"sample":"NextGen CTO Career Readiness Program"},
      {"key":"cta_url","label":"CTA URL","required":true,"sample":"https://example.com/eligibility"},
      {"key":"cta_label","label":"CTA label","required":true,"sample":"View eligibility"},
      {"key":"certificate_url","label":"Certificate URL","required":false,"sample":"https://example.com/certificate"},
      {"key":"support_url","label":"Support URL","required":false,"sample":"https://example.com/support"},
      {"key":"unsubscribe_url","label":"Unsubscribe URL","required":false,"sample":"https://example.com/unsubscribe"}
    ]'::jsonb,
    true,
    true
)
on conflict (slug) do update set
    name = excluded.name,
    category = excluded.category,
    description = excluded.description,
    subject_template = excluded.subject_template,
    preview_text_template = excluded.preview_text_template,
    html_template = excluded.html_template,
    text_template = excluded.text_template,
    variables = excluded.variables,
    is_system = true,
    is_active = true,
    updated_at = now();

-- 10. college-admin-progress-report
insert into public.email_templates (name, slug, category, description, subject_template, preview_text_template, html_template, text_template, variables, is_system, is_active)
values (
    'College Admin Progress Report',
    'college-admin-progress-report',
    'operational',
    'Progress summary for college admins.',
    'Career readiness progress report for {{college_name}}',
    'Summary of student progress and readiness signals for {{program_name}}.',
    $$<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background-color:#F9FAFB;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;line-height:1px;font-size:1px;">
    Summary of student progress and readiness signals for {{program_name}}.
  </div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F9FAFB;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:600px;max-width:600px;">
          <tr>
            <td style="padding:0 16px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#111827;border-radius:12px 12px 0 0;">
                <tr>
                  <td style="padding:20px 24px;font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;color:#F9FAFB;">NextGen CTO</td>
                  <td style="padding:20px 24px;text-align:right;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#E5E7EB;">{{college_name}}</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 16px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#FFFFFF;border:1px solid #E5E7EB;border-top:0;border-radius:0 0 12px 12px;">
                <tr>
                  <td style="padding:32px 28px;font-family:Arial,Helvetica,sans-serif;color:#111827;">
                    <p style="margin:0 0 10px 0;font-size:12px;letter-spacing:0.5px;text-transform:uppercase;color:#F97316;font-weight:700;">Admin report</p>
                    <h1 style="margin:0 0 12px 0;font-size:24px;line-height:1.2;">{{program_name}} progress snapshot</h1>
                    <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#374151;">Here is the current progress summary for your students. This view helps track readiness signals and completion momentum.</p>

                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F9FAFB;border:1px solid #E5E7EB;border-radius:10px;margin:0 0 18px 0;">
                      <tr>
                        <td style="padding:14px 16px;font-size:14px;color:#111827;font-weight:700;">Overall progress</td>
                      </tr>
                      <tr>
                        <td style="padding:0 16px 14px 16px;font-size:14px;color:#374151;">{{progress_percent}} complete</td>
                      </tr>
                    </table>

                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px 0;">
                      <tr>
                        <td align="left" bgcolor="#F97316" style="border-radius:8px;">
                          <a href="{{cta_url}}" style="display:inline-block;padding:12px 24px;font-size:14px;font-family:Arial,Helvetica,sans-serif;color:#FFFFFF;text-decoration:none;font-weight:700;">{{cta_label}}</a>
                        </td>
                      </tr>
                    </table>

                    <p style="margin:0;font-size:13px;color:#6B7280;">Need support? {{support_url}}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 16px 32px 16px;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#9CA3AF;">
              <a href="{{dashboard_url}}" style="color:#6B7280;text-decoration:underline;">Open dashboard</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>$$,
    $$Progress snapshot for {{program_name}} at {{college_name}}.

Overall progress: {{progress_percent}} complete.

View dashboard: {{cta_url}}
Support: {{support_url}}

Dashboard: {{dashboard_url}}$$,
    '[
      {"key":"college_name","label":"College name","required":true,"sample":"Demo College"},
      {"key":"program_name","label":"Program name","required":true,"sample":"NextGen CTO Career Readiness Program"},
      {"key":"progress_percent","label":"Progress percent","required":true,"sample":"68"},
      {"key":"cta_url","label":"CTA URL","required":true,"sample":"https://example.com/admin-progress"},
      {"key":"cta_label","label":"CTA label","required":true,"sample":"View full report"},
      {"key":"dashboard_url","label":"Dashboard URL","required":false,"sample":"https://example.com/dashboard"},
      {"key":"support_url","label":"Support URL","required":false,"sample":"https://example.com/support"}
    ]'::jsonb,
    true,
    true
)
on conflict (slug) do update set
    name = excluded.name,
    category = excluded.category,
    description = excluded.description,
    subject_template = excluded.subject_template,
    preview_text_template = excluded.preview_text_template,
    html_template = excluded.html_template,
    text_template = excluded.text_template,
    variables = excluded.variables,
    is_system = true,
    is_active = true,
    updated_at = now();

-- 11. program-deadline-alert
insert into public.email_templates (name, slug, category, description, subject_template, preview_text_template, html_template, text_template, variables, is_system, is_active)
values (
    'Program Deadline Alert',
    'program-deadline-alert',
    'notice',
    'Deadline or completion alert for students.',
    'Program milestone deadline: {{deadline_date}}',
    'Complete remaining steps before {{deadline_date}} to stay on track.',
    $$<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background-color:#F9FAFB;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;line-height:1px;font-size:1px;">
    Complete remaining steps before {{deadline_date}} to stay on track.
  </div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F9FAFB;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:600px;max-width:600px;">
          <tr>
            <td style="padding:0 16px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#111827;border-radius:12px 12px 0 0;">
                <tr>
                  <td style="padding:20px 24px;font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;color:#F9FAFB;">NextGen CTO</td>
                  <td style="padding:20px 24px;text-align:right;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#E5E7EB;">{{college_name}}</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 16px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#FFFFFF;border:1px solid #E5E7EB;border-top:0;border-radius:0 0 12px 12px;">
                <tr>
                  <td style="padding:32px 28px;font-family:Arial,Helvetica,sans-serif;color:#111827;">
                    <p style="margin:0 0 10px 0;font-size:12px;letter-spacing:0.5px;text-transform:uppercase;color:#F97316;font-weight:700;">Deadline alert</p>
                    <h1 style="margin:0 0 12px 0;font-size:24px;line-height:1.2;">Complete your milestones by {{deadline_date}}</h1>
                    <p style="margin:0 0 18px 0;font-size:15px;line-height:1.6;color:#374151;">Hi {{first_name}}, staying on schedule helps you build strong project completion and interview readiness improvement.</p>

                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px 0;">
                      <tr>
                        <td align="left" bgcolor="#F97316" style="border-radius:8px;">
                          <a href="{{cta_url}}" style="display:inline-block;padding:12px 24px;font-size:14px;font-family:Arial,Helvetica,sans-serif;color:#FFFFFF;text-decoration:none;font-weight:700;">{{cta_label}}</a>
                        </td>
                      </tr>
                    </table>

                    <p style="margin:0;font-size:13px;color:#6B7280;">Need help? {{support_url}}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 16px 32px 16px;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#9CA3AF;">
              <a href="{{dashboard_url}}" style="color:#6B7280;text-decoration:underline;">Open dashboard</a> &nbsp;|&nbsp;
              <a href="{{unsubscribe_url}}" style="color:#6B7280;text-decoration:underline;">Unsubscribe</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>$$,
    $$Hi {{first_name}},

Complete remaining steps before {{deadline_date}} to stay on track in your career readiness initiative.

Continue: {{cta_url}}
Support: {{support_url}}

Dashboard: {{dashboard_url}}
Unsubscribe: {{unsubscribe_url}}$$,
    '[
      {"key":"first_name","label":"Student first name","required":false,"sample":"Anuj"},
      {"key":"college_name","label":"College name","required":false,"sample":"Demo College"},
      {"key":"program_name","label":"Program name","required":false,"sample":"NextGen CTO Career Readiness Program"},
      {"key":"deadline_date","label":"Deadline date","required":true,"sample":"30 May"},
      {"key":"cta_url","label":"CTA URL","required":true,"sample":"https://example.com/deadline"},
      {"key":"cta_label","label":"CTA label","required":true,"sample":"View remaining steps"},
      {"key":"dashboard_url","label":"Dashboard URL","required":false,"sample":"https://example.com/dashboard"},
      {"key":"support_url","label":"Support URL","required":false,"sample":"https://example.com/support"},
      {"key":"unsubscribe_url","label":"Unsubscribe URL","required":false,"sample":"https://example.com/unsubscribe"}
    ]'::jsonb,
    true,
    true
)
on conflict (slug) do update set
    name = excluded.name,
    category = excluded.category,
    description = excluded.description,
    subject_template = excluded.subject_template,
    preview_text_template = excluded.preview_text_template,
    html_template = excluded.html_template,
    text_template = excluded.text_template,
    variables = excluded.variables,
    is_system = true,
    is_active = true,
    updated_at = now();

-- 12. advanced-addons-teaser
insert into public.email_templates (name, slug, category, description, subject_template, preview_text_template, html_template, text_template, variables, is_system, is_active)
values (
    'Advanced Add-ons Teaser',
    'advanced-addons-teaser',
    'marketing',
    'Introduce optional advanced learning paths for future learning.',
    'Explore optional advanced learning paths',
    'Advanced add-ons are available when you are ready for the next step.',
    $$<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background-color:#F9FAFB;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;line-height:1px;font-size:1px;">
    Advanced add-ons are available when you are ready for the next step.
  </div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F9FAFB;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:600px;max-width:600px;">
          <tr>
            <td style="padding:0 16px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#111827;border-radius:12px 12px 0 0;">
                <tr>
                  <td style="padding:20px 24px;font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;color:#F9FAFB;">NextGen CTO</td>
                  <td style="padding:20px 24px;text-align:right;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#E5E7EB;">{{college_name}}</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 16px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#FFFFFF;border:1px solid #E5E7EB;border-top:0;border-radius:0 0 12px 12px;">
                <tr>
                  <td style="padding:32px 28px;font-family:Arial,Helvetica,sans-serif;color:#111827;">
                    <p style="margin:0 0 10px 0;font-size:12px;letter-spacing:0.5px;text-transform:uppercase;color:#F97316;font-weight:700;">Optional learning paths</p>
                    <h1 style="margin:0 0 12px 0;font-size:24px;line-height:1.2;">Advanced add-ons for future learning</h1>
                    <p style="margin:0 0 18px 0;font-size:15px;line-height:1.6;color:#374151;">Hi {{first_name}}, when you feel ready for deeper specialization, you can explore these optional future learning paths.</p>

                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F9FAFB;border:1px solid #E5E7EB;border-radius:10px;margin:0 0 18px 0;">
                      <tr>
                        <td style="padding:14px 16px;font-size:14px;color:#111827;font-weight:700;">Optional add-ons</td>
                      </tr>
                      <tr>
                        <td style="padding:0 16px 16px 16px;font-size:14px;color:#374151;line-height:1.6;">
                          HLD, LLD, Advanced DSA, System Design, Deep AI/ML, Advanced AI Engineering, and additional mentorship.
                        </td>
                      </tr>
                    </table>

                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px 0;">
                      <tr>
                        <td align="left" bgcolor="#F97316" style="border-radius:8px;">
                          <a href="{{cta_url}}" style="display:inline-block;padding:12px 24px;font-size:14px;font-family:Arial,Helvetica,sans-serif;color:#FFFFFF;text-decoration:none;font-weight:700;">{{cta_label}}</a>
                        </td>
                      </tr>
                    </table>

                    <p style="margin:0;font-size:13px;color:#6B7280;">Need help deciding? {{support_url}}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 16px 32px 16px;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#9CA3AF;">
              <a href="{{unsubscribe_url}}" style="color:#6B7280;text-decoration:underline;">Unsubscribe</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>$$,
    $$Hi {{first_name}},

When you are ready for deeper specialization, optional add-ons include HLD, LLD, Advanced DSA, System Design, Deep AI/ML, Advanced AI Engineering, and additional mentorship.

Explore options: {{cta_url}}
Support: {{support_url}}

Unsubscribe: {{unsubscribe_url}}$$,
    '[
      {"key":"first_name","label":"Student first name","required":false,"sample":"Anuj"},
      {"key":"college_name","label":"College name","required":false,"sample":"Demo College"},
      {"key":"program_name","label":"Program name","required":false,"sample":"NextGen CTO Career Readiness Program"},
      {"key":"cta_url","label":"CTA URL","required":true,"sample":"https://example.com/addons"},
      {"key":"cta_label","label":"CTA label","required":true,"sample":"Explore advanced add-ons"},
      {"key":"support_url","label":"Support URL","required":false,"sample":"https://example.com/support"},
      {"key":"unsubscribe_url","label":"Unsubscribe URL","required":false,"sample":"https://example.com/unsubscribe"}
    ]'::jsonb,
    true,
    true
)
on conflict (slug) do update set
    name = excluded.name,
    category = excluded.category,
    description = excluded.description,
    subject_template = excluded.subject_template,
    preview_text_template = excluded.preview_text_template,
    html_template = excluded.html_template,
    text_template = excluded.text_template,
    variables = excluded.variables,
    is_system = true,
    is_active = true,
    updated_at = now();

commit;
