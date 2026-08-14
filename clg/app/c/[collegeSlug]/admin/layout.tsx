import React, { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { ClientLayout } from './client-layout';
import { getTenantBranding } from '@/lib/tenant/get-tenant-branding-server';

/**
 * Shared layout for all /c/[collegeSlug]/admin/* routes.
 * 
 * PERFORMANCE: Only fetches tenant branding here - needed for login page styling.
 * Protected data (user, features, modules) is fetched in the dashboard layout
 * AFTER auth is confirmed, avoiding unnecessary DB queries for public pages.
 */
export default function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ collegeSlug: string }>;
}) {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AdminLayoutInner params={params}>
        {children}
      </AdminLayoutInner>
    </Suspense>
  );
}

async function AdminLayoutInner({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ collegeSlug: string }>;
}) {
  const { collegeSlug } = await params;

  const branding = await getTenantBranding(collegeSlug);
  if (!branding) {
    notFound();
  }

  return (
    <ClientLayout
      collegeSlug={collegeSlug}
      initialBranding={branding}
    >
      {children}
    </ClientLayout>
  );
}
