import type { EmailProviderName } from './types';

type EmailConfig = {
  provider: EmailProviderName;
  fromEmail: string;
  replyTo?: string;
  sendgridApiKey?: string;
  resendApiKey?: string;
};

let cachedConfig: EmailConfig | null = null;

function isDryRunEnabled(): boolean {
  return String(process.env.EMAIL_DRY_RUN ?? '').trim().toLowerCase() === 'true';
}

function normalizeProvider(value: string | undefined): EmailProviderName {
  const provider = (value ?? 'sendgrid').trim().toLowerCase();
  if (provider === 'sendgrid' || provider === 'resend') {
    return provider;
  }
  throw new Error('[email] Invalid EMAIL_PROVIDER. Allowed values: sendgrid | resend.');
}

function normalizeProviderSafe(value: string | undefined): EmailProviderName {
  const provider = (value ?? 'sendgrid').trim().toLowerCase();
  if (provider === 'resend') return 'resend';
  return 'sendgrid';
}

function requireString(value: string | undefined, errorMessage: string): string {
  const nextValue = value?.trim();
  if (!nextValue) {
    throw new Error(errorMessage);
  }
  return nextValue;
}

export function getEmailConfig(): EmailConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const provider = normalizeProvider(process.env.EMAIL_PROVIDER);
  const fromEmail = (process.env.EMAIL_FROM ?? process.env.SENDGRID_FROM_EMAIL ?? '').trim();
  if (!fromEmail) {
    throw new Error('[email] Missing sender address. Set EMAIL_FROM or SENDGRID_FROM_EMAIL.');
  }

  const replyTo = process.env.EMAIL_REPLY_TO?.trim() || undefined;
  const sendgridApiKey = process.env.SENDGRID_API_KEY?.trim();
  const resendApiKey = process.env.RESEND_API_KEY?.trim();
  const isDryRun = isDryRunEnabled();

  if (!isDryRun && provider === 'sendgrid') {
    requireString(sendgridApiKey, '[email] Missing SENDGRID_API_KEY for EMAIL_PROVIDER=sendgrid.');
  }

  if (!isDryRun && provider === 'resend') {
    requireString(resendApiKey, '[email] Missing RESEND_API_KEY for EMAIL_PROVIDER=resend.');
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

export type EmailConfigInspection = {
  selectedProvider: EmailProviderName;
  hasEmailFrom: boolean;
  hasReplyTo: boolean;
  hasSendGridKey: boolean;
  hasResendKey: boolean;
  fromSource: 'EMAIL_FROM' | 'SENDGRID_FROM_EMAIL' | 'missing';
  isDryRun: boolean;
  ready: boolean;
  issues: string[];
};

export function inspectEmailConfig(): EmailConfigInspection {
  const selectedProvider = normalizeProviderSafe(process.env.EMAIL_PROVIDER);
  const hasEmailFrom = Boolean(process.env.EMAIL_FROM?.trim());
  const hasSendgridFromEmail = Boolean(process.env.SENDGRID_FROM_EMAIL?.trim());
  const hasReplyTo = Boolean(process.env.EMAIL_REPLY_TO?.trim());
  const hasSendGridKey = Boolean(process.env.SENDGRID_API_KEY?.trim());
  const hasResendKey = Boolean(process.env.RESEND_API_KEY?.trim());
  const isDryRun = isDryRunEnabled();
  const fromSource: 'EMAIL_FROM' | 'SENDGRID_FROM_EMAIL' | 'missing' = hasEmailFrom
    ? 'EMAIL_FROM'
    : hasSendgridFromEmail
      ? 'SENDGRID_FROM_EMAIL'
      : 'missing';

  const issues: string[] = [];
  if (fromSource === 'missing') {
    issues.push('Missing sender address. Set EMAIL_FROM or SENDGRID_FROM_EMAIL.');
  }
  if (!isDryRun && selectedProvider === 'sendgrid' && !hasSendGridKey) {
    issues.push('Missing SENDGRID_API_KEY for EMAIL_PROVIDER=sendgrid.');
  }
  if (!isDryRun && selectedProvider === 'resend' && !hasResendKey) {
    issues.push('Missing RESEND_API_KEY for EMAIL_PROVIDER=resend.');
  }

  return {
    selectedProvider,
    hasEmailFrom: hasEmailFrom || hasSendgridFromEmail,
    hasReplyTo,
    hasSendGridKey,
    hasResendKey,
    fromSource,
    isDryRun,
    ready: issues.length === 0,
    issues,
  };
}
