import React, { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { studentPortalBasePath } from '@/lib/auth/student-auth-urls';
import { StudentResetPasswordForm } from './reset-password-form';

export default function StudentResetPasswordPage({
  params,
  searchParams,
}: {
  params: Promise<{ collegeSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense fallback={<StudentResetPasswordFallbackShell />}>
      <StudentResetPasswordPageInner params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function StudentResetPasswordPageInner({
  params,
  searchParams,
}: {
  params: Promise<{ collegeSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ collegeSlug }, sp] = await Promise.all([params, searchParams]);
  const code = typeof sp.code === 'string' ? sp.code : null;
  const tokenHash = typeof sp.token_hash === 'string' ? sp.token_hash : null;
  const otpType = typeof sp.type === 'string' ? sp.type : null;
  const linkExpired = sp.error === 'expired';

  const resetPath = `${studentPortalBasePath(collegeSlug)}/reset-password`;
  const callbackBase = `${studentPortalBasePath(collegeSlug)}/auth/callback`;

  if (linkExpired) {
    return (
      <StudentResetPasswordForm collegeSlug={collegeSlug} hasRecoverySession={false} />
    );
  }

  // PKCE recovery codes must be exchanged on the server (session cookies are httpOnly).
  if (code) {
    redirect(`${callbackBase}?code=${encodeURIComponent(code)}&next=${encodeURIComponent(resetPath)}`);
  }

  const supabase = await createClient();

  if (tokenHash && otpType === 'recovery') {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: 'recovery',
    });
    if (!error) {
      redirect(resetPath);
    }
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  return (
    <StudentResetPasswordForm
      collegeSlug={collegeSlug}
      hasRecoverySession={!userError && !!user}
    />
  );
}

function StudentResetPasswordFallbackShell() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <p className="text-sm text-muted-foreground">Verifying your reset link...</p>
    </div>
  );
}
