import { Resend } from 'resend';

import { getEmailConfig } from '../config';
import type { SendEmailInput, SendEmailResult } from '../types';
import { normalizeRecipients, type EmailProvider } from './base';

export class ResendProvider implements EmailProvider {
  name = 'resend' as const;

  async send(input: SendEmailInput): Promise<SendEmailResult> {
    const config = getEmailConfig();
    const apiKey = config.resendApiKey;
    if (!apiKey) {
      throw new Error('[email] Missing RESEND_API_KEY for EMAIL_PROVIDER=resend.');
    }

    const resend = new Resend(apiKey);
    const to = normalizeRecipients(input.to);
    const cc = normalizeRecipients(input.cc);
    const bcc = normalizeRecipients(input.bcc);
    const from = (input.from ?? config.fromEmail).trim();
    const replyTo = (input.replyTo ?? config.replyTo)?.trim();

    try {
      const raw = await resend.emails.send({
        to,
        ...(cc.length > 0 ? { cc } : {}),
        ...(bcc.length > 0 ? { bcc } : {}),
        from,
        ...(replyTo ? { replyTo } : {}),
        subject: input.subject,
        html: input.html,
        ...(input.text ? { text: input.text } : {}),
        ...(input.headers ? { headers: input.headers } : {}),
      });

      if (raw.error) {
        return {
          ok: false,
          provider: this.name,
          errorCode: raw.error.name ?? 'resend_error',
          errorMessage: raw.error.message ?? 'Resend send failed.',
          raw,
        };
      }

      return {
        ok: true,
        provider: this.name,
        messageId: raw.data?.id,
        raw,
      };
    } catch (error) {
      const maybeError = error as { name?: string; message?: string };
      return {
        ok: false,
        provider: this.name,
        errorCode: maybeError.name ?? 'resend_error',
        errorMessage: maybeError.message ?? 'Resend send failed.',
      };
    }
  }
}
