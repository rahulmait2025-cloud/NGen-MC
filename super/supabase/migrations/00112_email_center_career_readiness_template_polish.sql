-- Email Center Career Readiness Template Polish
-- Migration: 00112_email_center_career_readiness_template_polish.sql
-- Upserts 12 premium templates for the Career Readiness Program

begin;

-- 1. career-readiness-program-launch
insert into public.email_templates (name, slug, category, description, subject_template, preview_text_template, html_template, text_template, variables, is_system, is_active)
values (
    'Career Readiness Program Launch',
    'career-readiness-program-launch',
    'marketing',
    'Launch announcement for the Career Readiness Program.',
    'Welcome to {{program_name}}',
    'Start your college-aligned career readiness journey with foundations, projects, and mentoring.',
    $$<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background-color:#F1F5F9;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;line-height:1px;font-size:1px;">
    Start your college-aligned career readiness journey with foundations, projects, and mentoring.
  </div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F1F5F9;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:600px;max-width:600px;">
          <tr>
            <td style="padding:0 16px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#0F172A;border-radius:12px 12px 0 0;">
                <tr>
                  <td style="padding:20px 24px;font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;color:#F8FAFC;">NextGen CTO</td>
                  <td style="padding:20px 24px;text-align:right;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#E2E8F0;">{{college_name}}</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 16px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#FFFFFF;border:1px solid #E2E8F0;border-top:0;border-radius:0 0 12px 12px;">
                <tr>
                  <td style="padding:32px 28px;font-family:Arial,Helvetica,sans-serif;color:#0F172A;">
                    <p style="margin:0 0 10px 0;font-size:12px;letter-spacing:0.6px;text-transform:uppercase;color:#F97316;font-weight:700;">Career Readiness Program</p>
                    <h1 style="margin:0 0 12px 0;font-size:24px;line-height:1.25;">Welcome to {{program_name}}</h1>
                    <p style="margin:0 0 18px 0;font-size:15px;line-height:1.6;color:#475569;">Hi {{first_name}}, you are starting a structured career readiness program that blends strong fundamentals, real projects, and mentorship support.</p>

                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px 0;">
                      <tr>
                        <td align="left" bgcolor="#F97316" style="border-radius:8px;">
                          <a href="{{cta_url}}" style="display:inline-block;padding:12px 24px;font-size:14px;font-family:Arial,Helvetica,sans-serif;color:#FFFFFF;text-decoration:none;font-weight:700;">{{cta_label}}</a>
                        </td>
                      </tr>
                    </table>

                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;margin:0 0 18px 0;">
                      <tr>
                        <td style="padding:12px 16px;font-size:14px;color:#0F172A;font-weight:700;">What you will gain</td>
                      </tr>
                      <tr>
                        <td style="padding:0 16px 16px 16px;font-size:14px;color:#334155;line-height:1.6;">
                          <ul style="margin:0;padding-left:18px;">
                            <li>Technical foundations with programming and DSA thinking</li>
                            <li>AI-assisted development exposure</li>
                            <li>Hands-on projects that strengthen your portfolio</li>
                            <li>Resume, GitHub, and LinkedIn readiness</li>
                            <li>Mentorship and community support</li>
                          </ul>
                        </td>
                      </tr>
                    </table>

                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#FFF7ED;border:1px solid #FDBA74;border-radius:10px;margin:0 0 18px 0;">
                      <tr>
                        <td style="padding:12px 16px;font-size:13px;color:#9A3412;line-height:1.6;">This college-aligned career readiness journey builds confidence step by step and prepares you for interviews without rushing the fundamentals.</td>
                      </tr>
                    </table>

                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 8px 0;">
                      <tr>
                        <td align="left" bgcolor="#F97316" style="border-radius:8px;">
                          <a href="{{cta_url}}" style="display:inline-block;padding:10px 20px;font-size:13px;font-family:Arial,Helvetica,sans-serif;color:#FFFFFF;text-decoration:none;font-weight:700;">{{cta_label}}</a>
                        </td>
                      </tr>
                    </table>

                    <p style="margin:6px 0 0 0;font-size:13px;color:#64748B;">Support: {{support_url}}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 16px 32px 16px;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#94A3B8;">
              You are receiving this because you are part of {{program_name}}.<br>
              <a href="{{unsubscribe_url}}" style="color:#64748B;text-decoration:underline;">Unsubscribe</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>$$,
    $$Hi {{first_name}},

Welcome to {{program_name}}. This structured career readiness program builds foundations, real projects, and interview confidence with mentoring.

Your outcomes:
- Technical foundations with programming and DSA thinking
- AI-assisted development exposure
- Hands-on projects that strengthen your portfolio
- Resume, GitHub, and LinkedIn readiness
- Mentorship and community support

Get started: {{cta_url}}
Support: {{support_url}}
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
    'Your roadmap for {{program_name}}',
    'Start with foundations, then AI, projects, and profile readiness.',
    $$<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background-color:#F1F5F9;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;line-height:1px;font-size:1px;">
    Start with foundations, then AI, projects, and profile readiness.
  </div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F1F5F9;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:600px;max-width:600px;">
          <tr>
            <td style="padding:0 16px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#0F172A;border-radius:12px 12px 0 0;">
                <tr>
                  <td style="padding:20px 24px;font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;color:#F8FAFC;">NextGen CTO</td>
                  <td style="padding:20px 24px;text-align:right;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#E2E8F0;">{{college_name}}</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 16px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#FFFFFF;border:1px solid #E2E8F0;border-top:0;border-radius:0 0 12px 12px;">
                <tr>
                  <td style="padding:32px 28px;font-family:Arial,Helvetica,sans-serif;color:#0F172A;">
                    <p style="margin:0 0 10px 0;font-size:12px;letter-spacing:0.6px;text-transform:uppercase;color:#F97316;font-weight:700;">Getting started</p>
                    <h1 style="margin:0 0 12px 0;font-size:24px;line-height:1.25;">Your roadmap for {{program_name}}</h1>
                    <p style="margin:0 0 18px 0;font-size:15px;line-height:1.6;color:#475569;">Hi {{first_name}}, follow this sequence to stay on track in your foundation-to-career readiness journey.</p>

                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px 0;">
                      <tr>
                        <td align="left" bgcolor="#F97316" style="border-radius:8px;">
                          <a href="{{cta_url}}" style="display:inline-block;padding:12px 24px;font-size:14px;font-family:Arial,Helvetica,sans-serif;color:#FFFFFF;text-decoration:none;font-weight:700;">{{cta_label}}</a>
                        </td>
                      </tr>
                    </table>

                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;margin:0 0 18px 0;">
                      <tr>
                        <td style="padding:12px 16px;font-size:14px;color:#0F172A;font-weight:700;">Recommended order</td>
                      </tr>
                      <tr>
                        <td style="padding:0 16px 16px 16px;font-size:14px;color:#334155;line-height:1.6;">
                          <ol style="margin:0;padding-left:18px;">
                            <li>Technical foundations: programming basics and DSA thinking</li>
                            <li>AI and modern development: tools, prompts, and workflows</li>
                            <li>Projects: portfolio and a real-world application</li>
                            <li>Career readiness: resume, GitHub, and LinkedIn</li>
                          </ol>
                        </td>
                      </tr>
                    </table>

                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#EFF6FF;border:1px solid #BFDBFE;border-radius:10px;margin:0 0 18px 0;">
                      <tr>
                        <td style="padding:12px 16px;font-size:13px;color:#1E3A8A;line-height:1.6;">Complete your first module and set goals in your profile. Progress tracking is available on your dashboard.</td>
                      </tr>
                    </table>

                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 8px 0;">
                      <tr>
                        <td align="left" bgcolor="#F97316" style="border-radius:8px;">
                          <a href="{{cta_url}}" style="display:inline-block;padding:10px 20px;font-size:13px;font-family:Arial,Helvetica,sans-serif;color:#FFFFFF;text-decoration:none;font-weight:700;">{{cta_label}}</a>
                        </td>
                      </tr>
                    </table>

                    <p style="margin:6px 0 0 0;font-size:13px;color:#64748B;">Support: {{support_url}}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 16px 32px 16px;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#94A3B8;">
              <a href="{{dashboard_url}}" style="color:#64748B;text-decoration:underline;">Open dashboard</a> &nbsp;|&nbsp;
              <a href="{{unsubscribe_url}}" style="color:#64748B;text-decoration:underline;">Unsubscribe</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>$$,
    $$Hi {{first_name}},

Here is your recommended roadmap for {{program_name}}:
1) Technical foundations: programming basics and DSA thinking
2) AI and modern development: tools, prompts, and workflows
3) Projects: portfolio and a real-world application
4) Career readiness: resume, GitHub, and LinkedIn

