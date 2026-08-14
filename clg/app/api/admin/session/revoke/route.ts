import { NextResponse, after } from 'next/server';
import { z } from 'zod';
import { revokeOwnAdminSessionById } from '@/lib/auth/admin-session';
import { getSession } from '@/lib/auth/session';
import { logSecurityEvent } from '@/lib/security/audit';
import { trackActivity } from '@/lib/activity/emit';

const schema = z.object({
  sessionId: z.uuid(),
  reason: z.string().trim().min(1).max(200).optional(),
});

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = schema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'Invalid payload.' }, { status: 400 });
  }

  try {
    const { session } = await getSession();
    if (!session?.user) {
      return NextResponse.json({ ok: false, error: 'Unauthenticated' }, { status: 401 });
    }
    const revoked = await revokeOwnAdminSessionById(parsed.data.sessionId, parsed.data.reason ?? 'user_revoked');

    if (!revoked) {
      return NextResponse.json({ ok: false, error: 'Session not found.' }, { status: 404 });
    }

    after(async () => {
      await logSecurityEvent({
        action: 'admin.session.revoked.self',
        resourceType: 'admin_session',
        resourceId: parsed.data.sessionId,
        payload: { reason: parsed.data.reason ?? 'user_revoked' },
      });

      await trackActivity({
        tenantId: null,
        actorUserId: session.user.id,
        actorRole: 'college_admin',
        actorType: 'college_admin',
        eventName: 'session_revoked',
        entityType: 'admin_session',
        entityId: parsed.data.sessionId,
        metadata: { reason: parsed.data.reason ?? 'user_revoked' },
      });
    });

    return NextResponse.json({ ok: true, userId: session.user.id });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
