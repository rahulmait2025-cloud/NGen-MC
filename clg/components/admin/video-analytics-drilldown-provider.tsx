'use client';

import { createContext, useCallback, use, useMemo, useState } from 'react';
import type { CollegeVideoAnalyticsFilters } from '@/lib/services/college-video-analytics';
import { VideoAnalyticsStudentDetailSheet } from '@/components/admin/video-analytics-student-detail-sheet';

interface VideoAnalyticsDrilldownContextValue {
  openStudentDetail: (studentId: string) => void;
}

const VideoAnalyticsDrilldownContext = createContext<VideoAnalyticsDrilldownContextValue | null>(
  null,
);

export function useVideoAnalyticsDrilldown(): VideoAnalyticsDrilldownContextValue {
  const ctx = use(VideoAnalyticsDrilldownContext);
  if (!ctx) {
    throw new Error('useVideoAnalyticsDrilldown must be used within VideoAnalyticsDrilldownProvider');
  }
  return ctx;
}

export function VideoAnalyticsDrilldownProvider({
  collegeId,
  appliedFilters,
  children,
}: {
  collegeId: string;
  appliedFilters: CollegeVideoAnalyticsFilters;
  children: React.ReactNode;
}) {
  const [studentId, setStudentId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const openStudentDetail = useCallback((id: string) => {
    setStudentId(id);
    setOpen(true);
  }, []);

  const value = useMemo(() => ({ openStudentDetail }), [openStudentDetail]);

  return (
    <VideoAnalyticsDrilldownContext.Provider value={value}>
      {children}
      <VideoAnalyticsStudentDetailSheet
        collegeId={collegeId}
        studentId={studentId}
        appliedFilters={appliedFilters}
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) {
            setStudentId(null);
          }
        }}
      />
    </VideoAnalyticsDrilldownContext.Provider>
  );
}
