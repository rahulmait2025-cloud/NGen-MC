import { NextResponse } from 'next/server';
import { z } from 'zod';

import { consumeRateLimit, getRequestIp, rateLimitResponse } from '@/lib/security/rate-limit';
import { logSecurityEvent } from '@/lib/security/audit';
import { createClient } from '@/lib/supabase/server';
import { trackActivity } from '@/lib/activity/emit';

const schema = z.object({
  event: z.enum(['failed_login', 'password_reset_requested']),
  slug: z.string().trim().optional(),
  email: z.string().trim().email().optional(),
  reason: z.string().trim().max(200).optional(),
});

const RATE_LIMIT = 120;
const RATE_WINDOW_MS = 60 * 1000;

function eventToAction(event: 'failed_login' | 'password_reset_requested'): string {
  switch (event) {
    case 'failed_login':
      return 'student.login.failed';
    case 'password_reset_requested':
      return 'student.password_reset.requested';
    default:
      return 'student.auth.unknown_event';
  }
}

export async function POST(request: Request) {
  const ip = getRequestIp(request);
  const limited = await consumeRateLimit({ 
    key: `student-auth-events:${ip}`, 
    limit: RATE_LIMIT, 
    windowMs: RATE_WINDOW_MS, 
    failClosed: true 
  });
  
  if (!limited.ok) {
    return rateLimitResponse('Too many requests.', limited, RATE_LIMIT);
  }

  const json = await request.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ ok: false, error: 'Invalid payload.' }, { status: 400 });

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

  const redactedEmail = parsed.data.email
    ? parsed.data.email.replace(/^(.)(.*)(@.*)$/, (_, p1, p2, p3) => `${p1}${'*'.repeat(Math.min(p2.length, 5))}${p3}`)
    : null;

  const activityPromise = parsed.data.event === 'failed_login'
    ? trackActivity({
        tenantId,
        actorUserId: null,
        actorRole: null,
        actorType: 'anonymous',
        eventName: 'login_failure',
        entityType: 'auth',
        entityId: parsed.data.slug ?? redactedEmail ?? null,
        metadata: { slug: parsed.data.slug ?? null, email: redactedEmail, reason: parsed.data.reason ?? null, ip },
        ipAddress: ip,
        userAgent: request.headers.get('user-agent') ?? null,
      })
    : parsed.data.event === 'password_reset_requested'
      ? trackActivity({
          tenantId,
          actorUserId: null,
          actorRole: null,
          actorType: 'anonymous',
          eventName: 'password_reset_requested',
          entityType: 'auth',
          entityId: redactedEmail ?? null,
          metadata: { slug: parsed.data.slug ?? null, email: redactedEmail, ip },
          ipAddress: ip,
          userAgent: request.headers.get('user-agent') ?? null,
        })
      : Promise.resolve();

  await Promise.all([
    logSecurityEvent({
      action: eventToAction(parsed.data.event),
      resourceType: 'auth',
      resourceId: parsed.data.slug ?? redactedEmail ?? null,
      payload: { slug: parsed.data.slug ?? null, email: redactedEmail, reason: parsed.data.reason ?? null, ip },
    }),
    activityPromise,
  ]);

  return NextResponse.json({ ok: true });
}

