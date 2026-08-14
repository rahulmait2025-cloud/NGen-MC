import type { ReactNode } from 'react';
import { requireCollegeAdmin } from '@/lib/auth/require-college-admin';
import { guardModulePage } from '@/lib/modules/guard-module-page';

import { VideoAnalyticsBody } from '@/components/admin/video-analytics-body';

export default async function ActivityVideoAnalyticsPage({
  params,
  searchParams,
}: {
  params: Promise<{ collegeSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<ReactNode> {
  const [{ collegeSlug }, sp] = await Promise.all([params, searchParams]);
  const [{ tenant }, guard] = await Promise.all([
    requireCollegeAdmin(collegeSlug),
    guardModulePage(collegeSlug, 'analytics'),
  ]);

  if (!tenant) {
    return (
      <div className="mx-auto w-full max-w-7xl space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Video analytics & leaderboard</h1>
        <p className="text-sm text-muted-foreground">Tenant not found.</p>
      </div>
    );
  }

  if (guard.locked) {
    return guard.node;
  }

  return (
    <div className="mx-auto w-full min-w-0 max-w-full xl:max-w-7xl">
      <VideoAnalyticsBody collegeId={tenant.id} collegeSlug={collegeSlug} searchParams={sp} />
    </div>
  );
}