View your roadmap: {{cta_url}}
Dashboard: {{dashboard_url}}
Support: {{support_url}}
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
    'Reminder to continue technical foundation modules.',
    'Continue {{module_name}} this week',
    'Build programming basics, DSA thinking, and Git confidence.',
    $$<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background-color:#F1F5F9;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;line-height:1px;font-size:1px;">
    Build programming basics, DSA thinking, and Git confidence.
  </div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F1F5F9;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:600px;max-width:600px;">
          <tr>
            <td style="padding:0 16px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#0F172A;border-radius:12px 12px 0 0;">
                <tr>
                  <td style="padding:20px 24px;font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;color:#F8FAFC;">NextGen CTO</td>
                  <td style="padding:20px 24px;text-align:right;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#E2E8F0;">{{college_name}}</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 16px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#FFFFFF;border:1px solid #E2E8F0;border-top:0;border-radius:0 0 12px 12px;">
                <tr>
                  <td style="padding:32px 28px;font-family:Arial,Helvetica,sans-serif;color:#0F172A;">
                    <p style="margin:0 0 10px 0;font-size:12px;letter-spacing:0.6px;text-transform:uppercase;color:#F97316;font-weight:700;">Academic progress</p>
                    <h1 style="margin:0 0 12px 0;font-size:24px;line-height:1.25;">Keep momentum in {{module_name}}</h1>
                    <p style="margin:0 0 18px 0;font-size:15px;line-height:1.6;color:#475569;">Hi {{first_name}}, consistent practice in your foundations makes AI modules and projects easier later in the journey.</p>

                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px 0;">
                      <tr>
                        <td align="left" bgcolor="#F97316" style="border-radius:8px;">
                          <a href="{{cta_url}}" style="display:inline-block;padding:12px 24px;font-size:14px;font-family:Arial,Helvetica,sans-serif;color:#FFFFFF;text-decoration:none;font-weight:700;">{{cta_label}}</a>
                        </td>
                      </tr>
                    </table>

                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;margin:0 0 18px 0;">
                      <tr>
                        <td style="padding:12px 16px;font-size:14px;color:#0F172A;font-weight:700;">Focus areas</td>
                      </tr>
                      <tr>
                        <td style="padding:0 16px 16px 16px;font-size:14px;color:#334155;line-height:1.6;">
                          <ul style="margin:0;padding-left:18px;">
                            <li>Programming basics in Java or Python</li>
                            <li>DSA thinking and problem solving</li>
                            <li>Web and backend fundamentals</li>
                            <li>Git and GitHub collaboration</li>
                          </ul>
                        </td>
                      </tr>
                    </table>

                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#EFF6FF;border:1px solid #BFDBFE;border-radius:10px;margin:0 0 18px 0;">
                      <tr>
                        <td style="padding:12px 16px;font-size:13px;color:#1E3A8A;line-height:1.6;">Small daily progress keeps you on pace for projects and interviews later in the program.</td>
                      </tr>
                    </table>

                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 8px 0;">
                      <tr>
                        <td align="left" bgcolor="#F97316" style="border-radius:8px;">
                          <a href="{{cta_url}}" style="display:inline-block;padding:10px 20px;font-size:13px;font-family:Arial,Helvetica,sans-serif;color:#FFFFFF;text-decoration:none;font-weight:700;">{{cta_label}}</a>
                        </td>
                      </tr>
                    </table>

                    <p style="margin:6px 0 0 0;font-size:13px;color:#64748B;">Support: {{support_url}}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 16px 32px 16px;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#94A3B8;">
              <a href="{{dashboard_url}}" style="color:#64748B;text-decoration:underline;">Open dashboard</a> &nbsp;|&nbsp;
              <a href="{{unsubscribe_url}}" style="color:#64748B;text-decoration:underline;">Unsubscribe</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>$$,
    $$Hi {{first_name}},

