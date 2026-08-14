import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/email';

function parseNotificationRecipients(): string[] {
  const raw = process.env.EMAIL_CENTER_SUPER_ADMIN_NOTIFICATION_EMAIL;
  if (!raw || !raw.trim()) return [];

  return raw.split(',').reduce((acc: string[], e) => {
    const trimmed = e.trim();
    if (trimmed.length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) acc.push(trimmed);
    return acc;
  }, []);
}

export async function sendCampaignCompletionNotification(
  campaignId: string
): Promise<{
  sent: boolean;
  skipped: boolean;
  reason?: string;
}> {
  const admin = createAdminClient();

  const recipients = parseNotificationRecipients();
  if (recipients.length === 0) {
    return { sent: false, skipped: true, reason: 'no recipients configured' };
  }

  const { data: campaign, error: loadError } = await admin
    .from('email_campaigns')
    .select('id, name, status, campaign_type, recipient_count, queued_count, sent_count, failed_count, skipped_count, delivered_count, opened_count, clicked_count, bounced_count, complained_count, unsubscribed_count')
    .eq('id', campaignId)
    .single();

  if (loadError || !campaign) {
    return { sent: false, skipped: true, reason: 'campaign not found' };
  }

  if (campaign.status !== 'sent') {
    return { sent: false, skipped: true, reason: 'campaign not yet completed' };
  }

  const recipientStr = recipients.join(', ');

  const { data: claimed } = await admin
    .from('email_campaigns')
    .update({
      completion_notification_attempted_at: new Date().toISOString(),
      completion_notification_error: null,
      completion_notification_recipient: recipientStr,
    })
    .eq('id', campaignId)
    .is('completion_notification_sent_at', null)
    .or('completion_notification_attempted_at.is.null,completion_notification_error.not.is.null')
    .select('id')
    .maybeSingle();

  if (!claimed) {
    return { sent: false, skipped: true, reason: 'another process claimed or already sent' };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const subject = `Email campaign completed: ${campaign.name}`;

  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background-color:#F9FAFB;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F9FAFB;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:600px;max-width:600px;">
          <tr>
            <td style="padding:20px 16px 0;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#111827;border-radius:12px 12px 0 0;">
                <tr>
                  <td style="padding:20px 24px;font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;color:#F9FAFB;">NextGen CTO</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 16px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#FFFFFF;border:1px solid #E5E7EB;border-top:0;border-radius:0 0 12px 12px;">
                <tr>
                  <td style="padding:32px 28px;font-family:Arial,Helvetica,sans-serif;color:#111827;">
                    <p style="margin:0 0 6px 0;font-size:12px;letter-spacing:0.5px;text-transform:uppercase;color:#F97316;font-weight:700;">Campaign Completed</p>
                    <h1 style="margin:0 0 16px 0;font-size:24px;line-height:1.3;">${escapeHtml(campaign.name)}</h1>

                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F9FAFB;border:1px solid #E5E7EB;border-radius:10px;margin:0 0 16px 0;">
                      <tr>
                        <td style="padding:12px 16px;font-size:14px;color:#111827;font-weight:700;">Summary</td>
                      </tr>
                      <tr>
                        <td style="padding:0 16px 12px;">
                          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="font-size:13px;color:#374151;">
                            <tr>
                              <td style="padding:3px 0;">Type</td>
                              <td style="padding:3px 0;text-align:right;font-weight:600;">${escapeHtml(campaign.campaign_type)}</td>
                            </tr>
                            <tr>
                              <td style="padding:3px 0;">Status</td>
                              <td style="padding:3px 0;text-align:right;font-weight:600;color:#059669;">sent</td>
                            </tr>
                            <tr>
                              <td style="padding:3px 0;">Total Recipients</td>
                              <td style="padding:3px 0;text-align:right;font-weight:600;">${campaign.recipient_count ?? 0}</td>
                            </tr>
                            <tr>
                              <td style="padding:3px 0;">Queued</td>
                              <td style="padding:3px 0;text-align:right;font-weight:600;">${campaign.queued_count ?? 0}</td>
                            </tr>
                            <tr>
                              <td style="padding:3px 0;">Sent</td>
                              <td style="padding:3px 0;text-align:right;font-weight:600;color:#059669;">${campaign.sent_count ?? 0}</td>
                            </tr>
                            <tr>
                              <td style="padding:3px 0;">Failed</td>
                              <td style="padding:3px 0;text-align:right;font-weight:600;color:#DC2626;">${campaign.failed_count ?? 0}</td>
                            </tr>
                            <tr>
                              <td style="padding:3px 0;">Skipped</td>
                              <td style="padding:3px 0;text-align:right;font-weight:600;color:#D97706;">${campaign.skipped_count ?? 0}</td>
                            </tr>
                            <tr>
                              <td style="padding:3px 0;">Delivered</td>
                              <td style="padding:3px 0;text-align:right;font-weight:600;">${campaign.delivered_count ?? 0}</td>
                            </tr>
                            <tr>
                              <td style="padding:3px 0;">Opened</td>
                              <td style="padding:3px 0;text-align:right;font-weight:600;">${campaign.opened_count ?? 0}</td>
                            </tr>
                            <tr>
                              <td style="padding:3px 0;">Clicked</td>
                              <td style="padding:3px 0;text-align:right;font-weight:600;">${campaign.clicked_count ?? 0}</td>
                            </tr>
                            <tr>
                              <td style="padding:3px 0;">Bounced</td>
                              <td style="padding:3px 0;text-align:right;font-weight:600;color:#DC2626;">${campaign.bounced_count ?? 0}</td>
                            </tr>
                            <tr>
                              <td style="padding:3px 0;">Complained</td>
                              <td style="padding:3px 0;text-align:right;font-weight:600;color:#DC2626;">${campaign.complained_count ?? 0}</td>
                            </tr>
                            <tr>
                              <td style="padding:3px 0;">Unsubscribed</td>
                              <td style="padding:3px 0;text-align:right;font-weight:600;color:#D97706;">${campaign.unsubscribed_count ?? 0}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 16px 0;">
                      <tr>
                        <td align="left" bgcolor="#F97316" style="border-radius:8px;">
                          <a href="${escapeHtml(appUrl)}/email-center/campaigns/${campaign.id}" style="display:inline-block;padding:12px 24px;font-size:14px;font-family:Arial,Helvetica,sans-serif;color:#FFFFFF;text-decoration:none;font-weight:700;">View Campaign Details</a>
                        </td>
                      </tr>
                    </table>

                    <p style="margin:0;font-size:12px;color:#9CA3AF;">
                      Completed at: ${new Date().toISOString()}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 16px 32px;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#9CA3AF;">
              This is an automated campaign completion notification from NextGen CTO Email Center.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const textBody = [
    `Email campaign completed: ${campaign.name}`,
    '',
    'Summary:',
    `  Type: ${campaign.campaign_type}`,
    `  Status: sent`,
    `  Total Recipients: ${campaign.recipient_count ?? 0}`,
    `  Queued: ${campaign.queued_count ?? 0}`,
    `  Sent: ${campaign.sent_count ?? 0}`,
    `  Failed: ${campaign.failed_count ?? 0}`,
    `  Skipped: ${campaign.skipped_count ?? 0}`,
    `  Delivered: ${campaign.delivered_count ?? 0}`,
    `  Opened: ${campaign.opened_count ?? 0}`,
    `  Clicked: ${campaign.clicked_count ?? 0}`,
    `  Bounced: ${campaign.bounced_count ?? 0}`,
    `  Complained: ${campaign.complained_count ?? 0}`,
    `  Unsubscribed: ${campaign.unsubscribed_count ?? 0}`,
    '',
    `View campaign: ${appUrl}/email-center/campaigns/${campaign.id}`,
    '',
    `Completed at: ${new Date().toISOString()}`,
  ].join('\n');

  try {
    const result = await sendEmail({
      to: recipients.length === 1 ? recipients[0] : recipients,
      subject,
      html: htmlBody,
      text: textBody,
      category: 'super_admin_alert',
    });

    if (result.ok) {
      await admin
        .from('email_campaigns')
        .update({
          completion_notification_sent_at: new Date().toISOString(),
          completion_notification_error: null,
        })
        .eq('id', campaignId);

      return { sent: true, skipped: false };
    }

    const errorMessage = result.errorMessage || result.errorCode || 'send failed';
    await admin
      .from('email_campaigns')
      .update({
        completion_notification_error: errorMessage.slice(0, 500),
      })
      .eq('id', campaignId);

    return { sent: false, skipped: false, reason: 'failed' };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown error';
    try {
      await admin
        .from('email_campaigns')
        .update({
          completion_notification_error: msg.slice(0, 500),
        })
        .eq('id', campaignId);
    } catch {
    }
    return { sent: false, skipped: false, reason: 'failed' };
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}