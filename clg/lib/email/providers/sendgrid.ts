import sgMail from '@sendgrid/mail';
import type { MailDataRequired } from '@sendgrid/mail';

import { getEmailConfig } from '../config';
import type { SendEmailInput, SendEmailResult } from '../types';
import { normalizeRecipients, type EmailProvider } from './base';

function pickMessageId(raw: unknown): string | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined;
  const first = raw[0] as { headers?: Record<string, string | string[] | undefined> } | undefined;
  const headers = first?.headers;
  if (!headers) return undefined;
  const value = headers['x-message-id'] ?? headers['X-Message-Id'];
  if (Array.isArray(value)) return value[0];
  return value;
}

export class SendGridProvider implements EmailProvider {
  name = 'sendgrid' as const;

  async send(input: SendEmailInput): Promise<SendEmailResult> {
    const config = getEmailConfig();
    const apiKey = config.sendgridApiKey;
    if (!apiKey) throw new Error('[email] Missing SENDGRID_API_KEY for EMAIL_PROVIDER=sendgrid.');
    sgMail.setApiKey(apiKey);

    const to = normalizeRecipients(input.to);
    const cc = normalizeRecipients(input.cc);
    const bcc = normalizeRecipients(input.bcc);
    const from = (input.from ?? config.fromEmail).trim();
    const replyTo = (input.replyTo ?? config.replyTo)?.trim();
    const htmlBody = input.html ?? (input.text ? `<pre>${input.text}</pre>` : '');

    try {
      const payload: MailDataRequired = {
        to,
        ...(cc.length > 0 ? { cc } : {}),
        ...(bcc.length > 0 ? { bcc } : {}),
        from,
        ...(replyTo ? { replyTo } : {}),
        subject: input.subject,
        html: htmlBody,
        ...(input.text ? { text: input.text } : {}),
        ...(input.headers ? { headers: input.headers } : {}),
      };
      const raw = await sgMail.send(payload);
      return {
        ok: true,
        provider: this.name,
        messageId: pickMessageId(raw),
        raw,
      };
    } catch (error) {
      const maybeError = error as { code?: number | string; message?: string; response?: { statusCode?: number } };
      return {
        ok: false,
        provider: this.name,
        errorCode:
          (typeof maybeError.code === 'number' ? String(maybeError.code) : maybeError.code) ??
          (typeof maybeError.response?.statusCode === 'number' ? String(maybeError.response.statusCode) : undefined) ??
          'sendgrid_error',
        errorMessage: maybeError.message ?? 'SendGrid send failed.',
      };
    }
  }
}
