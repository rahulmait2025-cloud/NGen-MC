'use client';

import React from 'react';
import { Play, CheckCircle2, Video, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import type { RecentActivityItem } from './unified-analytics';
import { formatDuration, formatDate } from './unified-analytics';

export function RecentActivityFeed({ items }: { items: RecentActivityItem[] }) {
  const getIcon = (item: RecentActivityItem) => {
    if (item.completed) return { icon: CheckCircle2, color: 'text-success' };
    if (item.completionPercentage > 0) return { icon: Play, color: 'text-primary' };
    return { icon: Video, color: 'text-muted-foreground' };
  };

  if (items.length === 0) {
    return (
      <Empty className="py-8">
        <EmptyHeader>
          <EmptyMedia variant="icon"><Activity className="size-6" /></EmptyMedia>
          <EmptyTitle>No recent activity</EmptyTitle>
          <EmptyDescription>Start watching videos to see your activity here.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="space-y-1">
      {items.map((item) => {
        const { icon: Icon, color } = getIcon(item);
        return (
          <div key={item.lessonId} className="flex items-start gap-3 p-3 rounded-xl hover:bg-muted/30 transition-colors">
            <div className={cn('size-8 rounded-lg flex items-center justify-center shrink-0', color === 'text-success' ? 'bg-success/15' : color === 'text-primary' ? 'bg-primary/15' : 'bg-muted/30')}>
              <Icon className={cn('size-4', color)} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium">
                {item.completed ? 'Completed ' : item.completionPercentage > 0 ? 'Watched ' : 'Started '}
                <span className="text-primary font-semibold">{item.lessonTitle}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {item.courseTitle} · {formatDuration(item.watchSeconds)} watched
              </p>
            </div>
            <span className="text-xs text-muted-foreground shrink-0">{formatDate(item.lastWatchedAt)}</span>
          </div>
        );
      })}
    </div>
  );
}
