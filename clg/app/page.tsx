import React, { Suspense } from 'react';
import { getSession } from '@/lib/auth/session';
import { redirectToAdminTenant } from '@/lib/auth/redirects';
import { redirect } from 'next/navigation';

export default function HomePage() {
  return (
    <Suspense fallback={<div>Redirecting...</div>}>
      <HomePageInner />
    </Suspense>
  );
}

async function HomePageInner() {
  const { session } = await getSession();

  if (session?.user) {
    // User is authenticated, redirect to their admin dashboard
    await redirectToAdminTenant('/dashboard');
  }

  // User is not authenticated, redirect to login
  redirect('/login');
  return null;
}