{{module_name}} keeps your fundamentals strong. Focus on:
- Programming basics in Java or Python
- DSA thinking and problem solving
- Web and backend fundamentals
- Git and GitHub collaboration

Continue: {{cta_url}}
Dashboard: {{dashboard_url}}
Support: {{support_url}}
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
    'Announce the AI and modern development module.',
    '{{module_name}} is ready to explore',
    'Learn AI-assisted coding, prompt basics, and hands-on AI workflows.',
    $$<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background-color:#F1F5F9;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;line-height:1px;font-size:1px;">
    Learn AI-assisted coding, prompt basics, and hands-on AI workflows.
  </div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F1F5F9;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:600px;max-width:600px;">
          <tr>
            <td style="padding:0 16px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#0F172A;border-radius:12px 12px 0 0;">
                <tr>
                  <td style="padding:20px 24px;font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;color:#F8FAFC;">NextGen CTO</td>
                  <td style="padding:20px 24px;text-align:right;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#E2E8F0;">{{college_name}}</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 16px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#FFFFFF;border:1px solid #E2E8F0;border-top:0;border-radius:0 0 12px 12px;">
                <tr>
                  <td style="padding:32px 28px;font-family:Arial,Helvetica,sans-serif;color:#0F172A;">
                    <p style="margin:0 0 10px 0;font-size:12px;letter-spacing:0.6px;text-transform:uppercase;color:#F97316;font-weight:700;">New module</p>
                    <h1 style="margin:0 0 12px 0;font-size:24px;line-height:1.25;">{{module_name}} is ready</h1>
                    <p style="margin:0 0 18px 0;font-size:15px;line-height:1.6;color:#475569;">Hi {{first_name}}, explore modern AI workflows and learn how to use AI tools responsibly for real development tasks.</p>

                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px 0;">
                      <tr>
                        <td align="left" bgcolor="#F97316" style="border-radius:8px;">
                          <a href="{{cta_url}}" style="display:inline-block;padding:12px 24px;font-size:14px;font-family:Arial,Helvetica,sans-serif;color:#FFFFFF;text-decoration:none;font-weight:700;">{{cta_label}}</a>
                        </td>
                      </tr>
                    </table>

                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;margin:0 0 18px 0;">
                      <tr>
                        <td style="padding:12px 16px;font-size:14px;color:#0F172A;font-weight:700;">You will practice</td>
                      </tr>
                      <tr>
                        <td style="padding:0 16px 16px 16px;font-size:14px;color:#334155;line-height:1.6;">
                          <ul style="margin:0;padding-left:18px;">
                            <li>AI-assisted coding workflows</li>
                            <li>Prompt fundamentals and evaluation</li>
                            <li>Generative and agentic AI concepts</li>
                            <li>Hands-on AI mini-projects</li>
                          </ul>
                        </td>
                      </tr>
                    </table>

                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#EFF6FF;border:1px solid #BFDBFE;border-radius:10px;margin:0 0 18px 0;">
                      <tr>
                        <td style="padding:12px 16px;font-size:13px;color:#1E3A8A;line-height:1.6;">These skills help you build modern developer workflows and stronger project outcomes.</td>
                      </tr>
                    </table>

                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 8px 0;">
                      <tr>
                        <td align="left" bgcolor="#F97316" style="border-radius:8px;">
                          <a href="{{cta_url}}" style="display:inline-block;padding:10px 20px;font-size:13px;font-family:Arial,Helvetica,sans-serif;color:#FFFFFF;text-decoration:none;font-weight:700;">{{cta_label}}</a>
                        </td>
                      </tr>
                    </table>

                    <p style="margin:6px 0 0 0;font-size:13px;color:#64748B;">Support: {{support_url}}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 16px 32px 16px;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#94A3B8;">
              <a href="{{dashboard_url}}" style="color:#64748B;text-decoration:underline;">Open dashboard</a> &nbsp;|&nbsp;
              <a href="{{unsubscribe_url}}" style="color:#64748B;text-decoration:underline;">Unsubscribe</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>$$,
    $$Hi {{first_name}},

{{module_name}} covers:
- AI-assisted coding workflows
- Prompt fundamentals and evaluation
- Generative and agentic AI concepts
- Hands-on AI mini-projects

