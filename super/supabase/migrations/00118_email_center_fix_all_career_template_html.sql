-- Email Center: fix ALL 12 Career Readiness templates with unique HTML using approved UI shell
-- Migration: 00118_email_center_fix_all_career_template_html.sql
-- Fixes clone issues confirmed by MD5 audit
-- Standardizes all templates on approved UI system:
--   max-width:600px, border-radius:16px, #0F172A header, #F97316 CTA, #F1F5F9 bg

begin;

-- ============================================================================
-- 1. career-readiness-program-launch
-- ============================================================================
insert into public.email_templates (name, slug, category, description, subject_template, preview_text_template, html_template, text_template, variables, is_system, is_active)
values (
  'Career Readiness Program Launch',
  'career-readiness-program-launch',
  'marketing',
  'Launch announcement for the Career Readiness Program. Announcing college-enabled access to the structured career readiness journey.',
  'Welcome to {{program_name}}',
  'Start your college-aligned career readiness journey with foundations, projects, and mentoring.',
  $$<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Welcome to {{program_name}}</title>
</head>
<body style="margin:0;padding:0;background-color:#F1F5F9;font-family:Arial,Helvetica,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;line-height:1px;font-size:1px;">
    Start your college-aligned career readiness journey with foundations, projects, and mentoring.
  </div>

  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F1F5F9;padding:24px 0;">
    <tr>
      <td align="center" style="padding:0 12px;">

        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;background-color:#FFFFFF;border-radius:16px;overflow:hidden;border:1px solid #E2E8F0;">

          <tr>
            <td style="background-color:#0F172A;padding:22px 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="font-size:18px;font-weight:800;color:#FFFFFF;">NextGen CTO</td>
                  <td align="right" style="font-size:12px;color:#CBD5E1;">{{college_name}}</td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:30px 26px 10px 26px;color:#0F172A;">

              <p style="margin:0 0 10px 0;font-size:12px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:#F97316;">
                Career Readiness Program
              </p>

              <h1 style="margin:0 0 14px 0;font-size:25px;line-height:1.25;color:#0F172A;font-weight:800;">
                Welcome to {{program_name}}
              </h1>

              <p style="margin:0 0 16px 0;font-size:15px;line-height:1.7;color:#334155;">
                Hi {{first_name}},
              </p>

              <p style="margin:0 0 18px 0;font-size:15px;line-height:1.7;color:#334155;">
                Your college has enabled access to <strong>{{program_name}}</strong> — a structured career readiness journey designed to help you move from learning concepts to building real career assets.
              </p>

              <p style="margin:0 0 22px 0;font-size:15px;line-height:1.7;color:#334155;">
                This is not just another course. It is designed to help you build the things that actually matter when you start preparing for internships, interviews, and your first serious career opportunities.
              </p>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px 0;">
                <tr>
                  <td bgcolor="#F97316" style="border-radius:10px;">
                    <a href="{{cta_url}}" style="display:inline-block;padding:13px 22px;font-size:14px;font-weight:800;color:#FFFFFF;text-decoration:none;">
                      {{cta_label}}
                    </a>
                  </td>
                </tr>
              </table>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;margin:0 0 18px 0;">
                <tr>
                  <td style="padding:16px 18px;">
                    <p style="margin:0 0 10px 0;font-size:14px;font-weight:800;color:#0F172A;">
                      What you will gain:
                    </p>
                    <p style="margin:0;font-size:14px;line-height:1.8;color:#334155;">
                      Strong technical foundations<br>
                      Hands-on project experience<br>
                      GitHub, Resume, and LinkedIn readiness<br>
                      AI-powered development exposure<br>
                      Interview and communication confidence<br>
                      Mentorship and community support
                    </p>
                  </td>
                </tr>
              </table>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#FFF7ED;border:1px solid #FED7AA;border-radius:12px;margin:0 0 22px 0;">
                <tr>
                  <td style="padding:16px 18px;">
                    <p style="margin:0;font-size:14px;line-height:1.7;color:#9A3412;">
                      Your first step: open your dashboard, explore the roadmap, and start with the first recommended module. Do not wait for the perfect time. Start small. Stay consistent. Build visible proof.
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 20px 0;font-size:15px;line-height:1.7;color:#334155;">
                You are not expected to figure everything out alone. Use the support and community channels whenever you feel stuck.
              </p>

              <p style="margin:0 0 8px 0;font-size:13px;color:#64748B;">
                Need help?
              </p>
              <p style="margin:0;font-size:13px;color:#64748B;">
                Support: <a href="{{support_url}}" style="color:#2563EB;text-decoration:underline;">{{support_url}}</a>
              </p>

            </td>
          </tr>

          <tr>
            <td style="padding:22px 26px 28px 26px;text-align:center;background-color:#F8FAFC;border-top:1px solid #E2E8F0;">
              <p style="margin:0 0 6px 0;font-size:12px;color:#64748B;">
                You are receiving this email because you are part of {{program_name}} at {{college_name}}.
              </p>
              <a href="{{unsubscribe_url}}" style="font-size:12px;color:#64748B;text-decoration:underline;">Unsubscribe or manage preferences</a>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>$$,
  $$CAREER READINESS PROGRAM

Welcome to {{program_name}}

Hi {{first_name}},

Your college has enabled access to {{program_name}} — a structured career readiness journey designed to help you move from learning concepts to building real career assets.

This is not just another course. It is designed to help you build the things that actually matter when you start preparing for internships, interviews, and your first serious career opportunities.

What you will gain:
- Strong technical foundations
- Hands-on project experience
- GitHub, Resume, and LinkedIn readiness
- AI-powered development exposure
- Interview and communication confidence
- Mentorship and community support

Your first step: open your dashboard, explore the roadmap, and start with the first recommended module.

Do not wait for the perfect time. Start small. Stay consistent. Build visible proof.

{{cta_label}}: {{cta_url}}

Need help? Support: {{support_url}}

---
You are receiving this email because you are part of {{program_name}} at {{college_name}}.
Unsubscribe or manage preferences: {{unsubscribe_url}}$$,
  '[
    {"key":"first_name","label":"Student first name","required":false,"sample":"Rahul","inputType":"text","source":"recipient"},
    {"key":"college_name","label":"College name","required":false,"sample":"ABC Institute of Technology","inputType":"text","source":"recipient"},
    {"key":"program_name","label":"Program name","required":true,"sample":"NextGen CTO Career Readiness Program","inputType":"text","source":"campaign"},
    {"key":"cta_url","label":"CTA URL","required":true,"placeholder":"https://...","inputType":"url","source":"campaign"},
    {"key":"cta_label","label":"CTA button text","required":true,"sample":"Explore the program","inputType":"text","source":"campaign"},
    {"key":"support_url","label":"Support URL","required":false,"placeholder":"https://...","inputType":"url","source":"system"},
    {"key":"unsubscribe_url","label":"Unsubscribe URL","required":false,"inputType":"url","source":"system"}
  ]'::jsonb,
  true,
  true
)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  category = excluded.category,
  subject_template = excluded.subject_template,
  preview_text_template = excluded.preview_text_template,
  html_template = excluded.html_template,
  text_template = excluded.text_template,
  variables = excluded.variables,
  is_system = true,
  is_active = true,
  updated_at = now();

