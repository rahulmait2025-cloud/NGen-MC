'use client';

import { Skeleton } from '@/components/ui/skeleton';

export function PageSkeleton() {
  return (
    <div className="space-y-8 animate-pulse motion-reduce:animate-none">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-8 w-24" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-[300px] rounded-2xl" />
        <Skeleton className="h-[300px] rounded-2xl" />
      </div>
      <Skeleton className="h-[300px] rounded-2xl" />
    </div>
  );
}

export function OverviewSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* 5 KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-2xl bg-card/50 border border-border/40" />
        ))}
      </div>
      {/* Learning Hours & Course Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Skeleton className="h-[300px] rounded-2xl lg:col-span-2 bg-card/50 border border-border/40" />
        <Skeleton className="h-[300px] rounded-2xl bg-card/50 border border-border/40" />
      </div>
      {/* Heatmap & Weekly Pattern */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <Skeleton className="h-[250px] rounded-2xl lg:col-span-3 bg-card/50 border border-border/40" />
        <Skeleton className="h-[250px] rounded-2xl lg:col-span-2 bg-card/50 border border-border/40" />
      </div>
      {/* Recent Activity */}
      <Skeleton className="h-[200px] rounded-2xl bg-card/50 border border-border/40" />
    </div>
  );
}

export function CoursesSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* 4 KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-2xl bg-card/50 border border-border/40" />
        ))}
      </div>
      {/* Course Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[140px] rounded-2xl bg-card/50 border border-border/40" />
        ))}
      </div>
    </div>
  );
}

export function VideosSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* 4 KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-2xl bg-card/50 border border-border/40" />
        ))}
      </div>
      {/* Charts / Table */}
      <Skeleton className="h-[250px] rounded-2xl bg-card/50 border border-border/40" />
      <Skeleton className="h-[350px] rounded-2xl bg-card/50 border border-border/40" />
    </div>
  );
}

export function StreaksSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Large Streak Banner */}
      <Skeleton className="h-[180px] rounded-2xl bg-card/50 border border-border/40" />
      {/* Calendar Grid */}
      <Skeleton className="h-[320px] rounded-2xl bg-card/50 border border-border/40" />
      {/* Weekly Study Trend */}
      <Skeleton className="h-[250px] rounded-2xl bg-card/50 border border-border/40" />
    </div>
  );
}
