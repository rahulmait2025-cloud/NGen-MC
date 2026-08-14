'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { UnifiedAuthScreen } from '@/components/auth/unified-auth-screen';

function getUrlErrorMessage(err: string | null): string | null {
  if (err === 'not_authorized') return 'You are not authorized to view the SuperAdmin dashboard.';
  if (err === 'inactive_account') return 'This account has been deactivated.';
  if (err === 'missing_profile') return 'Your account has no SuperAdmin profile.';
  return null;
}

function LoginFormContent() {
  const searchParams = useSearchParams();
  const urlError = getUrlErrorMessage(searchParams.get('error'));

  const paramsObj: Record<string, string | string[]> = {};
  searchParams.forEach((value, key) => {
    paramsObj[key] = value;
  });
  
  if (urlError) {
    paramsObj['error'] = urlError;
  }

  return <UnifiedAuthScreen searchParams={paramsObj} />;
}

export function LoginPageClient() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#030303] flex items-center justify-center">
        <div className="animate-spin rounded-full size-8 border-t-2 border-[#E8541A]"></div>
      </div>
    }>
      <LoginFormContent />
    </Suspense>
  );
}