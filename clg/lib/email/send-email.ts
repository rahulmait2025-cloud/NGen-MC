import { getEmailConfig, inspectEmailConfig } from './config';
import { ResendProvider } from './providers/resend';
import { SendGridProvider } from './providers/sendgrid';
import { normalizeRecipients, type EmailProvider } from './providers/base';
import type { SendEmailInput, SendEmailResult } from './types';

const KNOWN_CATEGORIES = new Set([
  'welcome',
  'password_reset',
  'student_invite',
  'student_invite_resend',
  'project_submission_confirmation',
  'resume_submission_confirmation',
  'mock_interview_scheduling',
  'mentorship_reminder',
  'feedback_available',
  'interview_ready_status_update',
  'announcement',
  'report_export_ready',
  'risk_alert',
  'college_admin_alert',
  'super_admin_alert',
  'test_email',
]);

function createProvider(): EmailProvider {
  const config = getEmailConfig();
  return config.provider === 'resend' ? new ResendProvider() : new SendGridProvider();
}

function buildInvalid(provider: 'sendgrid' | 'resend', message: string): SendEmailResult {
  return { ok: false, provider, errorCode: 'INVALID_EMAIL_INPUT', errorMessage: message };
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const inspected = inspectEmailConfig();
  const providerName = inspected.selectedProvider;
  const to = normalizeRecipients(input.to);
  const cc = normalizeRecipients(input.cc);
  const bcc = normalizeRecipients(input.bcc);

  if (to.length === 0) return buildInvalid(providerName, 'At least one recipient is required.');
  if (input.cc !== undefined && cc.length === 0) return buildInvalid(providerName, 'When provided, cc must include at least one recipient.');
  if (input.bcc !== undefined && bcc.length === 0) return buildInvalid(providerName, 'When provided, bcc must include at least one recipient.');
  if (!input.subject?.trim()) return buildInvalid(providerName, 'Email subject is required.');
  if (!input.html?.trim() && !input.text?.trim()) return buildInvalid(providerName, 'Either html or text content is required.');
  if (!input.category?.trim()) return buildInvalid(providerName, 'Email category is required.');
  if (!KNOWN_CATEGORIES.has(input.category)) return buildInvalid(providerName, 'Invalid email category.');

  if (inspected.dryRun) {
    console.info(`[email] dry-run provider=${providerName} category=${input.category} toCount=${to.length}`);
    return { ok: true, provider: providerName, messageId: 'dry_run' };
  }

  const provider = createProvider();
  const result = await provider.send(input);
  if (result.ok) {
    console.info(`[email] sent provider=${provider.name} category=${input.category} toCount=${to.length}`);
    return result;
  }

  console.warn(`[email] failed provider=${provider.name} category=${input.category} errorCode=${result.errorCode ?? 'unknown'}`);
  return result;
}
