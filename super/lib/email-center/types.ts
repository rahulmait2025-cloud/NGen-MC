import { z } from 'zod';
import { EMAIL_CENTER_LANES } from '@/lib/email-center/email-category';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const EMAIL_TEMPLATE_CATEGORIES = [
  'marketing',
  'product_launch',
  'notice',
  'announcement',
  'notification',
  'operational',
  'custom',
] as const;

export type EmailTemplateCategory = (typeof EMAIL_TEMPLATE_CATEGORIES)[number];

const EMAIL_CAMPAIGN_TYPES = [
  'marketing',
  'product_launch',
  'notice',
  'announcement',
  'notification',
  'operational',
  'custom',
] as const;

export type EmailCampaignType = (typeof EMAIL_CAMPAIGN_TYPES)[number];

const _EMAIL_CAMPAIGN_STATUSES = [
  'draft',
  'test_sent',
  'ready',
  'sending',
  'sent',
  'failed',
  'cancelled',
] as const;

export type EmailCampaignStatus = (typeof _EMAIL_CAMPAIGN_STATUSES)[number];

const _EMAIL_SUPPRESSION_REASONS = [
  'unsubscribed',
  'bounced',
  'complained',
  'manual',
] as const;

export type EmailSuppressionReason = (typeof _EMAIL_SUPPRESSION_REASONS)[number];

export interface EmailTemplateVariable {
  key: string;
  label: string;
  type?: 'string' | 'number' | 'boolean' | 'array' | 'url' | 'date';
  required?: boolean;
  description?: string;
  sample?: string;
  inputType?: 'text' | 'url' | 'date' | 'time' | 'number' | 'percent' | 'textarea';
  source?: 'recipient' | 'campaign' | 'system';
  placeholder?: string;
  helpText?: string;
}

