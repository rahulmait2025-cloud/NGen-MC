import { getEmailConfig, inspectEmailConfig } from './config';
import { ResendProvider } from './providers/resend';
import { SendGridProvider } from './providers/sendgrid';
import { normalizeRecipients, type EmailProvider } from './providers/base';
import type { SendEmailInput, SendEmailResult } from './types';

const KNOWN_CATEGORIES = new Set([
  'college_lead_confirmation',
  'college_lead_admin_notification',
  'welcome',
  'password_reset',
  'project_submission_confirmation',
  'resume_submission_confirmation',
  'mock_interview_scheduling',
  'mentorship_reminder',
  'feedback_available',
  'interview_ready_status_update',
  'announcement',
  'report_export_ready',
  'risk_alert',
  'test_email',
]);

function createProvider(): EmailProvider {
  const config = getEmailConfig();
  if (config.provider === 'resend') {
    return new ResendProvider();
  }
  return new SendGridProvider();
}

function normalizeForValidation(input: SendEmailInput): {
  to: string[];
  cc: string[];
  bcc: string[];
} {
  return {
    to: normalizeRecipients(input.to),
    cc: normalizeRecipients(input.cc),
    bcc: normalizeRecipients(input.bcc),
  };
}

function buildInvalidResult(providerName: 'sendgrid' | 'resend', message: string): SendEmailResult {
  return {
    ok: false,
    provider: providerName,
    errorCode: 'INVALID_EMAIL_INPUT',
    errorMessage: message,
  };
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const inspected = inspectEmailConfig();
  const normalized = normalizeForValidation(input);
  const providerName = inspected.selectedProvider;
  const toCount = normalized.to.length;

  if (toCount === 0) {
    return buildInvalidResult(providerName, 'At least one recipient is required.');
  }
  if (input.cc !== undefined && normalized.cc.length === 0) {
    return buildInvalidResult(providerName, 'When provided, cc must include at least one recipient.');
  }
  if (input.bcc !== undefined && normalized.bcc.length === 0) {
    return buildInvalidResult(providerName, 'When provided, bcc must include at least one recipient.');
  }
  if (!input.subject?.trim()) {
    return buildInvalidResult(providerName, 'Email subject is required.');
  }
  if (!input.html?.trim() && !input.text?.trim()) {
    return buildInvalidResult(providerName, 'Either html or text content is required.');
  }
  if (!input.category?.trim()) {
    return buildInvalidResult(providerName, 'Email category is required.');
  }
  if (!KNOWN_CATEGORIES.has(input.category)) {
    return buildInvalidResult(providerName, 'Invalid email category.');
  }

  if (inspected.isDryRun) {
    console.info(`[email] dry-run provider=${providerName} category=${input.category} toCount=${toCount}`);
    return {
      ok: true,
      provider: providerName,
      messageId: 'dry_run',
    };
  }

  const provider = createProvider();

  const result = await provider.send(input);
  if (result.ok) {
    console.info(`[email] sent provider=${provider.name} category=${input.category} toCount=${toCount}`);
    return result;
  }

  console.warn(
    `[email] failed provider=${provider.name} category=${input.category} errorCode=${result.errorCode ?? 'unknown'}`
  );
  return result;
}
