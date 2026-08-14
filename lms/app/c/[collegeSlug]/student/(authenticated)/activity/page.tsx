import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { requireStudent } from '@/lib/auth/require-student';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlayCircle, Activity as ActivityIcon } from 'lucide-react';
import StudentActivityDeferred from './student-activity-deferred';
import { VideoAnalyticsDashboardLazy } from '../analytics/_components/video-analytics-dashboard-lazy';

function ActivityFeedSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-[84px] rounded-2xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-[260px] rounded-2xl" />
        <Skeleton className="h-[260px] rounded-2xl" />
      </div>
      <Skeleton className="h-[300px] rounded-2xl" />
    </div>
  );
}

function VideoAnalyticsSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-[340px] rounded-2xl" />
        <Skeleton className="h-[340px] rounded-2xl" />
      </div>
      <Skeleton className="h-[400px] rounded-2xl" />
    </div>
  );
}

export default async function StudentActivityRoute({
  params,
  searchParams,
}: {
  params: Promise<{ collegeSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ collegeSlug }, sp] = await Promise.all([
    params,
    searchParams,
  ]);
  const { user, tenant, studentId, isGlobal, membership } = await requireStudent(collegeSlug);
  const eventName = typeof sp.eventName === 'string' ? sp.eventName : null;
  const eventCategory = typeof sp.eventCategory === 'string' ? sp.eventCategory : null;
  let from: string | null = typeof sp.from === 'string' ? sp.from : null;
  let to: string | null = typeof sp.to === 'string' ? sp.to : null;
  if (from && /^\d{4}-\d{2}-\d{2}$/.test(from)) from = `${from}T00:00:00.000Z`;
  if (to && /^\d{4}-\d{2}-\d{2}$/.test(to)) to = `${to}T23:59:59.999Z`;

  return (
    <div className='space-y-6'>
      <Tabs defaultValue="activity-feed" className="w-full space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
          <TabsList className="bg-muted border border-border p-1 rounded-xl shadow-sm">
            <TabsTrigger 
              value="activity-feed" 
              className="rounded-lg py-1.5 px-4 font-bold text-xs flex items-center gap-2 cursor-pointer transition-[background-color,color] duration-150 text-muted-foreground hover:text-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground shadow-none"
            >
              <ActivityIcon className="h-4 w-4" /> Activity Feed
            </TabsTrigger>
            <TabsTrigger 
              value="video-analytics" 
              className="rounded-lg py-1.5 px-4 font-bold text-xs flex items-center gap-2 cursor-pointer transition-[background-color,color] duration-150 text-muted-foreground hover:text-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground shadow-none"
            >
              <PlayCircle className="h-4 w-4" /> Video Engagement
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="activity-feed" className="mt-0 outline-none">
          <Suspense fallback={<ActivityFeedSkeleton />}>
            <StudentActivityDeferred
              tenantId={tenant.id}
              userId={user.id}
              studentId={studentId}
              isGlobal={isGlobal}
              collegeId={membership.collegeId}
              eventName={eventName ?? undefined}
              eventCategory={eventCategory ?? undefined}
              from={from ?? undefined}
              to={to ?? undefined}
            />
          </Suspense>
        </TabsContent>

        <TabsContent value="video-analytics" className="mt-0 outline-none">
          <Suspense fallback={<VideoAnalyticsSkeleton />}>
            <VideoAnalyticsDashboardLazy />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}
