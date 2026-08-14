import type { ReactNode } from 'react';
import { ActivitySectionNav } from '@/components/admin/activity-section-nav';
import { buildActivityAdminBasePath } from '@/lib/college-admin/activity/activity-section-links';

export default async function ActivitySectionLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ collegeSlug: string }>;
}): Promise<ReactNode> {
  const { collegeSlug } = await params;
  const adminBasePath = buildActivityAdminBasePath(collegeSlug);

  return (
    <div className="min-w-0 max-w-full space-y-0 overflow-x-hidden">
      <ActivitySectionNav adminBasePath={adminBasePath} />
      {children}
    </div>
  );
}