-- ============================================================================
-- 2. student-onboarding-career-readiness-roadmap
-- ============================================================================
insert into public.email_templates (name, slug, category, description, subject_template, preview_text_template, html_template, text_template, variables, is_system, is_active)
values (
  'Student Onboarding: Career Readiness Roadmap',
  'student-onboarding-career-readiness-roadmap',
  'announcement',
  'Onboarding roadmap for students in the career readiness journey. Guides students on how to move through the roadmap step by step.',
  'Your roadmap for {{program_name}}',
  'Start with foundations, then AI, projects, and profile readiness.',
  $$<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Your roadmap for {{program_name}}</title>
</head>
<body style="margin:0;padding:0;background-color:#F1F5F9;font-family:Arial,Helvetica,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;line-height:1px;font-size:1px;">
    Start with foundations, then AI, projects, and profile readiness.
  </div>

  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F1F5F9;padding:24px 0;">
    <tr>
      <td align="center" style="padding:0 12px;">

        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;background-color:#FFFFFF;border-radius:16px;overflow:hidden;border:1px solid #E2E8F0;">

          <tr>
            <td style="background-color:#0F172A;padding:22px 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="font-size:18px;font-weight:800;color:#FFFFFF;">NextGen CTO</td>
                  <td align="right" style="font-size:12px;color:#CBD5E1;">{{college_name}}</td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:30px 26px 10px 26px;color:#0F172A;">

              <p style="margin:0 0 10px 0;font-size:12px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:#F97316;">
                Getting Started
              </p>

              <h1 style="margin:0 0 14px 0;font-size:25px;line-height:1.25;color:#0F172A;font-weight:800;">
                Your roadmap for {{program_name}}
              </h1>

              <p style="margin:0 0 16px 0;font-size:15px;line-height:1.7;color:#334155;">
                Hi {{first_name}},
              </p>

              <p style="margin:0 0 18px 0;font-size:15px;line-height:1.7;color:#334155;">
                Your <strong>{{program_name}}</strong> roadmap is ready. Follow this sequence to stay on track from foundations to career readiness.
              </p>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px 0;">
                <tr>
                  <td bgcolor="#F97316" style="border-radius:10px;">
                    <a href="{{cta_url}}" style="display:inline-block;padding:13px 22px;font-size:14px;font-weight:800;color:#FFFFFF;text-decoration:none;">
                      {{cta_label}}
                    </a>
                  </td>
                </tr>
              </table>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;margin:0 0 18px 0;">
                <tr>
                  <td style="padding:16px 18px;">
                    <p style="margin:0 0 10px 0;font-size:14px;font-weight:800;color:#0F172A;">
                      Recommended order:
                    </p>
                    <p style="margin:0;font-size:14px;line-height:1.8;color:#334155;">
                      1. Technical foundations: programming basics and DSA thinking<br>
                      2. AI and modern development: tools, prompts, and workflows<br>
                      3. Projects: portfolio and real-world application<br>
                      4. Career readiness: resume, GitHub, and LinkedIn
                    </p>
                  </td>
                </tr>
              </table>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#EFF6FF;border:1px solid #BFDBFE;border-radius:12px;margin:0 0 22px 0;">
                <tr>
                  <td style="padding:16px 18px;">
                    <p style="margin:0;font-size:14px;line-height:1.7;color:#1E3A8A;">
                      Use your dashboard to track progress through each stage. Complete your first module and set goals in your profile.
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 20px 0;font-size:15px;line-height:1.7;color:#334155;">
                Most students learn randomly — one day DSA, one day web development, one day resume building. Without a clear path, learning becomes confusing. Your roadmap gives you a structured path so you know what to learn, what to build, and how to present your work professionally.
              </p>

              <p style="margin:0 0 8px 0;font-size:13px;color:#64748B;">
                Need help getting started?
              </p>
              <p style="margin:0;font-size:13px;color:#64748B;">
                Support: <a href="{{support_url}}" style="color:#2563EB;text-decoration:underline;">{{support_url}}</a>
                <span style="font-size:12px;color:#CBD5E1;"> &nbsp;|&nbsp; </span>
                <a href="{{dashboard_url}}" style="font-size:13px;color:#2563EB;text-decoration:underline;">Open dashboard</a>
              </p>

            </td>
          </tr>

          <tr>
            <td style="padding:22px 26px 28px 26px;text-align:center;background-color:#F8FAFC;border-top:1px solid #E2E8F0;">
              <p style="margin:0 0 6px 0;font-size:12px;color:#64748B;">
                You are receiving this email because you are part of {{program_name}} at {{college_name}}.
              </p>
              <a href="{{unsubscribe_url}}" style="font-size:12px;color:#64748B;text-decoration:underline;">Unsubscribe or manage preferences</a>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>$$,
  $$YOUR ROADMAP

Your roadmap for {{program_name}}

Hi {{first_name}},

Your {{program_name}} roadmap is ready. Follow this sequence to stay on track from foundations to career readiness.

Recommended order:
1. Technical foundations: programming basics and DSA thinking
2. AI and modern development: tools, prompts, and workflows
3. Projects: portfolio and real-world application
4. Career readiness: resume, GitHub, and LinkedIn

Use your dashboard to track progress through each stage.

{{cta_label}}: {{cta_url}}

Need help? Support: {{support_url}}
Dashboard: {{dashboard_url}}

---
You are receiving this email because you are part of {{program_name}} at {{college_name}}.
Unsubscribe or manage preferences: {{unsubscribe_url}}$$,
  '[
    {"key":"first_name","label":"Student first name","required":false,"sample":"Rahul","inputType":"text","source":"recipient"},
    {"key":"college_name","label":"College name","required":false,"sample":"ABC Institute of Technology","inputType":"text","source":"recipient"},
    {"key":"program_name","label":"Program name","required":true,"sample":"NextGen CTO Career Readiness Program","inputType":"text","source":"campaign"},
    {"key":"cta_url","label":"CTA URL","required":true,"placeholder":"https://...","inputType":"url","source":"campaign"},
    {"key":"cta_label","label":"CTA button text","required":true,"sample":"View Your Roadmap","inputType":"text","source":"campaign"},
    {"key":"dashboard_url","label":"Dashboard URL","required":false,"placeholder":"https://...","inputType":"url","source":"system"},
    {"key":"support_url","label":"Support URL","required":false,"placeholder":"https://...","inputType":"url","source":"system"},
    {"key":"unsubscribe_url","label":"Unsubscribe URL","required":false,"inputType":"url","source":"system"}
  ]'::jsonb,
  true,
  true
)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  category = excluded.category,
  subject_template = excluded.subject_template,
  preview_text_template = excluded.preview_text_template,
  html_template = excluded.html_template,
  text_template = excluded.text_template,
  variables = excluded.variables,
  is_system = true,
  is_active = true,
  updated_at = now();

-- ============================================================================
-- 3. technical-foundations-reminder
-- ============================================================================
insert into public.email_templates (name, slug, category, description, subject_template, preview_text_template, html_template, text_template, variables, is_system, is_active)
values (
  'Technical Foundations Reminder',
  'technical-foundations-reminder',
  'notification',
  'Reminder to continue technical foundation modules covering programming, DSA, web/backend/API/database, and Git/GitHub basics.',
  'Technical foundations: your next milestone',
  'Complete the programming and DSA foundations to stay on track in your career readiness journey.',
  $$<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Technical Foundations</title>
</head>
<body style="margin:0;padding:0;background-color:#F1F5F9;font-family:Arial,Helvetica,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;line-height:1px;font-size:1px;">
    Complete the programming and DSA foundations to stay on track.
  </div>

  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F1F5F9;padding:24px 0;">
    <tr>
      <td align="center" style="padding:0 12px;">

        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;background-color:#FFFFFF;border-radius:16px;overflow:hidden;border:1px solid #E2E8F0;">

          <tr>
            <td style="background-color:#0F172A;padding:22px 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="font-size:18px;font-weight:800;color:#FFFFFF;">NextGen CTO</td>
                  <td align="right" style="font-size:12px;color:#CBD5E1;">{{college_name}}</td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:30px 26px 10px 26px;color:#0F172A;">

              <p style="margin:0 0 10px 0;font-size:12px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:#F97316;">
                Academic Progress
              </p>

              <h1 style="margin:0 0 14px 0;font-size:25px;line-height:1.25;color:#0F172A;font-weight:800;">
                Technical foundations: your next milestone
              </h1>

              <p style="margin:0 0 16px 0;font-size:15px;line-height:1.7;color:#334155;">
                Hi {{first_name}},
              </p>

              <p style="margin:0 0 18px 0;font-size:15px;line-height:1.7;color:#334155;">
                Continue <strong>{{module_name}}</strong> inside <strong>{{program_name}}</strong>. Consistent practice in your foundations makes AI modules and projects easier later in the journey.
              </p>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px 0;">
                <tr>
                  <td bgcolor="#F97316" style="border-radius:10px;">
                    <a href="{{cta_url}}" style="display:inline-block;padding:13px 22px;font-size:14px;font-weight:800;color:#FFFFFF;text-decoration:none;">
                      {{cta_label}}
                    </a>
                  </td>
                </tr>
              </table>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;margin:0 0 18px 0;">
                <tr>
                  <td style="padding:16px 18px;">
                    <p style="margin:0 0 10px 0;font-size:14px;font-weight:800;color:#0F172A;">
                      Focus areas:
                    </p>
                    <p style="margin:0;font-size:14px;line-height:1.8;color:#334155;">
                      Programming basics (Java or Python)<br>
                      DSA thinking and problem solving<br>
                      Web and backend fundamentals<br>
                      APIs and databases basics<br>
                      Git and GitHub collaboration
                    </p>
                  </td>
                </tr>
              </table>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#EFF6FF;border:1px solid #BFDBFE;border-radius:12px;margin:0 0 22px 0;">
                <tr>
                  <td style="padding:16px 18px;">
                    <p style="margin:0;font-size:14px;line-height:1.7;color:#1E3A8A;">
                      Fundamentals before tools. Build strong foundations first — they will help you make better decisions when you use modern AI tools and build real projects.
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 20px 0;font-size:15px;line-height:1.7;color:#334155;">
                Small daily progress keeps you on pace for projects and interviews later in the program. Open your module and continue where you left off.
              </p>

              <p style="margin:0 0 8px 0;font-size:13px;color:#64748B;">
                Need help?
              </p>
              <p style="margin:0;font-size:13px;color:#64748B;">
                Support: <a href="{{support_url}}" style="color:#2563EB;text-decoration:underline;">{{support_url}}</a>
                <span style="font-size:12px;color:#CBD5E1;"> &nbsp;|&nbsp; </span>
                <a href="{{dashboard_url}}" style="font-size:13px;color:#2563EB;text-decoration:underline;">Dashboard</a>
              </p>

            </td>
          </tr>

          <tr>
            <td style="padding:22px 26px 28px 26px;text-align:center;background-color:#F8FAFC;border-top:1px solid #E2E8F0;">
              <p style="margin:0 0 6px 0;font-size:12px;color:#64748B;">
                You are receiving this email because you are part of {{program_name}} at {{college_name}}.
              </p>
              <a href="{{unsubscribe_url}}" style="font-size:12px;color:#64748B;text-decoration:underline;">Unsubscribe or manage preferences</a>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>$$,
  $$TECHNICAL FOUNDATIONS

Technical foundations: your next milestone

Hi {{first_name}},

Continue {{module_name}} inside {{program_name}}. Consistent practice in your foundations makes AI modules and projects easier later in the journey.

Focus areas:
- Programming basics (Java or Python)
- DSA thinking and problem solving
- Web and backend fundamentals
- APIs and databases basics
- Git and GitHub collaboration

Fundamentals before tools. Build strong foundations first.

{{cta_label}}: {{cta_url}}

Need help? Support: {{support_url}}
Dashboard: {{dashboard_url}}

---
You are receiving this email because you are part of {{program_name}} at {{college_name}}.
Unsubscribe or manage preferences: {{unsubscribe_url}}$$,
  '[
    {"key":"first_name","label":"Student first name","required":false,"sample":"Rahul","inputType":"text","source":"recipient"},
    {"key":"college_name","label":"College name","required":false,"sample":"ABC Institute of Technology","inputType":"text","source":"recipient"},
    {"key":"program_name","label":"Program name","required":true,"sample":"NextGen CTO Career Readiness Program","inputType":"text","source":"campaign"},
    {"key":"module_name","label":"Module name","required":true,"sample":"Technical Foundations","inputType":"text","source":"campaign"},
    {"key":"cta_url","label":"CTA URL","required":true,"placeholder":"https://...","inputType":"url","source":"campaign"},
    {"key":"cta_label","label":"CTA button text","required":true,"sample":"Continue Module","inputType":"text","source":"campaign"},
    {"key":"dashboard_url","label":"Dashboard URL","required":false,"placeholder":"https://...","inputType":"url","source":"system"},
    {"key":"support_url","label":"Support URL","required":false,"placeholder":"https://...","inputType":"url","source":"system"},
    {"key":"unsubscribe_url","label":"Unsubscribe URL","required":false,"inputType":"url","source":"system"}
  ]'::jsonb,
  true,
  true
)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  category = excluded.category,
  subject_template = excluded.subject_template,
  preview_text_template = excluded.preview_text_template,
  html_template = excluded.html_template,
  text_template = excluded.text_template,
  variables = excluded.variables,
  is_system = true,
  is_active = true,
  updated_at = now();

