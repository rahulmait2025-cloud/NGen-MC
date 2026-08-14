import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { studentPortalMetadata } from '@/lib/metadata/student-portal';
import { resolveStudentPortalBranding } from '@/lib/tenant/get-tenant-branding-server';
import { RootClientLayout } from './root-client-layout';

export const metadata: Metadata = studentPortalMetadata;

/**
 * Shared layout for all /c/[collegeSlug]/student/* routes.
 *
 * resolveStudentPortalBranding() uses DB internally — wrapped in Suspense
 * so Next.js allows the call. Shell renders immediately, content streams.
 */
export default function StudentLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ collegeSlug: string }>;
}) {
  return (
    <Suspense fallback={<ShellFallback />}>
      <StudentLayoutInner params={params}>
        {children}
      </StudentLayoutInner>
    </Suspense>
  );
}

async function StudentLayoutInner({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ collegeSlug: string }>;
}) {
  const { collegeSlug } = await params;
  const { branding, exists } = await resolveStudentPortalBranding(collegeSlug);

  if (!exists) {
    notFound();
  }

  return (
    <RootClientLayout collegeSlug={collegeSlug} initialBranding={branding}>
      {children}
    </RootClientLayout>
  );
}

function ShellFallback() {
  return (
    <div className="min-h-screen bg-background" />
  );
}