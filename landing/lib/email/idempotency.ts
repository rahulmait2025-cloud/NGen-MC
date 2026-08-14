import crypto from 'crypto';

import type { EmailCategory } from './types';
import { normalizeRecipients } from './providers/base';

type IdempotencyKeyInput = {
  category: EmailCategory;
  to: string | string[];
  subject: string;
  entityId?: string;
};

function hashValue(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export function createEmailIdempotencyKey(input: IdempotencyKeyInput): string {
  const recipients = normalizeRecipients(input.to)
    .map((recipient) => recipient.toLowerCase())
    .sort();
  const recipientHash = hashValue(recipients.join(','));
  const subjectHash = hashValue(input.subject.trim().toLowerCase());
  const entityPart = (input.entityId ?? '').trim();
  const payload = [input.category, recipientHash, subjectHash, entityPart].join('|');
  return `email:${hashValue(payload)}`;
}
