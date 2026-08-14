import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { encryptToken } from '@/lib/security/platform-token-crypto';

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

  const clientId = process.env.GITHUB_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GITHUB_OAUTH_CLIENT_SECRET;
  const callbackUrl = process.env.GITHUB_OAUTH_CALLBACK_URL;

  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const rawState = searchParams.get('state');
  const errorParam = searchParams.get('error');

  if (!callbackUrl || !clientId || !clientSecret) {
    console.error('[github/callback] OAuth callback unconfigured (missing client ID, secret, or GITHUB_OAUTH_CALLBACK_URL)');
    return NextResponse.redirect(new URL('/student/stats?error=github_oauth_not_configured', appUrl));
  }

  if (errorParam || !code || !rawState) {
    console.warn('[github/callback] OAuth authorization denied or missing parameters');
    return NextResponse.redirect(new URL('/student/stats?error=oauth_denied', appUrl));
  }

  try {
    const admin = createAdminClient();

    // 1. Hash State & Validate Single-Use Server State
    const stateHash = crypto.createHash('sha256').update(rawState).digest('hex');
    const nowIso = new Date().toISOString();

    const { data: stateRecord, error: stateFetchError } = await admin
      .from('platform_oauth_states')
      .select('id, user_id, student_id, redirect_path, expires_at, consumed_at')
      .eq('state_hash', stateHash)
      .gt('expires_at', nowIso)
      .is('consumed_at', null)
      .maybeSingle();

    if (stateFetchError || !stateRecord) {
      console.warn('[github/callback] Invalid, expired, or previously consumed OAuth state');
      return NextResponse.redirect(new URL('/student/stats?error=invalid_state', appUrl));
    }

    // 2. Mark State as Consumed Atomically
    const { error: consumeError } = await admin
      .from('platform_oauth_states')
      .update({ consumed_at: nowIso })
      .eq('id', stateRecord.id)
      .is('consumed_at', null);

    if (consumeError) {
      console.warn('[github/callback] Failed to mark OAuth state as consumed atomically');
      return NextResponse.redirect(new URL('/student/stats?error=invalid_state', appUrl));
    }

    const safeRedirectPath = sanitizeReturnToPath(stateRecord.redirect_path, '/student/stats');

    // 3. Exchange Code for Access Token Server-Side using GITHUB_OAUTH_CALLBACK_URL
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: callbackUrl,
      }),
      cache: 'no-store',
    });

    if (!tokenRes.ok) {
      console.error('[github/callback] Token exchange request failed with status:', tokenRes.status);
      return NextResponse.redirect(new URL(`${safeRedirectPath}?error=token_exchange_failed`, appUrl));
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;
    if (!accessToken) {
      console.error('[github/callback] Missing access_token in token exchange response');
      return NextResponse.redirect(new URL(`${safeRedirectPath}?error=token_exchange_failed`, appUrl));
    }

    // 4. Fetch GitHub Authenticated Viewer Account Info
    const userRes = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'User-Agent': 'Avesh-LMS-Platform',
        Accept: 'application/vnd.github.v3+json',
      },
      cache: 'no-store',
    });

    if (!userRes.ok) {
      console.error('[github/callback] Failed to fetch GitHub user info with status:', userRes.status);
      return NextResponse.redirect(new URL(`${safeRedirectPath}?error=user_fetch_failed`, appUrl));
    }

    const ghUser = await userRes.json();
    const providerUsername = ghUser.login;
    const profileUrl = ghUser.html_url || `https://github.com/${providerUsername}`;

    // 5. Check if this GitHub account is already connected to another student
    const { data: existingOtherConn } = await admin
      .from('student_platform_connections')
      .select('student_id')
      .eq('platform', 'github')
      .ilike('provider_username', providerUsername)
      .neq('student_id', stateRecord.student_id)
      .is('revoked_at', null)
      .maybeSingle();

    if (existingOtherConn) {
      console.warn('[github/callback] GitHub account already linked to another student');
      return NextResponse.redirect(new URL(`${safeRedirectPath}?error=github_account_already_linked`, appUrl));
    }

    // 7. Check if student previously linked a DIFFERENT GitHub account ID
    const { data: existingSelfConn } = await admin
      .from('student_platform_connections')
      .select('provider_username')
      .eq('student_id', stateRecord.student_id)
      .eq('platform', 'github')
      .maybeSingle();

    if (
      existingSelfConn &&
      existingSelfConn.provider_username.toLowerCase() !== providerUsername.toLowerCase()
    ) {
      // Invalidate old GitHub cache if provider_user_id changed
      // Invalidate old GitHub cache if provider_user_id changed
      await admin
        .from('student_platform_daily_activities')
        .delete()
        .eq('student_id', stateRecord.student_id)
        .eq('platform', 'github');

      await admin
        .from('student_platform_year_sync_state')
        .delete()
        .eq('student_id', stateRecord.student_id)
        .eq('platform', 'github');
    }

    // 7. Store verified account identity along with encrypted OAuth access token for background sync
    const encrypted = encryptToken(accessToken);
    const providerUserId = String(ghUser.id);
    const accountCreatedAt = ghUser.created_at || null;

    const { error: upsertError } = await admin
      .from('student_platform_connections')
      .upsert(
        {
          student_id: stateRecord.student_id,
          platform: 'github',
          provider_user_id: providerUserId,
          provider_username: providerUsername,
          profile_url: profileUrl,
          encrypted_access_token: encrypted.encryptedText,
          token_iv: encrypted.iv,
          token_auth_tag: encrypted.authTag,
          token_scopes: tokenData.scope ? tokenData.scope.split(',').map((s: string) => s.trim()) : ['read:user'],
          account_created_at: accountCreatedAt,
          connected_at: nowIso,
          last_verified_at: nowIso,
          revoked_at: null,
          updated_at: nowIso,
        },
        { onConflict: 'student_id, platform' }
      );

    if (upsertError) {
      console.error('[github/callback] Failed to save connection in database:', upsertError.message);
      return NextResponse.redirect(new URL(`${safeRedirectPath}?error=db_save_failed`, appUrl));
    }

    // 8. Update students.github_url for display compatibility
    await admin
      .from('students')
      .update({ github_url: profileUrl, updated_at: nowIso })
      .eq('id', stateRecord.student_id);

    // 9. Redirect to safe LMS path with success parameters
    const redirectUrl = new URL(safeRedirectPath, appUrl);
    redirectUrl.searchParams.set('connected', 'github');
    redirectUrl.searchParams.set('importing', 'github');

    return NextResponse.redirect(redirectUrl);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[github/callback] Unexpected error during callback processing:', message);
    return NextResponse.redirect(new URL('/student/stats?error=callback_failed', appUrl));
  }
}
