import { NextResponse } from 'next/server';
import { z } from 'zod';

import { consumeRateLimit, getRequestIp, rateLimitResponse } from '@/lib/security/rate-limit';
import { logAudit } from '@/lib/services/audit';
import { createClient } from '@/lib/supabase/server';
import { trackActivity } from '@/lib/activity/emit';

const schema = z.object({
  event: z.enum(['failed_login', 'password_reset_requested']),
  email: z.string().trim().email().optional(),
  reason: z.string().trim().max(200).optional(),
});

export async function POST(request: Request) {
  const ip = getRequestIp(request);
  const limited = await consumeRateLimit({ key: `superadmin-auth-events:${ip}`, limit: 120, windowMs: 60 * 1000 });
  if (!limited.ok) return rateLimitResponse('Too many requests.', limited, 120);

  const json = await request.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ ok: false, error: 'Invalid payload.' }, { status: 400 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const actorId = user?.id ?? null;
  const email = parsed.data.email ?? null;

  if (parsed.data.event === 'failed_login') {
    await trackActivity({
      tenantId: null,
      actorUserId: actorId,
      actorRole: 'superadmin',
      actorType: actorId ? 'superadmin' : 'anonymous',
      eventName: 'login_failure',
      entityType: 'auth',
      entityId: email,
      metadata: { email, reason: parsed.data.reason ?? null, ip },
      ipAddress: ip,
      userAgent: request.headers.get('user-agent') ?? null,
    });

    if (actorId) {
      await logAudit({
        actor_id: actorId,
        action: 'superadmin.login.failed',
        resource_type: 'auth',
        resource_id: email,
        payload: { reason: parsed.data.reason ?? null, ip },
      });
    }
  }

  if (parsed.data.event === 'password_reset_requested') {
    await trackActivity({
      tenantId: null,
      actorUserId: actorId,
      actorRole: 'superadmin',
      actorType: actorId ? 'superadmin' : 'anonymous',
      eventName: 'password_reset_requested',
      entityType: 'auth',
      entityId: email,
      metadata: { email, ip },
      ipAddress: ip,
      userAgent: request.headers.get('user-agent') ?? null,
    });

    if (actorId) {
      await logAudit({
        actor_id: actorId,
        action: 'superadmin.password_reset.requested',
        resource_type: 'auth',
        resource_id: email,
        payload: { ip },
      });
    }
  }

  return NextResponse.json({ ok: true });
}

