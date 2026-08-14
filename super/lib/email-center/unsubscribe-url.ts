import 'server-only';

import { getEmailCenterAppBaseUrl } from './brand-links';
import { createUnsubscribeToken } from './tokens';

/** Real unsubscribe link for Email Center sends (matches outbox queueing). */
export async function buildEmailPreferencesUnsubscribeUrl(input: {
  email: string;
  campaignId?: string;
  recipientId?: string;
}): Promise<string> {
  const token = await createUnsubscribeToken({
    email: input.email,
    campaignId: input.campaignId,
    recipientId: input.recipientId,
  });
  return `${getEmailCenterAppBaseUrl()}/email/preferences/${token}`;
}
