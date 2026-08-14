'use client';

import React, { useMemo, useCallback } from 'react';
import { CoursePlayerPlaylistShell } from '@/components/student/course-player-playlist-shell';
import { CoursePlayerProvider, useCoursePlayer } from './context';
import { PlaylistSidebar } from './playlist-sidebar';
import { PlaylistSearch } from './playlist-search';
import { buildPlayerLessonList } from '@/lib/utils/player-lessons';
import type { CourseForStudent } from '@/types/student-runtime';

function getDisplayDuration(item: CourseForStudent['modules'][number]['items'][number]): number {
  return item.duration_seconds && item.duration_seconds > 0
    ? item.duration_seconds
    : item.progress?.total_seconds || 0;
}

interface CoursePlayerShellProps {
  course: CourseForStudent;
  collegeSlug: string;
  studentId: string;
  learnVariantId?: string | null;
  parentCourseTitle?: string | null;
  children: React.ReactNode;
}

export function CoursePlayerShell(props: CoursePlayerShellProps) {
  return (
    <CoursePlayerProvider {...props}>
      <CoursePlayerShellInner>{props.children}</CoursePlayerShellInner>
    </CoursePlayerProvider>
  );
}

function CoursePlayerShellInner({ children }: { children: React.ReactNode }) {
  const {
    course,
    collegeSlug,
    learnVariantId,
    parentCourseTitle,
    completedItems,
    playlistOpen,
    setPlaylistOpen,
    playlistSearch,
    setPlaylistSearch,
  } = useCoursePlayer();
  const playerLessons = useMemo(
    () => buildPlayerLessonList(course, collegeSlug, learnVariantId),
    [course, collegeSlug, learnVariantId]
  );

  const calculateOverallProgress = useMemo(() => {
    if (playerLessons.length === 0) return 0;
    return Math.round((completedItems.size / playerLessons.length) * 100);
  }, [playerLessons.length, completedItems]);

  const visibleModules = useMemo(
    () => course.modules.filter((m) => m.visible_to_students !== false),
    [course.modules]
  );

  const totalLessonCount = playerLessons.length;

  const totalDuration = useMemo(() => {
    return course.modules.reduce((acc, mod) => {
      return acc + mod.items.reduce((itemAcc, item) => {
        return itemAcc + getDisplayDuration(item);
      }, 0);
    }, 0);
  }, [course.modules]);

  const formatTotalDuration = useCallback((seconds: number): string => {
    const mins = Math.max(1, Math.round(seconds / 60));
    if (mins < 60) return `${mins}min`;
    const hrs = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return remainingMins > 0 ? `${hrs}hr ${remainingMins}min` : `${hrs}hr`;
  }, []);

  const searchResultCount = useMemo(() => {
    const norm = playlistSearch.trim().toLowerCase();
    if (!norm.length) return playerLessons.length;
    let count = 0;
    for (const mod of visibleModules) {
      const moduleMatches = mod.title.toLowerCase().includes(norm);
      const items = moduleMatches
        ? playerLessons.filter((l) => l.moduleId === mod.id)
        : playerLessons.filter((l) => l.moduleId === mod.id && l.title.toLowerCase().includes(norm));
      count += items.length;
    }
    return count;
  }, [visibleModules, playlistSearch, playerLessons]);

  const searchResultSummary = (
    <PlaylistSearch searchResultCount={searchResultCount} />
  );

  return (
    <CoursePlayerPlaylistShell
      headerCenterTitle={course.title}
      sheetTitle={
        learnVariantId && parentCourseTitle
          ? `${course.title}`
          : course.title
      }
      sheetSubtitle={
        learnVariantId && parentCourseTitle
          ? `Based on ${parentCourseTitle}`
          : `${completedItems.size}/${totalLessonCount} | ${formatTotalDuration(totalDuration)}`
      }
      totalLessonCount={totalLessonCount}
      overallProgressPercent={calculateOverallProgress}
      playlistOpen={playlistOpen}
      onPlaylistOpenChange={setPlaylistOpen}
      playlistSearch={playlistSearch}
      onPlaylistSearchChange={setPlaylistSearch}
      searchPlaceholder="Search lessons or modules..."
      searchResultSummary={searchResultSummary}
      playlistScrollChildren={<PlaylistSidebar />}
      brandSlot={null}
      breadcrumb={null}
      topBarRight={null}
      viewportLockedLayout={true}
      mainChildren={children}
    />
  );
}
