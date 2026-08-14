import { NextResponse, after } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { consumeRateLimit, getRequestIp, rateLimitResponse } from '@/lib/security/rate-limit';

const PASSWORD_LOGIN_RATE_LIMIT = 10;
const PASSWORD_LOGIN_WINDOW_MS = 60 * 1000;
const SUPABASE_TIMEOUT_MS = parseInt(process.env.SUPABASE_TIMEOUT_MS || '30000', 10);

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timeout`)), ms)
    ),
  ]);
}

export async function POST(request: Request) {
  let body: { email?: string; password?: string; slug?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const email = String(body.email ?? '').trim().toLowerCase();
  const password = String(body.password ?? '');
  const slug = typeof body.slug === 'string' ? body.slug.trim().toLowerCase() : '';

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
    return { ok: true, remaining: 1, retryAfterSeconds: 0 }; // Fail open on timeout for better UX
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

  const authUser = signInData.data.user ?? signInData.data.session?.user ?? null;
  const hasSessionTokens = !!signInData.data.session;
  if (!authUser || !hasSessionTokens) {
    await supabase.auth.signOut().catch(() => undefined);
    return NextResponse.json(
      { error: 'Login failed: Session not established.' },
      { status: 500 },
    );
  }

  let resolvedData;
  try {
    const { data } = await withTimeout(
      Promise.resolve(
        supabase.rpc('resolve_admin_auth_context', {
          p_user_id: authUser.id,
          p_slug: slug || null,
        }).single()
      ),
      SUPABASE_TIMEOUT_MS,
      'resolveAdminAuthContext'
    );
    resolvedData = data;
  } catch (err) {
    console.error('[auth/login] RPC error:', err);
  }

  const ctx = resolvedData as {
    allowed: boolean;
    error_code: string | null;
    membership_id: string | null;
    membership_role: string | null;
    membership_status: string | null;
    profile_is_active: boolean;
    college_id: string | null;
    college_slug: string | null;
  } | null;

  if (ctx?.profile_is_active === false || ctx?.error_code === 'account_disabled') {
    await supabase.auth.signOut();
    return NextResponse.json(
      { error: 'This account has been disabled.' },
      { status: 403 },
    );
  }

  if (ctx?.allowed && ctx.membership_id && ctx.college_slug) {
    if (ctx.membership_status === 'invited') {
      after(async () => {
        await supabase
          .from('college_memberships')
          .update({ status: 'active' })
          .eq('id', ctx.membership_id)
          .eq('user_id', authUser.id)
          .eq('status', 'invited');
      });
    }
    return NextResponse.json({
      redirectTo: `/c/${encodeURIComponent(ctx.college_slug)}/admin/dashboard`,
    });
  }

  await supabase.auth.signOut();
  if (slug) {
    return NextResponse.json(
      { error: 'You do not have admin access to this college.' },
      { status: 403 },
    );
  }
  return NextResponse.json(
    { error: 'No college admin access found for this account.' },
    { status: 403 },
  );
}
