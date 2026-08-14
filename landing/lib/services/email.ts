import { sendEmail } from '@/lib/email';
import { buildCollegeLeadAdminNotificationEmail, buildCollegeLeadConfirmationEmail } from '@/lib/email/templates';

function extractEmailAddress(value: string): string {
  const trimmed = value.trim();
  const bracketMatch = trimmed.match(/<([^>]+)>/);
  return (bracketMatch?.[1] ?? trimmed).trim();
}

function getNamedFromAddress(displayName: string): string {
  const configuredFrom = process.env.EMAIL_FROM ?? process.env.SENDGRID_FROM_EMAIL ?? 'no-reply@nextgen-cto.in';
  const fromAddress = extractEmailAddress(configuredFrom);
  return `${displayName} <${fromAddress}>`;
}

function isPublicHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'https:') {
      return false;
    }
    const host = parsed.hostname.trim().toLowerCase();
    if (!host) return false;
    if (host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0') {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

function getSiteBaseUrl(): string {
  const envCandidates = [
    process.env.EMAIL_ASSET_BASE_URL,
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.NEXT_PUBLIC_BASE_URL,
    process.env.SITE_URL,
    process.env.APP_BASE_URL,
  ];

  const configured = envCandidates
    .find((value) => typeof value === 'string' && value.trim().length > 0 && isPublicHttpUrl(value.trim()))
    ?.trim();
  if (configured) {
    return configured.replace(/\/+$/, '');
  }

  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) {
    const normalized = vercelUrl.replace(/^https?:\/\//, '').replace(/\/+$/, '');
    return `https://${normalized}`;
  }

  return 'https://www.nextgen-cto.in';
}

function buildUnsubscribeUrl(email: string): string {
  const token = Buffer.from(email).toString('base64');
  const siteBaseUrl = getSiteBaseUrl();
  return `${siteBaseUrl}/api/unsubscribe?token=${encodeURIComponent(token)}`;
}

export interface CollegeLeadEmailData {
  full_name: string;
  work_email: string;
  college_name: string;
  interest_type?: string;
}

export interface CollegeLeadAdminData {
  full_name: string;
  work_email: string;
  phone_number: string;
  college_name: string;
  designation?: string;
  city?: string;
  state?: string;
  college_type?: string;
  student_count?: string;
  website_url?: string;
  interest_type?: string;
  message?: string;
  consent_given?: boolean;
  source_page?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
}

/**
 * Sends a confirmation email to the person who submitted the college lead form.
 * Executes as a best-effort side effect.
 */
export async function sendCollegeLeadConfirmationEmail(lead: CollegeLeadEmailData): Promise<void> {
  const formattedInterestType = lead.interest_type
    ? lead.interest_type
        .split('_')
        .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
        .join(' ')
    : 'Partnership';

  const referenceId = `${Date.now().toString().slice(-6)}${lead.work_email.length.toString().padStart(2, '0')}`;

  const unsubscribeUrl = buildUnsubscribeUrl(lead.work_email);
  const unsubscribeMailto = 'mailto:hello@nextgen-cto.in?subject=Unsubscribe';
  const logoUrl = `${getSiteBaseUrl()}/images/logo-email.png`;
  const template = buildCollegeLeadConfirmationEmail({
    fullName: lead.full_name,
    collegeName: lead.college_name,
    formattedInterestType,
    referenceId,
    unsubscribeUrl,
    logoUrl,
  });

  try {
    const result = await sendEmail({
      to: lead.work_email,
      from: getNamedFromAddress('NextGen CTO'),
      subject: template.subject,
      text: template.text,
      html: template.html,
      category: 'college_lead_confirmation',
      headers: {
        'List-Unsubscribe': `<${unsubscribeMailto}>, <${unsubscribeUrl}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
    });
    if (!result.ok) {
      const errorCode = result.errorCode ?? 'unknown';
      const errorMessage = result.errorMessage ?? 'Unknown email provider error.';
      console.warn(`[email] Confirmation email attempt failed category=college_lead_confirmation code=${errorCode}`);
      throw new Error(`Confirmation email failed (${errorCode}): ${errorMessage}`);
    }
  } catch (error) {
    console.warn('[email] Confirmation email skipped due to email adapter configuration or provider error.');
    throw error;
  }
}

/**
 * Sends an internal notification email to the admin team for a new lead.
 * Executes as a best-effort side effect.
 */
export async function sendCollegeLeadAdminNotificationEmail(lead: CollegeLeadAdminData): Promise<void> {
  // Admin recipient is hardcoded based on phase 7 requirements
  const adminEmail = process.env.ADMIN_LEADS_EMAIL || 'Anuj@nextgen-cto.in';

  const template = buildCollegeLeadAdminNotificationEmail({
    fullName: lead.full_name,
    workEmail: lead.work_email,
    phoneNumber: lead.phone_number,
    collegeName: lead.college_name,
    designation: lead.designation,
    city: lead.city,
    state: lead.state,
    collegeType: lead.college_type,
    studentCount: lead.student_count,
    websiteUrl: lead.website_url,
    interestType: lead.interest_type,
    message: lead.message,
    consentGiven: lead.consent_given,
    sourcePage: lead.source_page,
    utmSource: lead.utm_source,
    utmMedium: lead.utm_medium,
    utmCampaign: lead.utm_campaign,
    utmTerm: lead.utm_term,
    utmContent: lead.utm_content,
    submittedAtIso: new Date().toISOString(),
  });

  try {
    const result = await sendEmail({
      to: adminEmail,
      from: getNamedFromAddress('NextGen CTO System'),
      subject: template.subject,
      text: template.text,
      html: template.html,
      category: 'college_lead_admin_notification',
    });
    if (!result.ok) {
      const errorCode = result.errorCode ?? 'unknown';
      const errorMessage = result.errorMessage ?? 'Unknown email provider error.';
      console.warn(`[email] Admin notification email attempt failed category=college_lead_admin_notification code=${errorCode}`);
      throw new Error(`Admin notification email failed (${errorCode}): ${errorMessage}`);
    }
  } catch (error) {
    console.warn('[email] Admin notification email skipped due to email adapter configuration or provider error.');
    throw error;
  }
}