Start module: {{cta_url}}
Dashboard: {{dashboard_url}}
Support: {{support_url}}
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
    'Finish {{project_name}} to showcase your skills',
    'A completed project adds real proof to your portfolio and interviews.',
    $$<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background-color:#F1F5F9;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;line-height:1px;font-size:1px;">
    A completed project adds real proof to your portfolio and interviews.
  </div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F1F5F9;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:600px;max-width:600px;">
          <tr>
            <td style="padding:0 16px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#0F172A;border-radius:12px 12px 0 0;">
                <tr>
                  <td style="padding:20px 24px;font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;color:#F8FAFC;">NextGen CTO</td>
                  <td style="padding:20px 24px;text-align:right;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#E2E8F0;">{{college_name}}</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 16px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#FFFFFF;border:1px solid #E2E8F0;border-top:0;border-radius:0 0 12px 12px;">
                <tr>
                  <td style="padding:32px 28px;font-family:Arial,Helvetica,sans-serif;color:#0F172A;">
                    <p style="margin:0 0 10px 0;font-size:12px;letter-spacing:0.6px;text-transform:uppercase;color:#F97316;font-weight:700;">Project milestone</p>
                    <h1 style="margin:0 0 12px 0;font-size:24px;line-height:1.25;">Complete {{project_name}}</h1>
                    <p style="margin:0 0 18px 0;font-size:15px;line-height:1.6;color:#475569;">Hi {{first_name}}, a finished project adds concrete proof to your portfolio and gives you strong discussion points during interviews.</p>

                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px 0;">
                      <tr>
                        <td align="left" bgcolor="#F97316" style="border-radius:8px;">
                          <a href="{{cta_url}}" style="display:inline-block;padding:12px 24px;font-size:14px;font-family:Arial,Helvetica,sans-serif;color:#FFFFFF;text-decoration:none;font-weight:700;">{{cta_label}}</a>
                        </td>
                      </tr>
                    </table>

                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;margin:0 0 18px 0;">
                      <tr>
                        <td style="padding:12px 16px;font-size:14px;color:#0F172A;font-weight:700;">Why this matters</td>
                      </tr>
                      <tr>
                        <td style="padding:0 16px 16px 16px;font-size:14px;color:#334155;line-height:1.6;">
                          <ul style="margin:0;padding-left:18px;">
                            <li>Portfolio-ready proof of skills</li>
                            <li>Real-world application for interview stories</li>
                            <li>Cleaner GitHub visibility for reviewers</li>
                          </ul>
                        </td>
                      </tr>
                    </table>

                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#FFF7ED;border:1px solid #FDBA74;border-radius:10px;margin:0 0 18px 0;">
                      <tr>
                        <td style="padding:12px 16px;font-size:13px;color:#9A3412;line-height:1.6;">Complete your milestone now to stay on pace for the next modules and mentorship sessions.</td>
                      </tr>
                    </table>

                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 8px 0;">
                      <tr>
                        <td align="left" bgcolor="#F97316" style="border-radius:8px;">
                          <a href="{{cta_url}}" style="display:inline-block;padding:10px 20px;font-size:13px;font-family:Arial,Helvetica,sans-serif;color:#FFFFFF;text-decoration:none;font-weight:700;">{{cta_label}}</a>
                        </td>
                      </tr>
                    </table>

                    <p style="margin:6px 0 0 0;font-size:13px;color:#64748B;">Support: {{support_url}}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 16px 32px 16px;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#94A3B8;">
              <a href="{{dashboard_url}}" style="color:#64748B;text-decoration:underline;">Open dashboard</a> &nbsp;|&nbsp;
              <a href="{{unsubscribe_url}}" style="color:#64748B;text-decoration:underline;">Unsubscribe</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>$$,
    $$Hi {{first_name}},

Finish {{project_name}} to strengthen your portfolio.

Why it matters:
- Portfolio-ready proof of skills
- Real-world application for interview stories
- Cleaner GitHub visibility for reviewers

Complete project: {{cta_url}}
Dashboard: {{dashboard_url}}
Support: {{support_url}}
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
    'Your career profiles are almost complete',
    'Finalize resume, GitHub, and LinkedIn for interview readiness.',
    $$<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background-color:#F1F5F9;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;line-height:1px;font-size:1px;">
    Finalize resume, GitHub, and LinkedIn for interview readiness.
  </div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F1F5F9;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:600px;max-width:600px;">
          <tr>
            <td style="padding:0 16px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#0F172A;border-radius:12px 12px 0 0;">
                <tr>
                  <td style="padding:20px 24px;font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;color:#F8FAFC;">NextGen CTO</td>
                  <td style="padding:20px 24px;text-align:right;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#E2E8F0;">{{college_name}}</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 16px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#FFFFFF;border:1px solid #E2E8F0;border-top:0;border-radius:0 0 12px 12px;">
                <tr>
                  <td style="padding:32px 28px;font-family:Arial,Helvetica,sans-serif;color:#0F172A;">
                    <p style="margin:0 0 10px 0;font-size:12px;letter-spacing:0.6px;text-transform:uppercase;color:#F97316;font-weight:700;">Career profiles</p>
                    <h1 style="margin:0 0 12px 0;font-size:24px;line-height:1.25;">Finish your resume and profiles</h1>
                    <p style="margin:0 0 18px 0;font-size:15px;line-height:1.6;color:#475569;">Hi {{first_name}}, your profiles help mentors and recruiters quickly understand your strengths. A clean profile makes interviews easier.</p>

                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px 0;">
                      <tr>
                        <td align="left" bgcolor="#F97316" style="border-radius:8px;">
                          <a href="{{cta_url}}" style="display:inline-block;padding:12px 24px;font-size:14px;font-family:Arial,Helvetica,sans-serif;color:#FFFFFF;text-decoration:none;font-weight:700;">{{cta_label}}</a>
                        </td>
                      </tr>
                    </table>

                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;margin:0 0 18px 0;">
                      <tr>
                        <td style="padding:12px 16px;font-size:14px;color:#0F172A;font-weight:700;">Checklist</td>
                      </tr>
                      <tr>
                        <td style="padding:0 16px 16px 16px;font-size:14px;color:#334155;line-height:1.6;">
                          <ul style="margin:0;padding-left:18px;">
                            <li>ATS-ready resume</li>
                            <li>GitHub cleanup and README updates</li>
                            <li>LinkedIn headline and summary</li>
                            <li>Project links in one place</li>
                          </ul>
                        </td>
                      </tr>
                    </table>

                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#EFF6FF;border:1px solid #BFDBFE;border-radius:10px;margin:0 0 18px 0;">
                      <tr>
                        <td style="padding:12px 16px;font-size:13px;color:#1E3A8A;line-height:1.6;">A complete profile strengthens interview readiness and speeds up mentor feedback.</td>
                      </tr>
                    </table>

                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 8px 0;">
                      <tr>
                        <td align="left" bgcolor="#F97316" style="border-radius:8px;">
                          <a href="{{cta_url}}" style="display:inline-block;padding:10px 20px;font-size:13px;font-family:Arial,Helvetica,sans-serif;color:#FFFFFF;text-decoration:none;font-weight:700;">{{cta_label}}</a>
                        </td>
                      </tr>
                    </table>

                    <p style="margin:6px 0 0 0;font-size:13px;color:#64748B;">Support: {{support_url}}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 16px 32px 16px;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#94A3B8;">
              <a href="{{dashboard_url}}" style="color:#64748B;text-decoration:underline;">Open dashboard</a> &nbsp;|&nbsp;
              <a href="{{unsubscribe_url}}" style="color:#64748B;text-decoration:underline;">Unsubscribe</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>$$,
    $$Hi {{first_name}},

