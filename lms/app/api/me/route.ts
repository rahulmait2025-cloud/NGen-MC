import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/tenant/get-tenant';
import { consumeRateLimit, getRequestIp } from '@/lib/security/rate-limit';
import { logAuthEvent } from '@/lib/auth/auth-logger';

export async function GET(request: Request) {
  const ip = getRequestIp(request);
  // #9 Parallelize independent I/O: rate limit check and user resolution have no dependency
  const [limited, user] = await Promise.all([
    consumeRateLimit({
      key: `me:${ip}`,
      limit: 120,
      windowMs: 60 * 1000,
    }),
    getCurrentUser(),
  ]);

  if (!limited.ok) {
    return NextResponse.json(
      { error: `Too many requests. Retry in ${limited.retryAfterSeconds}s.` },
      { status: 429, headers: { 'Retry-After': String(limited.retryAfterSeconds) } }
    );
  }

  if (!user) {
    logAuthEvent({ type: 'api_unauthenticated', ip, metadata: { endpoint: '/api/me' } });
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  if (!user.isActive) {
    logAuthEvent({ type: 'api_inactive_user', userId: user.id, metadata: { endpoint: '/api/me' } });
    return NextResponse.json({ error: 'Account is inactive' }, { status: 403 });
  }

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      isActive: user.isActive,
    },
  });
}
