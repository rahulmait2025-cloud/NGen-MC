import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import crypto from 'crypto';
import {
  applyClickTrackingRewrites,
  collectTrackableHrefs,
} from './tracking-href';
import {
  getEmailCenterPublicAppUrl,
  isEmailCenterClickTrackingEnabled,
} from './tracking-route-utils';

function generateSecureToken(): string {
  return crypto.randomBytes(16).toString('hex');
}

export interface TrackingInjectionResult {
  html: string;
  text: string;
  openToken: string;
}

export async function injectTrackingLinks(
  htmlBody: string,
  textBody: string,
  campaignId: string,
  recipientId: string,
  recipientEmail: string,
  unsubscribeUrl?: string
): Promise<TrackingInjectionResult> {
  void recipientEmail;
  const admin = createAdminClient();
  const openToken = generateSecureToken();

  const baseUrl = getEmailCenterPublicAppUrl();
  const openTrackUrl = `${baseUrl}/api/email/track/open`;

  let processedHtml = htmlBody;

  // Click wrappers force Gmail → admin track URL → destination. Keep authored
  // hrefs by default so CTAs (WhatsApp, etc.) open the URL the sender entered.
  if (isEmailCenterClickTrackingEnabled()) {
    const clickTrackUrl = `${baseUrl}/api/email/track/click`;
    const uniqueUrls = collectTrackableHrefs(htmlBody, { baseUrl, unsubscribeUrl });
    const urlEntries = uniqueUrls.map((originalUrl) => {
      const trackToken = generateSecureToken();
      const trackingUrl = `${clickTrackUrl}?token=${trackToken}`;
      return { originalUrl, trackingUrl, trackToken };
    });

    if (urlEntries.length > 0) {
      const { error: upsertError } = await admin.from('email_click_links').upsert(
        urlEntries.map(({ originalUrl, trackToken }) => ({
          campaign_id: campaignId,
          recipient_id: recipientId,
          original_url: originalUrl,
          tracking_token: trackToken,
        })),
        { onConflict: 'tracking_token', ignoreDuplicates: false },
      );

      if (upsertError) {
        console.error('[email-center] failed to persist click tracking tokens:', upsertError.message);
        throw new Error(`Failed to persist click tracking links: ${upsertError.message}`);
      }

      processedHtml = applyClickTrackingRewrites(
        htmlBody,
        urlEntries.map(({ originalUrl, trackingUrl }) => ({ originalUrl, trackingUrl })),
      );
    }
  }

  const openPixelUrl = `${openTrackUrl}?token=${openToken}`;
  const openPixel = `<img src="${openPixelUrl}" width="1" height="1" alt="" style="display:none" />`;

  if (processedHtml.includes('</body>')) {
    processedHtml = processedHtml.replace('</body>', `${openPixel}</body>`);
  } else {
    processedHtml += openPixel;
  }

  await admin.from('email_open_tokens').upsert({
    campaign_id: campaignId,
    recipient_id: recipientId,
    tracking_token: openToken,
    outbox_id: null,
  });

  return {
    html: processedHtml,
    text: textBody,
    openToken,
  };
}
