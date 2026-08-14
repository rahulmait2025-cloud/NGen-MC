'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { requireSensitiveAuthIdentity } from '@/lib/auth/require-sensitive-auth-identity';

export interface SecurityActionResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
}

const passwordConfirmationSchema = z.object({
  newPassword: z.string().min(8).max(128),
  nonce: z.string().trim().min(1).max(64),
});

const emailInputSchema = z.string().trim().toLowerCase().email().max(254);

/**
 * Request password reauthentication verification code.
 * Calls native supabase.auth.reauthenticate() to send an authentication nonce/code to the logged-in user.
 */
export async function requestPasswordReauthenticationAction(): Promise<
  SecurityActionResponse<{ status: 'verification_required' }>
> {
  try {
    const identity = await requireSensitiveAuthIdentity();

    const supabase = await createClient();
    const { error } = await supabase.auth.reauthenticate();

    if (error) {
      if (process.env.AUTH_DIAGNOSTICS_ENABLED === 'true') {
        console.warn('[account-security] password-reauthentication-rejected', {
          userId: identity.userId.slice(0, 8) + '...',
        });
      }
      return { ok: false, error: 'REAUTHENTICATION_REQUIRED' };
    }

    if (process.env.AUTH_DIAGNOSTICS_ENABLED === 'true') {
      console.info('[account-security] password-reauthentication-sent', {
        userId: identity.userId.slice(0, 8) + '...',
      });
    }

    return {
      ok: true,
      data: {
        status: 'verification_required',
      },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : '';
    if (msg === 'SESSION_VALIDATION_FAILED') {
      return { ok: false, error: 'REAUTHENTICATION_REQUIRED' };
    }
    return { ok: false, error: 'REAUTHENTICATION_FAILED' };
  }
}

/**
 * Authenticated password change for logged-in users with nonce.
 * Uses auth-only identity check and native Supabase Auth updateUser with nonce.
 */
export async function updateAuthenticatedPasswordAction(input: {
  newPassword: string;
  nonce: string;
}): Promise<SecurityActionResponse> {
  try {
    const identity = await requireSensitiveAuthIdentity();

    const parsed = passwordConfirmationSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: 'INVALID_PASSWORD_INPUT' };
    }

    const { newPassword, nonce } = parsed.data;
    const supabase = await createClient();

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
      nonce,
    });

    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes('nonce') || msg.includes('expired') || msg.includes('invalid')) {
        return { ok: false, error: 'REAUTHENTICATION_INVALID' };
      }
      return { ok: false, error: 'PASSWORD_CHANGE_FAILED' };
    }

    if (process.env.AUTH_DIAGNOSTICS_ENABLED === 'true') {
      console.info('[account-security] password-change-completed', {
        userId: identity.userId.slice(0, 8) + '...',
      });
    }

    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : '';
    if (msg === 'SESSION_VALIDATION_FAILED') {
      return { ok: false, error: 'REAUTHENTICATION_REQUIRED' };
    }
    return { ok: false, error: 'PASSWORD_CHANGE_FAILED' };
  }
}

/**
 * Authenticated email change for users.
 * Uses auth-only identity check and initiates native Supabase Auth email confirmation flow.
 */
export async function updateAuthenticatedEmailAction(
  newEmail: string,
): Promise<SecurityActionResponse<{ status: 'confirmation_pending' }>> {
  try {
    const identity = await requireSensitiveAuthIdentity();

    const parsed = emailInputSchema.safeParse(newEmail);
    if (!parsed.success) {
      return { ok: false, error: 'INVALID_EMAIL_FORMAT' };
    }

    const normalizedEmail = parsed.data;
    if (identity.email && normalizedEmail === identity.email.toLowerCase()) {
      return { ok: false, error: 'EMAIL_SAME_AS_CURRENT' };
    }

    const supabase = await createClient();

    const { error } = await supabase.auth.updateUser({
      email: normalizedEmail,
    });

    if (error) {
      return { ok: false, error: 'EMAIL_CHANGE_FAILED' };
    }

    if (process.env.AUTH_DIAGNOSTICS_ENABLED === 'true') {
      console.info('[account-security] email-change-pending-confirmation', {
        userId: identity.userId.slice(0, 8) + '...',
      });
    }

    return {
      ok: true,
      data: {
        status: 'confirmation_pending',
      },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : '';
    if (msg === 'SESSION_VALIDATION_FAILED') {
      return { ok: false, error: 'REAUTHENTICATION_REQUIRED' };
    }
    return { ok: false, error: 'EMAIL_CHANGE_FAILED' };
  }
}