-- ============================================================================
-- 4. ai-agentic-ai-module-announcement
-- ============================================================================
insert into public.email_templates (name, slug, category, description, subject_template, preview_text_template, html_template, text_template, variables, is_system, is_active)
values (
  'AI and Modern Development Module Announcement',
  'ai-agentic-ai-module-announcement',
  'announcement',
  'Announce the AI and modern development module covering AI-assisted coding, prompt thinking, and agentic AI basics.',
  'AI and modern development module is open',
  'Explore AI-assisted coding, prompt engineering, and agentic AI fundamentals.',
  $$<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>{{module_name}}</title>
</head>
<body style="margin:0;padding:0;background-color:#F1F5F9;font-family:Arial,Helvetica,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;line-height:1px;font-size:1px;">
    Explore AI-assisted coding, prompt engineering, and agentic AI fundamentals.
  </div>

  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F1F5F9;padding:24px 0;">
    <tr>
      <td align="center" style="padding:0 12px;">

        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;background-color:#FFFFFF;border-radius:16px;overflow:hidden;border:1px solid #E2E8F0;">

          <tr>
            <td style="background-color:#0F172A;padding:22px 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="font-size:18px;font-weight:800;color:#FFFFFF;">NextGen CTO</td>
                  <td align="right" style="font-size:12px;color:#CBD5E1;">{{college_name}}</td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:30px 26px 10px 26px;color:#0F172A;">

              <p style="margin:0 0 10px 0;font-size:12px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:#F97316;">
                AI & Modern Development
              </p>

              <h1 style="margin:0 0 14px 0;font-size:25px;line-height:1.25;color:#0F172A;font-weight:800;">
                AI and modern development module is open
              </h1>

              <p style="margin:0 0 16px 0;font-size:15px;line-height:1.7;color:#334155;">
                Hi {{first_name}},
              </p>

              <p style="margin:0 0 18px 0;font-size:15px;line-height:1.7;color:#334155;">
                AI is changing how developers write, debug, and build software. But the real advantage is not just using AI tools — it is knowing how to use them with strong fundamentals and clear thinking.
              </p>

              <p style="margin:0 0 22px 0;font-size:15px;line-height:1.7;color:#334155;">
                Your <strong>{{module_name}}</strong> module is now available inside <strong>{{program_name}}</strong>.
              </p>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px 0;">
                <tr>
                  <td bgcolor="#F97316" style="border-radius:10px;">
                    <a href="{{cta_url}}" style="display:inline-block;padding:13px 22px;font-size:14px;font-weight:800;color:#FFFFFF;text-decoration:none;">
                      {{cta_label}}
                    </a>
                  </td>
                </tr>
              </table>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;margin:0 0 18px 0;">
                <tr>
                  <td style="padding:16px 18px;">
                    <p style="margin:0 0 10px 0;font-size:14px;font-weight:800;color:#0F172A;">
                      In this module, you will explore:
                    </p>
                    <p style="margin:0;font-size:14px;line-height:1.8;color:#334155;">
                      AI-assisted coding<br>
                      Prompt thinking for developers<br>
                      Generative and agentic AI basics<br>
                      Simple automation workflows<br>
                      Hands-on AI project practice
                    </p>
                  </td>
                </tr>
              </table>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#FFF7ED;border:1px solid #FED7AA;border-radius:12px;margin:0 0 22px 0;">
                <tr>
                  <td style="padding:16px 18px;">
                    <p style="margin:0;font-size:14px;line-height:1.7;color:#9A3412;">
                      Use AI as a support system, not a shortcut. AI can help you move faster, but your fundamentals help you know whether the output actually makes sense.
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 20px 0;font-size:15px;line-height:1.7;color:#334155;">
                Start the module, complete the activities, and see how AI fits into real development work.
              </p>

              <p style="margin:0 0 8px 0;font-size:13px;color:#64748B;">
                Need help while learning?
              </p>
              <p style="margin:0;font-size:13px;color:#64748B;">
                Support: <a href="{{support_url}}" style="color:#2563EB;text-decoration:underline;">{{support_url}}</a>
                <span style="font-size:12px;color:#CBD5E1;"> &nbsp;|&nbsp; </span>
                <a href="{{dashboard_url}}" style="font-size:13px;color:#2563EB;text-decoration:underline;">Dashboard</a>
              </p>

            </td>
          </tr>

          <tr>
            <td style="padding:22px 26px 28px 26px;text-align:center;background-color:#F8FAFC;border-top:1px solid #E2E8F0;">
              <p style="margin:0 0 6px 0;font-size:12px;color:#64748B;">
                You are receiving this email because you are part of {{program_name}} at {{college_name}}.
              </p>
              <a href="{{unsubscribe_url}}" style="font-size:12px;color:#64748B;text-decoration:underline;">Unsubscribe or manage preferences</a>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>$$,
  $$AI & MODERN DEVELOPMENT

AI and modern development module is open

Hi {{first_name}},

AI is changing how developers write, debug, and build software. But the real advantage is not just using AI tools. It is knowing how to use them with strong fundamentals and clear thinking.

Your {{module_name}} module is now available inside {{program_name}}.

In this module, you will explore:
- AI-assisted coding
- Prompt thinking for developers
- Generative and agentic AI basics
- Simple automation workflows
- Hands-on AI project practice

Use AI as a support system, not a shortcut. AI can help you move faster, but your fundamentals help you know whether the output actually makes sense.

Start the module, complete the activities, and see how AI fits into real development work.

{{cta_label}}: {{cta_url}}

Need help? Support: {{support_url}}
Dashboard: {{dashboard_url}}

---
You are receiving this email because you are part of {{program_name}} at {{college_name}}.
Unsubscribe or manage preferences: {{unsubscribe_url}}$$,
  '[
    {"key":"first_name","label":"Student first name","required":false,"sample":"Rahul","inputType":"text","source":"recipient"},
    {"key":"college_name","label":"College name","required":false,"sample":"ABC Institute of Technology","inputType":"text","source":"recipient"},
    {"key":"program_name","label":"Program name","required":true,"sample":"NextGen CTO Career Readiness Program","inputType":"text","source":"campaign"},
    {"key":"module_name","label":"Module name","required":true,"sample":"AI & Modern Development","inputType":"text","source":"campaign"},
    {"key":"cta_url","label":"CTA URL","required":true,"placeholder":"https://...","inputType":"url","source":"campaign"},
    {"key":"cta_label","label":"CTA button text","required":true,"sample":"Start the AI Module","inputType":"text","source":"campaign"},
    {"key":"dashboard_url","label":"Dashboard URL","required":false,"placeholder":"https://...","inputType":"url","source":"system"},
    {"key":"support_url","label":"Support URL","required":false,"placeholder":"https://...","inputType":"url","source":"system"},
    {"key":"unsubscribe_url","label":"Unsubscribe URL","required":false,"inputType":"url","source":"system"}
  ]'::jsonb,
  true,
  true
)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  category = excluded.category,
  subject_template = excluded.subject_template,
  preview_text_template = excluded.preview_text_template,
  html_template = excluded.html_template,
  text_template = excluded.text_template,
  variables = excluded.variables,
  is_system = true,
  is_active = true,
  updated_at = now();