export interface EmailTemplate {
  id: string;
  name: string;
  slug: string;
  category: EmailTemplateCategory;
  description: string | null;
  subject_template: string;
  preview_text_template: string | null;
  html_template: string;
  text_template: string;
  variables: EmailTemplateVariable[];
  is_system: boolean;
  is_active: boolean;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export type ApprovalStatus = 'not_required' | 'pending_review' | 'approved' | 'rejected';

export type EmailCampaignContentMode = 'template' | 'custom_composer' | 'legacy_html';

export interface EmailCampaign {
  id: string;
  name: string;
  campaign_type: EmailCampaignType;
  email_category: string | null;
  status: EmailCampaignStatus;
  template_id: string | null;
  content_mode?: EmailCampaignContentMode | null;
  composer_state?: Record<string, unknown> | null;
  subject: string;
  preview_text: string | null;
  html_body: string;
  text_body: string;
  audience_config: Record<string, unknown>;
  template_variable_values: Record<string, string>;
  test_last_sent_to: string | null;
  test_last_sent_at: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  recipient_count: number;
  queued_count: number;
  sent_count: number;
  failed_count: number;
  skipped_count: number;
  queued_at: string | null;
  sent_at: string | null;
  cancelled_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  approval_status: ApprovalStatus;
  approval_requested_at: string | null;
  rejected_by: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  delivered_count: number;
  opened_count: number;
  clicked_count: number;
  bounced_count: number;
  complained_count: number;
  unsubscribed_count: number;
  completion_notification_sent_at: string | null;
  completion_notification_recipient: string | null;
  completion_notification_error: string | null;
  completion_notification_attempted_at: string | null;
}

export interface EmailCampaignTest {
  id: string;
  campaign_id: string;
  sent_to: string;
  provider: string | null;
  message_id: string | null;
  status: string;
  error_message: string | null;
  created_by: string | null;
  created_at: string;
}

export interface EmailSuppression {
  id: string;
  email: string;
  reason: EmailSuppressionReason;
  source: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface RenderedEmail {
  subject: string;
  previewText: string;
  html: string;
  text: string;
}

export interface EmailCenterStats {
  totalDrafts: number;
  testSent: number;
  activeTemplates: number;
  suppressedEmails: number;
}

const contentModeSchema = z.enum(['template', 'custom_composer', 'legacy_html']);

export const createCampaignSchema = z.object({
  name: z.string().min(1, 'Campaign name is required').max(200, 'Name too long'),
  campaign_type: z.enum(EMAIL_CAMPAIGN_TYPES).optional(),
  email_category: z.enum(EMAIL_CENTER_LANES),
  template_id: z.uuid().nullable().optional(),
  content_mode: contentModeSchema.optional(),
  composer_state: z.record(z.string(), z.unknown()).nullable().optional(),
  subject: z.string().min(1, 'Subject is required').max(500, 'Subject too long'),
  preview_text: z.string().max(300, 'Preview text too long').optional(),
  html_body: z.string().min(1, 'Email body is required').max(500_000, 'HTML body too large'),
  text_body: z.string().max(500_000, 'Text body too large').optional(),
  audience_config: z.record(z.string(), z.unknown()).default({}),
  template_variable_values: z.record(z.string(), z.string()).optional(),
});

export const updateCampaignSchema = z.object({
  id: z.uuid('Invalid campaign ID'),
  name: z.string().min(1, 'Campaign name is required').max(200, 'Name too long').optional(),
  campaign_type: z.enum(EMAIL_CAMPAIGN_TYPES).optional(),
  email_category: z.enum(EMAIL_CENTER_LANES).optional(),
  template_id: z.uuid().nullable().optional(),
  content_mode: contentModeSchema.optional(),
  composer_state: z.record(z.string(), z.unknown()).nullable().optional(),
  subject: z.string().min(1, 'Subject is required').max(500, 'Subject too long').optional(),
  preview_text: z.string().max(300, 'Preview text too long').nullable().optional(),
  html_body: z.string().min(1, 'Email body is required').max(500_000, 'HTML body too large').optional(),
  text_body: z.string().max(500_000, 'Text body too large').optional().nullable(),
  audience_config: z.record(z.string(), z.unknown()).optional(),
  template_variable_values: z.record(z.string(), z.string()).optional(),
});

export const sendTestEmailSchema = z.object({
  campaign_id: z.uuid('Invalid campaign ID'),
  test_email: z.email('Valid email address is required'),
  preview_variables: z.record(z.string(), z.string()).optional(),
});

export const duplicateCampaignSchema = z.object({
  campaign_id: z.uuid('Invalid campaign ID'),
});

export const approvalActionSchema = z.object({
  campaign_id: z.uuid('Invalid campaign ID'),
  note: z.string().nullable().optional(),
  reason: z.string().optional(),
});

export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;
export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>;
export type SendTestEmailInput = z.infer<typeof sendTestEmailSchema>;
export type DuplicateCampaignInput = z.infer<typeof duplicateCampaignSchema>;
export type ApprovalActionInput = z.infer<typeof approvalActionSchema>;

export const campaignStatusLabels: Record<string, string> = {
  draft: 'Draft',
  test_sent: 'Test Sent',
  ready: 'Ready',
  sending: 'Sending',
  sent: 'Sent',
  failed: 'Failed',
  cancelled: 'Cancelled',
};

export const campaignTypeLabels: Record<string, string> = {
  marketing: 'Marketing',
  product_launch: 'Product Launch',
  notice: 'Notice',
  announcement: 'Announcement',
  notification: 'Notification',
  operational: 'Operational',
  custom: 'Custom',
};

const _audienceTypeLabels: Record<string, string> = {
  manual_emails: 'Manual Email List',
  all_students: 'All Students',
  all_college_admins: 'All College Admins',
  specific_college_students: 'Specific College Students',
  specific_college_admins: 'Specific College Admins',
  individual_students: 'Individual Students',
  individual_college_admins: 'Individual College Admins',
};

const _approvalStatusLabels: Record<string, string> = {
  not_required: 'Not Required',
  pending_review: 'Pending Review',
  approved: 'Approved',
  rejected: 'Rejected',
};
