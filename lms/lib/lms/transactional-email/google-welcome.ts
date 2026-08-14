import 'server-only';

import type { User } from '@supabase/supabase-js';
import { buildGoogleWelcomeEmail } from './templates/welcome-google';
import { queueAndMaybeProcessLmsEmail } from './processor';

const SIGNUP_WINDOW_MS = 30 * 60 * 1000;

function isGoogleAuthUser(user: User): boolean {
  if (user.app_metadata?.provider === 'google') return true;
  return (user.identities ?? []).some((identity) => identity.provider === 'google');
}

function isRecentAuthSignup(user: User, windowMs = SIGNUP_WINDOW_MS): boolean {
  const createdAt = new Date(user.created_at).getTime();
  if (Number.isNaN(createdAt)) return true;
  return Date.now() - createdAt <= windowMs;
}

/**
 * Queue a one-time welcome email for a newly provisioned student identity.
 * Keyed by Auth user UUID so same-email re-registration receives a fresh welcome.
 * Not blocked by marketing opt-out (category: welcome / transactional path).
 */
export async function maybeQueueAccountWelcomeEmail(params: {
  user: User;
  studentId?: string | null;
  dashboardUrl: string;
  isNewStudentProvisioning: boolean;
}): Promise<void> {
  if (!params.isNewStudentProvisioning) return;
  if (!isRecentAuthSignup(params.user)) return;

  const email = params.user.email?.trim();
  if (!email) return;

  const fullName =
    (params.user.user_metadata?.full_name as string | undefined) ??
    (params.user.user_metadata?.name as string | undefined) ??
    '';

  const content = buildGoogleWelcomeEmail({
    fullName,
    dashboardUrl: params.dashboardUrl,
    email,
  });

  const eventType = isGoogleAuthUser(params.user) ? 'google_welcome' : 'account_welcome';

  try {
    await queueAndMaybeProcessLmsEmail({
      eventType,
      userId: params.user.id,
      studentId: params.studentId ?? null,
      toEmail: email,
      subject: content.subject,
      htmlBody: content.html,
      textBody: content.text,
      category: 'welcome',
      idempotencyKey: `account_welcome:user:${params.user.id}`,
    });
    console.info('[lms-email/welcome] queued account welcome', {
      userId: params.user.id,
      eventType,
    });
  } catch (err) {
    console.warn('[lms-email/welcome] queue failed', {
      userId: params.user.id,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

/** @deprecated Prefer maybeQueueAccountWelcomeEmail */
export async function maybeQueueGoogleWelcomeEmail(params: {
  user: User;
  studentId?: string | null;
  dashboardUrl: string;
  isNewStudentProvisioning: boolean;
}): Promise<void> {
  return maybeQueueAccountWelcomeEmail(params);
}
