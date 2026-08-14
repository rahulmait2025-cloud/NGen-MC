import { NextResponse } from 'next/server';
import { z } from 'zod';
import { isSuperadminAuthError, requireSuperadmin } from '@/lib/auth/require-superadmin';
import { consumeRateLimit, getRequestIp } from '@/lib/security/rate-limit';
import { revokeAdminSessionById } from '@/lib/services/admin-security';

const schema = z.object({
  reason: z.string().trim().min(1).max(200).optional(),
});
const paramsSchema = z.object({
  userId: z.uuid('Invalid user id.'),
  sessionId: z.uuid('Invalid session id.'),
});

export async function DELETE(
  request: Request,
  context: { params: Promise<{ userId: string; sessionId: string }> }
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
    key: `admin-user-session-delete:${actor.id}:${ip}`,
    limit: 25,
    windowMs: 5 * 60 * 1000,
  });
  if (!limited.ok) {
    return NextResponse.json({ ok: false, error: 'Too many requests.' }, { status: 429 });
  }

  const paramsParsed = paramsSchema.safeParse(await context.params);
  if (!paramsParsed.success) {
    return NextResponse.json({ ok: false, error: paramsParsed.error.issues[0]?.message ?? 'Invalid request.' }, { status: 400 });
  }

  const { sessionId } = paramsParsed.data;
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body ?? {});

  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'Invalid payload.' }, { status: 400 });
  }

  try {
    await revokeAdminSessionById({
      actorId: actor.id,
      sessionId,
      reason: parsed.data.reason,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (isSuperadminAuthError(error)) {
      return NextResponse.json({ ok: false, error: error.message, code: error.code }, { status: error.status });
    }

    return NextResponse.json({ ok: false, error: 'Request failed.' }, { status: 500 });
  }
}
