export type EmailProviderName = 'sendgrid' | 'resend';

export type EmailCategory =
  | 'college_lead_confirmation'
  | 'college_lead_admin_notification'
  | 'welcome'
  | 'password_reset'
  | 'project_submission_confirmation'
  | 'resume_submission_confirmation'
  | 'mock_interview_scheduling'
  | 'mentorship_reminder'
  | 'feedback_available'
  | 'interview_ready_status_update'
  | 'announcement'
  | 'report_export_ready'
  | 'risk_alert'
  | 'test_email';

export type SendEmailInput = {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  from?: string;
  replyTo?: string;
  subject: string;
  html: string;
  text?: string;
  headers?: Record<string, string>;
  attachments?: Array<{
    filename: string;
    content: string;
    type?: string;
    disposition?: 'attachment' | 'inline';
    contentId?: string;
  }>;
  category: EmailCategory;
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
