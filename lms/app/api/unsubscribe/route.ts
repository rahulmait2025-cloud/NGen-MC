import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { consumeRateLimit, getRequestIp } from '@/lib/security/rate-limit';
import crypto from 'crypto';

const unsubscribeSchema = z.object({
  email: z.string().trim().toLowerCase().email('Valid email is required').max(320),
  token: z
    .string()
    .trim()
    .regex(/^[a-f0-9]{32}$/i, 'Invalid unsubscribe token')
    .optional(),
});

function verifyUnsubscribeToken(email: string, token: string): boolean {
  const secret = process.env.UNSUBSCRIBE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const expectedToken = crypto
    .createHmac('sha256', secret)
    .update(email.toLowerCase())
    .digest('hex')
    .slice(0, 32);
  return token === expectedToken;
}

/**
 * Unsubscribe endpoint for email links.
 * Requires either:
 * 1. A valid HMAC token (for email unsubscribe links)
 * 2. Rate limiting to prevent abuse
 * 
 * SECURITY: Uses failClosed to prevent abuse if rate limiter fails.
 */
export async function POST(request: Request) {
  const ip = getRequestIp(request);
  const limited = await consumeRateLimit({
    key: `unsubscribe:${ip}`,
    limit: 10,
    windowMs: 60 * 1000,
    failClosed: true,
  });

  if (!limited.ok) {
    return NextResponse.json(
      { error: `Too many requests. Retry in ${limited.retryAfterSeconds}s.` },
      { status: 429, headers: { 'Retry-After': String(limited.retryAfterSeconds) } }
    );
  }

  try {
    const body = await request.json().catch(() => null);
    const parsed = unsubscribeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid request.' }, { status: 400 });
    }

    if (parsed.data.token && !verifyUnsubscribeToken(parsed.data.email, parsed.data.token)) {
      return NextResponse.json({ error: 'Invalid unsubscribe token' }, { status: 403 });
    }

    const admin = createAdminClient();
    await admin.from('email_unsubscribes').upsert(
      { email: parsed.data.email, unsubscribed_at: new Date().toISOString(), source: 'student_invite' },
      { onConflict: 'email' }
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[unsubscribe]', e instanceof Error ? e.message : String(e));
    return NextResponse.json({ error: 'Failed to unsubscribe' }, { status: 500 });
  }
}
