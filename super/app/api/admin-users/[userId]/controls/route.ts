import { NextResponse } from 'next/server';
import { z } from 'zod';
import { isSuperadminAuthError, requireSuperadmin } from '@/lib/auth/require-superadmin';
import { consumeRateLimit, getRequestIp } from '@/lib/security/rate-limit';
import {
  auditAdminInviteAccepted,
  auditPasswordReset,
  forceLogoutAdminUser,
  setAdminSuspended,
  setAdminTwoFactorRequirement,
} from '@/lib/services/admin-security';



const schema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('suspend'), reason: z.string().trim().min(1).max(200).optional() }),
  z.object({ action: z.literal('reactivate') }),
  z.object({ action: z.literal('force_logout'), reason: z.string().trim().min(1).max(200).optional() }),
  z.object({ action: z.literal('set_2fa'), required: z.boolean() }),
  z.object({ action: z.literal('password_reset_audit'), payload: z.record(z.string(), z.unknown()).optional() }),
  z.object({ action: z.literal('invite_acceptance_audit'), collegeId: z.uuid().optional(), payload: z.record(z.string(), z.unknown()).optional() }),
]);
const paramsSchema = z.object({ userId: z.uuid('Invalid user id.') });

export async function POST(
  request: Request,
  context: { params: Promise<{ userId: string }> }
) {
  let actor;
  try {
    actor = await requireSuperadmin({ forApi: true });
  } catch (error) {
    if (isSuperadminAuthError(error)) {
      return NextResponse.json({ ok: false, error: error.message, code: error.code }, { status: error.status });
    }
    throw error;
  }

  const ip = getRequestIp(request);
  const limited = await consumeRateLimit({
    key: `admin-user-controls:${actor.id}:${ip}`,
    limit: 40,
    windowMs: 5 * 60 * 1000,
  });
  if (!limited.ok) {
    return NextResponse.json({ ok: false, error: 'Too many requests.' }, { status: 429 });
  }

  const paramsParsed = paramsSchema.safeParse(await context.params);
  if (!paramsParsed.success) {
    return NextResponse.json({ ok: false, error: paramsParsed.error.issues[0]?.message ?? 'Invalid user id.' }, { status: 400 });
  }

  const { userId } = paramsParsed.data;
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'Invalid payload.' }, { status: 400 });
  }

  try {

    switch (parsed.data.action) {
      case 'suspend':
        await setAdminSuspended({
          actorId: actor.id,
          userId,
          suspended: true,
          reason: parsed.data.reason,
        });
        return NextResponse.json({ ok: true, action: 'suspend' });
      case 'reactivate':
        await setAdminSuspended({ actorId: actor.id, userId, suspended: false });
        return NextResponse.json({ ok: true, action: 'reactivate' });
      case 'force_logout': {
        const result = await forceLogoutAdminUser({
          actorId: actor.id,
          userId,
          reason: parsed.data.reason,
        });
        return NextResponse.json({ ok: true, action: 'force_logout', revokedSessions: result.revokedSessions });
      }
      case 'set_2fa':
        await setAdminTwoFactorRequirement({
          actorId: actor.id,
          userId,
          required: parsed.data.required,
        });
        return NextResponse.json({ ok: true, action: 'set_2fa', required: parsed.data.required });
      case 'password_reset_audit':
        await auditPasswordReset({
          actorId: actor.id,
          userId,
          payload: parsed.data.payload,
        });
        return NextResponse.json({ ok: true, action: 'password_reset_audit' });
      case 'invite_acceptance_audit':
        await auditAdminInviteAccepted({
          actorId: actor.id,
          userId,
          collegeId: parsed.data.collegeId,
          payload: parsed.data.payload,
        });
        return NextResponse.json({ ok: true, action: 'invite_acceptance_audit' });
      default:
        return NextResponse.json({ ok: false, error: 'Unsupported action.' }, { status: 400 });
    }
  } catch (error) {
    if (isSuperadminAuthError(error)) {
      return NextResponse.json({ ok: false, error: error.message, code: error.code }, { status: error.status });
    }

    return NextResponse.json({ ok: false, error: 'Request failed.' }, { status: 500 });
  }
}
