import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { isValidUuid } from './identity';
import { logDiagnostic, redactId } from './diagnostics';
import { StudentRuntimeError } from './errors';

export type VerifiedSensitiveSession = {
  userId: string;
  email: string | null;
};

export async function verifySensitiveSession(
  expectedUserId: string
): Promise<VerifiedSensitiveSession> {
  logDiagnostic(`sensitive-session-check-requested: expectedUserId=${redactId(expectedUserId)}`);

  let supabase;
  try {
    supabase = await createClient();
  } catch {
    logDiagnostic(`sensitive-session-check-rejected: Supabase client initialization failed.`);
    throw new StudentRuntimeError(500, 'INTERNAL_ERROR', 'Auth server temporarily unavailable.');
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    logDiagnostic(`sensitive-session-check-rejected: Auth server error: ${error.message}`);
    throw new StudentRuntimeError(401, 'SESSION_VALIDATION_FAILED', 'Session validation failed.');
  }

  if (!user || !user.id || !isValidUuid(user.id)) {
    logDiagnostic(`sensitive-session-check-rejected: Invalid user returned from auth server.`);
    throw new StudentRuntimeError(401, 'SESSION_VALIDATION_FAILED', 'Session validation failed.');
  }

  if (user.id !== expectedUserId) {
    logDiagnostic(`sensitive-user-mismatch: User ID mismatch. expected=${redactId(expectedUserId)}, actual=${redactId(user.id)}`);
    throw new StudentRuntimeError(401, 'SESSION_IDENTITY_MISMATCH', 'Identity verification mismatch.');
  }

  logDiagnostic(`sensitive-session-check-accepted: userId=${redactId(user.id)}`);

  return {
    userId: user.id,
    email: user.email || null,
  };
}
