'use client';

import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageTransition } from '@/components/student/page-transition';
import { usePageTransition } from './use-page-transition';

export function UnifiedAnalyticsShell({
  overviewTab,
  coursesTab,
  videosTab,
  streaksTab,
  headerBadges,
}: {
  overviewTab: React.ReactNode;
  coursesTab: React.ReactNode;
  videosTab: React.ReactNode;
  streaksTab: React.ReactNode;
  headerBadges: React.ReactNode;
}) {
  const { mounted } = usePageTransition();

  if (!mounted) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <TabsList className="rounded-xl p-1 bg-muted/60 h-auto self-start">
            <TabsTrigger value="overview" className="rounded-lg px-4 py-2 text-xs font-semibold">Overview</TabsTrigger>
            <TabsTrigger value="courses" className="rounded-lg px-4 py-2 text-xs font-semibold">Courses</TabsTrigger>
            <TabsTrigger value="videos" className="rounded-lg px-4 py-2 text-xs font-semibold">Videos</TabsTrigger>
            <TabsTrigger value="streaks" className="rounded-lg px-4 py-2 text-xs font-semibold">Streaks</TabsTrigger>
          </TabsList>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsContent value="overview" className="space-y-8 mt-0">
            {overviewTab}
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  return (
    <PageTransition>
      <div id="analytics-content" className="space-y-6">
        <Tabs defaultValue="overview" className="space-y-6">
          {/* Navigation bar with tab triggers on left and status badges aligned on right */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <TabsList className="rounded-xl p-1 bg-muted/60 h-auto border border-border/40 self-start">
              <TabsTrigger
                value="overview"
                className="rounded-lg px-4 py-2 text-xs font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
              >
                Overview
              </TabsTrigger>
              <TabsTrigger
                value="courses"
                className="rounded-lg px-4 py-2 text-xs font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
              >
                Courses
              </TabsTrigger>
              <TabsTrigger
                value="videos"
                className="rounded-lg px-4 py-2 text-xs font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
              >
                Videos
              </TabsTrigger>
              <TabsTrigger
                value="streaks"
                className="rounded-lg px-4 py-2 text-xs font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
              >
                Streaks
              </TabsTrigger>
            </TabsList>

            {headerBadges && (
              <div className="flex items-center gap-2 flex-wrap">
                {headerBadges}
              </div>
            )}
          </div>

          <TabsContent value="overview" className="space-y-8 mt-0 focus-visible:outline-none">
            {overviewTab}
          </TabsContent>

          <TabsContent value="courses" className="space-y-8 mt-0 focus-visible:outline-none">
            {coursesTab}
          </TabsContent>

          <TabsContent value="videos" className="space-y-8 mt-0 focus-visible:outline-none">
            {videosTab}
          </TabsContent>

          <TabsContent value="streaks" className="space-y-8 mt-0 focus-visible:outline-none">
            {streaksTab}
          </TabsContent>
        </Tabs>
      </div>
    </PageTransition>
  );
}
