import { NextResponse } from 'next/server';
import { z } from 'zod';
import { isSuperadminAuthError, requireSuperadmin } from '@/lib/auth/require-superadmin';
import { consumeRateLimit, getRequestIp } from '@/lib/security/rate-limit';
import { listAdminSessionsForUser, revokeAllAdminSessionsForUser } from '@/lib/services/admin-security';

const deleteSchema = z.object({
  reason: z.string().trim().min(1).max(200).optional(),
});
const paramsSchema = z.object({ userId: z.uuid('Invalid user id.') });

export async function GET(
  request: Request,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    const actor = await requireSuperadmin({ forApi: true });
    const ip = getRequestIp(request);
    const limited = await consumeRateLimit({
      key: `admin-user-sessions-read:${actor.id}:${ip}`,
      limit: 60,
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
    const sessions = await listAdminSessionsForUser(userId);
    return NextResponse.json({ ok: true, sessions });
  } catch (error) {
    if (isSuperadminAuthError(error)) {
      return NextResponse.json({ ok: false, error: error.message, code: error.code }, { status: error.status });
    }

    return NextResponse.json({ ok: false, error: 'Request failed.' }, { status: 500 });
  }
}

export async function DELETE(
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
    key: `admin-user-sessions-delete:${actor.id}:${ip}`,
    limit: 25,
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
  const parsed = deleteSchema.safeParse(body ?? {});

  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'Invalid payload.' }, { status: 400 });
  }

  try {
    const count = await revokeAllAdminSessionsForUser({
      actorId: actor.id,
      userId,
      reason: parsed.data.reason,
    });

    return NextResponse.json({ ok: true, revokedSessions: count });
  } catch (error) {
    if (isSuperadminAuthError(error)) {
      return NextResponse.json({ ok: false, error: error.message, code: error.code }, { status: error.status });
    }

    return NextResponse.json({ ok: false, error: 'Request failed.' }, { status: 500 });
  }
}