-- ============================================================================
-- 5. project-completion-nudge
-- ============================================================================
insert into public.email_templates (name, slug, category, description, subject_template, preview_text_template, html_template, text_template, variables, is_system, is_active)
values (
  'Project Completion Nudge',
  'project-completion-nudge',
  'notification',
  'Nudge students to complete portfolio and project milestones. Personal tone encouraging project finishing.',
  'Your project can become your strongest proof',
  'Finish your project, push it to GitHub, and make your learning visible.',
  $$<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>{{project_name}}</title>
</head>
<body style="margin:0;padding:0;background-color:#F1F5F9;font-family:Arial,Helvetica,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;line-height:1px;font-size:1px;">
    Finish your project, push it to GitHub, and make your learning visible.
  </div>

  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F1F5F9;padding:24px 0;">
    <tr>
      <td align="center" style="padding:0 12px;">

        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;background-color:#FFFFFF;border-radius:16px;overflow:hidden;border:1px solid #E2E8F0;">

          <tr>
            <td style="background-color:#0F172A;padding:22px 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="font-size:18px;font-weight:800;color:#FFFFFF;">NextGen CTO</td>
                  <td align="right" style="font-size:12px;color:#CBD5E1;">{{college_name}}</td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:30px 26px 10px 26px;color:#0F172A;">

              <p style="margin:0 0 10px 0;font-size:12px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:#F97316;">
                Project Milestone
              </p>

              <h1 style="margin:0 0 14px 0;font-size:25px;line-height:1.25;color:#0F172A;font-weight:800;">
                Your project can become your strongest proof
              </h1>

              <p style="margin:0 0 16px 0;font-size:15px;line-height:1.7;color:#334155;">
                Hi {{first_name}},
              </p>

              <p style="margin:0 0 18px 0;font-size:15px;line-height:1.7;color:#334155;">
                Quick reminder — your <strong>{{project_name}}</strong> milestone inside <strong>{{program_name}}</strong> is waiting for you. This is one milestone you should not ignore. A completed project shows something theory cannot: that you can actually build.
              </p>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px 0;">
                <tr>
                  <td bgcolor="#F97316" style="border-radius:10px;">
                    <a href="{{cta_url}}" style="display:inline-block;padding:13px 22px;font-size:14px;font-weight:800;color:#FFFFFF;text-decoration:none;">
                      {{cta_label}}
                    </a>
                  </td>
                </tr>
              </table>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#FFF7ED;border:1px solid #FED7AA;border-radius:12px;margin:0 0 18px 0;">
                <tr>
                  <td style="padding:16px 18px;">
                    <p style="margin:0;font-size:14px;line-height:1.7;color:#9A3412;">
                      Do not aim for perfect right now. Aim for complete. A working project can always be improved, but an unfinished project cannot help your portfolio.
                    </p>
                  </td>
                </tr>
              </table>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;margin:0 0 22px 0;">
                <tr>
                  <td style="padding:16px 18px;">
                    <p style="margin:0 0 10px 0;font-size:14px;font-weight:800;color:#0F172A;">
                      Keep your next step simple:
                    </p>
                    <p style="margin:0;font-size:14px;line-height:1.8;color:#334155;">
                      Finish the core features<br>
                      Push your code to GitHub<br>
                      Write a simple README<br>
                      Mention what the project does and what you learned
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 20px 0;font-size:15px;line-height:1.7;color:#334155;">
                Small progress is okay. Incomplete silence is not. That is enough to turn this from just another task into a real career asset.
              </p>

              <p style="margin:0 0 8px 0;font-size:13px;color:#64748B;">
                Stuck somewhere? That is normal.
              </p>
              <p style="margin:0;font-size:13px;color:#64748B;">
                Support: <a href="{{support_url}}" style="color:#2563EB;text-decoration:underline;">{{support_url}}</a>
                <span style="font-size:12px;color:#CBD5E1;"> &nbsp;|&nbsp; </span>
                <a href="{{dashboard_url}}" style="font-size:13px;color:#2563EB;text-decoration:underline;">Dashboard</a>
              </p>

            </td>
          </tr>

          <tr>
            <td style="padding:22px 26px 28px 26px;text-align:center;background-color:#F8FAFC;border-top:1px solid #E2E8F0;">
              <p style="margin:0 0 6px 0;font-size:12px;color:#64748B;">
                You are receiving this email because you are part of {{program_name}} at {{college_name}}.
              </p>
              <a href="{{unsubscribe_url}}" style="font-size:12px;color:#64748B;text-decoration:underline;">Unsubscribe or manage preferences</a>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>$$,
  $$PROJECT MILESTONE

Your project can become your strongest proof

Hi {{first_name}},

Quick reminder: your {{project_name}} milestone inside {{program_name}} is waiting for you. A completed project shows something theory cannot: that you can actually build.

{{cta_label}}: {{cta_url}}

Do not aim for perfect right now. Aim for complete. A working project can always be improved, but an unfinished project cannot help your portfolio.

Keep your next step simple:
- Finish the core features
- Push your code to GitHub
- Write a simple README
- Mention what the project does and what you learned

Small progress is okay. Incomplete silence is not.

Need help? Support: {{support_url}}
Dashboard: {{dashboard_url}}

---
You are receiving this email because you are part of {{program_name}} at {{college_name}}.
Unsubscribe or manage preferences: {{unsubscribe_url}}$$,
  '[
    {"key":"first_name","label":"Student first name","required":false,"sample":"Rahul","inputType":"text","source":"recipient"},
    {"key":"college_name","label":"College name","required":false,"sample":"ABC Institute of Technology","inputType":"text","source":"recipient"},
    {"key":"program_name","label":"Program name","required":true,"sample":"NextGen CTO Career Readiness Program","inputType":"text","source":"campaign"},
    {"key":"project_name","label":"Project name","required":true,"sample":"Portfolio Website","inputType":"text","source":"campaign"},
    {"key":"cta_url","label":"CTA URL","required":true,"placeholder":"https://...","inputType":"url","source":"campaign"},
    {"key":"cta_label","label":"CTA button text","required":true,"sample":"Complete Your Project","inputType":"text","source":"campaign"},
    {"key":"dashboard_url","label":"Dashboard URL","required":false,"placeholder":"https://...","inputType":"url","source":"system"},
    {"key":"support_url","label":"Support URL","required":false,"placeholder":"https://...","inputType":"url","source":"system"},
    {"key":"unsubscribe_url","label":"Unsubscribe URL","required":false,"inputType":"url","source":"system"}
  ]'::jsonb,
  true,
  true
)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  category = excluded.category,
  subject_template = excluded.subject_template,
  preview_text_template = excluded.preview_text_template,
  html_template = excluded.html_template,
  text_template = excluded.text_template,
  variables = excluded.variables,
  is_system = true,
  is_active = true,
  updated_at = now();

-- ============================================================================
-- 6. resume-github-linkedin-reminder
-- ============================================================================
insert into public.email_templates (name, slug, category, description, subject_template, preview_text_template, html_template, text_template, variables, is_system, is_active)
values (
  'Resume, GitHub, LinkedIn Reminder',
  'resume-github-linkedin-reminder',
  'notification',
  'Reminder to complete resume, GitHub, and LinkedIn profile readiness tasks so skills and projects are visible.',
  'Your profile should show your effort',
  'Update your Resume, GitHub, and LinkedIn so your work is visible.',
  $$<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Profile Readiness</title>
</head>
<body style="margin:0;padding:0;background-color:#F1F5F9;font-family:Arial,Helvetica,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;line-height:1px;font-size:1px;">
    Update your Resume, GitHub, and LinkedIn so your work is visible.
  </div>

  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F1F5F9;padding:24px 0;">
    <tr>
      <td align="center" style="padding:0 12px;">

        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;background-color:#FFFFFF;border-radius:16px;overflow:hidden;border:1px solid #E2E8F0;">

          <tr>
            <td style="background-color:#0F172A;padding:22px 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="font-size:18px;font-weight:800;color:#FFFFFF;">NextGen CTO</td>
                  <td align="right" style="font-size:12px;color:#CBD5E1;">{{college_name}}</td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:30px 26px 10px 26px;color:#0F172A;">

              <p style="margin:0 0 10px 0;font-size:12px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:#F97316;">
                Profile Readiness
              </p>

              <h1 style="margin:0 0 14px 0;font-size:25px;line-height:1.25;color:#0F172A;font-weight:800;">
                Your profile should show your effort
              </h1>

              <p style="margin:0 0 16px 0;font-size:15px;line-height:1.7;color:#334155;">
                Hi {{first_name}},
              </p>

              <p style="margin:0 0 18px 0;font-size:15px;line-height:1.7;color:#334155;">
                Your skills need visible proof. Your Resume, GitHub, and LinkedIn are the first places where someone understands what you have learned, what you have built, and how seriously you are preparing through <strong>{{program_name}}</strong>.
              </p>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px 0;">
                <tr>
                  <td bgcolor="#F97316" style="border-radius:10px;">
                    <a href="{{cta_url}}" style="display:inline-block;padding:13px 22px;font-size:14px;font-weight:800;color:#FFFFFF;text-decoration:none;">
                      {{cta_label}}
                    </a>
                  </td>
                </tr>
              </table>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;margin:0 0 18px 0;">
                <tr>
                  <td style="padding:16px 18px;">
                    <p style="margin:0 0 10px 0;font-size:14px;font-weight:800;color:#0F172A;">
                      Keep this simple:
                    </p>
                    <p style="margin:0;font-size:14px;line-height:1.8;color:#334155;">
                      Update your resume<br>
                      Clean your GitHub and add project READMEs<br>
                      Improve your LinkedIn headline and summary<br>
                      Keep your project links easy to find
                    </p>
                  </td>
                </tr>
              </table>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#EFF6FF;border:1px solid #BFDBFE;border-radius:12px;margin:0 0 22px 0;">
                <tr>
                  <td style="padding:16px 18px;">
                    <p style="margin:0;font-size:14px;line-height:1.7;color:#1E3A8A;">
                      You do not need a perfect profile. You need a clear one — a profile that honestly shows your skills, projects, and progress. Recruiters, mentors, and admins should understand what you have built.
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 20px 0;font-size:15px;line-height:1.7;color:#334155;">
                Do not wait until placement season. A clean profile makes it easier for mentors to guide you and easier for interviewers to understand your work.
              </p>

              <p style="margin:0 0 8px 0;font-size:13px;color:#64748B;">
                Need help improving it?
              </p>
              <p style="margin:0;font-size:13px;color:#64748B;">
                Support: <a href="{{support_url}}" style="color:#2563EB;text-decoration:underline;">{{support_url}}</a>
                <span style="font-size:12px;color:#CBD5E1;"> &nbsp;|&nbsp; </span>
                <a href="{{dashboard_url}}" style="font-size:13px;color:#2563EB;text-decoration:underline;">Dashboard</a>
              </p>

            </td>
          </tr>

          <tr>
            <td style="padding:22px 26px 28px 26px;text-align:center;background-color:#F8FAFC;border-top:1px solid #E2E8F0;">
              <p style="margin:0 0 6px 0;font-size:12px;color:#64748B;">
                You are receiving this email because you are part of {{program_name}} at {{college_name}}.
              </p>
              <a href="{{unsubscribe_url}}" style="font-size:12px;color:#64748B;text-decoration:underline;">Unsubscribe or manage preferences</a>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>$$,
  $$PROFILE READINESS

Your profile should show your effort

Hi {{first_name}},

Your skills need visible proof. Your Resume, GitHub, and LinkedIn are the first places where someone understands what you have learned, what you have built, and how seriously you are preparing through {{program_name}}.

{{cta_label}}: {{cta_url}}

Keep this simple:
- Update your resume
- Clean your GitHub and add project READMEs
- Improve your LinkedIn headline and summary
- Keep your project links easy to find

You do not need a perfect profile. You need a clear one.

Do not wait until placement season.

Need help? Support: {{support_url}}
Dashboard: {{dashboard_url}}

---
You are receiving this email because you are part of {{program_name}} at {{college_name}}.
Unsubscribe or manage preferences: {{unsubscribe_url}}$$,
  '[
    {"key":"first_name","label":"Student first name","required":false,"sample":"Rahul","inputType":"text","source":"recipient"},
    {"key":"college_name","label":"College name","required":false,"sample":"ABC Institute of Technology","inputType":"text","source":"recipient"},
    {"key":"program_name","label":"Program name","required":true,"sample":"NextGen CTO Career Readiness Program","inputType":"text","source":"campaign"},
    {"key":"cta_url","label":"CTA URL","required":true,"placeholder":"https://...","inputType":"url","source":"campaign"},
    {"key":"cta_label","label":"CTA button text","required":true,"sample":"Update Your Profiles","inputType":"text","source":"campaign"},
    {"key":"dashboard_url","label":"Dashboard URL","required":false,"placeholder":"https://...","inputType":"url","source":"system"},
    {"key":"support_url","label":"Support URL","required":false,"placeholder":"https://...","inputType":"url","source":"system"},
    {"key":"unsubscribe_url","label":"Unsubscribe URL","required":false,"inputType":"url","source":"system"}
  ]'::jsonb,
  true,
  true
)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  category = excluded.category,
  subject_template = excluded.subject_template,
  preview_text_template = excluded.preview_text_template,
  html_template = excluded.html_template,
  text_template = excluded.text_template,
  variables = excluded.variables,
  is_system = true,
  is_active = true,
  updated_at = now();

