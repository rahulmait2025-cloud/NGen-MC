import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { consumeRateLimit, getRequestIp, rateLimitResponse } from '@/lib/security/rate-limit';

const PASSWORD_LOGIN_RATE_LIMIT = 10;
const PASSWORD_LOGIN_WINDOW_MS = 60 * 1000;
const SUPABASE_TIMEOUT_MS = 30_000;

function withTimeout<T>(promise: PromiseLike<T> | Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timeout`)), ms)
    ),
  ]);
}

export async function POST(request: Request) {
  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const email = String(body.email ?? '').trim().toLowerCase();
  const password = String(body.password ?? '');

  if (!email || !password) {
    return NextResponse.json(
      { error: 'Please enter email and password.' },
      { status: 400 },
    );
  }

  const clientIp = getRequestIp(request);
  const rateLimitKey = `pw_login:${clientIp}:${email}`;
  const limited = await withTimeout(
    consumeRateLimit({
      key: rateLimitKey,
      limit: PASSWORD_LOGIN_RATE_LIMIT,
      windowMs: PASSWORD_LOGIN_WINDOW_MS,
      failClosed: true,
    }),
    SUPABASE_TIMEOUT_MS,
    'consumeRateLimit'
  ).catch((err) => {
    console.error('[auth/login] rate-limit error:', err);
    return { ok: true, remaining: 1, retryAfterSeconds: 0 };
  });

  if (!limited.ok) {
    return rateLimitResponse('Too many login attempts. Please try again later.', limited, PASSWORD_LOGIN_RATE_LIMIT);
  }

  const supabase = await createClient();

  let signInData;
  try {
    const result = await withTimeout(
      supabase.auth.signInWithPassword({ email, password }),
      SUPABASE_TIMEOUT_MS,
      'signInWithPassword'
    );
    signInData = result;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    if (message.includes('timeout')) {
      return NextResponse.json(
        { error: 'Authentication service is temporarily unavailable. Please try again later.' },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { error: 'Login failed. Please try again.' },
      { status: 500 },
    );
  }

  if (signInData.error) {
    return NextResponse.json(
      { error: 'Invalid email or password.' },
      { status: 401 },
    );
  }

  const user = signInData.data.user;
  if (!user) {
    return NextResponse.json(
      { error: 'Login failed: Session not established.' },
      { status: 500 },
    );
  }

  const admin = createAdminClient();
  const { data: profile } = await withTimeout(
    admin
      .from('profiles')
      .select('global_role, is_active, suspended_at')
      .eq('id', user.id)
      .maybeSingle(),
    SUPABASE_TIMEOUT_MS,
    'getProfile'
  );

  if (!profile) {
    await supabase.auth.signOut();
    return NextResponse.json(
      { error: 'No profile found for this account.' },
      { status: 403 },
    );
  }

  if (profile.global_role !== 'superadmin') {
    await supabase.auth.signOut();
    return NextResponse.json(
      { error: 'You are not authorized for Super Admin.' },
      { status: 403 },
    );
  }

  if (profile.is_active === false || profile.suspended_at != null) {
    await supabase.auth.signOut();
    return NextResponse.json(
      { error: 'This account has been suspended.' },
      { status: 403 },
    );
  }

  return NextResponse.json({ redirectTo: '/dashboard' });
}
