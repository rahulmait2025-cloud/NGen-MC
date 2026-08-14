-- Email Center: Update approved HTML and variables for three templates
-- Migration: 00114_email_center_update_three_template_html_and_variables.sql

begin;

-- 1. ai-agentic-ai-module-announcement
insert into public.email_templates (name, slug, category, description, subject_template, preview_text_template, html_template, text_template, variables, is_system, is_active)
values (
    'AI and Agentic AI Module Announcement',
    'ai-agentic-ai-module-announcement',
    'announcement',
    'Announce the AI and modern development module.',
    'Learn how modern developers use AI to build faster',
    'Your {{module_name}} module is now available inside {{program_name}}.',
    $$<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>{{module_name}}</title>
</head>
<body style="margin:0;padding:0;background-color:#F1F5F9;font-family:Arial,Helvetica,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;line-height:1px;font-size:1px;">
    Your {{module_name}} module is now available inside {{program_name}}.
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
                Learn how modern developers use AI to build faster
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
                    <p style="margin:0;font-size:14px;line-height:1.7;color:#334155;">
                      AI-assisted coding, prompt thinking, generative and agentic AI basics, simple automation workflows, and hands-on AI project practice.
                    </p>
                  </td>
                </tr>
              </table>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#FFF7ED;border:1px solid #FED7AA;border-radius:12px;margin:0 0 22px 0;">
                <tr>
                  <td style="padding:16px 18px;">
                    <p style="margin:0;font-size:14px;line-height:1.7;color:#9A3412;">
                      The goal is simple: use AI as a support system, not a shortcut. AI can help you move faster, but your fundamentals help you know whether the output actually makes sense.
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
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:22px 26px 28px 26px;text-align:center;">
              <a href="{{dashboard_url}}" style="font-size:12px;color:#64748B;text-decoration:underline;">Open dashboard</a>
              <span style="font-size:12px;color:#CBD5E1;"> &nbsp;|&nbsp; </span>
              <a href="{{unsubscribe_url}}" style="font-size:12px;color:#64748B;text-decoration:underline;">Unsubscribe</a>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>$$,
    $$Hi {{first_name}},

AI is changing how developers write, debug, and build software. But the real advantage is not just using AI tools. It is knowing how to use them with strong fundamentals and clear thinking.

Your {{module_name}} module is now available inside {{program_name}}.

{{cta_label}}: {{cta_url}}

In this module, you will explore:
- AI-assisted coding
- Prompt thinking
- Generative and agentic AI basics
- Simple automation workflows
- Hands-on AI project practice

The goal is simple: use AI as a support system, not a shortcut. AI can help you move faster, but your fundamentals help you know whether the output actually makes sense.

Start the module, complete the activities, and see how AI fits into real development work.

Support: {{support_url}}
Open dashboard: {{dashboard_url}}
Unsubscribe: {{unsubscribe_url}}$$,
    '[
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

-- 2. project-completion-nudge
insert into public.email_templates (name, slug, category, description, subject_template, preview_text_template, html_template, text_template, variables, is_system, is_active)
values (
    'Project Completion Nudge',
    'project-completion-nudge',
    'notification',
    'Nudge students to complete portfolio and project milestones.',
    'Your project can become your strongest proof',
    'A finished project is more powerful than a half-learned concept.',
    $$<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>{{project_name}}</title>
</head>
<body style="margin:0;padding:0;background-color:#F1F5F9;font-family:Arial,Helvetica,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;line-height:1px;font-size:1px;">
    A finished project is more powerful than a half-learned concept.
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
                Quick reminder — your <strong>{{project_name}}</strong> milestone inside <strong>{{program_name}}</strong> is waiting for you.
              </p>

              <p style="margin:0 0 22px 0;font-size:15px;line-height:1.7;color:#334155;">
                And this is one milestone you should not ignore. A completed project shows something theory cannot: that you can actually build.
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
                      Finish the core features.<br>
                      Push your code to GitHub.<br>
                      Write a simple README.<br>
                      Mention what the project does and what you learned.
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 20px 0;font-size:15px;line-height:1.7;color:#334155;">
                That is enough to turn this from “just another task” into a real career asset.
              </p>

              <p style="margin:0 0 8px 0;font-size:13px;color:#64748B;">
                Stuck somewhere? That is normal. Use the support channel and keep moving one step at a time.
              </p>
              <p style="margin:0;font-size:13px;color:#64748B;">
                Support: <a href="{{support_url}}" style="color:#2563EB;text-decoration:underline;">{{support_url}}</a>
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:22px 26px 28px 26px;text-align:center;">
              <a href="{{dashboard_url}}" style="font-size:12px;color:#64748B;text-decoration:underline;">Open dashboard</a>
              <span style="font-size:12px;color:#CBD5E1;"> &nbsp;|&nbsp; </span>
              <a href="{{unsubscribe_url}}" style="font-size:12px;color:#64748B;text-decoration:underline;">Unsubscribe</a>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>$$,
    $$Hi {{first_name}},

Quick reminder: your {{project_name}} milestone inside {{program_name}} is waiting for you.

A completed project shows something theory cannot: that you can actually build.

{{cta_label}}: {{cta_url}}

Keep your next step simple:
- Finish the core features.
- Push your code to GitHub.
- Write a simple README.
- Mention what the project does and what you learned.

Do not aim for perfect right now. Aim for complete. A working project can always be improved, but an unfinished project cannot help your portfolio.

That is enough to turn this into a real career asset.

Support: {{support_url}}
Open dashboard: {{dashboard_url}}
Unsubscribe: {{unsubscribe_url}}$$,
    '[
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

-- 3. resume-github-linkedin-reminder
insert into public.email_templates (name, slug, category, description, subject_template, preview_text_template, html_template, text_template, variables, is_system, is_active)
values (
    'Resume, GitHub, LinkedIn Reminder',
    'resume-github-linkedin-reminder',
    'notification',
    'Reminder to complete resume and profile readiness tasks.',
    'Your profile should show your effort',
    'A clean resume, GitHub, and LinkedIn can make your work easier to notice.',
    $$<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Profile Readiness</title>
</head>
<body style="margin:0;padding:0;background-color:#F1F5F9;font-family:Arial,Helvetica,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;line-height:1px;font-size:1px;">
    A clean resume, GitHub, and LinkedIn can make your work easier to notice.
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
                Quick reminder — your Resume, GitHub, and LinkedIn are not just formalities.
              </p>

              <p style="margin:0 0 22px 0;font-size:15px;line-height:1.7;color:#334155;">
                They are the first places where someone understands what you have learned, what you have built, and how seriously you are preparing through <strong>{{program_name}}</strong>.
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
                      Update your resume.<br>
                      Clean your GitHub.<br>
                      Add proper project READMEs.<br>
                      Improve your LinkedIn headline.<br>
                      Keep your project links easy to find.
                    </p>
                  </td>
                </tr>
              </table>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#EFF6FF;border:1px solid #BFDBFE;border-radius:12px;margin:0 0 22px 0;">
                <tr>
                  <td style="padding:16px 18px;">
                    <p style="margin:0;font-size:14px;line-height:1.7;color:#1E3A8A;">
                      You do not need a perfect profile. You need a clear one — a profile that honestly shows your skills, projects, and progress.
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 20px 0;font-size:15px;line-height:1.7;color:#334155;">
                This makes it easier for mentors to guide you and easier for interviewers to understand your work.
              </p>

              <p style="margin:0 0 8px 0;font-size:13px;color:#64748B;">
                Need help improving it?
              </p>
              <p style="margin:0;font-size:13px;color:#64748B;">
                Support: <a href="{{support_url}}" style="color:#2563EB;text-decoration:underline;">{{support_url}}</a>
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:22px 26px 28px 26px;text-align:center;">
              <a href="{{dashboard_url}}" style="font-size:12px;color:#64748B;text-decoration:underline;">Open dashboard</a>
              <span style="font-size:12px;color:#CBD5E1;"> &nbsp;|&nbsp; </span>
              <a href="{{unsubscribe_url}}" style="font-size:12px;color:#64748B;text-decoration:underline;">Unsubscribe</a>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>$$,
    $$Hi {{first_name}},

Quick reminder: your Resume, GitHub, and LinkedIn are not just formalities.

They are the first places where someone understands what you have learned, what you have built, and how seriously you are preparing through {{program_name}}.

{{cta_label}}: {{cta_url}}

Keep this simple:
- Update your resume.
- Clean your GitHub.
- Add proper project READMEs.
- Improve your LinkedIn headline.
- Keep your project links easy to find.

You do not need a perfect profile. You need a clear one. A profile that honestly shows your skills, projects, and progress.

This makes it easier for mentors to guide you and easier for interviewers to understand your work.

Support: {{support_url}}
Open dashboard: {{dashboard_url}}
Unsubscribe: {{unsubscribe_url}}$$,
    '[
      {"key":"first_name","label":"First name","required":false,"sample":"Anuj","inputType":"text","source":"recipient"},
      {"key":"college_name","label":"College name","required":false,"sample":"Demo College","inputType":"text","source":"recipient"},
      {"key":"program_name","label":"Program name","required":true,"sample":"NextGen CTO Career Readiness Program","inputType":"text","source":"campaign"},
      {"key":"cta_url","label":"CTA URL","required":true,"sample":"https://example.com/profile","inputType":"url","source":"campaign"},
      {"key":"cta_label","label":"CTA label","required":true,"sample":"Complete Your Profiles","inputType":"text","source":"campaign"},
      {"key":"dashboard_url","label":"Dashboard URL","required":false,"sample":"https://example.com/dashboard","inputType":"url","source":"system"},
      {"key":"support_url","label":"Support URL","required":false,"sample":"https://example.com/support","inputType":"url","source":"system"},
      {"key":"unsubscribe_url","label":"Unsubscribe URL","required":false,"sample":"https://example.com/unsubscribe","inputType":"url","source":"system"}
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
