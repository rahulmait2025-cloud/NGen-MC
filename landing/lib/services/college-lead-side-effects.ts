import { appendLeadToSheet } from './google-sheets';
import { sendCollegeLeadConfirmationEmail, sendCollegeLeadAdminNotificationEmail } from './email';
import { getEmailConfig } from '@/lib/email/config';

export interface CollegeLeadSideEffectsPayload {
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

export interface SideEffectResult {
  action: string;
  provider: string;
  target: 'sheet' | 'email' | 'admin';
  status: 'fulfilled' | 'rejected';
  error?: string;
  retryable?: boolean;
}

/**
 * Executes all background side effects (Google Sheets sync, Confirmation Email, Admin Email)
 * concurrently after a college lead is successfully saved to the database.
 * 
 * Returns a structured summary array that never throws, maintaining the best-effort pattern.
 */
export async function handlePostCollegeLeadSideEffects(
  lead: CollegeLeadSideEffectsPayload
): Promise<SideEffectResult[]> {
  let emailProvider = 'sendgrid';
  try {
    emailProvider = getEmailConfig().provider;
  } catch {
    emailProvider = (process.env.EMAIL_PROVIDER ?? 'sendgrid').trim().toLowerCase() || 'sendgrid';
  }

  const tasks = [
    {
      action: 'Google Sheets Sync',
      provider: 'googleapis',
      target: 'sheet' as const,
      promise: appendLeadToSheet(lead)
    },
    {
      action: 'User Confirmation Email',
      provider: emailProvider,
      target: 'email' as const,
      promise: sendCollegeLeadConfirmationEmail({
        full_name: lead.full_name,
        work_email: lead.work_email,
        college_name: lead.college_name,
        interest_type: lead.interest_type,
      })
    },
    {
      action: 'Admin Notification Email',
      provider: emailProvider,
      target: 'admin' as const,
      promise: sendCollegeLeadAdminNotificationEmail(lead)
    }
  ];

  const results = await Promise.allSettled(tasks.map(t => t.promise));

  const structuredResults: SideEffectResult[] = results.map((result, index) => {
    const task = tasks[index];

    if (result.status === 'fulfilled') {
      return { 
        action: task.action, 
        provider: task.provider, 
        target: task.target, 
        status: 'fulfilled' 
      };
    }

    // Handle rejection reason cleanly
    const errorMsg = result.reason instanceof Error 
      ? result.reason.message 
      : String(result.reason || 'Unknown error');
      
    // Rate limits, internal server errors, connection resets are usually retryable
    const isRetryable = errorMsg.includes('429') || errorMsg.includes('500') || errorMsg.includes('ECONNRESET');

    return { 
      action: task.action, 
      provider: task.provider, 
      target: task.target, 
      status: 'rejected', 
      error: errorMsg,
      retryable: isRetryable
    };
  });

  return structuredResults;
}
