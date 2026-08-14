import React, { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { COLLEGE_ADMIN_RESET_PASSWORD_PATH } from '@/lib/auth/college-admin-auth-urls';
import { RecoveryResetPasswordForm } from './reset-password-form';

export default function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense fallback={<ResetPasswordFallbackShell />}>
      <ResetPasswordPageInner searchParams={searchParams} />
    </Suspense>
  );
}

async function ResetPasswordPageInner({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const code = typeof sp.code === 'string' ? sp.code : null;
  const tokenHash = typeof sp.token_hash === 'string' ? sp.token_hash : null;
  const otpType = typeof sp.type === 'string' ? sp.type : null;
  const linkExpired = sp.error === 'expired';

  if (linkExpired) {
    return <RecoveryResetPasswordForm hasRecoverySession={false} />;
  }

  if (code) {
    redirect(`/auth/callback?code=${encodeURIComponent(code)}&next=${encodeURIComponent(COLLEGE_ADMIN_RESET_PASSWORD_PATH)}`);
  }

  const supabase = await createClient();

  if (tokenHash && otpType === 'recovery') {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: 'recovery',
    });
    if (!error) {
      redirect(COLLEGE_ADMIN_RESET_PASSWORD_PATH);
    }
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  return <RecoveryResetPasswordForm hasRecoverySession={!userError && !!user} />;
}

function ResetPasswordFallbackShell() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <p className="text-sm text-muted-foreground">Verifying your reset link...</p>
    </div>
  );
}
