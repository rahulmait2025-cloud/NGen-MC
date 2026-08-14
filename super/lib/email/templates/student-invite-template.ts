/** In-repo student invite email (not Supabase Auth / not Email Center DB). */

export const STUDENT_INVITE_PREHEADER =
  'You are invited to join NextGen CTO at {{college_name}} — set your password to get started.';

export const STUDENT_INVITE_SUBJECT = 'Welcome to NextGen CTO — set your password';

export const STUDENT_INVITE_RESEND_SUBJECT =
  'Reminder: complete your NextGen CTO student account setup';

export const STUDENT_INVITE_TEXT = `Dear {{first_name}},

Thank you for joining NextGen CTO.

You have been invited to create your account at {{college_name}}.

Set your password: {{cta_url}}

Visit: {{site_url}}

Unsubscribe: {{unsubscribe_url}}

Warm regards,
Anuj (CTO Bhaiya)
Founder & CEO
NextGen CTO Private Limited`;
