/**
 * Pure helpers for Custom Email draft save / Save & Continue navigation.
 * Kept free of Next.js / React so unit tests can cover control flow.
 */

export type CampaignDraftActionResult =
  | { ok: true; campaignId: string }
  | { ok: false; error: string };

export function isMissingComposerColumnError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    (lower.includes('content_mode') || lower.includes('composer_state'))
    && (
      lower.includes('does not exist')
      || lower.includes('could not find')
      || lower.includes('schema cache')
      || lower.includes('column')
    )
  );
}

export function mapCampaignDraftError(message: string): string {
  if (isMissingComposerColumnError(message)) {
    return (
      'Database is missing Custom Email columns (content_mode / composer_state). '
      + 'Apply migration 00324_email_campaigns_custom_composer.sql manually, then retry.'
    );
  }
  return message || 'Failed to save campaign';
}

/** Audience & Send is the existing next step after compose. */
export function audienceRouteForCampaign(campaignId: string): string {
  return `/email-center/campaigns/${campaignId}?tab=audience`;
}

export function resolveSaveAndContinueHref(options: {
  ok: boolean;
  campaignId?: string | null;
}): string | null {
  if (!options.ok) return null;
  const id = options.campaignId?.trim();
  if (!id) return null;
  return audienceRouteForCampaign(id);
}

export function shouldNavigateAfterSave(options: {
  ok: boolean;
  saveAndContinue: boolean;
  campaignId?: string | null;
}): boolean {
  return options.saveAndContinue && resolveSaveAndContinueHref(options) != null;
}
