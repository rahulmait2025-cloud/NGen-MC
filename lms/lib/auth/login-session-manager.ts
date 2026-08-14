import { createClient } from '@/lib/supabase/server';
import { syncProfile, syncStudentAppMetadata } from '@/lib/auth/profile-sync';
import { resolveLoginRouteContext } from '@/lib/auth/login-route-context';
import { ensureDirectLearnerStudent } from '@/lib/services/direct-learners';
import { consumeRateLimit } from '@/lib/security/rate-limit';
import { getCachedPasswordLogin, setCachedPasswordLogin } from '@/lib/auth/login-idempotency';
import { directLearnerStudentExists } from '@/lib/lms/transactional-email/direct-learner-provisioning';
import { maybeQueueAccountWelcomeEmail } from '@/lib/lms/transactional-email/google-welcome';
import { getCampusAmbassadorAppBaseUrl } from '@/lib/campus-ambassador/share';

const PASSWORD_LOGIN_RATE_LIMIT = 10;
const PASSWORD_LOGIN_WINDOW_MS = 60 * 1000;
const SUPABASE_TIMEOUT_MS = 30_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Supabase timeout')), ms)
    ),
  ]);
}

export interface LoginResult {
  status: number;
  body: {
    error?: string;
    redirectTo?: string;
  };
}

function isValidRedirectPath(path: string | null | undefined): boolean {
  if (!path) return false;
  return path.startsWith('/') && !path.startsWith('//') && !path.startsWith('\\') && !/^(https?:)/i.test(path);
}

function normalizeStringOrNull(val: unknown): string | null {
  if (typeof val !== 'string') return null;
  const trimmed = val.trim().toLowerCase();
  return trimmed || null;
}

function normalizeIdOrNull(val: unknown): string | null {
  if (typeof val !== 'string') return null;
  const trimmed = val.trim();
  return trimmed || null;
}

function needsMetadataSync(
  existingAppMeta: Record<string, unknown> | undefined,
  target: {
    collegeId: string | null;
    collegeSlug: string | null;
    membershipId: string | null;
    studentId: string | null;
  }
): boolean {
  if (!existingAppMeta) return true;
  const roleMatch = existingAppMeta.college_role === 'student';
  const collegeIdMatch = normalizeIdOrNull(existingAppMeta.college_id) === normalizeIdOrNull(target.collegeId);
  const collegeSlugMatch = normalizeStringOrNull(existingAppMeta.college_slug) === normalizeStringOrNull(target.collegeSlug);
  const membershipIdMatch = normalizeIdOrNull(existingAppMeta.membership_id) === normalizeIdOrNull(target.membershipId);
  const studentIdMatch = normalizeIdOrNull(existingAppMeta.student_id) === normalizeIdOrNull(target.studentId);

  return !(roleMatch && collegeIdMatch && collegeSlugMatch && membershipIdMatch && studentIdMatch);
}

