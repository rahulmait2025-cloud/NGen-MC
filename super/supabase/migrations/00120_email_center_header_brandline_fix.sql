begin;

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
                  <td style="font-size:18px;font-weight:800;color:#FFFFFF;">NextGen CTO × {{college_name}}</td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:28px 24px 10px 24px;">
              <p style="margin:0 0 8px 0;font-size:12px;font-weight:700;color:#F59E0B;text-transform:uppercase;letter-spacing:0.08em;">Program Launch</p>
              <h1 style="margin:0 0 10px 0;font-size:26px;line-height:1.25;color:#0F172A;font-weight:800;">Welcome to {{program_name}}</h1>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 18px 0;">
                <tr>
                  <td style="height:2px;background-color:#F59E0B;"></td>
                </tr>
              </table>

              <p style="margin:0 0 14px 0;font-size:15px;line-height:1.7;color:#334155;">Hi <strong>{{first_name}}</strong>,</p>

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:22px 0 26px 0;">
                <tr>
                  <td align="left">
                    <a href="{{cta_url}}" style="display:inline-block;background-color:#F97316;color:#FFFFFF;text-decoration:none;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:700;padding:14px 22px;border-radius:10px;">{{cta_label}}</a>
                  </td>
                </tr>
              </table>

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
  html_template = excluded.html_template,
  updated_at = now();

commit;
