import type { ReactNode } from 'react';
import { Suspense } from 'react';
import { requireCollegeAdmin } from '@/lib/auth/require-college-admin';
import { listActivityEventsWithActors } from '@/lib/activity/queries';
import { ACTIVITY_EVENT_CATEGORIES } from '@/lib/activity/event-types';
import { guardModulePage } from '@/lib/modules/guard-module-page';
import { ActivityFeedPage } from '@/components/admin/activity-feed-page';

export default async function ActivityPage({
  params,
  searchParams,
}: {
  params: Promise<{ collegeSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<ReactNode> {
  const [{ collegeSlug }, sp] = await Promise.all([params, searchParams]);
  const { tenant } = await requireCollegeAdmin(collegeSlug);

  if (!tenant) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Activity</h1>
        <p className="text-muted-foreground">Tenant not found.</p>
      </div>
    );
  }

  const [guard, events] = await Promise.all([
    guardModulePage(tenant.id, 'activity'),
    listActivityEventsWithActors({
      tenantId: tenant.id,
      userId: typeof sp.userId === 'string' ? sp.userId : undefined,
      eventName: typeof sp.eventName === 'string' ? sp.eventName : undefined,
      eventCategory: typeof sp.eventCategory === 'string' ? sp.eventCategory : undefined,
      from: typeof sp.from === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(sp.from) ? `${sp.from}T00:00:00.000Z` : undefined,
      to: typeof sp.to === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(sp.to) ? `${sp.to}T23:59:59.999Z` : undefined,
      limit: 200,
    }),
  ]);
  if (guard.locked) return guard.node;

  return (
    <div className="space-y-6">
      <Suspense fallback={<div className="h-48 animate-pulse bg-muted/20 rounded-xl" />}>
        <ActivityFeedPage
          initialEvents={events}
          tenantName={tenant.name}
          eventCategories={ACTIVITY_EVENT_CATEGORIES.slice()}
        />
      </Suspense>
    </div>
  );
}
