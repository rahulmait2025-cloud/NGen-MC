export type EmailProviderName = 'sendgrid' | 'resend';

export type EmailCategory =
  | 'welcome'
  | 'password_reset'
  | 'student_invite'
  | 'student_invite_resend'
  | 'project_submission_confirmation'
  | 'resume_submission_confirmation'
  | 'mock_interview_scheduling'
  | 'mentorship_reminder'
  | 'feedback_available'
  | 'interview_ready_status_update'
  | 'announcement'
  | 'report_export_ready'
  | 'risk_alert'
  | 'college_admin_alert'
  | 'super_admin_alert'
  | 'test_email';

export type SendEmailInput = {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  from?: string;
  replyTo?: string;
  subject: string;
  html?: string;
  text?: string;
  category: EmailCategory;
  headers?: Record<string, string>;
  tags?: Record<string, string>;
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
};

export type SendEmailResult = {
  ok: boolean;
  provider: EmailProviderName;
  messageId?: string;
  errorCode?: string;
  errorMessage?: string;
  raw?: unknown;
};
