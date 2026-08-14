import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { CourseForStudent } from '@/types/student-runtime';
import { useHeaderTitle } from '@/contexts/header-title';
import { getLessonRuntimeAction } from '@/app/c/[collegeSlug]/student/(authenticated)/learn/runtime-actions';
import { resolveLessonVideoSource } from '@/lib/lessons/lesson-video-source';
import { buildCourseItemMap, type CourseItemMap } from '@/lib/utils/course-item-map';

import type { PlaybackTokenResult } from '@/types/student-runtime';

// --- Context types ---

export interface PlaybackContextType {
  course: CourseForStudent;
  collegeSlug: string;
  studentId: string;
  learnVariantId: string | null;
  parentCourseTitle: string | null;
  courseItemMap: CourseItemMap;
  prefetchedTokens: React.MutableRefObject<Map<string, PlaybackTokenResult>>;
  prefetchedResumes: React.MutableRefObject<Map<string, number>>;
  prefetchLesson: (lessonId: string) => Promise<void>;
  hasLoadedAnyVideoRef: React.MutableRefObject<boolean>;
}

export interface PlaylistContextType {
  playlistOpen: boolean;
  setPlaylistOpen: (open: boolean) => void;
  playlistSearch: string;
  setPlaylistSearch: (search: string) => void;
  activeItemId: string | null;
  setActiveItemId: React.Dispatch<React.SetStateAction<string | null>>;
  navigateToLesson: (lessonId: string, href: string) => void;
}

export interface CompletedItemsContextType {
  completedItems: Set<string>;
  setCompletedItems: React.Dispatch<React.SetStateAction<Set<string>>>;
}

// Combined type for backward compatibility
export interface CoursePlayerContextType extends PlaybackContextType, PlaylistContextType, CompletedItemsContextType {}

// --- Contexts ---

export const PlaybackContext = createContext<PlaybackContextType | null>(null);
export const PlaylistContext = createContext<PlaylistContextType | null>(null);
export const CompletedItemsContext = createContext<CompletedItemsContextType | null>(null);

// Module-level cache to persist client-side completions across layout remounts or canonical redirects
const clientCompletionsCache = new Map<string, Set<string>>();