-- ============================================================================
-- 7. mock-interview-invite
-- ============================================================================
insert into public.email_templates (name, slug, category, description, subject_template, preview_text_template, html_template, text_template, variables, is_system, is_active)
values (
  'Mock Interview Invite',
  'mock-interview-invite',
  'announcement',
  'Invite students to a mock interview practice session with a mentor to build interview confidence.',
  'Your mock interview practice is scheduled',
  'Practice your answers, get mentor feedback, and build interview confidence.',
  $$<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Mock Interview Invite</title>
</head>
<body style="margin:0;padding:0;background-color:#F1F5F9;font-family:Arial,Helvetica,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;line-height:1px;font-size:1px;">
    Practice your answers, get mentor feedback, and build interview confidence.
  </div>

  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F1F5F9;padding:24px 0;">
    <tr>
      <td align="center" style="padding:0 12px;">

        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;background-color:#FFFFFF;border-radius:16px;overflow:hidden;border:1px solid #E2E8F0;">

          <tr>
            <td style="background-color:#0F172A;padding:22px 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="font-size:18px;font-weight:800;color:#FFFFFF;">NextGen CTO</td>
                  <td align="right" style="font-size:12px;color:#CBD5E1;">{{college_name}}</td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:30px 26px 10px 26px;color:#0F172A;">

              <p style="margin:0 0 10px 0;font-size:12px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:#F97316;">
                Mock Interview Practice
              </p>

              <h1 style="margin:0 0 14px 0;font-size:25px;line-height:1.25;color:#0F172A;font-weight:800;">
                Your mock interview practice is scheduled
              </h1>

              <p style="margin:0 0 16px 0;font-size:15px;line-height:1.7;color:#334155;">
                Hi {{first_name}},
              </p>

              <p style="margin:0 0 18px 0;font-size:15px;line-height:1.7;color:#334155;">
                Your mock interview practice session with <strong>{{mentor_name}}</strong> is coming up. This session is not about being perfect. It is about practicing how you explain your thoughts, projects, and answers before a real interview.
              </p>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;margin:0 0 18px 0;">
                <tr>
                  <td style="padding:16px 18px;">
                    <p style="margin:0 0 6px 0;font-size:14px;font-weight:800;color:#0F172A;">Session details:</p>
                    <p style="margin:0;font-size:14px;line-height:1.8;color:#334155;">
                      Date: {{session_date}}<br>
                      Time: {{session_time}}<br>
                      Zoom Link: <a href="{{zoom_meeting_url}}" style="color:#2563EB;text-decoration:underline;">{{zoom_meeting_url}}</a>
                    </p>
                  </td>
                </tr>
              </table>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#FFF7ED;border:1px solid #FED7AA;border-radius:12px;margin:0 0 18px 0;">
                <tr>
                  <td style="padding:16px 18px;">
                    <p style="margin:0 0 6px 0;font-size:14px;font-weight:800;color:#9A3412;">Before joining, keep these ready:</p>
                    <p style="margin:0;font-size:14px;line-height:1.8;color:#9A3412;">
                      Your updated resume<br>
                      One project you can explain clearly<br>
                      A calm mindset to take feedback seriously
                    </p>
                  </td>
                </tr>
              </table>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px 0;">
                <tr>
                  <td bgcolor="#F97316" style="border-radius:10px;">
                    <a href="{{cta_url}}" style="display:inline-block;padding:13px 22px;font-size:14px;font-weight:800;color:#FFFFFF;text-decoration:none;">
                      {{cta_label}}
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 20px 0;font-size:15px;line-height:1.7;color:#334155;">
                A mock interview is not an exam. It is practice before the real opportunity. The more honestly you participate, the more useful the feedback will be.
              </p>

              <p style="margin:0 0 8px 0;font-size:13px;color:#64748B;">
                Need help before the session?
              </p>
              <p style="margin:0;font-size:13px;color:#64748B;">
                Support: <a href="{{support_url}}" style="color:#2563EB;text-decoration:underline;">{{support_url}}</a>
              </p>

            </td>
          </tr>

          <tr>
            <td style="padding:22px 26px 28px 26px;text-align:center;background-color:#F8FAFC;border-top:1px solid #E2E8F0;">
              <p style="margin:0 0 6px 0;font-size:12px;color:#64748B;">
                You are receiving this email because you are part of {{program_name}} at {{college_name}}.
              </p>
              <a href="{{unsubscribe_url}}" style="font-size:12px;color:#64748B;text-decoration:underline;">Unsubscribe or manage preferences</a>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>$$,
  $$MOCK INTERVIEW PRACTICE

Your mock interview practice is scheduled

Hi {{first_name}},

Your mock interview practice session with {{mentor_name}} is coming up. This session is about practicing how you explain your thoughts, projects, and answers before a real interview.

Session details:
- Date: {{session_date}}
- Time: {{session_time}}
- Zoom Link: {{zoom_meeting_url}}

Before joining, keep these ready:
- Your updated resume
- One project you can explain clearly
- A calm mindset to take feedback seriously

{{cta_label}}: {{cta_url}}

A mock interview is practice before the real opportunity. The more honestly you participate, the more useful the feedback will be.

Need help? Support: {{support_url}}

---
You are receiving this email because you are part of {{program_name}} at {{college_name}}.
Unsubscribe or manage preferences: {{unsubscribe_url}}$$,
  '[
    {"key":"first_name","label":"Student first name","required":false,"sample":"Rahul","inputType":"text","source":"recipient"},
    {"key":"college_name","label":"College name","required":false,"sample":"ABC Institute of Technology","inputType":"text","source":"recipient"},
    {"key":"mentor_name","label":"Mentor name","required":true,"placeholder":"Enter mentor name","inputType":"text","source":"campaign"},
    {"key":"session_date","label":"Session date","required":true,"inputType":"date","source":"campaign"},
    {"key":"session_time","label":"Session time","required":true,"placeholder":"5:00 PM IST","inputType":"text","source":"campaign"},
    {"key":"zoom_meeting_url","label":"Zoom meeting link","required":true,"placeholder":"https://zoom.us/j/...","inputType":"url","source":"campaign"},
    {"key":"program_name","label":"Program name","required":true,"sample":"NextGen CTO Career Readiness Program","inputType":"text","source":"campaign"},
    {"key":"cta_label","label":"CTA button text","required":true,"sample":"View Session Details","inputType":"text","source":"campaign"},
    {"key":"cta_url","label":"Session details URL","required":true,"placeholder":"https://...","inputType":"url","source":"campaign"},
    {"key":"support_url","label":"Support URL","required":false,"placeholder":"https://...","inputType":"url","source":"system"},
    {"key":"unsubscribe_url","label":"Unsubscribe URL","required":false,"inputType":"url","source":"system"}
  ]'::jsonb,
  true,
  true
)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  category = excluded.category,
  subject_template = excluded.subject_template,
  preview_text_template = excluded.preview_text_template,
  html_template = excluded.html_template,
  text_template = excluded.text_template,
  variables = excluded.variables,
  is_system = true,
  is_active = true,
  updated_at = now();

