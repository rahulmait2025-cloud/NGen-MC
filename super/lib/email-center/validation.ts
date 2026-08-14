import 'server-only';
import { z } from 'zod';
import {
  createCampaignSchema,
  updateCampaignSchema,
  sendTestEmailSchema,
  duplicateCampaignSchema,
} from './types';

export {
  sanitizeHtml,
  sanitizeHtmlForPreview,
  sanitizeComposerBodyHtml,
} from './composer-sanitize';

export function validateCreateCampaign(data: unknown) {
  return createCampaignSchema.safeParse(data);
}

export function validateUpdateCampaign(data: unknown) {
  return updateCampaignSchema.safeParse(data);
}

export function validateSendTestEmail(data: unknown) {
  return sendTestEmailSchema.safeParse(data);
}

export function validateDuplicateCampaign(data: unknown) {
  return duplicateCampaignSchema.safeParse(data);
}

function _validateEmailAddress(email: string): boolean {
  const emailSchema = z.email();
  return emailSchema.safeParse(email).success;
}

void _validateEmailAddress;