Complete your career profiles:
- ATS-ready resume
- GitHub cleanup and README updates
- LinkedIn headline and summary
- Project links in one place

Complete profiles: {{cta_url}}
Dashboard: {{dashboard_url}}
Support: {{support_url}}
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
    'Mock interview invite with {{mentor_name}}',
    'Practice structured answers and get mentor feedback.',
    $$<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background-color:#F1F5F9;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;line-height:1px;font-size:1px;">
    Practice structured answers and get mentor feedback.
  </div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F1F5F9;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:600px;max-width:600px;">
          <tr>
            <td style="padding:0 16px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#0F172A;border-radius:12px 12px 0 0;">
                <tr>
                  <td style="padding:20px 24px;font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;color:#F8FAFC;">NextGen CTO</td>
                  <td style="padding:20px 24px;text-align:right;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#E2E8F0;">{{college_name}}</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 16px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#FFFFFF;border:1px solid #E2E8F0;border-top:0;border-radius:0 0 12px 12px;">
                <tr>
                  <td style="padding:32px 28px;font-family:Arial,Helvetica,sans-serif;color:#0F172A;">
                    <p style="margin:0 0 10px 0;font-size:12px;letter-spacing:0.6px;text-transform:uppercase;color:#F97316;font-weight:700;">Mentorship</p>
                    <h1 style="margin:0 0 12px 0;font-size:24px;line-height:1.25;">Mock interview practice</h1>
                    <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#475569;">Hi {{first_name}}, join {{mentor_name}} for a guided mock interview focused on clarity and confidence.</p>

                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;margin:0 0 18px 0;">
                      <tr>
                        <td style="padding:12px 16px;font-size:14px;color:#0F172A;font-weight:700;">Session details</td>
                      </tr>
                      <tr>
                        <td style="padding:0 16px 14px 16px;font-size:14px;color:#334155;">{{session_date}} | {{session_time}}</td>
                      </tr>
                    </table>

                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px 0;">
                      <tr>
                        <td align="left" bgcolor="#F97316" style="border-radius:8px;">
                          <a href="{{cta_url}}" style="display:inline-block;padding:12px 24px;font-size:14px;font-family:Arial,Helvetica,sans-serif;color:#FFFFFF;text-decoration:none;font-weight:700;">{{cta_label}}</a>
                        </td>
                      </tr>
                    </table>

                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#EFF6FF;border:1px solid #BFDBFE;border-radius:10px;margin:0 0 18px 0;">
                      <tr>
                        <td style="padding:12px 16px;font-size:13px;color:#1E3A8A;line-height:1.6;">Expect structured answers, communication practice, and actionable mentor feedback.</td>
                      </tr>
                    </table>

                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 8px 0;">
                      <tr>
                        <td align="left" bgcolor="#F97316" style="border-radius:8px;">
                          <a href="{{cta_url}}" style="display:inline-block;padding:10px 20px;font-size:13px;font-family:Arial,Helvetica,sans-serif;color:#FFFFFF;text-decoration:none;font-weight:700;">{{cta_label}}</a>
                        </td>
                      </tr>
                    </table>

                    <p style="margin:6px 0 0 0;font-size:13px;color:#64748B;">Support: {{support_url}}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 16px 32px 16px;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#94A3B8;">
              <a href="{{unsubscribe_url}}" style="color:#64748B;text-decoration:underline;">Unsubscribe</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>$$,
    $$Hi {{first_name}},

Mock interview practice with {{mentor_name}}.
Session: {{session_date}} | {{session_time}}

What you will practice:
- Structured answers with STAR
- Clear communication
- Mentor feedback on strengths and gaps