-- ============================================================================
-- 8. founder-mentorship-session-invite
-- ============================================================================
insert into public.email_templates (name, slug, category, description, subject_template, preview_text_template, html_template, text_template, variables, is_system, is_active)
values (
  'Founder Mentorship Session Invite',
  'founder-mentorship-session-invite',
  'announcement',
  'Invite students to a practical mentorship session with a founder/mentor for career readiness guidance.',
  'You''re invited to a practical mentorship session',
  'Get clarity on projects, profiles, interviews, and your next steps.',
  $$<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Mentorship Session Invite</title>
</head>
<body style="margin:0;padding:0;background-color:#F1F5F9;font-family:Arial,Helvetica,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;line-height:1px;font-size:1px;">
    Get clarity on projects, profiles, interviews, and your next steps.
  </div>

  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F1F5F9;padding:24px 0;">
    <tr>
      <td align="center" style="padding:0 12px;">

        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;background-color:#FFFFFF;border-radius:16px;overflow:hidden;border:1px solid #E2E8F0;">

          <tr>
            <td style="background-color:#0F172A;padding:22px 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="font-size:18px;font-weight:800;color:#FFFFFF;">NextGen CTO</td>
                  <td align="right" style="font-size:12px;color:#CBD5E1;">{{college_name}}</td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:30px 26px 10px 26px;color:#0F172A;">

              <p style="margin:0 0 10px 0;font-size:12px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:#F97316;">
                Mentorship Session
              </p>

              <h1 style="margin:0 0 14px 0;font-size:25px;line-height:1.25;color:#0F172A;font-weight:800;">
                You''re invited to a practical mentorship session
              </h1>

              <p style="margin:0 0 16px 0;font-size:15px;line-height:1.7;color:#334155;">
                Hi {{first_name}},
              </p>

              <p style="margin:0 0 18px 0;font-size:15px;line-height:1.7;color:#334155;">
                You are invited to a mentorship session with <strong>{{mentor_name}}</strong>. This session is meant to be practical, direct, and useful.
              </p>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;margin:0 0 18px 0;">
                <tr>
                  <td style="padding:16px 18px;">
                    <p style="margin:0 0 6px 0;font-size:14px;font-weight:800;color:#0F172A;">You will get clarity on:</p>
                    <p style="margin:0;font-size:14px;line-height:1.8;color:#334155;">
                      What to prioritize first<br>
                      How to avoid random learning<br>
                      How to build better project proof<br>
                      How to improve your Resume, GitHub, and LinkedIn<br>
                      How to prepare with more confidence for interviews<br>
                      How to use AI, fundamentals, and projects together
                    </p>
                  </td>
                </tr>
              </table>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#FFF7ED;border:1px solid #FED7AA;border-radius:12px;margin:0 0 18px 0;">
                <tr>
                  <td style="padding:16px 18px;">
                    <p style="margin:0 0 6px 0;font-size:14px;font-weight:800;color:#9A3412;">Session details:</p>
                    <p style="margin:0;font-size:14px;line-height:1.8;color:#9A3412;">
                      Date: {{session_date}}<br>
                      Time: {{session_time}}<br>
                      Zoom Link: <a href="{{zoom_meeting_url}}" style="color:#2563EB;text-decoration:underline;">{{zoom_meeting_url}}</a>
                    </p>
                  </td>
                </tr>
              </table>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px 0;">
                <tr>
                  <td bgcolor="#F97316" style="border-radius:10px;">
                    <a href="{{cta_url}}" style="display:inline-block;padding:13px 22px;font-size:14px;font-weight:800;color:#FFFFFF;text-decoration:none;">
                      {{cta_label}}
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 20px 0;font-size:15px;line-height:1.7;color:#334155;">
                Come with a learner mindset. You do not need to have everything figured out.
              </p>

              <p style="margin:0 0 8px 0;font-size:13px;color:#64748B;">
                Need help before the session?
              </p>
              <p style="margin:0;font-size:13px;color:#64748B;">
                Support: <a href="{{support_url}}" style="color:#2563EB;text-decoration:underline;">{{support_url}}</a>
              </p>

            </td>
          </tr>

          <tr>
            <td style="padding:22px 26px 28px 26px;text-align:center;background-color:#F8FAFC;border-top:1px solid #E2E8F0;">
              <p style="margin:0 0 6px 0;font-size:12px;color:#64748B;">
                You are receiving this email because you are part of {{program_name}} at {{college_name}}.
              </p>
              <a href="{{unsubscribe_url}}" style="font-size:12px;color:#64748B;text-decoration:underline;">Unsubscribe or manage preferences</a>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>$$,
  $$MENTORSHIP SESSION

You're invited to a practical mentorship session

Hi {{first_name}},

You are invited to a mentorship session with {{mentor_name}}. This session is meant to be practical, direct, and useful.

You will get clarity on:
- What to prioritize first
- How to avoid random learning
- How to build better project proof
- How to improve your Resume, GitHub, and LinkedIn
- How to prepare with more confidence for interviews
- How to use AI, fundamentals, and projects together

Session details:
- Date: {{session_date}}
- Time: {{session_time}}
- Zoom Link: {{zoom_meeting_url}}

{{cta_label}}: {{cta_url}}

Come with a learner mindset. You do not need to have everything figured out.

Need help? Support: {{support_url}}

---
You are receiving this email because you are part of {{program_name}} at {{college_name}}.
Unsubscribe or manage preferences: {{unsubscribe_url}}$$,
  '[
    {"key":"first_name","label":"Student first name","required":false,"sample":"Rahul","inputType":"text","source":"recipient"},
    {"key":"college_name","label":"College name","required":false,"sample":"ABC Institute of Technology","inputType":"text","source":"recipient"},
    {"key":"mentor_name","label":"Mentor / speaker name(s)","required":true,"placeholder":"Enter mentor or speaker name(s)","inputType":"text","source":"campaign"},
    {"key":"session_date","label":"Session date","required":true,"inputType":"date","source":"campaign"},
    {"key":"session_time","label":"Session time","required":true,"placeholder":"5:00 PM IST","inputType":"text","source":"campaign"},
    {"key":"zoom_meeting_url","label":"Zoom meeting link","required":true,"placeholder":"https://zoom.us/j/...","inputType":"url","source":"campaign"},
    {"key":"program_name","label":"Program name","required":true,"sample":"NextGen CTO Career Readiness Program","inputType":"text","source":"campaign"},
    {"key":"cta_label","label":"CTA button text","required":true,"sample":"Join the Mentorship Session","inputType":"text","source":"campaign"},
    {"key":"cta_url","label":"Session details URL","required":true,"placeholder":"https://...","inputType":"url","source":"campaign"},
    {"key":"support_url","label":"Support URL","required":false,"placeholder":"https://...","inputType":"url","source":"system"},
    {"key":"unsubscribe_url","label":"Unsubscribe URL","required":false,"inputType":"url","source":"system"}
  ]'::jsonb,
  true,
  true
)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  category = excluded.category,
  subject_template = excluded.subject_template,
  preview_text_template = excluded.preview_text_template,
  html_template = excluded.html_template,
  text_template = excluded.text_template,
  variables = excluded.variables,
  is_system = true,
  is_active = true,
  updated_at = now();

-- ============================================================================
-- 9. certificate-eligibility-notice
-- ============================================================================
insert into public.email_templates (name, slug, category, description, subject_template, preview_text_template, html_template, text_template, variables, is_system, is_active)
values (
  'Certificate Eligibility Notice',
  'certificate-eligibility-notice',
  'operational',
  'Notify students about certificate eligibility status and remaining milestones to complete for the Industry Ready Certificate.',
  'You''re close to earning your certificate',
  'Complete your remaining milestones and move closer to your Industry Ready Certificate.',
  $$<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Certificate Eligibility Notice</title>
</head>
<body style="margin:0;padding:0;background-color:#F1F5F9;font-family:Arial,Helvetica,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;line-height:1px;font-size:1px;">
    Complete your remaining milestones and move closer to your Industry Ready Certificate.
  </div>

  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F1F5F9;padding:24px 0;">
    <tr>
      <td align="center" style="padding:0 12px;">

        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;background-color:#FFFFFF;border-radius:16px;overflow:hidden;border:1px solid #E2E8F0;">

          <tr>
            <td style="background-color:#0F172A;padding:22px 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="font-size:18px;font-weight:800;color:#FFFFFF;">NextGen CTO</td>
                  <td align="right" style="font-size:12px;color:#CBD5E1;">{{college_name}}</td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:30px 26px 10px 26px;color:#0F172A;">

              <p style="margin:0 0 10px 0;font-size:12px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:#F97316;">
                Certificate Eligibility
              </p>

              <h1 style="margin:0 0 14px 0;font-size:25px;line-height:1.25;color:#0F172A;font-weight:800;">
                You''re close to earning your certificate
              </h1>

              <p style="margin:0 0 16px 0;font-size:15px;line-height:1.7;color:#334155;">
                Hi {{first_name}},
              </p>

              <p style="margin:0 0 18px 0;font-size:15px;line-height:1.7;color:#334155;">
                You are getting closer to completing <strong>{{program_name}}</strong>. Your Industry Ready Certificate is proof that you stayed consistent, completed required milestones, and moved closer to becoming career-ready.
              </p>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;margin:0 0 18px 0;">
                <tr>
                  <td style="padding:16px 18px;">
                    <p style="margin:0 0 6px 0;font-size:14px;font-weight:800;color:#0F172A;">Before your certificate can be issued:</p>
                    <p style="margin:0;font-size:14px;line-height:1.8;color:#334155;">
                      Complete the required learning modules<br>
                      Finish your project work<br>
                      Update your Resume, GitHub, and LinkedIn<br>
                      Complete the required readiness activities
                    </p>
                  </td>
                </tr>
              </table>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px 0;">
                <tr>
                  <td bgcolor="#F97316" style="border-radius:10px;">
                    <a href="{{cta_url}}" style="display:inline-block;padding:13px 22px;font-size:14px;font-weight:800;color:#FFFFFF;text-decoration:none;">
                      {{cta_label}}
                    </a>
                  </td>
                </tr>
              </table>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#FFF7ED;border:1px solid #FED7AA;border-radius:12px;margin:0 0 22px 0;">
                <tr>
                  <td style="padding:16px 18px;">
                    <p style="margin:0;font-size:14px;line-height:1.7;color:#9A3412;">
                      Do not leave this for the last moment. A few pending steps can delay your certificate.
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 8px 0;font-size:13px;color:#64748B;">
                If your certificate is already available:
              </p>
              <p style="margin:0 0 20px 0;font-size:13px;color:#64748B;">
                <a href="{{certificate_url}}" style="color:#2563EB;text-decoration:underline;">{{certificate_url}}</a>
              </p>

              <p style="margin:0 0 8px 0;font-size:13px;color:#64748B;">
                Need help?
              </p>
              <p style="margin:0;font-size:13px;color:#64748B;">
                Support: <a href="{{support_url}}" style="color:#2563EB;text-decoration:underline;">{{support_url}}</a>
              </p>

            </td>
          </tr>

          <tr>
            <td style="padding:22px 26px 28px 26px;text-align:center;background-color:#F8FAFC;border-top:1px solid #E2E8F0;">
              <p style="margin:0 0 6px 0;font-size:12px;color:#64748B;">
                You are receiving this email because you are part of {{program_name}} at {{college_name}}.
              </p>
              <a href="{{unsubscribe_url}}" style="font-size:12px;color:#64748B;text-decoration:underline;">Unsubscribe or manage preferences</a>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>$$,
  $$CERTIFICATE ELIGIBILITY

You're close to earning your certificate

Hi {{first_name}},

You are getting closer to completing {{program_name}}. Your Industry Ready Certificate is proof that you stayed consistent, completed required milestones, and moved closer to becoming career-ready.

Before your certificate can be issued:
- Complete the required learning modules
- Finish your project work
- Update your Resume, GitHub, and LinkedIn
- Complete the required readiness activities

{{cta_label}}: {{cta_url}}

If your certificate is already available: {{certificate_url}}

Do not leave this for the last moment.

Need help? Support: {{support_url}}

---
You are receiving this email because you are part of {{program_name}} at {{college_name}}.
Unsubscribe or manage preferences: {{unsubscribe_url}}$$,
  '[
    {"key":"first_name","label":"Student first name","required":false,"sample":"Rahul","inputType":"text","source":"recipient"},
    {"key":"college_name","label":"College name","required":false,"sample":"ABC Institute of Technology","inputType":"text","source":"recipient"},
    {"key":"program_name","label":"Program name","required":true,"sample":"NextGen CTO Career Readiness Program","inputType":"text","source":"campaign"},
    {"key":"cta_url","label":"Eligibility checklist URL","required":true,"placeholder":"https://...","inputType":"url","source":"campaign"},
    {"key":"cta_label","label":"CTA button text","required":true,"sample":"Check Certificate Eligibility","inputType":"text","source":"campaign"},
    {"key":"certificate_url","label":"Certificate URL","required":false,"placeholder":"Optional certificate download/view URL","inputType":"url","source":"campaign"},
    {"key":"support_url","label":"Support URL","required":false,"placeholder":"https://...","inputType":"url","source":"system"},
    {"key":"unsubscribe_url","label":"Unsubscribe URL","required":false,"inputType":"url","source":"system"}
  ]'::jsonb,
  true,
  true
)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  category = excluded.category,
  subject_template = excluded.subject_template,
  preview_text_template = excluded.preview_text_template,
  html_template = excluded.html_template,
  text_template = excluded.text_template,
  variables = excluded.variables,
  is_system = true,
  is_active = true,
  updated_at = now();

