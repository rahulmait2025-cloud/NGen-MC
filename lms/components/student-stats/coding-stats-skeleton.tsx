'use client';

import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, Settings } from 'lucide-react';

export function CodingStatsSkeleton() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto font-sans">
      {/* Static Header Card Shell */}
      <div className="bg-card border border-border/80 rounded-3xl p-6 sm:p-8 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <Skeleton className="w-14 h-14 rounded-full shrink-0" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-44 rounded-lg" />
              <div className="flex items-center gap-2 pt-1">
                <Skeleton className="h-5 w-20 rounded-md" />
                <Skeleton className="h-5 w-20 rounded-md" />
                <Skeleton className="h-5 w-20 rounded-md" />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-9 px-4 rounded-xl bg-primary/20 border border-primary/30 flex items-center gap-2 text-xs font-semibold text-primary/70">
              <div className="animate-spin"><RefreshCw className="w-3.5 h-3.5" /></div>
              <span>Sync Stats</span>
            </div>
            <div className="w-9 h-9 rounded-xl bg-muted/50 border border-border/60 flex items-center justify-center text-muted-foreground/50">
              <Settings className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>

      {/* Static Activity Heatmap Shell with Skeleton Grid */}
      <div className="bg-card border border-border/80 rounded-3xl p-6 sm:p-8 shadow-2xs space-y-6">
        {/* Static Toolbar Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border/60">
          {/* Static Platform Tabs */}
          <div className="p-1 bg-muted/60 border border-border/50 rounded-2xl flex items-center gap-1 overflow-x-auto">
            {['Combined', 'GitHub', 'Codeforces', 'LeetCode', 'GFG'].map((tab, idx) => (
              <div
                key={tab}
                className={`h-8 px-3.5 text-xs font-semibold rounded-xl flex items-center gap-1.5 ${
                  idx === 0
                    ? 'bg-card text-foreground font-bold border border-border/60 shadow-2xs'
                    : 'text-muted-foreground/60'
                }`}
              >
                {tab}
              </div>
            ))}
          </div>

          {/* Static View Mode & Year Selector */}
          <div className="flex items-center gap-2.5">
            <div className="p-1 bg-muted/60 border border-border/50 rounded-2xl flex items-center gap-1">
              <div className="h-7 px-3 text-xs font-bold rounded-lg bg-card text-foreground border border-border/50 shadow-2xs">
                Heatmap
              </div>
              <div className="h-7 px-3 text-xs font-semibold text-muted-foreground/60">
                Calendar
              </div>
            </div>
            <div className="h-9 px-3 rounded-xl bg-muted/50 border border-border/60 flex items-center gap-2 text-xs font-semibold text-foreground">
              <Skeleton className="h-4 w-10 rounded-md" />
            </div>
          </div>
        </div>

        {/* Dynamic Skeleton Content Area */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-48 rounded-md" />
            <Skeleton className="h-4 w-64 rounded-md" />
          </div>

          {/* Heatmap Grid Loading Skeleton */}
          <div className="p-4 rounded-2xl border border-border/40 bg-muted/10 space-y-2">
            <Skeleton className="h-32 w-full rounded-xl" />
          </div>

          {/* Day Inspection Card Skeleton */}
          <div className="p-4 rounded-2xl border border-border/40 bg-muted/10">
            <Skeleton className="h-16 w-full rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
