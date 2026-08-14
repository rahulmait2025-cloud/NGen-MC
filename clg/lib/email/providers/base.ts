import type { EmailProviderName, SendEmailInput, SendEmailResult } from '../types';

export interface EmailProvider {
  name: EmailProviderName;
  send(input: SendEmailInput): Promise<SendEmailResult>;
}

export function normalizeRecipients(value: string | string[] | undefined): string[] {
  if (!value) return [];
  const items = Array.isArray(value) ? value : [value];
  const result: string[] = [];
  for (const entry of items) {
    const trimmed = entry.trim();
    if (trimmed.length > 0) {
      result.push(trimmed);
    }
  }
  return result;
}
