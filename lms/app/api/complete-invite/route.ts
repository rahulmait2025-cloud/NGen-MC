import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getVerifiedIdentity } from '@/lib/student-runtime/identity';
import { consumeRateLimit, rateLimitResponse } from '@/lib/security/rate-limit';

const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60 * 1000;

export async function POST() {
  const identity = await getVerifiedIdentity();
  if (!identity?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = identity.userId;

  const limited = await consumeRateLimit({ key: `complete-invite:${userId}`, limit: RATE_LIMIT, windowMs: RATE_WINDOW_MS, failClosed: true });
  if (!limited.ok) {
    return rateLimitResponse(`Too many requests. Retry in ${limited.retryAfterSeconds}s.`, limited, RATE_LIMIT);
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('profiles')
    .update({ invite_completed_at: new Date().toISOString() })
    .eq('id', userId);
  if (error) {
    return NextResponse.json({ error: 'Request failed.' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
