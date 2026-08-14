import { EmailTemplateResult, escapeHtml, safeUrl } from './utils';

type BuildCollegeLeadConfirmationEmailInput = {
  fullName: string;
  collegeName: string;
  formattedInterestType: string;
  referenceId: string;
  unsubscribeUrl: string;
  logoUrl: string;
};

export function buildCollegeLeadConfirmationEmail(input: BuildCollegeLeadConfirmationEmailInput): EmailTemplateResult {
  const fullName = escapeHtml(input.fullName);
  const collegeName = escapeHtml(input.collegeName);
  const formattedInterestType = escapeHtml(input.formattedInterestType);
  const referenceId = escapeHtml(input.referenceId);
  const unsubscribeUrl = escapeHtml(safeUrl(input.unsubscribeUrl));
  const logoUrl = escapeHtml(safeUrl(input.logoUrl));

  const subject = `${input.formattedInterestType} Request Received — NextGen CTO × ${input.collegeName}`;

  const text = `━━━━━━━━━━━━━━━━━━━━━━━━━━
NEXTGEN CTO
━━━━━━━━━━━━━━━━━━━━━━━━━━

REQUEST CONFIRMED

Dear ${input.fullName},

Thank you for reaching out.

We’ve successfully received your ${input.formattedInterestType} request from ${input.collegeName}.

Reference ID: #NGC-${input.referenceId}

━━━━━━━━━━━━━━━━━━━━━━━━━━

WHAT HAPPENS NEXT

[1] Submission Review
Our Academic Partnerships Team is reviewing your request.

[2] Response Within 24–48 Hours
We’ll reach out with next steps or any follow-up questions.

[3] Discovery / Kickoff Call
We’ll align on student count, timelines, goals, and customization.

━━━━━━━━━━━━━━━━━━━━━━━━━━

Program Focus Areas Include:

• Technical Skill Development
• Behavioral Interview Preparation
• ATS-Friendly Resume Building
• GitHub Portfolio Development
• LinkedIn Optimization

━━━━━━━━━━━━━━━━━━━━━━━━━━

If you'd like us to tailor recommendations before our first call,
feel free to reply with:

• Cohort Size
• Academic Timeline
• Placement Goals

━━━━━━━━━━━━━━━━━━━━━━━━━━

Warm Regards,
Academic Partnerships Team
NextGen CTO

Website: www.nextgen-cto.in
Email: hello@nextgen-cto.in

━━━━━━━━━━━━━━━━━━━━━━━━━━

To unsubscribe from future emails: ${input.unsubscribeUrl}`;

  const html = `
    <div style='background-color: #F8FAFC; margin: 0; padding: 24px 12px; font-family: Arial, Helvetica, sans-serif; color: #111827; -webkit-text-size-adjust: 100%;'>
      <div style='max-width: 680px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden;'>
        <div style='padding: 20px; border-bottom: 2px solid #F59E0B; background-color: #FFFFFF;'>
          <table cellpadding='0' cellspacing='0' border='0' style='width: 100%;'><tr>
            <td style='vertical-align: middle; width: 48px; padding-right: 12px;'>
              <img src='${logoUrl}' alt='NextGen CTO' width='48' height='48' style='display: block; border-radius: 8px;' />
            </td>
            <td style='vertical-align: middle;'>
              <p style='margin: 0; font-size: 13px; letter-spacing: 0.08em; text-transform: uppercase; color: #1E3A8A;'>NextGen CTO</p>
            </td>
          </tr></table>
          <h1 style='margin: 14px 0 0; font-size: 22px; line-height: 1.35; font-weight: 700; color: #1E3A8A;'>
            ${formattedInterestType} Request Received
          </h1>
          <p style='margin: 8px 0 0; font-size: 14px; color: #6B7280;'>NextGen CTO &times; ${collegeName}</p>
        </div>

        <div style='padding: 20px 20px 10px; background-color: #FFFFFF;'>
          <p style='margin: 0 0 12px; font-size: 16px; font-weight: 700; color: #1E3A8A; letter-spacing: 0.04em;'>REQUEST CONFIRMED</p>
          <p style='margin: 0 0 14px; font-size: 15px; color: #111827;'>Dear ${fullName},</p>
          <p style='margin: 0 0 12px; font-size: 15px; color: #111827;'>Thank you for reaching out.</p>
          <p style='margin: 0 0 16px; font-size: 15px; color: #111827;'>
            We’ve successfully received your <strong>${formattedInterestType}</strong> request from
            <strong>${collegeName}</strong>.
          </p>

          <div style='background: #F8FAFC; border: 1px solid #dbe4f5; border-left: 4px solid #F59E0B; border-radius: 8px; padding: 12px 14px; margin: 0 0 20px;'>
            <p style='margin: 0; font-size: 14px; color: #111827;'><strong>Reference ID:</strong> #NGC-${referenceId}</p>
          </div>

          <div style='border-top: 1px solid #d6dde7; padding-top: 18px; margin-top: 10px;'>
            <h2 style='margin: 0 0 14px; font-size: 16px; letter-spacing: 0.04em; text-transform: uppercase; color: #1E3A8A;'>What Happens Next</h2>
            <div style='margin-bottom: 12px;'>
              <p style='margin: 0; font-size: 14px; font-weight: 700; color: #111827;'>[1] Submission Review</p>
              <p style='margin: 4px 0 0; font-size: 14px; color: #6B7280;'>Our Academic Partnerships Team is reviewing your request.</p>
            </div>
            <div style='margin-bottom: 12px;'>
              <p style='margin: 0; font-size: 14px; font-weight: 700; color: #111827;'>[2] Response Within 24–48 Hours</p>
              <p style='margin: 4px 0 0; font-size: 14px; color: #6B7280;'>We’ll reach out with next steps or any follow-up questions.</p>
            </div>
            <div style='margin-bottom: 18px;'>
              <p style='margin: 0; font-size: 14px; font-weight: 700; color: #111827;'>[3] Discovery / Kickoff Call</p>
              <p style='margin: 4px 0 0; font-size: 14px; color: #6B7280;'>We’ll align on student count, timelines, goals, and customization.</p>
            </div>
          </div>

          <div style='background: #FFFFFF; border: 1px solid #dbe4f5; border-left: 4px solid #F59E0B; border-radius: 8px; padding: 14px 16px; margin-bottom: 18px;'>
            <p style='margin: 0 0 8px; font-size: 14px; font-weight: 700; color: #1E3A8A;'>Program Focus Areas Include:</p>
            <p style='margin: 0; font-size: 14px; line-height: 1.7; color: #111827;'>
              • Technical Skill Development<br/>
              • Behavioral Interview Preparation<br/>
              • ATS-Friendly Resume Building<br/>
              • GitHub Portfolio Development<br/>
              • LinkedIn Optimization
            </p>
          </div>

          <p style='margin: 0 0 8px; font-size: 14px; color: #111827;'>
            If you'd like us to tailor recommendations before our first call, feel free to reply with:
          </p>
          <p style='margin: 0 0 20px; font-size: 14px; line-height: 1.7; color: #111827;'>
            • Cohort Size<br/>
            • Academic Timeline<br/>
            • Placement Goals
          </p>

          <div style='border-top: 1px solid #d6dde7; padding-top: 16px;'>
            <p style='margin: 0; font-size: 14px; color: #111827;'>Warm Regards,</p>
            <p style='margin: 6px 0 0; font-size: 14px; font-weight: 600; color: #0f172a;'>Academic Partnerships Team</p>
            <p style='margin: 2px 0 12px; font-size: 14px; color: #111827;'>NextGen CTO</p>
            <p style='margin: 0; font-size: 13px; color: #6B7280;'>Website: <a href='https://www.nextgen-cto.in' style='color: #3B82F6; text-decoration: underline;'>www.nextgen-cto.in</a></p>
            <p style='margin: 4px 0 0; font-size: 13px; color: #6B7280;'>Email: <a href='mailto:hello@nextgen-cto.in' style='color: #3B82F6; text-decoration: underline;'>hello@nextgen-cto.in</a></p>
          </div>
        </div>

        <div style='background: #F8FAFC; border-top: 1px solid #dbe4f5; padding: 14px 20px; text-align: center;'>
          <p style='margin: 0; font-size: 12px; color: #6B7280; line-height: 1.5;'>
            You are receiving this email because you submitted a request via nextgen-cto.in.<br/>
            <a href='${unsubscribeUrl}' style='color: #3B82F6; text-decoration: underline;'>Unsubscribe</a> from future emails.
          </p>
        </div>
      </div>
    </div>
  `;

  return {
    subject,
    html,
    text,
  };
}
