'use client';

import type { ComponentProps } from 'react';
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

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

const VideoAnalyticsDashboard = dynamic(
  () =>
    import('./video-analytics-dashboard').then((m) => m.VideoAnalyticsDashboard),
  { ssr: false, loading: () => <VideoAnalyticsSkeleton /> }
);

type DashboardProps = ComponentProps<typeof VideoAnalyticsDashboard>;

export function VideoAnalyticsDashboardLazy(props: DashboardProps) {
  return <VideoAnalyticsDashboard {...props} />;
}