async function syncAndRefreshMetadataIfNeeded(
  authUser: { id: string; app_metadata?: Record<string, unknown> },
  target: {
    collegeId: string | null;
    collegeSlug: string | null;
    membershipId: string | null;
    studentId: string | null;
  },
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<{ ok: boolean; error?: string }> {
  if (!needsMetadataSync(authUser.app_metadata, target)) {
    return { ok: true };
  }

  const syncOk = await syncStudentAppMetadata(authUser.id, target);
  if (!syncOk) {
    return { ok: false, error: 'Failed to synchronize account metadata.' };
  }

  const { error: refreshErr } = await supabase.auth.refreshSession();
  if (refreshErr) {
    console.error('[login-session-manager] refreshSession failed:', refreshErr);
    return { ok: false, error: 'Failed to refresh authentication session.' };
  }

  return { ok: true };
}

export class LoginSessionManager {
  static async authenticate({
    email,
    password,
    slug,
    clientIp,
    loginAttemptId,
    next,
  }: {
    email: string;
    password: string;
    slug: string;
    clientIp: string;
    loginAttemptId: string | null;
    next?: string | null;
  }): Promise<LoginResult> {
    // 1. Idempotency Check
    const cached = getCachedPasswordLogin(email, loginAttemptId);
    if (cached) {
      return {
        status: cached.status,
        body: cached.body,
      };
    }

    // 2. Rate Limiting Check
    const rateLimitKey = `pw_login:${clientIp}:${email}`;
    const limited = await consumeRateLimit({
      key: rateLimitKey,
      limit: PASSWORD_LOGIN_RATE_LIMIT,
      windowMs: PASSWORD_LOGIN_WINDOW_MS,
    });

    if (!limited.ok) {
      return {
        status: 429,
        body: { error: 'Too many login attempts. Please try again later.' },
      };
    }

    const supabase = await createClient();

    // 3. Supabase Authentication
    let signInData;
    try {
      signInData = await withTimeout(
        supabase.auth.signInWithPassword({ email, password }),
        SUPABASE_TIMEOUT_MS,
      );
    } catch (err) {
      if (err instanceof Error && err.message.includes('timeout')) {
        return {
          status: 503,
          body: { error: 'Authentication service is temporarily unavailable. Please try again later.' },
        };
      }
      return {
        status: 500,
        body: { error: 'Login failed. Please try again.' },
      };
    }

    if (signInData.error) {
      return {
        status: 401,
        body: { error: 'Invalid email or password.' },
      };
    }

    const authUser = signInData.data.user ?? signInData.data.session?.user ?? null;
    const hasSessionTokens = !!signInData.data.session;

    if (!authUser || !hasSessionTokens) {
      await supabase.auth.signOut().catch(() => undefined);
      return {
        status: 500,
        body: { error: 'Login failed: Session not established.' },
      };
    }

    const finish = (status: number, body: LoginResult['body']): LoginResult => {
      setCachedPasswordLogin(email, loginAttemptId, { status, body, deviceId: '', at: Date.now() });
      return { status, body };
    };

    // 4. College-Specific Login Context (Slug Path)
    if (slug) {
      const { data: resolved } = await supabase
        .rpc('resolve_student_auth_context', {
          p_user_id: authUser.id,
          p_slug: slug,
        })
        .single();

      const ctx = resolved as {
        allowed: boolean;
        error_code: string | null;
        membership_id: string | null;
        student_id: string | null;
        college_id: string | null;
        college_slug: string | null;
      } | null;

      if (ctx?.error_code === 'account_disabled') {
        await supabase.auth.signOut();
        return finish(403, { error: 'This account has been disabled.' });
      }

      if (ctx?.error_code === 'tenant') {
        await supabase.auth.signOut();
        return finish(404, { error: 'This college is not available.' });
      }

      if (ctx?.allowed && ctx.membership_id && ctx.college_id) {
        let studentId = ctx.student_id;
        const isNewCollegeStudent = !ctx.student_id;
        if (isNewCollegeStudent) {
          const { data: studentRow } = await supabase
            .from('students')
            .insert({
              user_id: authUser.id,
              college_id: ctx.college_id,
            })
            .select('id')
            .single();
          studentId = studentRow?.id || null;
        }
        const targetMeta = {
          collegeId: ctx.college_id,
          collegeSlug: ctx.college_slug || slug,
          membershipId: ctx.membership_id,
          studentId: studentId,
        };
        const syncResult = await syncAndRefreshMetadataIfNeeded(authUser, targetMeta, supabase);
        if (!syncResult.ok) {
          await supabase.auth.signOut().catch(() => undefined);
          return finish(500, { error: syncResult.error || 'Login failed due to session sync error.' });
        }
        await syncProfile(authUser, supabase);

        if (isNewCollegeStudent) {
          const dashboardUrl = `${getCampusAmbassadorAppBaseUrl().replace(/\/+$/, '')}/c/${encodeURIComponent(ctx.college_slug || slug)}/student`;
          void maybeQueueAccountWelcomeEmail({
            user: authUser,
            dashboardUrl,
            isNewStudentProvisioning: true,
          });
        }

        return finish(200, {
          redirectTo: isValidRedirectPath(next) ? next! : `/c/${encodeURIComponent(ctx.college_slug || slug)}/student`,
        });
      }

      await supabase.auth.signOut();
      return finish(403, {
        error: 'You do not have student access to this college.',
      });
    }

    // 5. Global Student Resolution Path
    try {
      const routeContext = await resolveLoginRouteContext(authUser.id, supabase);

      if (routeContext?.profile_is_active === false) {
        await supabase.auth.signOut();
        return finish(403, { error: 'This account has been disabled.' });
      }

      if (routeContext?.student_college_slug) {
        let studentId = routeContext.student_id;
        if (!routeContext.student_id && routeContext.student_college_id) {
          const { data: studentRow } = await supabase
            .from('students')
            .upsert(
              { user_id: authUser.id, college_id: routeContext.student_college_id },
              { onConflict: 'user_id,college_id' }
            )
            .select('id')
            .single();
          studentId = studentRow?.id || null;
        }
        const targetMeta = {
          collegeId: routeContext.student_college_id,
          collegeSlug: routeContext.student_college_slug,
          membershipId: routeContext.student_membership_id,
          studentId: studentId,
        };
        const syncResult = await syncAndRefreshMetadataIfNeeded(authUser, targetMeta, supabase);
        if (!syncResult.ok) {
          await supabase.auth.signOut().catch(() => undefined);
          return finish(500, { error: syncResult.error || 'Login failed due to session sync error.' });
        }
        await syncProfile(authUser, supabase);

        return finish(200, {
          redirectTo: isValidRedirectPath(next) ? next! : `/c/${encodeURIComponent(routeContext.student_college_slug)}/student`,
        });
      }

      const [hadDirectLearnerStudent, tenant] = await Promise.all([
        directLearnerStudentExists(authUser.id),
        ensureDirectLearnerStudent(authUser.id),
      ]);
      const targetMeta = {
        collegeId: tenant.collegeId,
        collegeSlug: tenant.slug,
        membershipId: tenant.membershipId || null,
        studentId: tenant.studentId || null,
      };
      const syncResult = await syncAndRefreshMetadataIfNeeded(authUser, targetMeta, supabase);
      if (!syncResult.ok) {
        await supabase.auth.signOut().catch(() => undefined);
          return finish(500, { error: syncResult.error || 'Login failed due to session sync error.' });
      }
      await syncProfile(authUser, supabase);

      if (!hadDirectLearnerStudent) {
        const dashboardUrl = `${getCampusAmbassadorAppBaseUrl().replace(/\/+$/, '')}/c/${encodeURIComponent(tenant.slug)}/student`;
        void maybeQueueAccountWelcomeEmail({
          user: authUser,
          dashboardUrl,
          isNewStudentProvisioning: true,
        });
      }

      return finish(200, {
        redirectTo: isValidRedirectPath(next) ? next! : `/c/${encodeURIComponent(tenant.slug)}/student`,
      });
    } catch (err) {
      if (err instanceof Error && err.message === 'partnered_student_exists') {
        return finish(403, { error: 'No access. Use your college portal.' });
      }
      return finish(500, { error: 'Login failed. Please try again.' });
    }
  }
}