Reserve your spot: {{cta_url}}
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
    'Founder session: career clarity and project strategy',
    'Join {{mentor_name}} on {{session_date}} at {{session_time}}.',
    $$<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background-color:#F1F5F9;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;line-height:1px;font-size:1px;">
    Join {{mentor_name}} on {{session_date}} at {{session_time}}.
  </div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F1F5F9;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:600px;max-width:600px;">
          <tr>
            <td style="padding:0 16px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#0F172A;border-radius:12px 12px 0 0;">
                <tr>
                  <td style="padding:20px 24px;font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;color:#F8FAFC;">NextGen CTO</td>
                  <td style="padding:20px 24px;text-align:right;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#E2E8F0;">{{college_name}}</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 16px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#FFFFFF;border:1px solid #E2E8F0;border-top:0;border-radius:0 0 12px 12px;">
                <tr>
                  <td style="padding:32px 28px;font-family:Arial,Helvetica,sans-serif;color:#0F172A;">
                    <p style="margin:0 0 10px 0;font-size:12px;letter-spacing:0.6px;text-transform:uppercase;color:#F97316;font-weight:700;">Founder mentorship</p>
                    <h1 style="margin:0 0 12px 0;font-size:24px;line-height:1.25;">Founder-led career direction session</h1>
                    <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#475569;">Hi {{first_name}}, join {{mentor_name}} for a premium session on project strategy and career direction.</p>

                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;margin:0 0 18px 0;">
                      <tr>
                        <td style="padding:12px 16px;font-size:14px;color:#0F172A;font-weight:700;">Session details</td>
                      </tr>
                      <tr>
                        <td style="padding:0 16px 14px 16px;font-size:14px;color:#334155;">{{session_date}} | {{session_time}}</td>
                      </tr>
                    </table>

                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px 0;">
                      <tr>
                        <td align="left" bgcolor="#F97316" style="border-radius:8px;">
                          <a href="{{cta_url}}" style="display:inline-block;padding:12px 24px;font-size:14px;font-family:Arial,Helvetica,sans-serif;color:#FFFFFF;text-decoration:none;font-weight:700;">{{cta_label}}</a>
                        </td>
                      </tr>
                    </table>

                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#EFF6FF;border:1px solid #BFDBFE;border-radius:10px;margin:0 0 18px 0;">
                      <tr>
                        <td style="padding:12px 16px;font-size:13px;color:#1E3A8A;line-height:1.6;">Topics include project strategy, common mistakes to avoid, and next-step clarity.</td>
                      </tr>
                    </table>

                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 8px 0;">
                      <tr>
                        <td align="left" bgcolor="#F97316" style="border-radius:8px;">
                          <a href="{{cta_url}}" style="display:inline-block;padding:10px 20px;font-size:13px;font-family:Arial,Helvetica,sans-serif;color:#FFFFFF;text-decoration:none;font-weight:700;">{{cta_label}}</a>
                        </td>
                      </tr>
                    </table>

                    <p style="margin:6px 0 0 0;font-size:13px;color:#64748B;">Support: {{support_url}}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 16px 32px 16px;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#94A3B8;">
              <a href="{{unsubscribe_url}}" style="color:#64748B;text-decoration:underline;">Unsubscribe</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>$$,
    $$Hi {{first_name}},

Founder-led mentorship session with {{mentor_name}}.
Session: {{session_date}} | {{session_time}}

Topics:
- Project strategy and scope
- Career direction and next steps
- Mistakes to avoid

Join the session: {{cta_url}}
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
    'Certificate eligibility checklist for {{program_name}}',
    'Complete remaining milestones to unlock your Industry Ready Certificate.',
    $$<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background-color:#F1F5F9;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;line-height:1px;font-size:1px;">
    Complete remaining milestones to unlock your Industry Ready Certificate.
  </div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F1F5F9;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:600px;max-width:600px;">
          <tr>
            <td style="padding:0 16px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#0F172A;border-radius:12px 12px 0 0;">
                <tr>
                  <td style="padding:20px 24px;font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;color:#F8FAFC;">NextGen CTO</td>
                  <td style="padding:20px 24px;text-align:right;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#E2E8F0;">{{college_name}}</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 16px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#FFFFFF;border:1px solid #E2E8F0;border-top:0;border-radius:0 0 12px 12px;">
                <tr>
                  <td style="padding:32px 28px;font-family:Arial,Helvetica,sans-serif;color:#0F172A;">
                    <p style="margin:0 0 10px 0;font-size:12px;letter-spacing:0.6px;text-transform:uppercase;color:#F97316;font-weight:700;">Certificate update</p>
                    <h1 style="margin:0 0 12px 0;font-size:24px;line-height:1.25;">Eligibility checklist for your certificate</h1>
                    <p style="margin:0 0 18px 0;font-size:15px;line-height:1.6;color:#475569;">Hi {{first_name}}, you are close to the Industry Ready Certificate from NextGen CTO Academy. Complete the remaining steps to unlock eligibility.</p>

                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px 0;">
                      <tr>
                        <td align="left" bgcolor="#F97316" style="border-radius:8px;">
                          <a href="{{cta_url}}" style="display:inline-block;padding:12px 24px;font-size:14px;font-family:Arial,Helvetica,sans-serif;color:#FFFFFF;text-decoration:none;font-weight:700;">{{cta_label}}</a>
                        </td>
                      </tr>
                    </table>

                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;margin:0 0 18px 0;">
                      <tr>
                        <td style="padding:12px 16px;font-size:14px;color:#0F172A;font-weight:700;">Remaining steps</td>
                      </tr>
                      <tr>
                        <td style="padding:0 16px 16px 16px;font-size:14px;color:#334155;line-height:1.6;">
                          <ul style="margin:0;padding-left:18px;">
                            <li>Complete pending milestones</li>
                            <li>Finish project requirements</li>
                            <li>Confirm profile readiness</li>
                          </ul>
                        </td>
                      </tr>
                    </table>

                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#EFF6FF;border:1px solid #BFDBFE;border-radius:10px;margin:0 0 18px 0;">
                      <tr>
                        <td style="padding:12px 16px;font-size:13px;color:#1E3A8A;line-height:1.6;">Your certificate recognizes readiness milestones and project completion.</td>
                      </tr>
                    </table>

                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 8px 0;">
                      <tr>
                        <td align="left" bgcolor="#F97316" style="border-radius:8px;">
                          <a href="{{cta_url}}" style="display:inline-block;padding:10px 20px;font-size:13px;font-family:Arial,Helvetica,sans-serif;color:#FFFFFF;text-decoration:none;font-weight:700;">{{cta_label}}</a>
                        </td>
                      </tr>
                    </table>

                    <p style="margin:6px 0 0 0;font-size:13px;color:#64748B;">Support: {{support_url}}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 16px 32px 16px;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#94A3B8;">
              <a href="{{certificate_url}}" style="color:#64748B;text-decoration:underline;">Certificate details</a> &nbsp;|&nbsp;
              <a href="{{unsubscribe_url}}" style="color:#64748B;text-decoration:underline;">Unsubscribe</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>$$,
    $$Hi {{first_name}},

