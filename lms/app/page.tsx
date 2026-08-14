import React, { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getVerifiedIdentity } from '@/lib/student-runtime/identity';
import { redirectToStudentTenant } from '@/lib/auth/redirects';

/**
 * Root page — acts as the entry point for the LMS.
 *
 * Authenticated users are redirected to their student tenant.
 * Unauthenticated users are sent to login.
 *
 * This replaces the legacy (dashboard)/layout.tsx redirect shell
 * with an explicit root page so `/` resolves cleanly.
 */
export default function RootPage() {
  return (
    <Suspense fallback={<div>Redirecting...</div>}>
      <RootPageInner />
    </Suspense>
  );
}

async function RootPageInner() {
  const identity = await getVerifiedIdentity();

  if (!identity?.userId) {
    redirect('/c/direct-learners/student');
  }

  // Authenticated — route to the correct student tenant.
  // redirectToStudentTenant checks membership and provisions B2C direct-learner
  // tenants when no existing membership is found.
  await redirectToStudentTenant();
  return null;
}