export function CoursePlayerProvider({
  children,
  course,
  collegeSlug,
  studentId,
  learnVariantId = null,
  parentCourseTitle = null,
}: {
  children: React.ReactNode;
  course: CourseForStudent;
  collegeSlug: string;
  studentId: string;
  learnVariantId?: string | null;
  parentCourseTitle?: string | null;
}) {
  // Playlist state
  const [playlistOpen, setPlaylistOpen] = useState(false);
  const [playlistSearch, setPlaylistSearch] = useState('');
  const [activeItemId, setActiveItemId] = useState<string | null>(null);

  // Completed items state — lazy initializer runs once; subsequent updates via render-time sync below
  const [completedItems, setCompletedItems] = useState<Set<string>>(() => {
    const completed = new Set<string>();
    course.modules.forEach((mod) => {
      mod.items.forEach((item) => {
        if (item.progress?.completed) {
          completed.add(item.id);
        }
      });
    });
    const cached = clientCompletionsCache.get(course.id);
    if (cached) {
      cached.forEach((id) => completed.add(id));
    }
    return completed;
  });
  const [prevCourse, setPrevCourse] = useState(course);

  // Adjust completed items when the course prop updates (router.refresh / page transition).
  // Doing this during render avoids cascading setState-in-effect renders.
  if (course !== prevCourse) {
    setPrevCourse(course);
    if (course.id !== prevCourse.id) {
      const nextCompleted = new Set<string>();
      course.modules.forEach((mod) => {
        mod.items.forEach((item) => {
          if (item.progress?.completed) nextCompleted.add(item.id);
        });
      });
      const cached = clientCompletionsCache.get(course.id);
      if (cached) {
        cached.forEach((id) => nextCompleted.add(id));
      }
      setCompletedItems(nextCompleted);
    } else {
      // Keep all client-side completions (once done, it cannot be undone!)
      const merged = new Set(completedItems);
      course.modules.forEach((mod) => {
        mod.items.forEach((item) => {
          if (item.progress?.completed) merged.add(item.id);
        });
      });
      setCompletedItems(merged);
    }
  }

  // Sync client-side completions cache whenever completedItems state changes
  useEffect(() => {
    if (!course.id) return;
    let cached = clientCompletionsCache.get(course.id);
    if (!cached) {
      cached = new Set<string>();
      clientCompletionsCache.set(course.id, cached);
    }
    completedItems.forEach((id) => cached!.add(id));
  }, [completedItems, course.id]);

  // Prefetch state
  const prefetchedTokens = useRef<Map<string, PlaybackTokenResult>>(new Map());
  const prefetchedResumes = useRef<Map<string, number>>(new Map());
  const hasLoadedAnyVideoRef = useRef<boolean>(false);

  const courseItemMap = useMemo(() => buildCourseItemMap(course), [course]);

  const prefetchLesson = useCallback(async (lessonId: string) => {
    if (!lessonId) return;
    if (prefetchedTokens.current.has(lessonId)) return;

    const item = courseItemMap.itemMap.get(lessonId);

    if (!item || item.item_type !== 'video') return;
    const source = resolveLessonVideoSource(item);
    if (source.kind !== 'tpstreams') return;

    try {
      const result = await getLessonRuntimeAction(
        collegeSlug,
        source.videoAssetId,
        course.id,
        lessonId,
        learnVariantId,
      );

      if (result.ok) {
        if (result.playback) {
          prefetchedTokens.current.set(lessonId, result.playback);
        }
        if (result.resume !== undefined) {
          prefetchedResumes.current.set(lessonId, result.resume);
        }
      }
    } catch (err) {
      console.warn('[CoursePlayerProvider] Error prefetching lesson:', err);
    }
  }, [courseItemMap, collegeSlug, course.id, learnVariantId]);

const navigateToLesson = useCallback((lessonId: string, href: string) => {
    setActiveItemId(lessonId);
    if (typeof window !== 'undefined' && window.location.pathname !== href) {
      window.history.pushState({ courseId: course.id }, '', href);
    }
  }, [course.id]);

  // Clean up prefetch cache on unmount to prevent token leakage
  useEffect(() => {
    const tokens = prefetchedTokens.current;
    const resumes = prefetchedResumes.current;
    return () => {
      tokens.clear();
      resumes.clear();
      hasLoadedAnyVideoRef.current = false;
    };
  }, []);

  // Listen to popstate to make browser back/forward buttons work with client-side history navigation
  useEffect(() => {
    const handlePopState = () => {
      const pathname = window.location.pathname;
      const parts = pathname.split('/');
      const lessonsIdx = parts.indexOf('lessons');
      const itemSlugOrId = lessonsIdx !== -1 ? parts[lessonsIdx + 1] : parts[parts.length - 1];
      if (itemSlugOrId) {
        const matchedItem = course.modules
          .flatMap((m) => m.items)
          .find((item) => item.id === itemSlugOrId || item.slug === itemSlugOrId);
        if (matchedItem) {
          setActiveItemId(matchedItem.id);
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [course, setActiveItemId]);

  const { setTitle } = useHeaderTitle();

  useEffect(() => {
    setTitle(course.title);
    return () => {
      setTitle(null);
    };
  }, [course.title, setTitle]);

  // Memoize each context value separately to minimize re-renders
  const playbackValue = useMemo(
    () => ({
      course,
      collegeSlug,
      studentId,
      learnVariantId,
      parentCourseTitle,
      courseItemMap,
      prefetchedTokens,
      prefetchedResumes,
      prefetchLesson,
      hasLoadedAnyVideoRef,
    }),
    [course, collegeSlug, studentId, learnVariantId, parentCourseTitle, courseItemMap, prefetchLesson]
  );

  const playlistValue = useMemo(
    () => ({
      playlistOpen,
      setPlaylistOpen,
      playlistSearch,
      setPlaylistSearch,
      activeItemId,
      setActiveItemId,
      navigateToLesson,
    }),
    [playlistOpen, playlistSearch, activeItemId, navigateToLesson]
  );

  const completedItemsValue = useMemo(
    () => ({
      completedItems,
      setCompletedItems,
    }),
    [completedItems]
  );

  return (
    <PlaybackContext.Provider value={playbackValue}>
      <PlaylistContext.Provider value={playlistValue}>
        <CompletedItemsContext.Provider value={completedItemsValue}>
          {children}
        </CompletedItemsContext.Provider>
      </PlaylistContext.Provider>
    </PlaybackContext.Provider>
  );
}

// Individual hooks for targeted consumption (prevents unnecessary re-renders)
export function usePlaybackContext() {
  const ctx = useContext(PlaybackContext);
  if (!ctx) {
    throw new Error('usePlaybackContext must be used within a CoursePlayerProvider');
  }
  return ctx;
}

export function usePlaylistContext() {
  const ctx = useContext(PlaylistContext);
  if (!ctx) {
    throw new Error('usePlaylistContext must be used within a CoursePlayerProvider');
  }
  return ctx;
}

export function useCompletedItemsContext() {
  const ctx = useContext(CompletedItemsContext);
  if (!ctx) {
    throw new Error('useCompletedItemsContext must be used within a CoursePlayerProvider');
  }
  return ctx;
}

// Combined hook for backward compatibility
export function useCoursePlayer(): CoursePlayerContextType {
  const playback = usePlaybackContext();
  const playlist = usePlaylistContext();
  const completed = useCompletedItemsContext();
  return { ...playback, ...playlist, ...completed };
}
