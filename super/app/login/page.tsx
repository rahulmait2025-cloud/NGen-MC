import { Suspense, type ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/tenant/get-tenant';
import { LoginPageClient } from './login-page-client';

interface LoginPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

async function LoginCheck({ searchParams }: { searchParams: LoginPageProps['searchParams'] }) {
  const params = await searchParams;

  // If we arrived here due to an auth error (e.g. ?error=session),
  // do NOT auto-redirect — show the login form to break the loop.
  if (params?.error) {
    return <LoginPageClient />;
  }

  const user = await getCurrentUser();

  if (user?.globalRole === 'superadmin' && user.isActive) {
    redirect('/dashboard');
  }

  return <LoginPageClient />;
}

export default function LoginPage({ searchParams }: LoginPageProps): ReactNode {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-background" />}>
      <LoginCheck searchParams={searchParams} />
    </Suspense>
  );
}