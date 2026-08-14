import { EmailTemplateResult, escapeHtml, formatLeadValue, safeUrl } from './utils';

type BuildCollegeLeadAdminNotificationEmailInput = {
  fullName: string;
  workEmail: string;
  phoneNumber: string;
  collegeName: string;
  designation?: string;
  city?: string;
  state?: string;
  collegeType?: string;
  studentCount?: string;
  websiteUrl?: string;
  interestType?: string;
  message?: string;
  consentGiven?: boolean;
  sourcePage?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  submittedAtIso: string;
};

export function buildCollegeLeadAdminNotificationEmail(
  input: BuildCollegeLeadAdminNotificationEmailInput
): EmailTemplateResult {
  const fullName = formatLeadValue(input.fullName);
  const workEmail = formatLeadValue(input.workEmail);
  const phoneNumber = formatLeadValue(input.phoneNumber);
  const collegeName = formatLeadValue(input.collegeName);
  const designation = formatLeadValue(input.designation);
  const city = formatLeadValue(input.city);
  const state = formatLeadValue(input.state);
  const collegeType = formatLeadValue(input.collegeType);
  const studentCount = formatLeadValue(input.studentCount);
  const websiteUrl = formatLeadValue(input.websiteUrl);
  const interestType = formatLeadValue(input.interestType);
  const message = formatLeadValue(input.message);
  const consentGiven = input.consentGiven ? 'Yes' : 'No';
  const sourcePage = formatLeadValue(input.sourcePage);
  const utmSource = formatLeadValue(input.utmSource);
  const utmMedium = formatLeadValue(input.utmMedium);
  const utmCampaign = formatLeadValue(input.utmCampaign);
  const utmTerm = formatLeadValue(input.utmTerm);
  const utmContent = formatLeadValue(input.utmContent);
  const submittedAtIso = formatLeadValue(input.submittedAtIso);

  const subject = `New College Partnership Lead | ${input.collegeName} | ${input.fullName}`;

  const text = `New College Partnership Lead Received

A new college lead has been submitted through the landing website.

Contact Details
- Name: ${fullName}
- Email: ${workEmail}
- Phone: ${phoneNumber}

College Information
- College: ${collegeName}
- Designation: ${designation}
- City: ${city}
- State: ${state}
- Type: ${collegeType}
- Batch Size: ${studentCount}
- Website: ${websiteUrl}

Inquiry Details
- Interest: ${interestType}
- Message/Notes: ${message}
- Consent Given: ${consentGiven}

Source and UTM Data
- Page: ${sourcePage}
- Source: ${utmSource}
- Medium: ${utmMedium}
- Campaign: ${utmCampaign}
- Term: ${utmTerm}
- Content: ${utmContent}

Submitted At (UTC): ${submittedAtIso}`;

  const html = `
    <div style='font-family: Arial, Helvetica, sans-serif; line-height: 1.6; color: #1f2937; max-width: 680px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 8px;'>
      <h2 style='margin: 0 0 8px; color: #111827;'>New College Partnership Lead Received</h2>
      <p style='margin: 0 0 20px; color: #4b5563;'>
        A new lead has been submitted from the landing website and is ready for follow-up.
      </p>

      <h3 style='margin: 0 0 8px; color: #111827;'>Contact Details</h3>
      <ul>
        <li><strong>Name:</strong> ${escapeHtml(fullName)}</li>
        <li><strong>Email:</strong> <a href='mailto:${escapeHtml(workEmail)}'>${escapeHtml(workEmail)}</a></li>
        <li><strong>Phone:</strong> ${escapeHtml(phoneNumber)}</li>
      </ul>

      <h3 style='margin: 16px 0 8px; color: #111827;'>College Information</h3>
      <ul>
        <li><strong>College:</strong> ${escapeHtml(collegeName)}</li>
        <li><strong>Designation:</strong> ${escapeHtml(designation)}</li>
        <li><strong>City:</strong> ${escapeHtml(city)}</li>
        <li><strong>State:</strong> ${escapeHtml(state)}</li>
        <li><strong>Type:</strong> ${escapeHtml(collegeType)}</li>
        <li><strong>Batch Size:</strong> ${escapeHtml(studentCount)}</li>
        <li><strong>Website:</strong> ${
          safeUrl(input.websiteUrl)
            ? `<a href='${escapeHtml(safeUrl(input.websiteUrl))}'>${escapeHtml(websiteUrl)}</a>`
            : 'N/A'
        }</li>
      </ul>

      <h3 style='margin: 16px 0 8px; color: #111827;'>Inquiry Details</h3>
      <ul>
        <li><strong>Interest:</strong> ${escapeHtml(interestType)}</li>
        <li><strong>Message:</strong> ${escapeHtml(message)}</li>
        <li><strong>Consent Given:</strong> ${escapeHtml(consentGiven)}</li>
      </ul>

      <h3 style='margin: 16px 0 8px; color: #111827;'>Source and UTM Data</h3>
      <ul>
        <li><strong>Page:</strong> ${escapeHtml(sourcePage)}</li>
        <li><strong>Source:</strong> ${escapeHtml(utmSource)}</li>
        <li><strong>Medium:</strong> ${escapeHtml(utmMedium)}</li>
        <li><strong>Campaign:</strong> ${escapeHtml(utmCampaign)}</li>
        <li><strong>Term:</strong> ${escapeHtml(utmTerm)}</li>
        <li><strong>Content:</strong> ${escapeHtml(utmContent)}</li>
      </ul>

      <hr style='margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;' />

      <p style='font-size: 12px; color: #6b7280; margin: 0;'>
        Submitted At (UTC): ${escapeHtml(submittedAtIso)}
      </p>
    </div>
  `;

  return {
    subject,
    html,
    text,
  };
}
