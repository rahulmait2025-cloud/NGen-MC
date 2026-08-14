import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

function getAppOrigin(request: NextRequest): string {
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  if (host) {
    return `${proto}://${host}`.replace(/\/$/, '');
  }
  return new URL(request.url).origin.replace(/\/$/, '');
}

function sanitizeReturnToPath(rawPath: string | null | undefined, fallback: string = '/student/stats'): string {
  if (!rawPath) return fallback;
  const trimmed = rawPath.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.startsWith('/\\') || /^[a-z0-9+-.]+:/i.test(trimmed)) {
    return fallback;
  }
  return trimmed;
}

export async function GET(request: NextRequest) {
  const appUrl = getAppOrigin(request);

  const searchParams = request.nextUrl.searchParams;
  const rawReturnTo = searchParams.get('returnTo') || searchParams.get('redirect');
  const refererHeader = request.headers.get('referer');

  let targetRedirectPath = '/student/stats';
  if (rawReturnTo) {
    targetRedirectPath = sanitizeReturnToPath(rawReturnTo, '/student/stats');
  } else if (refererHeader) {
    try {
      const refUrl = new URL(refererHeader);
      targetRedirectPath = sanitizeReturnToPath(refUrl.pathname + refUrl.search, '/student/stats');
    } catch {
      // fallback
    }
  }

  const clientId = process.env.GITHUB_OAUTH_CLIENT_ID;
  const callbackUrl = process.env.GITHUB_OAUTH_CALLBACK_URL;

  if (!clientId || !callbackUrl) {
    console.error('[github/connect] GitHub OAuth is missing configuration (GITHUB_OAUTH_CLIENT_ID or GITHUB_OAUTH_CALLBACK_URL).');
    return NextResponse.redirect(new URL(`${targetRedirectPath}?error=github_oauth_not_configured`, appUrl));
  }

  try {
    const supabase = await createClient();

    // 1. Authenticate Supabase User
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.redirect(new URL(`/login?error=unauthorized`, appUrl));
    }

    // 2. Resolve Student Record
    const admin = createAdminClient();
    const { data: student, error: studentError } = await admin
      .from('students')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (studentError || !student) {
      return NextResponse.redirect(new URL(`${targetRedirectPath}?error=student_not_found`, appUrl));
    }

    // 3. Generate Cryptographically Secure Single-Use State (32 random bytes)
    const rawState = crypto.randomBytes(32).toString('hex');
    const stateHash = crypto.createHash('sha256').update(rawState).digest('hex');
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

    // 4. Store State Hash Server-side
    const { error: stateInsertError } = await admin.from('platform_oauth_states').insert({
      state_hash: stateHash,
      user_id: user.id,
      student_id: student.id,
      platform: 'github',
      redirect_path: targetRedirectPath,
      expires_at: expiresAt,
    });

    if (stateInsertError) {
      console.error('[github/connect] Failed to store OAuth state in database.');
      return NextResponse.redirect(new URL(`${targetRedirectPath}?error=oauth_init_failed`, appUrl));
    }

    // 5. Redirect to GitHub Authorization Endpoint using GITHUB_OAUTH_CALLBACK_URL
    const authorizeUrl = new URL('https://github.com/login/oauth/authorize');
    authorizeUrl.searchParams.set('client_id', clientId);
    authorizeUrl.searchParams.set('redirect_uri', callbackUrl);
    authorizeUrl.searchParams.set('scope', 'read:user');
    authorizeUrl.searchParams.set('state', rawState);
    authorizeUrl.searchParams.set('prompt', 'consent');

    return NextResponse.redirect(authorizeUrl.toString());
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[github/connect] Unexpected error during OAuth initiation:', message);
    return NextResponse.redirect(new URL(`${targetRedirectPath}?error=server_error`, appUrl));
  }
}
