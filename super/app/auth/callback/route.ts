import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { consumeRateLimit, getRequestIp, rateLimitResponse } from '@/lib/security/rate-limit';

const AUTH_CALLBACK_RATE_LIMIT = 20;
const AUTH_CALLBACK_WINDOW_MS = 60 * 1000;

export async function GET(request: Request) {
  const base = new URL(request.url).origin;
  const searchParams = new URL(request.url).searchParams;
  const code = searchParams.get('code');
  const clientIp = getRequestIp(request);

  const limited = await consumeRateLimit({
    key: `auth_callback:${clientIp}`,
    limit: AUTH_CALLBACK_RATE_LIMIT,
    windowMs: AUTH_CALLBACK_WINDOW_MS,
  });
  if (!limited.ok) {
    return rateLimitResponse('Too many auth requests', limited, AUTH_CALLBACK_RATE_LIMIT);
  }

  const supabase = await createClient();

  let user;
  if (code) {
    const { data: exchangeData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) {
      console.error('[auth/callback] Code exchange failed:', exchangeError.message);
      return NextResponse.redirect(new URL('/login?error=session', base));
    }
    user = exchangeData?.user;
  }

  if (!user) {
    const {
      data: { user: sessionUser },
      error: userError,
    } = await supabase.auth.getUser();
    user = sessionUser;
    if (userError || !user) {
      console.error('[auth/callback] No session:', userError?.message ?? 'no user');
      return NextResponse.redirect(new URL('/login?error=session', base));
    }
  }
  
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from('profiles')
    .select('id, email, full_name, global_role, is_active, suspended_at')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile) {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL('/login?error=missing_profile', base));
  }

  if (profile.global_role !== 'superadmin') {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL('/login?error=not_authorized', base));
  }

  if (profile.is_active === false || profile.suspended_at != null) {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL('/login?error=inactive_account', base));
  }

  return NextResponse.redirect(new URL('/dashboard', base));
}
