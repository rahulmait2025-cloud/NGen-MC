import { NextResponse, after } from 'next/server';
import { z } from 'zod';
import { consumeRateLimit, getRequestIp, rateLimitResponse } from '@/lib/security/rate-limit';
import { logSecurityEvent } from '@/lib/security/audit';
import { createClient } from '@/lib/supabase/server';
import { trackActivity } from '@/lib/activity/emit';

const schema = z.object({
  event: z.enum(['failed_login', 'password_reset_requested', 'invite_acceptance']),
  slug: z.string().trim().optional(),
  email: z.string().trim().email().optional(),
  reason: z.string().trim().max(200).optional(),
});

const RATE_LIMIT = 100;
const RATE_WINDOW_MS = 60 * 1000;

function eventToAction(event: 'failed_login' | 'password_reset_requested' | 'invite_acceptance'): string {
  switch (event) {
    case 'failed_login':
      return 'admin.login.failed';
    case 'password_reset_requested':
      return 'admin.password_reset.requested';
    case 'invite_acceptance':
      return 'admin.invite.acceptance_attempt';
    default:
      return 'admin.auth.unknown_event';
  }
}

export async function POST(request: Request) {
  const ip = getRequestIp(request);
  const limited = await consumeRateLimit({
    key: `admin-auth-events:${ip}`,
    limit: RATE_LIMIT,
    windowMs: RATE_WINDOW_MS,
    failClosed: true,
  });

  if (!limited.ok) {
    return rateLimitResponse('Too many requests.', limited, RATE_LIMIT);
  }

  const json = await request.json().catch(() => null);
  const parsed = schema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'Invalid payload.' }, { status: 400 });
  }

  let tenantId: string | null = null;
  if (parsed.data.slug) {
    const supabase = await createClient();
    const { data: tenant } = await supabase
      .from('colleges')
      .select('id')
      .ilike('slug', parsed.data.slug)
      .eq('status', 'active')
      .maybeSingle();
    tenantId = tenant?.id ?? null;
  }

  after(async () => {
    await logSecurityEvent({
      action: eventToAction(parsed.data.event),
      resourceType: 'auth',
      resourceId: parsed.data.slug ?? parsed.data.email ?? null,
      payload: {
        slug: parsed.data.slug ?? null,
        email: parsed.data.email ?? null,
        reason: parsed.data.reason ?? null,
        ip,
      },
    });

    if (parsed.data.event === 'failed_login') {
      await trackActivity({
        tenantId,
        actorUserId: null,
        actorRole: null,
        actorType: 'anonymous',
        eventName: 'login_failure',
        entityType: 'auth',
        entityId: parsed.data.slug ?? parsed.data.email ?? null,
        metadata: { slug: parsed.data.slug ?? null, email: parsed.data.email ?? null, reason: parsed.data.reason ?? null, ip },
        ipAddress: ip,
        userAgent: request.headers.get('user-agent') ?? null,
      });
    }

    if (parsed.data.event === 'password_reset_requested') {
      await trackActivity({
        tenantId,
        actorUserId: null,
        actorRole: null,
        actorType: 'anonymous',
        eventName: 'password_reset_requested',
        entityType: 'auth',
        entityId: parsed.data.email ?? null,
        metadata: { slug: parsed.data.slug ?? null, email: parsed.data.email ?? null, ip },
        ipAddress: ip,
        userAgent: request.headers.get('user-agent') ?? null,
      });
    }
  });

  return NextResponse.json({ ok: true });
}