-- ============================================================================
-- 10. college-admin-progress-report
-- ============================================================================
insert into public.email_templates (name, slug, category, description, subject_template, preview_text_template, html_template, text_template, variables, is_system, is_active)
values (
  'College Admin Progress Report',
  'college-admin-progress-report',
  'operational',
  'Send college admins a progress snapshot of student readiness signals and next steps.',
  '{{program_name}} progress snapshot for {{college_name}}',
  'A quick view of student progress, readiness signals, and next steps.',
  $$<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>College Admin Progress Report</title>
</head>
<body style="margin:0;padding:0;background-color:#F1F5F9;font-family:Arial,Helvetica,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;line-height:1px;font-size:1px;">
    A quick view of student progress, readiness signals, and next steps.
  </div>

  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F1F5F9;padding:24px 0;">
    <tr>
      <td align="center" style="padding:0 12px;">

        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;background-color:#FFFFFF;border-radius:16px;overflow:hidden;border:1px solid #E2E8F0;">

          <tr>
            <td style="background-color:#0F172A;padding:22px 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="font-size:18px;font-weight:800;color:#FFFFFF;">NextGen CTO</td>
                  <td align="right" style="font-size:12px;color:#CBD5E1;">{{college_name}}</td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:30px 26px 10px 26px;color:#0F172A;">

              <p style="margin:0 0 10px 0;font-size:12px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:#F97316;">
                Progress Report
              </p>

              <h1 style="margin:0 0 14px 0;font-size:25px;line-height:1.25;color:#0F172A;font-weight:800;">
                {{program_name}} progress snapshot for {{college_name}}
              </h1>

              <p style="margin:0 0 18px 0;font-size:15px;line-height:1.7;color:#334155;">
                Here is the latest progress snapshot for <strong>{{college_name}}</strong> under <strong>{{program_name}}</strong>.
              </p>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;margin:0 0 18px 0;">
                <tr>
                  <td style="padding:16px 18px;">
                    <p style="margin:0 0 6px 0;font-size:14px;font-weight:800;color:#0F172A;">Overall progress: <span style="color:#F97316;">{{progress_percent}}%</span></p>
                  </td>
                </tr>
              </table>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#EFF6FF;border:1px solid #BFDBFE;border-radius:12px;margin:0 0 18px 0;">
                <tr>
                  <td style="padding:16px 18px;">
                    <p style="margin:0 0 6px 0;font-size:14px;font-weight:800;color:#1E3A8A;">Report includes:</p>
                    <p style="margin:0;font-size:14px;line-height:1.8;color:#1E3A8A;">
                      Student participation trends<br>
                      Module and learning progress<br>
                      Project completion signals<br>
                      Resume, GitHub, and LinkedIn readiness<br>
                      Interview and career-preparation indicators
                    </p>
                  </td>
                </tr>
              </table>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px 0;">
                <tr>
                  <td bgcolor="#F97316" style="border-radius:10px;">
                    <a href="{{cta_url}}" style="display:inline-block;padding:13px 22px;font-size:14px;font-weight:800;color:#FFFFFF;text-decoration:none;">
                      {{cta_label}}
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 8px 0;font-size:13px;color:#64748B;">
                Dashboard: <a href="{{dashboard_url}}" style="color:#2563EB;text-decoration:underline;">{{dashboard_url}}</a>
              </p>
              <p style="margin:0 0 20px 0;font-size:13px;color:#64748B;">
                Support: <a href="{{support_url}}" style="color:#2563EB;text-decoration:underline;">{{support_url}}</a>
              </p>

            </td>
          </tr>

          <tr>
            <td style="padding:22px 26px 28px 26px;text-align:center;background-color:#F8FAFC;border-top:1px solid #E2E8F0;">
              <p style="margin:0;font-size:12px;color:#64748B;">
                This progress report is shared by NextGen CTO for {{college_name}}.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>$$,
  $$PROGRESS REPORT

{{program_name}} progress snapshot for {{college_name}}

Here is the latest progress snapshot for {{college_name}} under {{program_name}}.

Overall progress: {{progress_percent}}%

Report includes:
- Student participation trends
- Module and learning progress
- Project completion signals
- Resume, GitHub, and LinkedIn readiness
- Interview and career-preparation indicators

{{cta_label}}: {{cta_url}}

Dashboard: {{dashboard_url}}
Support: {{support_url}}

---
This progress report is shared by NextGen CTO for {{college_name}}.$$,
  '[
    {"key":"college_name","label":"College name","required":false,"sample":"ABC Institute of Technology","inputType":"text","source":"recipient"},
    {"key":"program_name","label":"Program name","required":true,"sample":"NextGen CTO Career Readiness Program","inputType":"text","source":"campaign"},
    {"key":"progress_percent","label":"Overall progress percentage","required":true,"placeholder":"72","inputType":"number","source":"campaign"},
    {"key":"cta_url","label":"Full report URL","required":true,"placeholder":"https://...","inputType":"url","source":"campaign"},
    {"key":"cta_label","label":"CTA button text","required":true,"sample":"View Full Progress Report","inputType":"text","source":"campaign"},
    {"key":"dashboard_url","label":"Dashboard URL","required":false,"placeholder":"https://...","inputType":"url","source":"system"},
    {"key":"support_url","label":"Support URL","required":false,"placeholder":"https://...","inputType":"url","source":"system"}
  ]'::jsonb,
  true,
  true
)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  category = excluded.category,
  subject_template = excluded.subject_template,
  preview_text_template = excluded.preview_text_template,
  html_template = excluded.html_template,
  text_template = excluded.text_template,
  variables = excluded.variables,
  is_system = true,
  is_active = true,
  updated_at = now();