You are close to the Industry Ready Certificate from NextGen CTO Academy. Complete the remaining steps:
- Pending milestones
- Project requirements
- Profile readiness

View eligibility: {{cta_url}}
Certificate details: {{certificate_url}}
Support: {{support_url}}
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
    '{{program_name}} progress report for {{college_name}}',
    'Overall progress and readiness signals in one view.',
    $$<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background-color:#F1F5F9;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;line-height:1px;font-size:1px;">
    Overall progress and readiness signals in one view.
  </div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F1F5F9;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:600px;max-width:600px;">
          <tr>
            <td style="padding:0 16px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#0F172A;border-radius:12px 12px 0 0;">
                <tr>
                  <td style="padding:20px 24px;font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;color:#F8FAFC;">NextGen CTO</td>
                  <td style="padding:20px 24px;text-align:right;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#E2E8F0;">{{college_name}}</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 16px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#FFFFFF;border:1px solid #E2E8F0;border-top:0;border-radius:0 0 12px 12px;">
                <tr>
                  <td style="padding:32px 28px;font-family:Arial,Helvetica,sans-serif;color:#0F172A;">
                    <p style="margin:0 0 10px 0;font-size:12px;letter-spacing:0.6px;text-transform:uppercase;color:#F97316;font-weight:700;">Admin report</p>
                    <h1 style="margin:0 0 12px 0;font-size:24px;line-height:1.25;">{{program_name}} progress snapshot</h1>
                    <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#475569;">Hello {{college_name}} team, here is a concise progress view to help monitor readiness momentum.</p>

                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;margin:0 0 18px 0;">
                      <tr>
                        <td style="padding:12px 16px;font-size:14px;color:#0F172A;font-weight:700;">Overall progress</td>
                      </tr>
                      <tr>
                        <td style="padding:0 16px 14px 16px;font-size:14px;color:#334155;">{{progress_percent}} complete</td>
                      </tr>
                    </table>

                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#EFF6FF;border:1px solid #BFDBFE;border-radius:10px;margin:0 0 18px 0;">
                      <tr>
                        <td style="padding:12px 16px;font-size:13px;color:#1E3A8A;line-height:1.6;">Use the full report to identify students who need academic or mentorship support.</td>
                      </tr>
                    </table>

                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px 0;">
                      <tr>
                        <td align="left" bgcolor="#F97316" style="border-radius:8px;">
                          <a href="{{cta_url}}" style="display:inline-block;padding:12px 24px;font-size:14px;font-family:Arial,Helvetica,sans-serif;color:#FFFFFF;text-decoration:none;font-weight:700;">{{cta_label}}</a>
                        </td>
                      </tr>
                    </table>

                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 8px 0;">
                      <tr>
                        <td align="left" bgcolor="#F97316" style="border-radius:8px;">
                          <a href="{{cta_url}}" style="display:inline-block;padding:10px 20px;font-size:13px;font-family:Arial,Helvetica,sans-serif;color:#FFFFFF;text-decoration:none;font-weight:700;">{{cta_label}}</a>
                        </td>
                      </tr>
                    </table>

                    <p style="margin:6px 0 0 0;font-size:13px;color:#64748B;">Support: {{support_url}}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 16px 32px 16px;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#94A3B8;">
              <a href="{{dashboard_url}}" style="color:#64748B;text-decoration:underline;">Open dashboard</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>$$,
    $$Hello {{college_name}} team,

Progress snapshot for {{program_name}}:
- Overall progress: {{progress_percent}} complete
- Key milestones and project completion signals
- Career readiness activities and mentorship touchpoints

View full report: {{cta_url}}
Dashboard: {{dashboard_url}}
Support: {{support_url}}$$,
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
    'Deadline approaching: {{deadline_date}}',
    'Complete remaining steps and stay on track in your program.',
    $$<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background-color:#F1F5F9;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;line-height:1px;font-size:1px;">
    Complete remaining steps and stay on track in your program.
  </div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F1F5F9;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:600px;max-width:600px;">
          <tr>
            <td style="padding:0 16px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#0F172A;border-radius:12px 12px 0 0;">
                <tr>
                  <td style="padding:20px 24px;font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;color:#F8FAFC;">NextGen CTO</td>
                  <td style="padding:20px 24px;text-align:right;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#E2E8F0;">{{college_name}}</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 16px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#FFFFFF;border:1px solid #E2E8F0;border-top:0;border-radius:0 0 12px 12px;">
                <tr>
                  <td style="padding:32px 28px;font-family:Arial,Helvetica,sans-serif;color:#0F172A;">
                    <p style="margin:0 0 10px 0;font-size:12px;letter-spacing:0.6px;text-transform:uppercase;color:#F97316;font-weight:700;">Deadline alert</p>
                    <h1 style="margin:0 0 12px 0;font-size:24px;line-height:1.25;">Complete milestones by {{deadline_date}}</h1>
                    <p style="margin:0 0 18px 0;font-size:15px;line-height:1.6;color:#475569;">Hi {{first_name}}, staying on schedule protects your momentum and keeps your career readiness journey moving forward.</p>

                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px 0;">
                      <tr>
                        <td align="left" bgcolor="#F97316" style="border-radius:8px;">
                          <a href="{{cta_url}}" style="display:inline-block;padding:12px 24px;font-size:14px;font-family:Arial,Helvetica,sans-serif;color:#FFFFFF;text-decoration:none;font-weight:700;">{{cta_label}}</a>
                        </td>
                      </tr>
                    </table>

                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;margin:0 0 18px 0;">
                      <tr>
                        <td style="padding:12px 16px;font-size:14px;color:#0F172A;font-weight:700;">Remaining steps</td>
                      </tr>
                      <tr>
                        <td style="padding:0 16px 16px 16px;font-size:14px;color:#334155;line-height:1.6;">
                          <ul style="margin:0;padding-left:18px;">
                            <li>Finish pending modules</li>
                            <li>Complete the project milestone</li>
                            <li>Update resume, GitHub, and LinkedIn</li>
                          </ul>
                        </td>
                      </tr>
                    </table>

                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#FFF7ED;border:1px solid #FDBA74;border-radius:10px;margin:0 0 18px 0;">
                      <tr>
                        <td style="padding:12px 16px;font-size:13px;color:#9A3412;line-height:1.6;">If you are blocked, reach out to support and we will help you plan the next steps.</td>
                      </tr>
                    </table>

                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 8px 0;">
                      <tr>
                        <td align="left" bgcolor="#F97316" style="border-radius:8px;">
                          <a href="{{cta_url}}" style="display:inline-block;padding:10px 20px;font-size:13px;font-family:Arial,Helvetica,sans-serif;color:#FFFFFF;text-decoration:none;font-weight:700;">{{cta_label}}</a>
                        </td>
                      </tr>
                    </table>

                    <p style="margin:6px 0 0 0;font-size:13px;color:#64748B;">Support: {{support_url}}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 16px 32px 16px;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#94A3B8;">
              <a href="{{dashboard_url}}" style="color:#64748B;text-decoration:underline;">Open dashboard</a> &nbsp;|&nbsp;
              <a href="{{unsubscribe_url}}" style="color:#64748B;text-decoration:underline;">Unsubscribe</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>$$,
    $$Hi {{first_name}},

