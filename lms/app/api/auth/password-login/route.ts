import { NextResponse } from 'next/server';
import { getRequestIp } from '@/lib/security/rate-limit';
import { LoginSessionManager } from '@/lib/auth/login-session-manager';

const LOGIN_ATTEMPT_HEADER = 'x-login-attempt-id';

export async function POST(request: Request) {
  let body: { email?: string; password?: string; slug?: string; next?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const email = String(body.email ?? '').trim().toLowerCase();
  const password = String(body.password ?? '');
  const slug = typeof body.slug === 'string' ? body.slug.trim().toLowerCase() : '';
  const next = typeof body.next === 'string' ? body.next.trim() : '';

  if (!email || !password) {
    return NextResponse.json(
      { error: 'Please enter email and password.' },
      { status: 400 }
    );
  }

  const loginAttemptId = request.headers.get(LOGIN_ATTEMPT_HEADER)?.trim() || null;
  const clientIp = getRequestIp(request);

  if (process.env.AUTH_DIAGNOSTICS_ENABLED === 'true') {
    console.log(`[auth-diagnostics] password-login-attempt: attemptId=${loginAttemptId ?? 'none'}`);
  }

  const result = await LoginSessionManager.authenticate({
    email,
    password,
    slug,
    clientIp,
    loginAttemptId,
    next,
  });

  if (process.env.AUTH_DIAGNOSTICS_ENABLED === 'true' && result.body.redirectTo) {
    console.log(`[auth-diagnostics] password-login-redirect: attemptId=${loginAttemptId ?? 'none'}, redirectTo=${result.body.redirectTo}`);
  }

  return NextResponse.json(result.body, { status: result.status });
}