-- ============================================================================
-- 11. program-deadline-alert
-- ============================================================================
insert into public.email_templates (name, slug, category, description, subject_template, preview_text_template, html_template, text_template, variables, is_system, is_active)
values (
  'Program Deadline Alert',
  'program-deadline-alert',
  'notice',
  'Alert students about upcoming program deadlines and pending steps to complete.',
  'Complete your remaining steps before {{deadline_date}}',
  'A few pending steps can delay your progress. Check what''s left and complete it on time.',
  $$<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Program Deadline Alert</title>
</head>
<body style="margin:0;padding:0;background-color:#F1F5F9;font-family:Arial,Helvetica,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;line-height:1px;font-size:1px;">
    A few pending steps can delay your progress. Check what's left and complete it on time.
  </div>

  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F1F5F9;padding:24px 0;">
    <tr>
      <td align="center" style="padding:0 12px;">

        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;background-color:#FFFFFF;border-radius:16px;overflow:hidden;border:1px solid #E2E8F0;">

          <tr>
            <td style="background-color:#0F172A;padding:22px 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="font-size:18px;font-weight:800;color:#FFFFFF;">NextGen CTO</td>
                  <td align="right" style="font-size:12px;color:#CBD5E1;">{{college_name}}</td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:30px 26px 10px 26px;color:#0F172A;">

              <p style="margin:0 0 10px 0;font-size:12px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:#F97316;">
                Deadline Reminder
              </p>

              <h1 style="margin:0 0 14px 0;font-size:25px;line-height:1.25;color:#0F172A;font-weight:800;">
                Complete your remaining steps before {{deadline_date}}
              </h1>

              <p style="margin:0 0 16px 0;font-size:15px;line-height:1.7;color:#334155;">
                Hi {{first_name}},
              </p>

              <p style="margin:0 0 18px 0;font-size:15px;line-height:1.7;color:#334155;">
                The deadline to complete your remaining steps in <strong>{{program_name}}</strong> is <strong>{{deadline_date}}</strong>. This is not to create pressure. It is to make sure you do not miss progress because of a few pending tasks.
              </p>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;margin:0 0 18px 0;">
                <tr>
                  <td style="padding:16px 18px;">
                    <p style="margin:0 0 6px 0;font-size:14px;font-weight:800;color:#0F172A;">Check if any of these are still pending:</p>
                    <p style="margin:0;font-size:14px;line-height:1.8;color:#334155;">
                      Project submission<br>
                      Profile updates<br>
                      Resume, GitHub, or LinkedIn work<br>
                      Readiness activities<br>
                      Final checklist items
                    </p>
                  </td>
                </tr>
              </table>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px 0;">
                <tr>
                  <td bgcolor="#F97316" style="border-radius:10px;">
                    <a href="{{cta_url}}" style="display:inline-block;padding:13px 22px;font-size:14px;font-weight:800;color:#FFFFFF;text-decoration:none;">
                      {{cta_label}}
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 20px 0;font-size:15px;line-height:1.7;color:#334155;">
                Take a few minutes today to complete what is still incomplete.
              </p>

              <p style="margin:0 0 8px 0;font-size:13px;color:#64748B;">
                Dashboard: <a href="{{dashboard_url}}" style="color:#2563EB;text-decoration:underline;">{{dashboard_url}}</a>
              </p>
              <p style="margin:0;font-size:13px;color:#64748B;">
                Support: <a href="{{support_url}}" style="color:#2563EB;text-decoration:underline;">{{support_url}}</a>
              </p>

            </td>
          </tr>

          <tr>
            <td style="padding:22px 26px 28px 26px;text-align:center;background-color:#F8FAFC;border-top:1px solid #E2E8F0;">
              <p style="margin:0 0 6px 0;font-size:12px;color:#64748B;">
                You are receiving this email because you are part of {{program_name}} at {{college_name}}.
              </p>
              <a href="{{unsubscribe_url}}" style="font-size:12px;color:#64748B;text-decoration:underline;">Unsubscribe or manage preferences</a>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>$$,
  $$DEADLINE REMINDER

Complete your remaining steps before {{deadline_date}}

Hi {{first_name}},

The deadline to complete your remaining steps in {{program_name}} is {{deadline_date}}. This is not to create pressure. It is to make sure you do not miss progress because of a few pending tasks.

Check if any of these are still pending:
- Project submission
- Profile updates
- Resume, GitHub, or LinkedIn work
- Readiness activities
- Final checklist items

{{cta_label}}: {{cta_url}}

Dashboard: {{dashboard_url}}
Support: {{support_url}}

---
You are receiving this email because you are part of {{program_name}} at {{college_name}}.
Unsubscribe or manage preferences: {{unsubscribe_url}}$$,
  '[
    {"key":"first_name","label":"Student first name","required":false,"sample":"Rahul","inputType":"text","source":"recipient"},
    {"key":"college_name","label":"College name","required":false,"sample":"ABC Institute of Technology","inputType":"text","source":"recipient"},
    {"key":"program_name","label":"Program name","required":true,"sample":"NextGen CTO Career Readiness Program","inputType":"text","source":"campaign"},
    {"key":"deadline_date","label":"Deadline date","required":true,"inputType":"date","source":"campaign"},
    {"key":"cta_url","label":"Deadline checklist URL","required":true,"placeholder":"https://...","inputType":"url","source":"campaign"},
    {"key":"cta_label","label":"CTA button text","required":true,"sample":"View Remaining Steps","inputType":"text","source":"campaign"},
    {"key":"dashboard_url","label":"Dashboard URL","required":false,"placeholder":"https://...","inputType":"url","source":"system"},
    {"key":"support_url","label":"Support URL","required":false,"placeholder":"https://...","inputType":"url","source":"system"},
    {"key":"unsubscribe_url","label":"Unsubscribe URL","required":false,"inputType":"url","source":"system"}
  ]'::jsonb,
  true,
  true
)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  category = excluded.category,
  subject_template = excluded.subject_template,
  preview_text_template = excluded.preview_text_template,
  html_template = excluded.html_template,
  text_template = excluded.text_template,
  variables = excluded.variables,
  is_system = true,
  is_active = true,
  updated_at = now();

-- ============================================================================
-- 12. advanced-addons-teaser
-- ============================================================================
insert into public.email_templates (name, slug, category, description, subject_template, preview_text_template, html_template, text_template, variables, is_system, is_active)
values (
  'Advanced Add-ons Teaser',
  'advanced-addons-teaser',
  'marketing',
  'Tease optional advanced add-on learning paths for students who want to go deeper after the core program.',
  'Ready to go deeper after the core program?',
  'Explore optional advanced add-ons when you are ready for the next level.',
  $$<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Advanced Add-ons</title>
</head>
<body style="margin:0;padding:0;background-color:#F1F5F9;font-family:Arial,Helvetica,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;line-height:1px;font-size:1px;">
    Explore optional advanced add-ons when you are ready for the next level.
  </div>

  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F1F5F9;padding:24px 0;">
    <tr>
      <td align="center" style="padding:0 12px;">

        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;background-color:#FFFFFF;border-radius:16px;overflow:hidden;border:1px solid #E2E8F0;">

          <tr>
            <td style="background-color:#0F172A;padding:22px 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="font-size:18px;font-weight:800;color:#FFFFFF;">NextGen CTO</td>
                  <td align="right" style="font-size:12px;color:#CBD5E1;">{{college_name}}</td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:30px 26px 10px 26px;color:#0F172A;">

              <p style="margin:0 0 10px 0;font-size:12px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:#F97316;">
                Optional Advanced Add-ons
              </p>

              <h1 style="margin:0 0 14px 0;font-size:25px;line-height:1.25;color:#0F172A;font-weight:800;">
                Ready to go deeper after the core program?
              </h1>

              <p style="margin:0 0 16px 0;font-size:15px;line-height:1.7;color:#334155;">
                Hi {{first_name}},
              </p>

              <p style="margin:0 0 18px 0;font-size:15px;line-height:1.7;color:#334155;">
                Once you build your foundations inside <strong>{{program_name}}</strong>, the next question is simple: what should you learn next? Advanced add-ons are optional learning paths for students who want to go deeper after the core career readiness journey.
              </p>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;margin:0 0 18px 0;">
                <tr>
                  <td style="padding:16px 18px;">
                    <p style="margin:0 0 6px 0;font-size:14px;font-weight:800;color:#0F172A;">You can explore areas like:</p>
                    <p style="margin:0;font-size:14px;line-height:1.8;color:#334155;">
                      System Design — HLD and LLD<br>
                      Advanced DSA<br>
                      Advanced AI and applied AI engineering<br>
                      Scalability concepts<br>
                      Advanced hands-on exercises<br>
                      Additional mentorship support
                    </p>
                  </td>
                </tr>
              </table>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#EFF6FF;border:1px solid #BFDBFE;border-radius:12px;margin:0 0 22px 0;">
                <tr>
                  <td style="padding:16px 18px;">
                    <p style="margin:0;font-size:14px;line-height:1.7;color:#1E3A8A;">
                      This is not mandatory. Your first goal is to complete your current roadmap, build projects, and improve your profile. But if you are serious about going further, these add-ons can help you choose a deeper path.
                    </p>
                  </td>
                </tr>
              </table>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px 0;">
                <tr>
                  <td bgcolor="#F97316" style="border-radius:10px;">
                    <a href="{{cta_url}}" style="display:inline-block;padding:13px 22px;font-size:14px;font-weight:800;color:#FFFFFF;text-decoration:none;">
                      {{cta_label}}
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 20px 0;font-size:15px;line-height:1.7;color:#334155;">
                The first goal is to complete your current roadmap, build projects, and improve your profile. These add-ons are here when you are ready for the next level.
              </p>

              <p style="margin:0 0 8px 0;font-size:13px;color:#64748B;">
                Need help deciding?
              </p>
              <p style="margin:0;font-size:13px;color:#64748B;">
                Support: <a href="{{support_url}}" style="color:#2563EB;text-decoration:underline;">{{support_url}}</a>
              </p>

            </td>
          </tr>

          <tr>
            <td style="padding:22px 26px 28px 26px;text-align:center;background-color:#F8FAFC;border-top:1px solid #E2E8F0;">
              <p style="margin:0 0 6px 0;font-size:12px;color:#64748B;">
                You are receiving this email because you are part of {{program_name}} at {{college_name}}.
              </p>
              <a href="{{unsubscribe_url}}" style="font-size:12px;color:#64748B;text-decoration:underline;">Unsubscribe or manage preferences</a>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>$$,
  $$OPTIONAL ADVANCED ADD-ONS

Ready to go deeper after the core program?

Hi {{first_name}},

Once you build your foundations inside {{program_name}}, the next question is simple: what should you learn next? Advanced add-ons are optional learning paths for students who want to go deeper after the core career readiness journey.

You can explore areas like:
- System Design — HLD and LLD
- Advanced DSA
- Advanced AI and applied AI engineering
- Scalability concepts
- Advanced hands-on exercises
- Additional mentorship support

This is not mandatory. Your first goal is to complete your current roadmap, build projects, and improve your profile.

{{cta_label}}: {{cta_url}}

Need help deciding? Support: {{support_url}}

---
You are receiving this email because you are part of {{program_name}} at {{college_name}}.
Unsubscribe or manage preferences: {{unsubscribe_url}}$$,
  '[
    {"key":"first_name","label":"Student first name","required":false,"sample":"Rahul","inputType":"text","source":"recipient"},
    {"key":"college_name","label":"College name","required":false,"sample":"ABC Institute of Technology","inputType":"text","source":"recipient"},
    {"key":"program_name","label":"Program name","required":true,"sample":"NextGen CTO Career Readiness Program","inputType":"text","source":"campaign"},
    {"key":"cta_url","label":"Add-ons page URL","required":true,"placeholder":"https://...","inputType":"url","source":"campaign"},
    {"key":"cta_label","label":"CTA button text","required":true,"sample":"Explore Advanced Add-ons","inputType":"text","source":"campaign"},
    {"key":"support_url","label":"Support URL","required":false,"placeholder":"https://...","inputType":"url","source":"system"},
    {"key":"unsubscribe_url","label":"Unsubscribe URL","required":false,"inputType":"url","source":"system"}
  ]'::jsonb,
  true,
  true
)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  category = excluded.category,
  subject_template = excluded.subject_template,
  preview_text_template = excluded.preview_text_template,
  html_template = excluded.html_template,
  text_template = excluded.text_template,
  variables = excluded.variables,
  is_system = true,
  is_active = true,
  updated_at = now();

commit;