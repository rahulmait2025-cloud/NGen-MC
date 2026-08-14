import { z } from 'zod';

import type { EmailProviderName } from './types';

type EmailConfig = {
  provider: EmailProviderName;
  fromEmail: string;
  replyTo?: string;
  sendgridApiKey?: string;
  resendApiKey?: string;
};

export type EmailConfigInspection = {
  selectedProvider: EmailProviderName;
  hasEmailFrom: boolean;
  hasReplyTo: boolean;
  hasSendGridKey: boolean;
  hasResendKey: boolean;
  fromSource: 'EMAIL_FROM' | 'SENDGRID_FROM_EMAIL' | 'missing';
  dryRun: boolean;
  ready: boolean;
  issues: string[];
};

const providerSchema = z.enum(['sendgrid', 'resend']);
let cachedConfig: EmailConfig | null = null;

function normalizeProviderSafe(value: string | undefined): EmailProviderName {
  const provider = (value ?? 'sendgrid').trim().toLowerCase();
  const parsed = providerSchema.safeParse(provider);
  return parsed.success ? parsed.data : 'sendgrid';
}

function normalizeProvider(value: string | undefined): EmailProviderName {
  const provider = (value ?? 'sendgrid').trim().toLowerCase();
  const parsed = providerSchema.safeParse(provider);
  if (!parsed.success) throw new Error('[email] Invalid EMAIL_PROVIDER. Allowed values: sendgrid | resend.');
  return parsed.data;
}

export function inspectEmailConfig(): EmailConfigInspection {
  const selectedProvider = normalizeProviderSafe(process.env.EMAIL_PROVIDER);
  const hasEmailFrom = Boolean(process.env.EMAIL_FROM?.trim());
  const hasSendgridFromEmail = Boolean(process.env.SENDGRID_FROM_EMAIL?.trim());
  const hasReplyTo = Boolean(process.env.EMAIL_REPLY_TO?.trim());
  const hasSendGridKey = Boolean(process.env.SENDGRID_API_KEY?.trim());
  const hasResendKey = Boolean(process.env.RESEND_API_KEY?.trim());
  const dryRun = String(process.env.EMAIL_DRY_RUN ?? '').trim().toLowerCase() === 'true';
  const fromSource: 'EMAIL_FROM' | 'SENDGRID_FROM_EMAIL' | 'missing' = hasEmailFrom
    ? 'EMAIL_FROM'
    : hasSendgridFromEmail
      ? 'SENDGRID_FROM_EMAIL'
      : 'missing';

  const issues: string[] = [];
  if (fromSource === 'missing') issues.push('Missing sender address. Set EMAIL_FROM or SENDGRID_FROM_EMAIL.');
  if (!dryRun && selectedProvider === 'sendgrid' && !hasSendGridKey) {
    issues.push('Missing SENDGRID_API_KEY for EMAIL_PROVIDER=sendgrid.');
  }
  if (!dryRun && selectedProvider === 'resend' && !hasResendKey) {
    issues.push('Missing RESEND_API_KEY for EMAIL_PROVIDER=resend.');
  }

  const hasFrom = hasEmailFrom || hasSendgridFromEmail;
  const ready = dryRun ? hasFrom : issues.length === 0;

  return {
    selectedProvider,
    hasEmailFrom: hasFrom,
    hasReplyTo,
    hasSendGridKey,
    hasResendKey,
    fromSource,
    dryRun,
    ready,
    issues,
  };
}

export function getEmailConfig(): EmailConfig {
  if (cachedConfig) return cachedConfig;

  const provider = normalizeProvider(process.env.EMAIL_PROVIDER);
  const fromEmail = (process.env.EMAIL_FROM ?? process.env.SENDGRID_FROM_EMAIL ?? '').trim();
  const replyTo = process.env.EMAIL_REPLY_TO?.trim() || undefined;
  const sendgridApiKey = process.env.SENDGRID_API_KEY?.trim();
  const resendApiKey = process.env.RESEND_API_KEY?.trim();
  const dryRun = String(process.env.EMAIL_DRY_RUN ?? '').trim().toLowerCase() === 'true';

  if (!fromEmail) throw new Error('[email] Missing sender address. Set EMAIL_FROM or SENDGRID_FROM_EMAIL.');
  if (!dryRun && provider === 'sendgrid' && !sendgridApiKey) {
    throw new Error('[email] Missing SENDGRID_API_KEY for EMAIL_PROVIDER=sendgrid.');
  }
  if (!dryRun && provider === 'resend' && !resendApiKey) {
    throw new Error('[email] Missing RESEND_API_KEY for EMAIL_PROVIDER=resend.');
  }

  cachedConfig = {
    provider,
    fromEmail,
    replyTo,
    sendgridApiKey,
    resendApiKey,
  };
  return cachedConfig;
}