Deadline approaching: {{deadline_date}}

Please complete:
- Pending modules
- Project milestone
- Resume, GitHub, and LinkedIn updates

View remaining steps: {{cta_url}}
Dashboard: {{dashboard_url}}
Support: {{support_url}}
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
    'Optional advanced add-ons to explore',
    'Choose deeper paths like system design or advanced AI when ready.',
    $$<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background-color:#F1F5F9;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;line-height:1px;font-size:1px;">
    Choose deeper paths like system design or advanced AI when ready.
  </div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F1F5F9;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:600px;max-width:600px;">
          <tr>
            <td style="padding:0 16px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#0F172A;border-radius:12px 12px 0 0;">
                <tr>
                  <td style="padding:20px 24px;font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;color:#F8FAFC;">NextGen CTO</td>
                  <td style="padding:20px 24px;text-align:right;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#E2E8F0;">{{college_name}}</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 16px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#FFFFFF;border:1px solid #E2E8F0;border-top:0;border-radius:0 0 12px 12px;">
                <tr>
                  <td style="padding:32px 28px;font-family:Arial,Helvetica,sans-serif;color:#0F172A;">
                    <p style="margin:0 0 10px 0;font-size:12px;letter-spacing:0.6px;text-transform:uppercase;color:#F97316;font-weight:700;">Optional next steps</p>
                    <h1 style="margin:0 0 12px 0;font-size:24px;line-height:1.25;">Advanced add-ons, when you are ready</h1>
                    <p style="margin:0 0 18px 0;font-size:15px;line-height:1.6;color:#475569;">Hi {{first_name}}, after your foundations are complete, you can optionally explore advanced paths for deeper specialization.</p>

                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px 0;">
                      <tr>
                        <td align="left" bgcolor="#F97316" style="border-radius:8px;">
                          <a href="{{cta_url}}" style="display:inline-block;padding:12px 24px;font-size:14px;font-family:Arial,Helvetica,sans-serif;color:#FFFFFF;text-decoration:none;font-weight:700;">{{cta_label}}</a>
                        </td>
                      </tr>
                    </table>

                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;margin:0 0 18px 0;">
                      <tr>
                        <td style="padding:12px 16px;font-size:14px;color:#0F172A;font-weight:700;">Optional add-ons</td>
                      </tr>
                      <tr>
                        <td style="padding:0 16px 16px 16px;font-size:14px;color:#334155;line-height:1.6;">
                          <ul style="margin:0;padding-left:18px;">
                            <li>System design with HLD and LLD</li>
                            <li>Advanced DSA for interviews</li>
                            <li>Advanced AI engineering and automation</li>
                            <li>Mentor-led deep dives and reviews</li>
                          </ul>
                        </td>
                      </tr>
                    </table>

                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#EFF6FF;border:1px solid #BFDBFE;border-radius:10px;margin:0 0 18px 0;">
                      <tr>
                        <td style="padding:12px 16px;font-size:13px;color:#1E3A8A;line-height:1.6;">These are optional and do not replace your core career readiness program.</td>
                      </tr>
                    </table>

                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 8px 0;">
                      <tr>
                        <td align="left" bgcolor="#F97316" style="border-radius:8px;">
                          <a href="{{cta_url}}" style="display:inline-block;padding:10px 20px;font-size:13px;font-family:Arial,Helvetica,sans-serif;color:#FFFFFF;text-decoration:none;font-weight:700;">{{cta_label}}</a>
                        </td>
                      </tr>
                    </table>

                    <p style="margin:6px 0 0 0;font-size:13px;color:#64748B;">Support: {{support_url}}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 16px 32px 16px;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#94A3B8;">
              <a href="{{unsubscribe_url}}" style="color:#64748B;text-decoration:underline;">Unsubscribe</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>$$,
    $$Hi {{first_name}},

When you are ready, optional advanced add-ons include:
- System design (HLD/LLD)
- Advanced DSA for interviews
- Advanced AI engineering and automation
- Mentor-led deep dives and reviews

Explore add-ons: {{cta_url}}
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
