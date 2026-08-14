-- Email Center: final premium Career Readiness templates + dynamic fields
-- Migration: 00119_email_center_final_premium_templates_and_dynamic_fields.sql

begin;

-- ==========================================================================
-- 1. career-readiness-program-launch
-- ==========================================================================
insert into public.email_templates (
  name,
  slug,
  category,
  description,
  subject_template,
  preview_text_template,
  html_template,
  text_template,
  variables,
  is_system,
  is_active
)
values (
  'Career Readiness Program Launch',
  'career-readiness-program-launch',
  'marketing',
  'Launch announcement for the Career Readiness Program. Detailed walkthrough of the structured career readiness journey with foundations, projects, profiles, AI exposure, and interview preparation.',
  'Welcome to {{program_name}}',
  'Your college has enabled access to {{program_name}} — build foundations, projects, profiles, and interview readiness.',
  $$<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Welcome to {{program_name}}</title>
</head>
<body style="margin:0;padding:0;background-color:#F1F5F9;font-family:Arial,Helvetica,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;line-height:1px;font-size:1px;">
    Your college has enabled access to {{program_name}} - build foundations, projects, profiles, AI exposure, and interview readiness.
  </div>

  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F1F5F9;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;background-color:#FFFFFF;border:1px solid #E2E8F0;border-radius:16px;overflow:hidden;">

          <tr>
            <td style="background-color:#0B0F19;padding:22px 24px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="font-size:18px;font-weight:800;color:#FFFFFF;">NextGen CTO</td>
                  <td align="right" style="font-size:12px;color:#E5E7EB;">{{college_name}}</td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:28px 24px 10px 24px;">
              <p style="margin:0 0 8px 0;font-size:12px;font-weight:700;color:#F59E0B;text-transform:uppercase;letter-spacing:0.08em;">Program Launch</p>
              <h1 style="margin:0 0 10px 0;font-size:26px;line-height:1.25;color:#0F172A;font-weight:800;">Welcome to {{program_name}}</h1>
              <p style="margin:0 0 16px 0;font-size:13px;line-height:1.6;color:#64748B;">NextGen CTO × {{college_name}}</p>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 18px 0;">
                <tr>
                  <td style="height:2px;background-color:#F59E0B;"></td>
                </tr>
              </table>

              <p style="margin:0 0 14px 0;font-size:15px;line-height:1.7;color:#334155;">Hi {{first_name}},</p>
              <p style="margin:0 0 12px 0;font-size:15px;line-height:1.7;color:#334155;">Your college has enabled access to <strong>{{program_name}}</strong> - a structured career readiness journey designed to help you move from learning concepts to building real career assets.</p>
              <p style="margin:0 0 6px 0;font-size:15px;line-height:1.7;color:#334155;">This is not just another course.</p>
              <p style="margin:0 0 14px 0;font-size:15px;line-height:1.7;color:#334155;">It is designed to help you build the things that actually matter when you start preparing for internships, interviews, and your first serious career opportunities:</p>
              <ul style="margin:0 0 18px 0;padding-left:18px;">
                <li style="margin:0 0 8px 0;font-size:14px;line-height:1.6;color:#334155;">Strong technical foundations</li>
                <li style="margin:0 0 8px 0;font-size:14px;line-height:1.6;color:#334155;">Hands-on project experience</li>
                <li style="margin:0 0 8px 0;font-size:14px;line-height:1.6;color:#334155;">GitHub, Resume, and LinkedIn readiness</li>
                <li style="margin:0 0 8px 0;font-size:14px;line-height:1.6;color:#334155;">AI-powered development exposure</li>
                <li style="margin:0 0 8px 0;font-size:14px;line-height:1.6;color:#334155;">Interview and communication confidence</li>
                <li style="margin:0;font-size:14px;line-height:1.6;color:#334155;">Mentorship and community support</li>
              </ul>

              <p style="margin:0 0 8px 0;font-size:15px;font-weight:700;color:#0F172A;">Why this matters</p>
              <p style="margin:0 0 8px 0;font-size:15px;line-height:1.7;color:#334155;">Most students learn randomly.</p>
              <p style="margin:0 0 8px 0;font-size:15px;line-height:1.7;color:#334155;">One day DSA. One day web development. One day AI tools. One day resume building.</p>
              <p style="margin:0 0 8px 0;font-size:15px;line-height:1.7;color:#334155;">But without a clear path, learning becomes confusing.</p>
              <p style="margin:0 0 18px 0;font-size:15px;line-height:1.7;color:#334155;">{{program_name}} gives you a structured roadmap so you know what to learn, what to build, and how to present your work professionally.</p>

              <p style="margin:0 0 8px 0;font-size:15px;font-weight:700;color:#0F172A;">What you will work on</p>
              <ol style="margin:0 0 18px 0;padding-left:18px;">
                <li style="margin:0 0 10px 0;font-size:14px;line-height:1.6;color:#334155;"><strong>Build your technical base.</strong> Strengthen programming fundamentals, problem-solving thinking, web basics, backend concepts, APIs, databases, Git, and GitHub.</li>
                <li style="margin:0 0 10px 0;font-size:14px;line-height:1.6;color:#334155;"><strong>Explore modern AI-powered development.</strong> Learn how AI-assisted coding, prompt basics, generative AI, agentic AI concepts, and simple automation workflows fit into modern software development.</li>
                <li style="margin:0 0 10px 0;font-size:14px;line-height:1.6;color:#334155;"><strong>Create project proof.</strong> Work on portfolio-building and real-world application practice so your learning is visible, not hidden inside notebooks or theory.</li>
                <li style="margin:0 0 10px 0;font-size:14px;line-height:1.6;color:#334155;"><strong>Improve your career profile.</strong> Start building a stronger Resume, GitHub profile, and LinkedIn presence so you look more prepared when opportunities come.</li>
                <li style="margin:0;font-size:14px;line-height:1.6;color:#334155;"><strong>Prepare for interviews with confidence.</strong> Improve communication, structured thinking, interview mindset, and practical readiness with mentorship and guided support.</li>
              </ol>

              <p style="margin:0 0 8px 0;font-size:15px;font-weight:700;color:#0F172A;">What you should aim for</p>
              <p style="margin:0 0 10px 0;font-size:15px;line-height:1.7;color:#334155;">By the end of this journey, you should be able to show visible progress:</p>
              <ul style="margin:0 0 18px 0;padding-left:18px;">
                <li style="margin:0 0 8px 0;font-size:14px;line-height:1.6;color:#334155;">A stronger understanding of technical concepts</li>
                <li style="margin:0 0 8px 0;font-size:14px;line-height:1.6;color:#334155;">A GitHub profile with meaningful project work</li>
                <li style="margin:0 0 8px 0;font-size:14px;line-height:1.6;color:#334155;">A more complete Resume + LinkedIn profile</li>
                <li style="margin:0 0 8px 0;font-size:14px;line-height:1.6;color:#334155;">Better confidence in interviews and communication</li>
                <li style="margin:0 0 8px 0;font-size:14px;line-height:1.6;color:#334155;">Exposure to AI-driven development workflows</li>
                <li style="margin:0;font-size:14px;line-height:1.6;color:#334155;">A clear eligibility path for the NextGen CTO Academy Industry Ready Certificate</li>
              </ul>

              <p style="margin:0 0 8px 0;font-size:15px;font-weight:700;color:#0F172A;">Your first step</p>
              <p style="margin:0 0 6px 0;font-size:15px;line-height:1.7;color:#334155;">Open your dashboard, explore the roadmap, and start with the first recommended module.</p>
              <p style="margin:0 0 6px 0;font-size:15px;line-height:1.7;color:#334155;">Do not wait for the perfect time.</p>
              <p style="margin:0 0 16px 0;font-size:15px;line-height:1.7;color:#334155;">Start small. Stay consistent. Build visible proof.</p>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 16px 0;">
                <tr>
                  <td bgcolor="#F97316" style="border-radius:10px;">
                    <a href="{{cta_url}}" style="display:inline-block;padding:13px 20px;font-size:14px;font-weight:800;color:#FFFFFF;text-decoration:none;">{{cta_label}}</a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 6px 0;font-size:15px;font-weight:700;color:#0F172A;">Need help during the journey?</p>
              <p style="margin:0 0 8px 0;font-size:15px;line-height:1.7;color:#334155;">You are not expected to figure everything out alone. Use the support and community channels whenever you feel stuck.</p>
              <p style="margin:0 0 8px 0;font-size:13px;color:#64748B;">Support: <a href="{{support_url}}" style="color:#F97316;text-decoration:underline;">{{support_url}}</a></p>
            </td>
          </tr>

          <tr>
            <td style="padding:18px 24px;background-color:#F8FAFC;border-top:1px solid #E2E8F0;text-align:center;">
              <p style="margin:0 0 8px 0;font-size:12px;line-height:1.6;color:#64748B;">You are receiving this email because you are part of {{program_name}} at {{college_name}}.</p>
              <a href="{{unsubscribe_url}}" style="font-size:12px;color:#64748B;text-decoration:underline;">Unsubscribe or manage preferences</a>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>$$,
  $$Hi {{first_name}},

Your college has enabled access to {{program_name}} - a structured career readiness journey designed to help you move from learning concepts to building real career assets.

This is not just another course.

It is designed to help you build the things that actually matter when you start preparing for internships, interviews, and your first serious career opportunities:

Strong technical foundations
Hands-on project experience
GitHub, Resume, and LinkedIn readiness
AI-powered development exposure
Interview and communication confidence
Mentorship and community support

Why this matters

Most students learn randomly.

One day DSA.
One day web development.
One day AI tools.
One day resume building.

But without a clear path, learning becomes confusing.

{{program_name}} gives you a structured roadmap so you know what to learn, what to build, and how to present your work professionally.

What you will work on

1. Build your technical base
   Strengthen programming fundamentals, problem-solving thinking, web basics, backend concepts, APIs, databases, Git, and GitHub.

2. Explore modern AI-powered development
   Learn how AI-assisted coding, prompt basics, generative AI, agentic AI concepts, and simple automation workflows fit into modern software development.

3. Create project proof
   Work on portfolio-building and real-world application practice so your learning is visible, not hidden inside notebooks or theory.

4. Improve your career profile
   Start building a stronger Resume, GitHub profile, and LinkedIn presence so you look more prepared when opportunities come.

5. Prepare for interviews with confidence
   Improve communication, structured thinking, interview mindset, and practical readiness with mentorship and guided support.

What you should aim for

By the end of this journey, you should be able to show visible progress:

A stronger understanding of technical concepts
A GitHub profile with meaningful project work
A more complete Resume + LinkedIn profile
Better confidence in interviews and communication
Exposure to AI-driven development workflows
A clear eligibility path for the NextGen CTO Academy Industry Ready Certificate

Your first step

Open your dashboard, explore the roadmap, and start with the first recommended module.

Do not wait for the perfect time.

Start small. Stay consistent. Build visible proof.

{{cta_label}}: {{cta_url}}

Need help during the journey?

You are not expected to figure everything out alone. Use the support and community channels whenever you feel stuck.

Support: {{support_url}}

You are receiving this email because you are part of {{program_name}}.

Unsubscribe or manage preferences:
{{unsubscribe_url}}$$,
  '[
    {"key":"first_name","label":"Student first name","required":false,"sample":"Anuj","inputType":"text","source":"recipient"},
    {"key":"college_name","label":"College name","required":false,"sample":"Demo College","inputType":"text","source":"recipient"},
    {"key":"program_name","label":"Program name","required":true,"sample":"NextGen CTO Career Readiness Program","inputType":"text","source":"campaign"},
    {"key":"cta_url","label":"CTA URL","required":true,"placeholder":"https://...","inputType":"url","source":"campaign"},
    {"key":"cta_label","label":"CTA button text","required":true,"sample":"Open your dashboard","inputType":"text","source":"campaign"},
    {"key":"support_url","label":"Support URL","required":false,"placeholder":"https://...","inputType":"url","source":"system"},
    {"key":"unsubscribe_url","label":"Unsubscribe URL","required":false,"inputType":"url","source":"system","helpText":"Preview-only value. Real sends use system-generated links."}
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

-- ==========================================================================
-- 2. student-onboarding-career-readiness-roadmap
-- ==========================================================================
insert into public.email_templates (
  name,
  slug,
  category,
  description,
  subject_template,
  preview_text_template,
  html_template,
  text_template,
  variables,
  is_system,
  is_active
)
values (
  'Student Onboarding: Career Readiness Roadmap',
  'student-onboarding-career-readiness-roadmap',
  'announcement',
  'Roadmap guidance for students starting the career readiness journey.',
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

  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F1F5F9;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;background-color:#FFFFFF;border:1px solid #E2E8F0;border-radius:16px;overflow:hidden;">

          <tr>
            <td style="background-color:#0B0F19;padding:22px 24px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="font-size:18px;font-weight:800;color:#FFFFFF;">NextGen CTO</td>
                  <td align="right" style="font-size:12px;color:#E5E7EB;">Roadmap</td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:28px 24px 10px 24px;">
              <p style="margin:0 0 8px 0;font-size:12px;font-weight:700;color:#F59E0B;text-transform:uppercase;letter-spacing:0.08em;">Student Onboarding</p>
              <h1 style="margin:0 0 10px 0;font-size:26px;line-height:1.25;color:#0F172A;font-weight:800;">Your roadmap for {{program_name}}</h1>
              <p style="margin:0 0 16px 0;font-size:13px;line-height:1.6;color:#64748B;">NextGen CTO × {{college_name}}</p>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 18px 0;">
                <tr>
                  <td style="height:2px;background-color:#F59E0B;"></td>
                </tr>
              </table>

              <p style="margin:0 0 12px 0;font-size:15px;line-height:1.7;color:#334155;">Hi {{first_name}},</p>
              <p style="margin:0 0 16px 0;font-size:15px;line-height:1.7;color:#334155;">Welcome to your roadmap for {{program_name}}. Start with foundations, then move to AI and modern development, then project proof, and finally Resume, GitHub, LinkedIn, and interview readiness.</p>
              <p style="margin:0 0 18px 0;font-size:15px;line-height:1.7;color:#334155;">Do not try to do everything randomly. Follow the roadmap step by step.</p>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 12px 0;background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;">
                <tr>
                  <td style="padding:14px 16px;">
                    <p style="margin:0 0 6px 0;font-size:14px;font-weight:700;color:#0F172A;">Step 1: Foundations</p>
                    <p style="margin:0;font-size:14px;line-height:1.6;color:#475569;">Programming basics, DSA thinking, web/backend basics, APIs, databases, Git, GitHub.</p>
                  </td>
                </tr>
              </table>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 12px 0;background-color:#EFF6FF;border:1px solid #BFDBFE;border-radius:12px;">
                <tr>
                  <td style="padding:14px 16px;">
                    <p style="margin:0 0 6px 0;font-size:14px;font-weight:700;color:#0F172A;">Step 2: AI + modern development</p>
                    <p style="margin:0;font-size:14px;line-height:1.6;color:#475569;">AI-assisted coding, prompt thinking, generative and agentic AI basics, workflows.</p>
                  </td>
                </tr>
              </table>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 16px 0;background-color:#FFF7ED;border:1px solid #FED7AA;border-radius:12px;">
                <tr>
                  <td style="padding:14px 16px;">
                    <p style="margin:0 0 6px 0;font-size:14px;font-weight:700;color:#0F172A;">Step 3: Projects + profile readiness</p>
                    <p style="margin:0;font-size:14px;line-height:1.6;color:#475569;">Project proof, Resume, GitHub, LinkedIn, and interview readiness.</p>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 16px 0;font-size:15px;line-height:1.7;color:#334155;">Your dashboard will help you track what is complete and what needs attention next.</p>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 16px 0;">
                <tr>
                  <td bgcolor="#F97316" style="border-radius:10px;">
                    <a href="{{cta_url}}" style="display:inline-block;padding:13px 20px;font-size:14px;font-weight:800;color:#FFFFFF;text-decoration:none;">{{cta_label}}</a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 6px 0;font-size:13px;color:#64748B;">Dashboard: <a href="{{dashboard_url}}" style="color:#F97316;text-decoration:underline;">{{dashboard_url}}</a></p>
              <p style="margin:0;font-size:13px;color:#64748B;">Need help? <a href="{{support_url}}" style="color:#F97316;text-decoration:underline;">{{support_url}}</a></p>
            </td>
          </tr>

          <tr>
            <td style="padding:18px 24px;background-color:#F8FAFC;border-top:1px solid #E2E8F0;text-align:center;">
              <p style="margin:0 0 8px 0;font-size:12px;line-height:1.6;color:#64748B;">You are receiving this email because you are part of {{program_name}} at {{college_name}}.</p>
              <a href="{{unsubscribe_url}}" style="font-size:12px;color:#64748B;text-decoration:underline;">Unsubscribe or manage preferences</a>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>$$,
  $$Hi {{first_name}},
Welcome to your roadmap for {{program_name}}.
Start with technical foundations, then move to AI and modern development, then project proof, and finally Resume, GitHub, LinkedIn, and interview readiness.
Do not try to do everything randomly. Follow the roadmap step by step.
{{cta_label}}: {{cta_url}}
Dashboard: {{dashboard_url}}
Support: {{support_url}}
Unsubscribe or manage preferences: {{unsubscribe_url}}$$,
  '[
    {"key":"first_name","label":"Student first name","required":false,"sample":"Anuj","inputType":"text","source":"recipient"},
    {"key":"college_name","label":"College name","required":false,"sample":"Demo College","inputType":"text","source":"recipient"},
    {"key":"program_name","label":"Program name","required":true,"sample":"NextGen CTO Career Readiness Program","inputType":"text","source":"campaign"},
    {"key":"cta_url","label":"CTA URL","required":true,"placeholder":"https://...","inputType":"url","source":"campaign"},
    {"key":"cta_label","label":"CTA button text","required":true,"sample":"View your roadmap","inputType":"text","source":"campaign"},
    {"key":"dashboard_url","label":"Dashboard URL","required":false,"placeholder":"https://...","inputType":"url","source":"system"},
    {"key":"support_url","label":"Support URL","required":false,"placeholder":"https://...","inputType":"url","source":"system"},
    {"key":"unsubscribe_url","label":"Unsubscribe URL","required":false,"inputType":"url","source":"system","helpText":"Preview-only value. Real sends use system-generated links."}
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

-- ==========================================================================
-- 3. technical-foundations-reminder
-- ==========================================================================
insert into public.email_templates (
  name,
  slug,
  category,
  description,
  subject_template,
  preview_text_template,
  html_template,
  text_template,
  variables,
  is_system,
  is_active
)
values (
  'Technical Foundations Reminder',
  'technical-foundations-reminder',
  'notification',
  'Reminder to complete programming and DSA fundamentals before moving forward.',
  'Technical foundations: your next milestone',
  'Complete the programming and DSA foundations to stay on track in your career readiness journey.',
  $$<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Technical foundations: your next milestone</title>
</head>
<body style="margin:0;padding:0;background-color:#F1F5F9;font-family:Arial,Helvetica,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;line-height:1px;font-size:1px;">
    Complete the programming and DSA foundations to stay on track in your career readiness journey.
  </div>

  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F1F5F9;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;background-color:#FFFFFF;border:1px solid #E2E8F0;border-radius:16px;overflow:hidden;">

          <tr>
            <td style="background-color:#0B0F19;padding:22px 24px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="font-size:18px;font-weight:800;color:#FFFFFF;">NextGen CTO</td>
                  <td align="right" style="font-size:12px;color:#E5E7EB;">Foundations</td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:28px 24px 10px 24px;">
              <p style="margin:0 0 8px 0;font-size:12px;font-weight:700;color:#F59E0B;text-transform:uppercase;letter-spacing:0.08em;">Technical Foundations</p>
              <h1 style="margin:0 0 10px 0;font-size:26px;line-height:1.25;color:#0F172A;font-weight:800;">Technical foundations: your next milestone</h1>
              <p style="margin:0 0 16px 0;font-size:13px;line-height:1.6;color:#64748B;">NextGen CTO × {{college_name}}</p>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 18px 0;">
                <tr>
                  <td style="height:2px;background-color:#F59E0B;"></td>
                </tr>
              </table>

              <p style="margin:0 0 12px 0;font-size:15px;line-height:1.7;color:#334155;">Hi {{first_name}},</p>
              <p style="margin:0 0 12px 0;font-size:15px;line-height:1.7;color:#334155;">Your next milestone in {{program_name}} is {{module_name}}. Before tools and shortcuts, your fundamentals must be clear.</p>
              <p style="margin:0 0 18px 0;font-size:15px;line-height:1.7;color:#334155;">Continue the module and strengthen programming basics, problem-solving thinking, web/backend concepts, APIs, databases, Git, and GitHub.</p>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 12px 0;background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;">
                <tr>
                  <td style="padding:14px 16px;">
                    <p style="margin:0 0 6px 0;font-size:14px;font-weight:700;color:#0F172A;">Focus areas</p>
                    <ul style="margin:0;padding-left:18px;">
                      <li style="margin:0 0 6px 0;font-size:14px;line-height:1.6;color:#334155;">Programming basics and DSA thinking</li>
                      <li style="margin:0 0 6px 0;font-size:14px;line-height:1.6;color:#334155;">Web and backend fundamentals</li>
                      <li style="margin:0 0 6px 0;font-size:14px;line-height:1.6;color:#334155;">APIs, databases, Git, and GitHub</li>
                      <li style="margin:0;font-size:14px;line-height:1.6;color:#334155;">Problem-solving confidence</li>
                    </ul>
                  </td>
                </tr>
              </table>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 16px 0;background-color:#FFF7ED;border:1px solid #FED7AA;border-radius:12px;">
                <tr>
                  <td style="padding:14px 16px;">
                    <p style="margin:0;font-size:14px;line-height:1.6;color:#9A3412;">Strong fundamentals help you understand what AI tools generate, debug faster, and explain your work clearly in interviews.</p>
                  </td>
                </tr>
              </table>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 16px 0;">
                <tr>
                  <td bgcolor="#F97316" style="border-radius:10px;">
                    <a href="{{cta_url}}" style="display:inline-block;padding:13px 20px;font-size:14px;font-weight:800;color:#FFFFFF;text-decoration:none;">{{cta_label}}</a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 6px 0;font-size:13px;color:#64748B;">Dashboard: <a href="{{dashboard_url}}" style="color:#F97316;text-decoration:underline;">{{dashboard_url}}</a></p>
              <p style="margin:0;font-size:13px;color:#64748B;">Need help? <a href="{{support_url}}" style="color:#F97316;text-decoration:underline;">{{support_url}}</a></p>
            </td>
          </tr>

          <tr>
            <td style="padding:18px 24px;background-color:#F8FAFC;border-top:1px solid #E2E8F0;text-align:center;">
              <p style="margin:0 0 8px 0;font-size:12px;line-height:1.6;color:#64748B;">You are receiving this email because you are part of {{program_name}} at {{college_name}}.</p>
              <a href="{{unsubscribe_url}}" style="font-size:12px;color:#64748B;text-decoration:underline;">Unsubscribe or manage preferences</a>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>$$,
  $$Hi {{first_name}},
Your next milestone in {{program_name}} is {{module_name}}.
Before tools and shortcuts, your fundamentals must be clear. Continue the module and strengthen programming basics, problem-solving thinking, web/backend concepts, APIs, databases, Git, and GitHub.
{{cta_label}}: {{cta_url}}
Dashboard: {{dashboard_url}}
Support: {{support_url}}
Unsubscribe or manage preferences: {{unsubscribe_url}}$$,
  '[
    {"key":"first_name","label":"Student first name","required":false,"sample":"Anuj","inputType":"text","source":"recipient"},
    {"key":"college_name","label":"College name","required":false,"sample":"Demo College","inputType":"text","source":"recipient"},
    {"key":"program_name","label":"Program name","required":true,"sample":"NextGen CTO Career Readiness Program","inputType":"text","source":"campaign"},
    {"key":"module_name","label":"Module name","required":true,"sample":"Technical Foundations","inputType":"text","source":"campaign"},
    {"key":"cta_url","label":"CTA URL","required":true,"placeholder":"https://...","inputType":"url","source":"campaign"},
    {"key":"cta_label","label":"CTA button text","required":true,"sample":"Continue the module","inputType":"text","source":"campaign"},
    {"key":"dashboard_url","label":"Dashboard URL","required":false,"placeholder":"https://...","inputType":"url","source":"system"},
    {"key":"support_url","label":"Support URL","required":false,"placeholder":"https://...","inputType":"url","source":"system"},
    {"key":"unsubscribe_url","label":"Unsubscribe URL","required":false,"inputType":"url","source":"system","helpText":"Preview-only value. Real sends use system-generated links."}
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

-- ==========================================================================
-- 4. ai-agentic-ai-module-announcement
-- ==========================================================================
insert into public.email_templates (
  name,
  slug,
  category,
  description,
  subject_template,
  preview_text_template,
  html_template,
  text_template,
  variables,
  is_system,
  is_active
)
values (
  'AI and Agentic AI Module Announcement',
  'ai-agentic-ai-module-announcement',
  'announcement',
  'Announcement for the AI and Agentic AI module opening.',
  'AI and modern development module is open',
  'Explore AI-assisted coding, prompt engineering, and agentic AI fundamentals.',
  $$<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>AI and modern development module is open</title>
</head>
<body style="margin:0;padding:0;background-color:#F1F5F9;font-family:Arial,Helvetica,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;line-height:1px;font-size:1px;">
    Explore AI-assisted coding, prompt engineering, and agentic AI fundamentals.
  </div>

  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F1F5F9;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;background-color:#FFFFFF;border:1px solid #E2E8F0;border-radius:16px;overflow:hidden;">

          <tr>
            <td style="background-color:#0B0F19;padding:22px 24px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="font-size:18px;font-weight:800;color:#FFFFFF;">NextGen CTO</td>
                  <td align="right" style="font-size:12px;color:#E5E7EB;">AI & Modern Dev</td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:28px 24px 10px 24px;">
              <p style="margin:0 0 8px 0;font-size:12px;font-weight:700;color:#F59E0B;text-transform:uppercase;letter-spacing:0.08em;">Module Announcement</p>
              <h1 style="margin:0 0 10px 0;font-size:26px;line-height:1.25;color:#0F172A;font-weight:800;">AI and modern development module is open</h1>
              <p style="margin:0 0 16px 0;font-size:13px;line-height:1.6;color:#64748B;">NextGen CTO × {{college_name}}</p>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 18px 0;">
                <tr>
                  <td style="height:2px;background-color:#F59E0B;"></td>
                </tr>
              </table>

              <p style="margin:0 0 12px 0;font-size:15px;line-height:1.7;color:#334155;">Hi {{first_name}},</p>
              <p style="margin:0 0 12px 0;font-size:15px;line-height:1.7;color:#334155;">AI is changing how developers write, debug, and build software. The real advantage is not just using AI tools.</p>
              <p style="margin:0 0 18px 0;font-size:15px;line-height:1.7;color:#334155;">The real advantage is knowing how to use AI with strong fundamentals and clear thinking. Start the {{module_name}} module inside {{program_name}} and explore AI-assisted coding, prompt thinking, generative and agentic AI basics, automation workflows, and hands-on AI project practice.</p>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 12px 0;background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;">
                <tr>
                  <td style="padding:14px 16px;">
                    <p style="margin:0 0 6px 0;font-size:14px;font-weight:700;color:#0F172A;">You will explore</p>
                    <ul style="margin:0;padding-left:18px;">
                      <li style="margin:0 0 6px 0;font-size:14px;line-height:1.6;color:#334155;">AI-assisted coding and debugging</li>
                      <li style="margin:0 0 6px 0;font-size:14px;line-height:1.6;color:#334155;">Prompt thinking and automation workflows</li>
                      <li style="margin:0 0 6px 0;font-size:14px;line-height:1.6;color:#334155;">Generative and agentic AI basics</li>
                      <li style="margin:0;font-size:14px;line-height:1.6;color:#334155;">How fundamentals still drive quality</li>
                    </ul>
                  </td>
                </tr>
              </table>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 16px 0;background-color:#EFF6FF;border:1px solid #BFDBFE;border-radius:12px;">
                <tr>
                  <td style="padding:14px 16px;">
                    <p style="margin:0;font-size:14px;line-height:1.6;color:#1E3A8A;">AI is a support tool, not a shortcut. Build clarity, then use AI to move faster and smarter.</p>
                  </td>
                </tr>
              </table>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 16px 0;">
                <tr>
                  <td bgcolor="#F97316" style="border-radius:10px;">
                    <a href="{{cta_url}}" style="display:inline-block;padding:13px 20px;font-size:14px;font-weight:800;color:#FFFFFF;text-decoration:none;">{{cta_label}}</a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 6px 0;font-size:13px;color:#64748B;">Dashboard: <a href="{{dashboard_url}}" style="color:#F97316;text-decoration:underline;">{{dashboard_url}}</a></p>
              <p style="margin:0;font-size:13px;color:#64748B;">Need help? <a href="{{support_url}}" style="color:#F97316;text-decoration:underline;">{{support_url}}</a></p>
            </td>
          </tr>

          <tr>
            <td style="padding:18px 24px;background-color:#F8FAFC;border-top:1px solid #E2E8F0;text-align:center;">
              <p style="margin:0 0 8px 0;font-size:12px;line-height:1.6;color:#64748B;">You are receiving this email because you are part of {{program_name}} at {{college_name}}.</p>
              <a href="{{unsubscribe_url}}" style="font-size:12px;color:#64748B;text-decoration:underline;">Unsubscribe or manage preferences</a>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>$$,
  $$Hi {{first_name}},
AI is changing how developers write, debug, and build software.
The real advantage is not just using AI tools. The real advantage is knowing how to use AI with strong fundamentals and clear thinking.
Start the {{module_name}} module inside {{program_name}} and explore AI-assisted coding, prompt thinking, generative and agentic AI basics, automation workflows, and hands-on AI project practice.
{{cta_label}}: {{cta_url}}
Support: {{support_url}}
Unsubscribe or manage preferences: {{unsubscribe_url}}$$,
  '[
    {"key":"first_name","label":"Student first name","required":false,"sample":"Anuj","inputType":"text","source":"recipient"},
    {"key":"college_name","label":"College name","required":false,"sample":"Demo College","inputType":"text","source":"recipient"},
    {"key":"program_name","label":"Program name","required":true,"sample":"NextGen CTO Career Readiness Program","inputType":"text","source":"campaign"},
    {"key":"module_name","label":"Module name","required":true,"sample":"AI and Modern Development","inputType":"text","source":"campaign"},
    {"key":"cta_url","label":"CTA URL","required":true,"placeholder":"https://...","inputType":"url","source":"campaign"},
    {"key":"cta_label","label":"CTA button text","required":true,"sample":"Start the module","inputType":"text","source":"campaign"},
    {"key":"dashboard_url","label":"Dashboard URL","required":false,"placeholder":"https://...","inputType":"url","source":"system"},
    {"key":"support_url","label":"Support URL","required":false,"placeholder":"https://...","inputType":"url","source":"system"},
    {"key":"unsubscribe_url","label":"Unsubscribe URL","required":false,"inputType":"url","source":"system","helpText":"Preview-only value. Real sends use system-generated links."}
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

-- ==========================================================================
-- 5. project-completion-nudge
-- ==========================================================================
insert into public.email_templates (
  name,
  slug,
  category,
  description,
  subject_template,
  preview_text_template,
  html_template,
  text_template,
  variables,
  is_system,
  is_active
)
values (
  'Project Completion Nudge',
  'project-completion-nudge',
  'notification',
  'Encouragement to complete the current project milestone and publish proof.',
  'Your project can become your strongest proof',
  'Finish your project, push it to GitHub, and make your learning visible.',
  $$<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Your project can become your strongest proof</title>
</head>
<body style="margin:0;padding:0;background-color:#F1F5F9;font-family:Arial,Helvetica,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;line-height:1px;font-size:1px;">
    Finish your project, push it to GitHub, and make your learning visible.
  </div>

  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F1F5F9;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;background-color:#FFFFFF;border:1px solid #E2E8F0;border-radius:16px;overflow:hidden;">

          <tr>
            <td style="background-color:#0B0F19;padding:22px 24px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="font-size:18px;font-weight:800;color:#FFFFFF;">NextGen CTO</td>
                  <td align="right" style="font-size:12px;color:#E5E7EB;">Project Milestone</td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:28px 24px 10px 24px;">
              <p style="margin:0 0 8px 0;font-size:12px;font-weight:700;color:#F59E0B;text-transform:uppercase;letter-spacing:0.08em;">Project Completion</p>
              <h1 style="margin:0 0 10px 0;font-size:26px;line-height:1.25;color:#0F172A;font-weight:800;">Your project can become your strongest proof</h1>
              <p style="margin:0 0 16px 0;font-size:13px;line-height:1.6;color:#64748B;">NextGen CTO × {{college_name}}</p>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 18px 0;">
                <tr>
                  <td style="height:2px;background-color:#F59E0B;"></td>
                </tr>
              </table>

              <p style="margin:0 0 12px 0;font-size:15px;line-height:1.7;color:#334155;">Hi {{first_name}},</p>
              <p style="margin:0 0 12px 0;font-size:15px;line-height:1.7;color:#334155;">Quick reminder — your {{project_name}} milestone inside {{program_name}} is waiting for you.</p>
              <p style="margin:0 0 18px 0;font-size:15px;line-height:1.7;color:#334155;">A completed project shows that you can actually build. Finish the core features, push your code to GitHub, write a simple README, and mention what you learned.</p>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 12px 0;background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;">
                <tr>
                  <td style="padding:14px 16px;">
                    <p style="margin:0 0 6px 0;font-size:14px;font-weight:700;color:#0F172A;">Make it visible</p>
                    <ul style="margin:0;padding-left:18px;">
                      <li style="margin:0 0 6px 0;font-size:14px;line-height:1.6;color:#334155;">Complete the core features</li>
                      <li style="margin:0 0 6px 0;font-size:14px;line-height:1.6;color:#334155;">Push the code to GitHub</li>
                      <li style="margin:0 0 6px 0;font-size:14px;line-height:1.6;color:#334155;">Write a simple README</li>
                      <li style="margin:0;font-size:14px;line-height:1.6;color:#334155;">Summarize what you learned</li>
                    </ul>
                  </td>
                </tr>
              </table>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 16px 0;background-color:#FFF7ED;border:1px solid #FED7AA;border-radius:12px;">
                <tr>
                  <td style="padding:14px 16px;">
                    <p style="margin:0;font-size:14px;line-height:1.6;color:#9A3412;">Do not aim for perfect right now. Aim for complete.</p>
                  </td>
                </tr>
              </table>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 16px 0;">
                <tr>
                  <td bgcolor="#F97316" style="border-radius:10px;">
                    <a href="{{cta_url}}" style="display:inline-block;padding:13px 20px;font-size:14px;font-weight:800;color:#FFFFFF;text-decoration:none;">{{cta_label}}</a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 6px 0;font-size:13px;color:#64748B;">Dashboard: <a href="{{dashboard_url}}" style="color:#F97316;text-decoration:underline;">{{dashboard_url}}</a></p>
              <p style="margin:0;font-size:13px;color:#64748B;">Need help? <a href="{{support_url}}" style="color:#F97316;text-decoration:underline;">{{support_url}}</a></p>
            </td>
          </tr>

          <tr>
            <td style="padding:18px 24px;background-color:#F8FAFC;border-top:1px solid #E2E8F0;text-align:center;">
              <p style="margin:0 0 8px 0;font-size:12px;line-height:1.6;color:#64748B;">You are receiving this email because you are part of {{program_name}} at {{college_name}}.</p>
              <a href="{{unsubscribe_url}}" style="font-size:12px;color:#64748B;text-decoration:underline;">Unsubscribe or manage preferences</a>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>$$,
  $$Hi {{first_name}},
Quick reminder — your {{project_name}} milestone inside {{program_name}} is waiting for you.
A completed project shows that you can actually build. Finish the core features, push your code to GitHub, write a simple README, and mention what you learned.
Do not aim for perfect right now. Aim for complete.
{{cta_label}}: {{cta_url}}
Dashboard: {{dashboard_url}}
Support: {{support_url}}
Unsubscribe or manage preferences: {{unsubscribe_url}}$$,
  '[
    {"key":"first_name","label":"Student first name","required":false,"sample":"Anuj","inputType":"text","source":"recipient"},
    {"key":"college_name","label":"College name","required":false,"sample":"Demo College","inputType":"text","source":"recipient"},
    {"key":"program_name","label":"Program name","required":true,"sample":"NextGen CTO Career Readiness Program","inputType":"text","source":"campaign"},
    {"key":"project_name","label":"Project name","required":true,"sample":"Portfolio Website","inputType":"text","source":"campaign"},
    {"key":"cta_url","label":"CTA URL","required":true,"placeholder":"https://...","inputType":"url","source":"campaign"},
    {"key":"cta_label","label":"CTA button text","required":true,"sample":"Open your project","inputType":"text","source":"campaign"},
    {"key":"dashboard_url","label":"Dashboard URL","required":false,"placeholder":"https://...","inputType":"url","source":"system"},
    {"key":"support_url","label":"Support URL","required":false,"placeholder":"https://...","inputType":"url","source":"system"},
    {"key":"unsubscribe_url","label":"Unsubscribe URL","required":false,"inputType":"url","source":"system","helpText":"Preview-only value. Real sends use system-generated links."}
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

-- ==========================================================================
-- 6. resume-github-linkedin-reminder
-- ==========================================================================
insert into public.email_templates (
  name,
  slug,
  category,
  description,
  subject_template,
  preview_text_template,
  html_template,
  text_template,
  variables,
  is_system,
  is_active
)
values (
  'Resume, GitHub, LinkedIn Reminder',
  'resume-github-linkedin-reminder',
  'notification',
  'Reminder to update Resume, GitHub, and LinkedIn for visible proof.',
  'Your profile should show your effort',
  'Update your Resume, GitHub, and LinkedIn so your work is visible.',
  $$<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Your profile should show your effort</title>
</head>
<body style="margin:0;padding:0;background-color:#F1F5F9;font-family:Arial,Helvetica,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;line-height:1px;font-size:1px;">
    Update your Resume, GitHub, and LinkedIn so your work is visible.
  </div>

  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F1F5F9;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;background-color:#FFFFFF;border:1px solid #E2E8F0;border-radius:16px;overflow:hidden;">

          <tr>
            <td style="background-color:#0B0F19;padding:22px 24px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="font-size:18px;font-weight:800;color:#FFFFFF;">NextGen CTO</td>
                  <td align="right" style="font-size:12px;color:#E5E7EB;">Profile Readiness</td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:28px 24px 10px 24px;">
              <p style="margin:0 0 8px 0;font-size:12px;font-weight:700;color:#F59E0B;text-transform:uppercase;letter-spacing:0.08em;">Profile Reminder</p>
              <h1 style="margin:0 0 10px 0;font-size:26px;line-height:1.25;color:#0F172A;font-weight:800;">Your profile should show your effort</h1>
              <p style="margin:0 0 16px 0;font-size:13px;line-height:1.6;color:#64748B;">NextGen CTO × {{college_name}}</p>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 18px 0;">
                <tr>
                  <td style="height:2px;background-color:#F59E0B;"></td>
                </tr>
              </table>

              <p style="margin:0 0 12px 0;font-size:15px;line-height:1.7;color:#334155;">Hi {{first_name}},</p>
              <p style="margin:0 0 12px 0;font-size:15px;line-height:1.7;color:#334155;">Your learning needs visible proof. Update your Resume, clean your GitHub, and improve your LinkedIn so mentors, recruiters, and college teams can understand what you have built.</p>
              <p style="margin:0 0 18px 0;font-size:15px;line-height:1.7;color:#334155;">Do not wait until placement season to fix your profile.</p>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 12px 0;background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;">
                <tr>
                  <td style="padding:14px 16px;">
                    <p style="margin:0 0 6px 0;font-size:14px;font-weight:700;color:#0F172A;">Profile checklist</p>
                    <ul style="margin:0;padding-left:18px;">
                      <li style="margin:0 0 6px 0;font-size:14px;line-height:1.6;color:#334155;">Update your Resume with recent projects</li>
                      <li style="margin:0 0 6px 0;font-size:14px;line-height:1.6;color:#334155;">Clean up GitHub repos and README files</li>
                      <li style="margin:0;font-size:14px;line-height:1.6;color:#334155;">Refresh LinkedIn summary and highlights</li>
                    </ul>
                  </td>
                </tr>
              </table>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 16px 0;">
                <tr>
                  <td bgcolor="#F97316" style="border-radius:10px;">
                    <a href="{{cta_url}}" style="display:inline-block;padding:13px 20px;font-size:14px;font-weight:800;color:#FFFFFF;text-decoration:none;">{{cta_label}}</a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 6px 0;font-size:13px;color:#64748B;">Dashboard: <a href="{{dashboard_url}}" style="color:#F97316;text-decoration:underline;">{{dashboard_url}}</a></p>
              <p style="margin:0;font-size:13px;color:#64748B;">Need help? <a href="{{support_url}}" style="color:#F97316;text-decoration:underline;">{{support_url}}</a></p>
            </td>
          </tr>

          <tr>
            <td style="padding:18px 24px;background-color:#F8FAFC;border-top:1px solid #E2E8F0;text-align:center;">
              <p style="margin:0 0 8px 0;font-size:12px;line-height:1.6;color:#64748B;">You are receiving this email because you are part of {{program_name}} at {{college_name}}.</p>
              <a href="{{unsubscribe_url}}" style="font-size:12px;color:#64748B;text-decoration:underline;">Unsubscribe or manage preferences</a>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>$$,
  $$Hi {{first_name}},
Your learning needs visible proof.
Update your Resume, clean your GitHub, and improve your LinkedIn so mentors, recruiters, and college teams can understand what you have built.
Do not wait until placement season to fix your profile.
{{cta_label}}: {{cta_url}}
Dashboard: {{dashboard_url}}
Support: {{support_url}}
Unsubscribe or manage preferences: {{unsubscribe_url}}$$,
  '[
    {"key":"first_name","label":"Student first name","required":false,"sample":"Anuj","inputType":"text","source":"recipient"},
    {"key":"college_name","label":"College name","required":false,"sample":"Demo College","inputType":"text","source":"recipient"},
    {"key":"program_name","label":"Program name","required":true,"sample":"NextGen CTO Career Readiness Program","inputType":"text","source":"campaign"},
    {"key":"cta_url","label":"CTA URL","required":true,"placeholder":"https://...","inputType":"url","source":"campaign"},
    {"key":"cta_label","label":"CTA button text","required":true,"sample":"Update your profile","inputType":"text","source":"campaign"},
    {"key":"dashboard_url","label":"Dashboard URL","required":false,"placeholder":"https://...","inputType":"url","source":"system"},
    {"key":"support_url","label":"Support URL","required":false,"placeholder":"https://...","inputType":"url","source":"system"},
    {"key":"unsubscribe_url","label":"Unsubscribe URL","required":false,"inputType":"url","source":"system","helpText":"Preview-only value. Real sends use system-generated links."}
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

-- ==========================================================================
-- 7. mock-interview-invite
-- ==========================================================================
insert into public.email_templates (
  name,
  slug,
  category,
  description,
  subject_template,
  preview_text_template,
  html_template,
  text_template,
  variables,
  is_system,
  is_active
)
values (
  'Mock Interview Invite',
  'mock-interview-invite',
  'announcement',
  'Invite to a mock interview practice session with mentor details.',
  'Your mock interview practice is scheduled',
  'Practice your answers, get mentor feedback, and build interview confidence.',
  $$<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Your mock interview practice is scheduled</title>
</head>
<body style="margin:0;padding:0;background-color:#F1F5F9;font-family:Arial,Helvetica,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;line-height:1px;font-size:1px;">
    Practice your answers, get mentor feedback, and build interview confidence.
  </div>

  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F1F5F9;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;background-color:#FFFFFF;border:1px solid #E2E8F0;border-radius:16px;overflow:hidden;">

          <tr>
            <td style="background-color:#0B0F19;padding:22px 24px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="font-size:18px;font-weight:800;color:#FFFFFF;">NextGen CTO</td>
                  <td align="right" style="font-size:12px;color:#E5E7EB;">Mock Interview</td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:28px 24px 10px 24px;">
              <p style="margin:0 0 8px 0;font-size:12px;font-weight:700;color:#F59E0B;text-transform:uppercase;letter-spacing:0.08em;">Interview Practice</p>
              <h1 style="margin:0 0 10px 0;font-size:26px;line-height:1.25;color:#0F172A;font-weight:800;">Your mock interview practice is scheduled</h1>
              <p style="margin:0 0 16px 0;font-size:13px;line-height:1.6;color:#64748B;">NextGen CTO × {{college_name}}</p>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 18px 0;">
                <tr>
                  <td style="height:2px;background-color:#F59E0B;"></td>
                </tr>
              </table>

              <p style="margin:0 0 12px 0;font-size:15px;line-height:1.7;color:#334155;">Hi {{first_name}},</p>
              <p style="margin:0 0 12px 0;font-size:15px;line-height:1.7;color:#334155;">Your mock interview practice session with {{mentor_name}} is coming up.</p>
              <p style="margin:0 0 18px 0;font-size:15px;line-height:1.7;color:#334155;">This session is not about being perfect. It is about practicing how you explain your thoughts, projects, and answers before a real interview.</p>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 12px 0;background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;">
                <tr>
                  <td style="padding:14px 16px;">
                    <p style="margin:0 0 6px 0;font-size:14px;font-weight:700;color:#0F172A;">Session details</p>
                    <p style="margin:0;font-size:14px;line-height:1.7;color:#334155;">Date: {{session_date}}<br>Time: {{session_time}}<br>Zoom: <a href="{{zoom_meeting_url}}" style="color:#2563EB;text-decoration:underline;">{{zoom_meeting_url}}</a></p>
                  </td>
                </tr>
              </table>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 16px 0;background-color:#EFF6FF;border:1px solid #BFDBFE;border-radius:12px;">
                <tr>
                  <td style="padding:14px 16px;">
                    <p style="margin:0;font-size:14px;line-height:1.6;color:#1E3A8A;">Keep your updated resume, one explainable project, and a calm feedback mindset ready.</p>
                  </td>
                </tr>
              </table>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 16px 0;">
                <tr>
                  <td bgcolor="#F97316" style="border-radius:10px;">
                    <a href="{{cta_url}}" style="display:inline-block;padding:13px 20px;font-size:14px;font-weight:800;color:#FFFFFF;text-decoration:none;">{{cta_label}}</a>
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-size:13px;color:#64748B;">Need help? <a href="{{support_url}}" style="color:#F97316;text-decoration:underline;">{{support_url}}</a></p>
            </td>
          </tr>

          <tr>
            <td style="padding:18px 24px;background-color:#F8FAFC;border-top:1px solid #E2E8F0;text-align:center;">
              <p style="margin:0 0 8px 0;font-size:12px;line-height:1.6;color:#64748B;">You are receiving this email because you are part of {{program_name}} at {{college_name}}.</p>
              <a href="{{unsubscribe_url}}" style="font-size:12px;color:#64748B;text-decoration:underline;">Unsubscribe or manage preferences</a>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>$$,
  $$Hi {{first_name}},
Your mock interview practice session with {{mentor_name}} is coming up.
This session is not about being perfect. It is about practicing how you explain your thoughts, projects, and answers before a real interview.
Date: {{session_date}}
Time: {{session_time}}
Zoom Link: {{zoom_meeting_url}}
Keep your updated resume, one explainable project, and a calm feedback mindset ready.
{{cta_label}}: {{cta_url}}
Support: {{support_url}}
Unsubscribe or manage preferences: {{unsubscribe_url}}$$,
  '[
    {"key":"first_name","label":"Student first name","required":false,"sample":"Anuj","inputType":"text","source":"recipient"},
    {"key":"college_name","label":"College name","required":false,"sample":"Demo College","inputType":"text","source":"recipient"},
    {"key":"program_name","label":"Program name","required":true,"sample":"NextGen CTO Career Readiness Program","inputType":"text","source":"campaign"},
    {"key":"mentor_name","label":"Mentor name","required":true,"sample":"Rahul Kumar","inputType":"text","source":"campaign"},
    {"key":"session_date","label":"Session date","required":true,"sample":"2026-05-20","inputType":"date","source":"campaign"},
    {"key":"session_time","label":"Session time","required":true,"sample":"16:00","inputType":"time","source":"campaign"},
    {"key":"zoom_meeting_url","label":"Zoom meeting URL","required":true,"placeholder":"https://...","inputType":"url","source":"campaign"},
    {"key":"cta_url","label":"CTA URL","required":true,"placeholder":"https://...","inputType":"url","source":"campaign"},
    {"key":"cta_label","label":"CTA button text","required":true,"sample":"Join the session","inputType":"text","source":"campaign"},
    {"key":"support_url","label":"Support URL","required":false,"placeholder":"https://...","inputType":"url","source":"system"},
    {"key":"unsubscribe_url","label":"Unsubscribe URL","required":false,"inputType":"url","source":"system","helpText":"Preview-only value. Real sends use system-generated links."}
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

-- ==========================================================================
-- 8. founder-mentorship-session-invite
-- ==========================================================================
insert into public.email_templates (
  name,
  slug,
  category,
  description,
  subject_template,
  preview_text_template,
  html_template,
  text_template,
  variables,
  is_system,
  is_active
)
values (
  'Founder Mentorship Session Invite',
  'founder-mentorship-session-invite',
  'announcement',
  'Invite to a practical mentorship session with mentor details.',
  'You''re invited to a practical mentorship session',
  'Get clarity on projects, profiles, interviews, and your next steps.',
  $$<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>You're invited to a practical mentorship session</title>
</head>
<body style="margin:0;padding:0;background-color:#F1F5F9;font-family:Arial,Helvetica,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;line-height:1px;font-size:1px;">
    Get clarity on projects, profiles, interviews, and your next steps.
  </div>

  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F1F5F9;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;background-color:#FFFFFF;border:1px solid #E2E8F0;border-radius:16px;overflow:hidden;">

          <tr>
            <td style="background-color:#0B0F19;padding:22px 24px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="font-size:18px;font-weight:800;color:#FFFFFF;">NextGen CTO</td>
                  <td align="right" style="font-size:12px;color:#E5E7EB;">Mentorship</td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:28px 24px 10px 24px;">
              <p style="margin:0 0 8px 0;font-size:12px;font-weight:700;color:#F59E0B;text-transform:uppercase;letter-spacing:0.08em;">Mentorship Session</p>
              <h1 style="margin:0 0 10px 0;font-size:26px;line-height:1.25;color:#0F172A;font-weight:800;">You're invited to a practical mentorship session</h1>
              <p style="margin:0 0 16px 0;font-size:13px;line-height:1.6;color:#64748B;">NextGen CTO × {{college_name}}</p>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 18px 0;">
                <tr>
                  <td style="height:2px;background-color:#F59E0B;"></td>
                </tr>
              </table>

              <p style="margin:0 0 12px 0;font-size:15px;line-height:1.7;color:#334155;">Hi {{first_name}},</p>
              <p style="margin:0 0 12px 0;font-size:15px;line-height:1.7;color:#334155;">You are invited to a mentorship session with {{mentor_name}}.</p>
              <p style="margin:0 0 18px 0;font-size:15px;line-height:1.7;color:#334155;">This session is meant to be practical, direct, and useful — not a long motivational lecture. You will get clarity on projects, profiles, interviews, and how to use AI, fundamentals, and projects together.</p>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 12px 0;background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;">
                <tr>
                  <td style="padding:14px 16px;">
                    <p style="margin:0 0 6px 0;font-size:14px;font-weight:700;color:#0F172A;">Session details</p>
                    <p style="margin:0;font-size:14px;line-height:1.7;color:#334155;">Date: {{session_date}}<br>Time: {{session_time}}<br>Zoom: <a href="{{zoom_meeting_url}}" style="color:#2563EB;text-decoration:underline;">{{zoom_meeting_url}}</a></p>
                  </td>
                </tr>
              </table>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 16px 0;background-color:#FFF7ED;border:1px solid #FED7AA;border-radius:12px;">
                <tr>
                  <td style="padding:14px 16px;">
                    <p style="margin:0;font-size:14px;line-height:1.6;color:#9A3412;">Bring one project you can explain, a quick profile update list, and your current questions.</p>
                  </td>
                </tr>
              </table>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 16px 0;">
                <tr>
                  <td bgcolor="#F97316" style="border-radius:10px;">
                    <a href="{{cta_url}}" style="display:inline-block;padding:13px 20px;font-size:14px;font-weight:800;color:#FFFFFF;text-decoration:none;">{{cta_label}}</a>
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-size:13px;color:#64748B;">Need help? <a href="{{support_url}}" style="color:#F97316;text-decoration:underline;">{{support_url}}</a></p>
            </td>
          </tr>

          <tr>
            <td style="padding:18px 24px;background-color:#F8FAFC;border-top:1px solid #E2E8F0;text-align:center;">
              <p style="margin:0 0 8px 0;font-size:12px;line-height:1.6;color:#64748B;">You are receiving this email because you are part of {{program_name}} at {{college_name}}.</p>
              <a href="{{unsubscribe_url}}" style="font-size:12px;color:#64748B;text-decoration:underline;">Unsubscribe or manage preferences</a>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>$$,
  $$Hi {{first_name}},
You are invited to a mentorship session with {{mentor_name}}.
This session is meant to be practical, direct, and useful — not a long motivational lecture.
You will get clarity on what to prioritize, how to avoid random learning, how to build better project proof, how to improve Resume, GitHub, and LinkedIn, how to prepare for interviews, and how to use AI, fundamentals, and projects together.
Date: {{session_date}}
Time: {{session_time}}
Zoom Link: {{zoom_meeting_url}}
{{cta_label}}: {{cta_url}}
Support: {{support_url}}
Unsubscribe or manage preferences: {{unsubscribe_url}}$$,
  '[
    {"key":"first_name","label":"Student first name","required":false,"sample":"Anuj","inputType":"text","source":"recipient"},
    {"key":"college_name","label":"College name","required":false,"sample":"Demo College","inputType":"text","source":"recipient"},
    {"key":"program_name","label":"Program name","required":true,"sample":"NextGen CTO Career Readiness Program","inputType":"text","source":"campaign"},
    {"key":"mentor_name","label":"Mentor name","required":true,"sample":"Rahul Kumar","inputType":"text","source":"campaign"},
    {"key":"session_date","label":"Session date","required":true,"sample":"2026-05-20","inputType":"date","source":"campaign"},
    {"key":"session_time","label":"Session time","required":true,"sample":"16:00","inputType":"time","source":"campaign"},
    {"key":"zoom_meeting_url","label":"Zoom meeting URL","required":true,"placeholder":"https://...","inputType":"url","source":"campaign"},
    {"key":"cta_url","label":"CTA URL","required":true,"placeholder":"https://...","inputType":"url","source":"campaign"},
    {"key":"cta_label","label":"CTA button text","required":true,"sample":"Confirm your spot","inputType":"text","source":"campaign"},
    {"key":"support_url","label":"Support URL","required":false,"placeholder":"https://...","inputType":"url","source":"system"},
    {"key":"unsubscribe_url","label":"Unsubscribe URL","required":false,"inputType":"url","source":"system","helpText":"Preview-only value. Real sends use system-generated links."}
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

-- ==========================================================================
-- 9. certificate-eligibility-notice
-- ==========================================================================
insert into public.email_templates (
  name,
  slug,
  category,
  description,
  subject_template,
  preview_text_template,
  html_template,
  text_template,
  variables,
  is_system,
  is_active
)
values (
  'Certificate Eligibility Notice',
  'certificate-eligibility-notice',
  'operational',
  'Notice that a student is close to earning the Industry Ready Certificate.',
  'You''re close to earning your certificate',
  'Complete your remaining milestones and move closer to your Industry Ready Certificate.',
  $$<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>You're close to earning your certificate</title>
</head>
<body style="margin:0;padding:0;background-color:#F1F5F9;font-family:Arial,Helvetica,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;line-height:1px;font-size:1px;">
    Complete your remaining milestones and move closer to your Industry Ready Certificate.
  </div>

  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F1F5F9;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;background-color:#FFFFFF;border:1px solid #E2E8F0;border-radius:16px;overflow:hidden;">

          <tr>
            <td style="background-color:#0B0F19;padding:22px 24px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="font-size:18px;font-weight:800;color:#FFFFFF;">NextGen CTO</td>
                  <td align="right" style="font-size:12px;color:#E5E7EB;">Certificate</td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:28px 24px 10px 24px;">
              <p style="margin:0 0 8px 0;font-size:12px;font-weight:700;color:#F59E0B;text-transform:uppercase;letter-spacing:0.08em;">Certificate Eligibility</p>
              <h1 style="margin:0 0 10px 0;font-size:26px;line-height:1.25;color:#0F172A;font-weight:800;">You're close to earning your certificate</h1>
              <p style="margin:0 0 16px 0;font-size:13px;line-height:1.6;color:#64748B;">NextGen CTO × {{college_name}}</p>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 18px 0;">
                <tr>
                  <td style="height:2px;background-color:#F59E0B;"></td>
                </tr>
              </table>

              <p style="margin:0 0 12px 0;font-size:15px;line-height:1.7;color:#334155;">Hi {{first_name}},</p>
              <p style="margin:0 0 12px 0;font-size:15px;line-height:1.7;color:#334155;">You are getting closer to completing {{program_name}}.</p>
              <p style="margin:0 0 18px 0;font-size:15px;line-height:1.7;color:#334155;">Your Industry Ready Certificate is proof that you stayed consistent, completed required milestones, worked on your skills, and moved closer to becoming career-ready.</p>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 12px 0;background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;">
                <tr>
                  <td style="padding:14px 16px;">
                    <p style="margin:0 0 6px 0;font-size:14px;font-weight:700;color:#0F172A;">Remaining steps</p>
                    <ul style="margin:0;padding-left:18px;">
                      <li style="margin:0 0 6px 0;font-size:14px;line-height:1.6;color:#334155;">Required modules and readiness activities</li>
                      <li style="margin:0 0 6px 0;font-size:14px;line-height:1.6;color:#334155;">Project completion and proof</li>
                      <li style="margin:0;font-size:14px;line-height:1.6;color:#334155;">Resume/GitHub/LinkedIn updates</li>
                    </ul>
                  </td>
                </tr>
              </table>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 16px 0;background-color:#FFF7ED;border:1px solid #FED7AA;border-radius:12px;">
                <tr>
                  <td style="padding:14px 16px;">
                    <p style="margin:0;font-size:14px;line-height:1.6;color:#9A3412;">Check your eligibility status and complete anything that is still pending.</p>
                  </td>
                </tr>
              </table>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 16px 0;">
                <tr>
                  <td bgcolor="#F97316" style="border-radius:10px;">
                    <a href="{{cta_url}}" style="display:inline-block;padding:13px 20px;font-size:14px;font-weight:800;color:#FFFFFF;text-decoration:none;">{{cta_label}}</a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 6px 0;font-size:13px;color:#64748B;">Certificate link, if already available: <a href="{{certificate_url}}" style="color:#F97316;text-decoration:underline;">{{certificate_url}}</a></p>
              <p style="margin:0;font-size:13px;color:#64748B;">Need help? <a href="{{support_url}}" style="color:#F97316;text-decoration:underline;">{{support_url}}</a></p>
            </td>
          </tr>

          <tr>
            <td style="padding:18px 24px;background-color:#F8FAFC;border-top:1px solid #E2E8F0;text-align:center;">
              <p style="margin:0 0 8px 0;font-size:12px;line-height:1.6;color:#64748B;">You are receiving this email because you are part of {{program_name}} at {{college_name}}.</p>
              <a href="{{unsubscribe_url}}" style="font-size:12px;color:#64748B;text-decoration:underline;">Unsubscribe or manage preferences</a>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>$$,
  $$Hi {{first_name}},
You are getting closer to completing {{program_name}}.
Your Industry Ready Certificate is proof that you stayed consistent, completed required milestones, worked on your skills, and moved closer to becoming career-ready.
Complete the remaining eligibility steps: required modules, project work, Resume/GitHub/LinkedIn updates, and readiness activities.
{{cta_label}}: {{cta_url}}
Certificate link, if available: {{certificate_url}}
Support: {{support_url}}
Unsubscribe or manage preferences: {{unsubscribe_url}}$$,
  '[
    {"key":"first_name","label":"Student first name","required":false,"sample":"Anuj","inputType":"text","source":"recipient"},
    {"key":"college_name","label":"College name","required":false,"sample":"Demo College","inputType":"text","source":"recipient"},
    {"key":"program_name","label":"Program name","required":true,"sample":"NextGen CTO Career Readiness Program","inputType":"text","source":"campaign"},
    {"key":"cta_url","label":"CTA URL","required":true,"placeholder":"https://...","inputType":"url","source":"campaign"},
    {"key":"cta_label","label":"CTA button text","required":true,"sample":"Check eligibility","inputType":"text","source":"campaign"},
    {"key":"certificate_url","label":"Certificate URL","required":false,"placeholder":"https://...","inputType":"url","source":"campaign","helpText":"Optional link if the certificate is already available."},
    {"key":"support_url","label":"Support URL","required":false,"placeholder":"https://...","inputType":"url","source":"system"},
    {"key":"unsubscribe_url","label":"Unsubscribe URL","required":false,"inputType":"url","source":"system","helpText":"Preview-only value. Real sends use system-generated links."}
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

-- ==========================================================================
-- 10. college-admin-progress-report
-- ==========================================================================
insert into public.email_templates (
  name,
  slug,
  category,
  description,
  subject_template,
  preview_text_template,
  html_template,
  text_template,
  variables,
  is_system,
  is_active
)
values (
  'College Admin Progress Report',
  'college-admin-progress-report',
  'operational',
  'Admin-facing progress snapshot for college leadership.',
  '{{program_name}} progress snapshot for {{college_name}}',
  'A quick view of student progress, readiness signals, and next steps.',
  $$<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>{{program_name}} progress snapshot for {{college_name}}</title>
</head>
<body style="margin:0;padding:0;background-color:#F1F5F9;font-family:Arial,Helvetica,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;line-height:1px;font-size:1px;">
    A quick view of student progress, readiness signals, and next steps.
  </div>

  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F1F5F9;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;background-color:#FFFFFF;border:1px solid #E2E8F0;border-radius:16px;overflow:hidden;">

          <tr>
            <td style="background-color:#0B0F19;padding:22px 24px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="font-size:18px;font-weight:800;color:#FFFFFF;">NextGen CTO</td>
                  <td align="right" style="font-size:12px;color:#E5E7EB;">Admin Report</td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:28px 24px 10px 24px;">
              <p style="margin:0 0 8px 0;font-size:12px;font-weight:700;color:#F59E0B;text-transform:uppercase;letter-spacing:0.08em;">College Admin Report</p>
              <h1 style="margin:0 0 10px 0;font-size:26px;line-height:1.25;color:#0F172A;font-weight:800;">{{program_name}} progress snapshot for {{college_name}}</h1>
              <p style="margin:0 0 16px 0;font-size:13px;line-height:1.6;color:#64748B;">NextGen CTO × {{college_name}}</p>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 18px 0;">
                <tr>
                  <td style="height:2px;background-color:#F59E0B;"></td>
                </tr>
              </table>

              <p style="margin:0 0 12px 0;font-size:15px;line-height:1.7;color:#334155;">Hello,</p>
              <p style="margin:0 0 12px 0;font-size:15px;line-height:1.7;color:#334155;">Here is the latest progress snapshot for {{college_name}} under {{program_name}}. Current overall progress stands at {{progress_percent}}%.</p>
              <p style="margin:0 0 18px 0;font-size:15px;line-height:1.7;color:#334155;">This report gives you a quick view of learning progress, project completion, and profile-readiness indicators.</p>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 12px 0;background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;">
                <tr>
                  <td style="padding:14px 16px;">
                    <p style="margin:0 0 6px 0;font-size:14px;font-weight:700;color:#0F172A;">Included signals</p>
                    <ul style="margin:0;padding-left:18px;">
                      <li style="margin:0 0 6px 0;font-size:14px;line-height:1.6;color:#334155;">Participation and module progress trends</li>
                      <li style="margin:0 0 6px 0;font-size:14px;line-height:1.6;color:#334155;">Project completion and proof signals</li>
                      <li style="margin:0 0 6px 0;font-size:14px;line-height:1.6;color:#334155;">Resume/GitHub/LinkedIn readiness</li>
                      <li style="margin:0;font-size:14px;line-height:1.6;color:#334155;">Interview preparation indicators</li>
                    </ul>
                  </td>
                </tr>
              </table>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 16px 0;">
                <tr>
                  <td bgcolor="#F97316" style="border-radius:10px;">
                    <a href="{{cta_url}}" style="display:inline-block;padding:13px 20px;font-size:14px;font-weight:800;color:#FFFFFF;text-decoration:none;">{{cta_label}}</a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 6px 0;font-size:13px;color:#64748B;">Dashboard: <a href="{{dashboard_url}}" style="color:#F97316;text-decoration:underline;">{{dashboard_url}}</a></p>
              <p style="margin:0;font-size:13px;color:#64748B;">Need help? <a href="{{support_url}}" style="color:#F97316;text-decoration:underline;">{{support_url}}</a></p>
            </td>
          </tr>

          <tr>
            <td style="padding:18px 24px;background-color:#F8FAFC;border-top:1px solid #E2E8F0;text-align:center;">
              <p style="margin:0;font-size:12px;line-height:1.6;color:#64748B;">This operational report was generated for {{college_name}} under {{program_name}}.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>$$,
  $$Hello,
Here is the latest progress snapshot for {{college_name}} under {{program_name}}.
Current overall progress stands at {{progress_percent}}%.
This report gives you a quick view of learning progress, project completion, and profile-readiness indicators.
Inside the report, you can review student participation trends, module progress, project completion signals, Resume/GitHub/LinkedIn readiness, and interview preparation indicators.
{{cta_label}}: {{cta_url}}
Dashboard: {{dashboard_url}}
Support: {{support_url}}$$,
  '[
    {"key":"college_name","label":"College name","required":false,"sample":"Demo College","inputType":"text","source":"recipient"},
    {"key":"program_name","label":"Program name","required":true,"sample":"NextGen CTO Career Readiness Program","inputType":"text","source":"campaign"},
    {"key":"progress_percent","label":"Progress percent","required":true,"sample":"72","inputType":"percent","source":"campaign","helpText":"Enter a value from 0 to 100."},
    {"key":"cta_url","label":"CTA URL","required":true,"placeholder":"https://...","inputType":"url","source":"campaign"},
    {"key":"cta_label","label":"CTA button text","required":true,"sample":"View report","inputType":"text","source":"campaign"},
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

-- ==========================================================================
-- 11. program-deadline-alert
-- ==========================================================================
insert into public.email_templates (
  name,
  slug,
  category,
  description,
  subject_template,
  preview_text_template,
  html_template,
  text_template,
  variables,
  is_system,
  is_active
)
values (
  'Program Deadline Alert',
  'program-deadline-alert',
  'notice',
  'Deadline reminder for completing remaining steps in the program.',
  'Complete your remaining steps before {{deadline_date}}',
  'A few pending steps can delay your progress. Check what''s left and complete it on time.',
  $$<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Complete your remaining steps before {{deadline_date}}</title>
</head>
<body style="margin:0;padding:0;background-color:#F1F5F9;font-family:Arial,Helvetica,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;line-height:1px;font-size:1px;">
    A few pending steps can delay your progress. Check what's left and complete it on time.
  </div>

  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F1F5F9;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;background-color:#FFFFFF;border:1px solid #E2E8F0;border-radius:16px;overflow:hidden;">

          <tr>
            <td style="background-color:#0B0F19;padding:22px 24px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="font-size:18px;font-weight:800;color:#FFFFFF;">NextGen CTO</td>
                  <td align="right" style="font-size:12px;color:#E5E7EB;">Deadline Reminder</td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:28px 24px 10px 24px;">
              <p style="margin:0 0 8px 0;font-size:12px;font-weight:700;color:#F59E0B;text-transform:uppercase;letter-spacing:0.08em;">Deadline Alert</p>
              <h1 style="margin:0 0 10px 0;font-size:26px;line-height:1.25;color:#0F172A;font-weight:800;">Complete your remaining steps before {{deadline_date}}</h1>
              <p style="margin:0 0 16px 0;font-size:13px;line-height:1.6;color:#64748B;">NextGen CTO × {{college_name}}</p>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 18px 0;">
                <tr>
                  <td style="height:2px;background-color:#F59E0B;"></td>
                </tr>
              </table>

              <p style="margin:0 0 12px 0;font-size:15px;line-height:1.7;color:#334155;">Hi {{first_name}},</p>
              <p style="margin:0 0 12px 0;font-size:15px;line-height:1.7;color:#334155;">A quick reminder — the deadline to complete your remaining steps in {{program_name}} is {{deadline_date}}.</p>
              <p style="margin:0 0 18px 0;font-size:15px;line-height:1.7;color:#334155;">This is not to create pressure. It is to make sure you do not miss progress because of a few pending tasks.</p>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 12px 0;background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;">
                <tr>
                  <td style="padding:14px 16px;">
                    <p style="margin:0 0 6px 0;font-size:14px;font-weight:700;color:#0F172A;">Check what is pending</p>
                    <ul style="margin:0;padding-left:18px;">
                      <li style="margin:0 0 6px 0;font-size:14px;line-height:1.6;color:#334155;">Project submission and proof</li>
                      <li style="margin:0 0 6px 0;font-size:14px;line-height:1.6;color:#334155;">Profile updates: Resume, GitHub, LinkedIn</li>
                      <li style="margin:0;font-size:14px;line-height:1.6;color:#334155;">Readiness activities and final checklist</li>
                    </ul>
                  </td>
                </tr>
              </table>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 16px 0;background-color:#FFF7ED;border:1px solid #FED7AA;border-radius:12px;">
                <tr>
                  <td style="padding:14px 16px;">
                    <p style="margin:0;font-size:14px;line-height:1.6;color:#9A3412;">If you are stuck, do not wait till the last day. Use the support channel and keep moving.</p>
                  </td>
                </tr>
              </table>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 16px 0;">
                <tr>
                  <td bgcolor="#F97316" style="border-radius:10px;">
                    <a href="{{cta_url}}" style="display:inline-block;padding:13px 20px;font-size:14px;font-weight:800;color:#FFFFFF;text-decoration:none;">{{cta_label}}</a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 6px 0;font-size:13px;color:#64748B;">Dashboard: <a href="{{dashboard_url}}" style="color:#F97316;text-decoration:underline;">{{dashboard_url}}</a></p>
              <p style="margin:0;font-size:13px;color:#64748B;">Need help? <a href="{{support_url}}" style="color:#F97316;text-decoration:underline;">{{support_url}}</a></p>
            </td>
          </tr>

          <tr>
            <td style="padding:18px 24px;background-color:#F8FAFC;border-top:1px solid #E2E8F0;text-align:center;">
              <p style="margin:0 0 8px 0;font-size:12px;line-height:1.6;color:#64748B;">You are receiving this email because you are part of {{program_name}} at {{college_name}}.</p>
              <a href="{{unsubscribe_url}}" style="font-size:12px;color:#64748B;text-decoration:underline;">Unsubscribe or manage preferences</a>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>$$,
  $$Hi {{first_name}},
A quick reminder — the deadline to complete your remaining steps in {{program_name}} is {{deadline_date}}.
This is not to create pressure. It is to make sure you do not miss progress because of a few pending tasks.
Check project submission, profile updates, Resume/GitHub/LinkedIn work, readiness activities, and final checklist items.
{{cta_label}}: {{cta_url}}
Dashboard: {{dashboard_url}}
Support: {{support_url}}
Unsubscribe or manage preferences: {{unsubscribe_url}}$$,
  '[
    {"key":"first_name","label":"Student first name","required":false,"sample":"Anuj","inputType":"text","source":"recipient"},
    {"key":"college_name","label":"College name","required":false,"sample":"Demo College","inputType":"text","source":"recipient"},
    {"key":"program_name","label":"Program name","required":true,"sample":"NextGen CTO Career Readiness Program","inputType":"text","source":"campaign"},
    {"key":"deadline_date","label":"Deadline date","required":true,"sample":"2026-05-30","inputType":"date","source":"campaign"},
    {"key":"cta_url","label":"CTA URL","required":true,"placeholder":"https://...","inputType":"url","source":"campaign"},
    {"key":"cta_label","label":"CTA button text","required":true,"sample":"View checklist","inputType":"text","source":"campaign"},
    {"key":"dashboard_url","label":"Dashboard URL","required":false,"placeholder":"https://...","inputType":"url","source":"system"},
    {"key":"support_url","label":"Support URL","required":false,"placeholder":"https://...","inputType":"url","source":"system"},
    {"key":"unsubscribe_url","label":"Unsubscribe URL","required":false,"inputType":"url","source":"system","helpText":"Preview-only value. Real sends use system-generated links."}
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

-- ==========================================================================
-- 12. advanced-addons-teaser
-- ==========================================================================
insert into public.email_templates (
  name,
  slug,
  category,
  description,
  subject_template,
  preview_text_template,
  html_template,
  text_template,
  variables,
  is_system,
  is_active
)
values (
  'Advanced Add-ons Teaser',
  'advanced-addons-teaser',
  'marketing',
  'Optional advanced add-ons after the core career readiness journey.',
  'Ready to go deeper after the core program?',
  'Explore optional advanced add-ons when you are ready for the next level.',
  $$<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Ready to go deeper after the core program?</title>
</head>
<body style="margin:0;padding:0;background-color:#F1F5F9;font-family:Arial,Helvetica,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;line-height:1px;font-size:1px;">
    Explore optional advanced add-ons when you are ready for the next level.
  </div>

  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F1F5F9;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;background-color:#FFFFFF;border:1px solid #E2E8F0;border-radius:16px;overflow:hidden;">

          <tr>
            <td style="background-color:#0B0F19;padding:22px 24px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="font-size:18px;font-weight:800;color:#FFFFFF;">NextGen CTO</td>
                  <td align="right" style="font-size:12px;color:#E5E7EB;">Advanced Add-ons</td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:28px 24px 10px 24px;">
              <p style="margin:0 0 8px 0;font-size:12px;font-weight:700;color:#F59E0B;text-transform:uppercase;letter-spacing:0.08em;">Optional Advanced Tracks</p>
              <h1 style="margin:0 0 10px 0;font-size:26px;line-height:1.25;color:#0F172A;font-weight:800;">Ready to go deeper after the core program?</h1>
              <p style="margin:0 0 16px 0;font-size:13px;line-height:1.6;color:#64748B;">NextGen CTO × {{college_name}}</p>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 18px 0;">
                <tr>
                  <td style="height:2px;background-color:#F59E0B;"></td>
                </tr>
              </table>

              <p style="margin:0 0 12px 0;font-size:15px;line-height:1.7;color:#334155;">Hi {{first_name}},</p>
              <p style="margin:0 0 12px 0;font-size:15px;line-height:1.7;color:#334155;">Once you build your foundations, the next question is simple: what should you learn next?</p>
              <p style="margin:0 0 18px 0;font-size:15px;line-height:1.7;color:#334155;">Advanced add-ons are optional learning paths for students who want to go deeper after the core career readiness journey inside {{program_name}}.</p>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 12px 0;background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;">
                <tr>
                  <td style="padding:14px 16px;">
                    <p style="margin:0 0 6px 0;font-size:14px;font-weight:700;color:#0F172A;">Optional add-ons include</p>
                    <ul style="margin:0;padding-left:18px;">
                      <li style="margin:0 0 6px 0;font-size:14px;line-height:1.6;color:#334155;">System Design, HLD and LLD</li>
                      <li style="margin:0 0 6px 0;font-size:14px;line-height:1.6;color:#334155;">Advanced DSA and problem-solving</li>
                      <li style="margin:0 0 6px 0;font-size:14px;line-height:1.6;color:#334155;">Advanced AI and applied AI engineering</li>
                      <li style="margin:0 0 6px 0;font-size:14px;line-height:1.6;color:#334155;">Scalability concepts and architecture</li>
                      <li style="margin:0 0 6px 0;font-size:14px;line-height:1.6;color:#334155;">Advanced hands-on exercises</li>
                      <li style="margin:0;font-size:14px;line-height:1.6;color:#334155;">Additional mentorship support</li>
                    </ul>
                  </td>
                </tr>
              </table>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 16px 0;background-color:#EFF6FF;border:1px solid #BFDBFE;border-radius:12px;">
                <tr>
                  <td style="padding:14px 16px;">
                    <p style="margin:0;font-size:14px;line-height:1.6;color:#1E3A8A;">These add-ons are optional and not required for the core certificate.</p>
                  </td>
                </tr>
              </table>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 16px 0;">
                <tr>
                  <td bgcolor="#F97316" style="border-radius:10px;">
                    <a href="{{cta_url}}" style="display:inline-block;padding:13px 20px;font-size:14px;font-weight:800;color:#FFFFFF;text-decoration:none;">{{cta_label}}</a>
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-size:13px;color:#64748B;">Need help? <a href="{{support_url}}" style="color:#F97316;text-decoration:underline;">{{support_url}}</a></p>
            </td>
          </tr>

          <tr>
            <td style="padding:18px 24px;background-color:#F8FAFC;border-top:1px solid #E2E8F0;text-align:center;">
              <p style="margin:0 0 8px 0;font-size:12px;line-height:1.6;color:#64748B;">You are receiving this email because you are part of {{program_name}} at {{college_name}}.</p>
              <a href="{{unsubscribe_url}}" style="font-size:12px;color:#64748B;text-decoration:underline;">Unsubscribe or manage preferences</a>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>$$,
  $$Hi {{first_name}},
Once you build your foundations, the next question is simple: what should you learn next?
Advanced add-ons are optional learning paths for students who want to go deeper after the core career readiness journey inside {{program_name}}.
You can explore System Design, HLD and LLD, Advanced DSA, Advanced AI and applied AI engineering, scalability concepts, advanced hands-on exercises, and additional mentorship support.
{{cta_label}}: {{cta_url}}
Support: {{support_url}}
Unsubscribe or manage preferences: {{unsubscribe_url}}$$,
  '[
    {"key":"first_name","label":"Student first name","required":false,"sample":"Anuj","inputType":"text","source":"recipient"},
    {"key":"college_name","label":"College name","required":false,"sample":"Demo College","inputType":"text","source":"recipient"},
    {"key":"program_name","label":"Program name","required":true,"sample":"NextGen CTO Career Readiness Program","inputType":"text","source":"campaign"},
    {"key":"cta_url","label":"CTA URL","required":true,"placeholder":"https://...","inputType":"url","source":"campaign"},
    {"key":"cta_label","label":"CTA button text","required":true,"sample":"Explore add-ons","inputType":"text","source":"campaign"},
    {"key":"support_url","label":"Support URL","required":false,"placeholder":"https://...","inputType":"url","source":"system"},
    {"key":"unsubscribe_url","label":"Unsubscribe URL","required":false,"inputType":"url","source":"system","helpText":"Preview-only value. Real sends use system-generated links."}
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

-- ==========================================================================
-- Keep old Professional templates inactive
-- ==========================================================================
update public.email_templates
set is_active = false,
    updated_at = now()
where slug in (
  'new-course-announcement',
  'official-college-notice',
  'deadline-reminder',
  'event-webinar-invite',
  'premium-product-launch',
  'blank-professional'
);

commit;
