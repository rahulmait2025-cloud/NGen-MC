import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import { requireAdmin } from '@/lib/auth/require-admin';
import { collegeAdminPortalMetadata } from '@/lib/metadata/college-admin-portal';
import { AdminClientLayout } from './client-layout';

export const metadata: Metadata = collegeAdminPortalMetadata;

export default function CollegeAdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ collegeSlug: string }>;
}) {
  return (
    <Suspense fallback={<div className="text-sm text-muted-foreground">Loading admin panel...</div>}>
      <CollegeAdminLayoutInner params={params}>
        {children}
      </CollegeAdminLayoutInner>
    </Suspense>
  );
}

async function CollegeAdminLayoutInner({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ collegeSlug: string }>;
}) {
  const { collegeSlug } = await params;
  const adminContext = await requireAdmin(collegeSlug);

  return (
    <AdminClientLayout
      collegeSlug={collegeSlug}
      tenantName={adminContext.tenant.name}
      userFullName={adminContext.user.fullName}
      userEmail={adminContext.user.email}
    >
      {children}
    </AdminClientLayout>
  );
}
