'use client';

import React, { useState, useRef, useEffect, useMemo, useCallback, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useCoursePlayer } from './context';
import { LessonNavigation } from './lesson-navigation';
import { useKeyboardShortcuts } from './keyboard-shortcuts';
import { LessonEngagementTabs } from '@/components/student/lesson-engagement-tabs';
import { LessonResourcesPanel } from '@/components/student/lesson-resources-panel';
import { ActiveLessonContent, LessonMeta, LinkedQuizPanel } from './active-lesson-content';
import { buildPlayerLessonList, findPlayerLessonIndex } from '@/lib/utils/player-lessons';
import { syncProgressAction } from '@/app/c/[collegeSlug]/student/(authenticated)/learn/progress-actions';
import { getLessonRuntimeAction } from '@/app/c/[collegeSlug]/student/(authenticated)/learn/runtime-actions';
import { getLessonContextAction } from '@/app/c/[collegeSlug]/student/(authenticated)/learn/lesson-context-action';
import {
  resolveLessonVideoSource,
  type LessonItemForVideoSource,
} from '@/lib/lessons/lesson-video-source';
import { isPlaybackTokenFresh } from '@/lib/tpstreams/playback-token-freshness';
import type { PlaybackTokenResult } from '@/types/student-runtime';
import type { CurriculumItem } from '@/types/student-runtime';
import type { CourseResourceSummary, CourseResourceSectionWithItems } from '@/types/database';
import type { TpStreamsPlayerRef } from '@/components/student/tpstreams-player';

// ── Phase 1 request-reduction flags ──────────────────────────────────────────
// Set to true to re-enable adjacent prefetch (for A/B testing or rollback).
const ENABLE_ADJACENT_LESSON_PREFETCH = true;
const ENABLE_ADJACENT_ROUTE_PREFETCH = false;

const isDebug =
  process.env.NODE_ENV !== 'production' ||
  process.env.NEXT_PUBLIC_DEBUG_REQUESTS === 'true';

type PlaybackTokenState = {
  itemId: string;
  token: PlaybackTokenResult;
};

function safeId(id?: string | null) {
  return id ? `${id.slice(0, 8)}...` : null;
}

interface ActiveLessonViewProps {
  activeItem: CurriculumItem;
  lessonResources?: CourseResourceSummary[];
  courseResourceMeta: CourseResourceSummary[];
  courseResourceSections: CourseResourceSectionWithItems[];
  noteCollectionSlugMap?: Record<string, string>;
  /** Pre-fetched quiz payload — avoids client-side fetch waterfall */
  quizPayload?: import('@/types/lesson-quiz').LessonQuizPayload | null;
}

export function ActiveLessonView({
  activeItem: activeItemProp,
  lessonResources = [],
  courseResourceMeta,
  courseResourceSections,
  noteCollectionSlugMap,
  quizPayload,
}: ActiveLessonViewProps) {
  const { 
    course, 
    collegeSlug, 
    studentId, 
    learnVariantId, 
    parentCourseTitle, 
    completedItems, 
    setCompletedItems,
    courseItemMap,
    prefetchedTokens,
    prefetchedResumes,
    activeItemId,
    setActiveItemId,
    navigateToLesson,
  } = useCoursePlayer();
  const router = useRouter();

  // Sync activeItemId when the server-provided activeItemProp changes
  useEffect(() => {
    setActiveItemId(activeItemProp.id);
  }, [activeItemProp.id, setActiveItemId]);

  const currentItemId = activeItemId || activeItemProp.id;

  // #16: Use courseItemMap from context instead of creating a duplicate
  const activeItem = useMemo((): CurriculumItem => {
    return courseItemMap.itemMap.get(currentItemId) ?? activeItemProp;
  }, [courseItemMap, currentItemId, activeItemProp]);

  const playerRef = useRef<TpStreamsPlayerRef | null>(null);
  const videoContainerRef = useRef<HTMLDivElement | null>(null);
  const currentTimeRef = useRef(0);
  const [currentTime, setCurrentTime] = useState(0);
  const lastStateUpdateRef = useRef(0);
  const [markingComplete, setMarkingComplete] = useState(false);

  const [currentResources, setCurrentResources] = useState<CourseResourceSummary[]>(() =>
    courseResourceMeta.length > 0 ? courseResourceMeta : lessonResources,
  );

  const prevItemIdRef = useRef(currentItemId);
  const [playbackToken, setPlaybackToken] = useState<PlaybackTokenState | null>(() => {
    const cached = prefetchedTokens.current.get(currentItemId) ?? null;
    return cached && isPlaybackTokenFresh(cached) ? { itemId: currentItemId, token: cached } : null;
  });
  const [youtubeEmbedUrl, setYoutubeEmbedUrl] = useState<string | null>(null);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [playbackErrorKind, setPlaybackErrorKind] = useState<'unavailable' | 'access'>('unavailable');
  const [resumePosition, setResumePosition] = useState<number>(() => {
    return prefetchedResumes.current.get(currentItemId) ?? 0;
  });
  const [linkedQuizItem, setLinkedQuizItem] = useState<CurriculumItem | null>(null);

  const [hasPrefetchedNextOnProgress, setHasPrefetchedNextOnProgress] = useState(false);
  const lastPlaybackTokenRef = useRef<PlaybackTokenState | null>(null);
  const [, startTransition] = useTransition();

  // Keep the mounted embed across the 300s TTL window (license already acquired).
  // Freshness is enforced when selecting prefetch cache / reminting — not mid-playback.
  // During a lesson switch, React can render the new currentItemId before the
  // effect below clears/replaces playbackToken. Never pair a token with any
  // lesson except the one it was minted for, or analytics session/start will
  // fail token validation.
  const playbackTokenForCurrentItem = playbackToken?.itemId === currentItemId ? playbackToken.token : null;
  if (playbackTokenForCurrentItem) {
    lastPlaybackTokenRef.current = { itemId: currentItemId, token: playbackTokenForCurrentItem };
  }

  const activePlaybackToken =
    playbackTokenForCurrentItem ??
    (lastPlaybackTokenRef.current?.itemId === currentItemId
      ? lastPlaybackTokenRef.current.token
      : null);

  useEffect(() => {
    if (currentItemId === prevItemIdRef.current) {
      return;
    }
    prevItemIdRef.current = currentItemId;
    lastPlaybackTokenRef.current = null;

    const cachedToken = prefetchedTokens.current.get(currentItemId) ?? null;
    const freshCachedToken = isPlaybackTokenFresh(cachedToken) ? cachedToken : null;
    if (cachedToken && !freshCachedToken) {
      prefetchedTokens.current.delete(currentItemId);
    }
    const cachedResume = prefetchedResumes.current.get(currentItemId) ?? 0;
    startTransition(() => {
      setPlaybackToken(freshCachedToken ? { itemId: currentItemId, token: freshCachedToken } : null);
      setResumePosition(cachedResume);
      setYoutubeEmbedUrl(null);
      setPlaybackError(null);
      setLinkedQuizItem(null);
      currentTimeRef.current = 0;
      setCurrentTime(0);
      setCurrentResources([]);
      setHasPrefetchedNextOnProgress(false);
    });
  }, [currentItemId, courseItemMap, prefetchedTokens, prefetchedResumes]);

  const curriculumItem = useMemo((): CurriculumItem | null => {
    return courseItemMap.itemMap.get(currentItemId) ?? null;
  }, [courseItemMap, currentItemId]);

  const lessonForPlayback = useMemo((): LessonItemForVideoSource & Pick<CurriculumItem, 'description'> => ({
    ...activeItem,
    ...(curriculumItem ?? {}),
    video_asset_id: activeItem.video_asset_id ?? curriculumItem?.video_asset_id ?? null,
    video_source: (curriculumItem?.video_source ?? activeItem.video_source) ?? null,
    youtube_video_id: curriculumItem?.youtube_video_id ?? activeItem.youtube_video_id ?? null,
    external_metadata: curriculumItem?.external_metadata ?? activeItem.external_metadata ?? null,
    metadata: curriculumItem?.metadata ?? activeItem.metadata ?? null,
    description: activeItem.description ?? curriculumItem?.description ?? null,
  }), [activeItem, curriculumItem]);

  const videoSource = useMemo(
    () => resolveLessonVideoSource(lessonForPlayback),
    [lessonForPlayback],
  );

  const playerLessons = useMemo(
    () => buildPlayerLessonList(course, collegeSlug, learnVariantId),
    [course, collegeSlug, learnVariantId]
  );

  const videoLessons = useMemo(
    () => playerLessons.filter((lesson) => lesson.type === 'video'),
    [playerLessons],
  );

  const currentIndex = useMemo(
    () => findPlayerLessonIndex(videoLessons, currentItemId),
    [videoLessons, currentItemId]
  );

  const prevLesson = useMemo(
    () => currentIndex > 0 ? videoLessons[currentIndex - 1] : null,
    [currentIndex, videoLessons]
  );

  const nextLesson = useMemo(
    () => currentIndex >= 0 && currentIndex < videoLessons.length - 1 ? videoLessons[currentIndex + 1] : null,
    [currentIndex, videoLessons]
  );

  const secondNextLesson = useMemo(
    () => currentIndex >= 0 && currentIndex < videoLessons.length - 2 ? videoLessons[currentIndex + 2] : null,
    [currentIndex, videoLessons]
  );

  const secondPrevLesson = useMemo(
    () => currentIndex > 1 ? videoLessons[currentIndex - 2] : null,
    [currentIndex, videoLessons]
  );

  const handleTimeUpdate = useCallback((currentTimeSeconds: number, durationSeconds: number) => {
    currentTimeRef.current = currentTimeSeconds;
    const now = performance.now();
    if (now - lastStateUpdateRef.current > 500) {
      lastStateUpdateRef.current = now;
      setCurrentTime(currentTimeSeconds);
    }

    // Predictive prefetch of next video when reaching 80% completion of current video
    if (
      durationSeconds > 0 &&
      currentTimeSeconds / durationSeconds >= 0.8 &&
      !hasPrefetchedNextOnProgress &&
      nextLesson
    ) {
      setHasPrefetchedNextOnProgress(true);
      if (nextLesson.type === 'video' && nextLesson.id) {
        if (!prefetchedTokens.current.has(nextLesson.id)) {
          const item = courseItemMap.itemMap.get(nextLesson.id);
          if (item) {
            const source = resolveLessonVideoSource(item);
            if (source.kind === 'tpstreams') {
              if (isDebug) {
                console.info('[predictive-prefetch] Video is at 80% completion. Prefetching next lesson token:', safeId(nextLesson.id));
              }
              getLessonRuntimeAction(
                collegeSlug,
                source.videoAssetId,
                course.id,
                nextLesson.id,
                learnVariantId,
              ).then((result) => {
                if (result.ok) {
                  if (result.playback) {
                    prefetchedTokens.current.set(nextLesson.id, result.playback);
                  }
                  if (result.resume !== undefined) {
                    prefetchedResumes.current.set(nextLesson.id, result.resume);
                  }
                }
              }).catch((err) => {
                console.warn('[ActiveLessonView] Predictive prefetch failed:', err);
              });
            }
          }
        }
      }
    }
  }, [
    hasPrefetchedNextOnProgress,
    nextLesson,
    prefetchedTokens,
    prefetchedResumes,
    courseItemMap,
    course.id,
    collegeSlug,
    learnVariantId,
  ]);

  // Keyboard shortcuts (after prevLesson/nextLesson are declared)
  useKeyboardShortcuts({
    playerRef,
    prevLesson,
    nextLesson,
    navigateToLesson,
    videoContainerRef,
  });

  // Load playback, notes, bookmarks, and resources details on item change
  useEffect(() => {
    setLinkedQuizItem(null);

    let cancelled = false;

    const loadData = async () => {
      const isVideo = activeItem.item_type === 'video';
      const isQuiz = activeItem.item_type === 'quiz_placeholder';

      // Skip context fetch for quizzes — quiz data is pre-fetched by the shell bundle
      // and the quiz player handles its own data path separately.
      if (isQuiz) return;

      // Compute video source INSIDE the effect to avoid stale closures.
      const source = resolveLessonVideoSource(lessonForPlayback);

      // Clear layout visual state
      setPlaybackError(null);
      setYoutubeEmbedUrl(null);

      // Check prefetched cache first (from hover-prefetch or adjacent prefetch).
      // Short-TTL tokens (300s) must still be fresh — otherwise remint.
      const cachedTokenRaw = prefetchedTokens.current.get(currentItemId);
      const cachedToken = isPlaybackTokenFresh(cachedTokenRaw) ? cachedTokenRaw : undefined;
      if (cachedTokenRaw && !cachedToken) {
        prefetchedTokens.current.delete(currentItemId);
      }
      const cachedResume = prefetchedResumes.current.get(currentItemId);

      // FAST PATH: If video token is already cached and fresh, set it immediately
      // and fetch only engagement + resources via the combined action.
      if (isVideo && source.kind === 'youtube') {
        setYoutubeEmbedUrl(source.embedUrl);
        setPlaybackToken(null);
        setResumePosition(0);
      } else if (isVideo && source.kind === 'none') {
        setPlaybackErrorKind('unavailable');
        setPlaybackError('This lesson video is not available yet.');
        setPlaybackToken(null);
        setResumePosition(0);
      } else if (isVideo && cachedToken && cachedResume !== undefined) {
        // Prefetch cache hit (fresh) — set token instantly, still fetch engagement
        setPlaybackToken({ itemId: currentItemId, token: cachedToken });
        setResumePosition(cachedResume);
      } else if (!isVideo) {
        setPlaybackToken(null);
        setResumePosition(0);
      }
      // else: video with no fresh cache — token will come from combined action below

      // COMBINED ACTION: Single server call for everything.
      // 1 auth check, 1 access check, then token + resume + notes + bookmarks + resources in parallel.
      const videoAssetId =
        isVideo && source.kind === 'tpstreams' && !(cachedToken && cachedResume !== undefined)
          ? source.videoAssetId
          : null;

      getLessonContextAction(
        collegeSlug,
        course.id,
        currentItemId,
        videoAssetId,
        learnVariantId,
      ).then((result) => {
        if (cancelled) return;
        if (result.ok) {
          // Set video token only if we didn't already set it from cache
          if (videoAssetId && result.playback) {
            setPlaybackToken({ itemId: currentItemId, token: result.playback });
            setResumePosition(result.resume);
            // Also cache for future navigation
            prefetchedTokens.current.set(currentItemId, result.playback);
            prefetchedResumes.current.set(currentItemId, result.resume);
          } else if (videoAssetId && !result.playback) {
            // Video asset exists but token generation failed
            setPlaybackErrorKind('access');
            setPlaybackError('We could not start secure playback for this lesson.');
          }
          setCurrentResources(result.resources);
        } else {
          // If combined action fails, set error for video
          if (videoAssetId) {
            setPlaybackErrorKind('access');
            setPlaybackError(result.error || 'Failed to load lesson details.');
          }
          setCurrentResources([]);
        }
      }).catch((err) => {
        if (cancelled) return;
        console.error('[ActiveLessonView] Error loading lesson context:', err);
        if (videoAssetId) {
          setPlaybackErrorKind('access');
          setPlaybackError('Failed to load lesson details. Please try again.');
        }
      });
    };

    loadData();

    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    currentItemId,
    activeItem.item_type,
    collegeSlug,
    course.id,
    learnVariantId,
    prefetchedTokens,
    prefetchedResumes,
  ]);

  // Background prefetch adjacent video details (token + resume position) — 2 lessons each direction
  // Phase 1: Disabled to eliminate hidden request multiplier. Each adjacent prefetch
  // triggered getLessonRuntimeAction (token + resume) per lesson,
  // multiplied by 4 adjacent lessons = 4 extra server calls per lesson navigation.
  useEffect(() => {
    if (!ENABLE_ADJACENT_LESSON_PREFETCH) return;

    const prefetchLesson = async (lesson: { id: string; type?: string } | null) => {
      if (!lesson || lesson.type !== 'video' || !lesson.id) return;
      if (prefetchedTokens.current.has(lesson.id)) return;

      const item = courseItemMap.itemMap.get(lesson.id);

      if (!item) return;
      const source = resolveLessonVideoSource(item);
      if (source.kind !== 'tpstreams') return;

      if (isDebug) {
        console.info('[request-audit]', {
          area: 'course-player',
          action: 'adjacentPrefetch',
          lessonId: safeId(lesson.id),
          source: 'adjacent-lesson-token-resume',
        });
      }

      try {
        const result = await getLessonRuntimeAction(
          collegeSlug,
          source.videoAssetId,
          course.id,
          lesson.id,
          learnVariantId,
        );

        if (result.ok) {
          if (result.playback) {
            prefetchedTokens.current.set(lesson.id, result.playback);
          }
          if (result.resume !== undefined) {
            prefetchedResumes.current.set(lesson.id, result.resume);
          }
        }
      } catch (err) {
        console.warn('[ActiveLessonView] Error prefetching adjacent lesson:', err);
      }
    };

    // Staggered prefetch: immediate neighbors first, then 2nd neighbors after delay
    const timers: ReturnType<typeof setTimeout>[] = [];

    // Prefetch next lesson immediately (0ms) for instant sequential navigation;
    // prev lesson after a short 400ms delay since backward nav is less common.
    if (nextLesson) {
      // Use queueMicrotask to avoid blocking the current render cycle
      queueMicrotask(() => prefetchLesson(nextLesson));
    }
    timers.push(setTimeout(() => {
      if (prevLesson) prefetchLesson(prevLesson);
    }, 400));

    // Prefetch 2nd next/prev after 2s (only after active video is playing)
    timers.push(setTimeout(() => {
      if (secondNextLesson) prefetchLesson(secondNextLesson);
      if (secondPrevLesson) prefetchLesson(secondPrevLesson);
    }, 2000));

    return () => timers.forEach(clearTimeout);
  }, [currentItemId, nextLesson, prevLesson, secondNextLesson, secondPrevLesson, collegeSlug, course.id, courseItemMap, learnVariantId, prefetchedTokens, prefetchedResumes]);

  // Prefetch adjacent routes (Next.js client bundle) — 2 lessons each direction
  // Phase 1: Disabled to eliminate hidden server renders. Each router.prefetch()
  // triggers a full server-side render of the target page (middleware + layout +
  // auth guard + course resolution + data fetch), creating 4-8 DB calls per prefetch.
  useEffect(() => {
    if (!ENABLE_ADJACENT_ROUTE_PREFETCH) return;

    if (prevLesson?.href) {
      router.prefetch(prevLesson.href);
    }
    if (nextLesson?.href) {
      router.prefetch(nextLesson.href);
    }
    if (secondPrevLesson?.href) {
      router.prefetch(secondPrevLesson.href);
    }
    if (secondNextLesson?.href) {
      router.prefetch(secondNextLesson.href);
    }
  }, [prevLesson, nextLesson, secondPrevLesson, secondNextLesson, router]);

  const handleMarkComplete = useCallback(async () => {
    if (markingComplete) return;

    // Optimistically mark as completed in UI
    setCompletedItems((prev) => {
      const next = new Set(prev);
      next.add(currentItemId);
      return next;
    });

    setMarkingComplete(true);
    try {
      const res = await syncProgressAction(
        collegeSlug,
        course.id,
        currentItemId,
        0,
        100,
        100,
        undefined,
        learnVariantId,
      );
      if (!res.success) {
        // Rollback optimistic state
        setCompletedItems((prev) => {
          const next = new Set(prev);
          next.delete(currentItemId);
          return next;
        });
        toast.error('Failed to mark lesson as complete. Please try again.');
      } else {
        toast.success('Lesson marked as completed!');
      }
    } catch (err) {
      console.error('[ActiveLessonView] Error marking complete:', err);
      // Rollback optimistic state
      setCompletedItems((prev) => {
        const next = new Set(prev);
        next.delete(currentItemId);
        return next;
      });
      toast.error('Failed to mark lesson as complete. Connection error.');
    } finally {
      setMarkingComplete(false);
    }
  }, [collegeSlug, course.id, currentItemId, learnVariantId, markingComplete, setCompletedItems]);

  const handleVideoComplete = useCallback(async () => {
    setCompletedItems((prev) => {
      const next = new Set(prev);
      next.add(currentItemId);
      return next;
    });
    // Find any quiz_placeholder linked to this video
    for (const item of courseItemMap.itemMap.values()) {
      if (
        item.item_type === 'quiz_placeholder' &&
        item.quiz_id &&
        (item.metadata?.linked_video_id as string) === currentItemId
      ) {
        setLinkedQuizItem(item);
        return;
      }
    }
  }, [currentItemId, setCompletedItems, courseItemMap]);

  const seekPlayer = useCallback((time: number) => {
    if (playerRef.current) {
      playerRef.current.seekTo(time);
    }
  }, []);

  /** Force a fresh TPStreams access token (300s TTL) — used by Refresh Player / expired embed. */
  const handleRefreshPlayback = useCallback(() => {
    const source = resolveLessonVideoSource(lessonForPlayback);
    if (source.kind !== 'tpstreams') {
      router.refresh();
      return;
    }

    prefetchedTokens.current.delete(currentItemId);
    lastPlaybackTokenRef.current = null;
    setPlaybackToken(null);
    setPlaybackError(null);

    void getLessonRuntimeAction(
      collegeSlug,
      source.videoAssetId,
      course.id,
      currentItemId,
      learnVariantId,
    )
      .then((result) => {
        if (result.ok && result.playback) {
          setPlaybackToken({ itemId: currentItemId, token: result.playback });
          if (result.resume !== undefined) {
            setResumePosition(result.resume);
          }
          prefetchedTokens.current.set(currentItemId, result.playback);
          if (result.resume !== undefined) {
            prefetchedResumes.current.set(currentItemId, result.resume);
          }
        } else {
          setPlaybackErrorKind('access');
          setPlaybackError(result.error || 'We could not start secure playback for this lesson.');
        }
      })
      .catch((err) => {
        console.error('[ActiveLessonView] Refresh playback failed:', err);
        setPlaybackErrorKind('access');
        setPlaybackError('Failed to refresh playback. Please try again.');
      });
  }, [
    lessonForPlayback,
    router,
    currentItemId,
    collegeSlug,
    course.id,
    learnVariantId,
    prefetchedTokens,
    prefetchedResumes,
  ]);

  const handleOpenResource = useCallback(
    (resource: CourseResourceSummary, signedUrl?: string) => {
      if (resource.resource_type === 'pdf' && signedUrl) {
        window.open(signedUrl, '_blank');
      }
    },
    [],
  );

  // Phase 1: Removed router.refresh() from engagement mutation callback.
  // Notes/bookmarks cards handle their own local state updates.
  // The server actions' revalidatePath() is the only remaining server refresh trigger
  // (handled in Phase 2 by removing revalidatePath from engagement-actions.ts).

  const activeModuleId = activeItem.module_id ?? null;

  // Quick action items for the current lesson (excalidraw + notes linked to this item)
  const quickActionExcalidraw = useMemo(() => {
    if (!activeItemId) return null;
    for (const section of courseResourceSections) {
      for (const item of section.items) {
        if (item.kind === 'excalidraw_link' && item.excalidraw_url && section.item_id === activeItemId) {
          return item;
        }
      }
    }
    return null;
  }, [courseResourceSections, activeItemId]);

  const quickActionNotes = useMemo(() => {
    if (!activeItemId) return null;
    for (const section of courseResourceSections) {
      for (const item of section.items) {
        if (item.kind === 'note_collection' && item.note_collection_id && section.item_id === activeItemId) {
          const slug = noteCollectionSlugMap?.[item.note_collection_id];
          if (slug) return { ...item, slug };
        }
      }
    }
    return null;
  }, [courseResourceSections, activeItemId, noteCollectionSlugMap]);

  const isQuiz = useMemo(
    () => activeItem.item_type === 'quiz_placeholder' || curriculumItem?.item_type === 'quiz_placeholder',
    [activeItem.item_type, curriculumItem?.item_type],
  );

  // Resolve quiz_id from the curriculum item (new lesson_quiz system)
  const resolvedQuizId = useMemo(
    () => activeItem.quiz_id ?? curriculumItem?.quiz_id ?? null,
    [activeItem.quiz_id, curriculumItem?.quiz_id],
  );

  return (
    <div className="w-full min-w-0 overflow-x-hidden space-y-5 px-0 pb-6 pt-0 md:px-0 md:pb-6 md:pt-0">
      {/* Player / Content Surface — the hero */}
<ActiveLessonContent
        activeItem={activeItem}
        activeModuleId={activeModuleId}
        activePlaybackToken={activePlaybackToken}
        collegeSlug={collegeSlug}
        courseId={course.id}
        currentItemId={currentItemId}
        currentTime={currentTime}
        isQuiz={isQuiz}
        learnVariantId={learnVariantId}
        playbackError={playbackError}
        playbackErrorKind={playbackErrorKind}
        playerRef={playerRef}
        resolvedQuizId={resolvedQuizId}
        resumePosition={resumePosition}
        seekPlayer={seekPlayer}
        setCompletedItems={setCompletedItems}
        studentId={studentId}
        videoContainerRef={videoContainerRef}
        videoSource={videoSource}
        youtubeEmbedUrl={youtubeEmbedUrl}
        handleRefreshPlayback={handleRefreshPlayback}
        handleTimeUpdate={handleTimeUpdate}
        handleVideoComplete={handleVideoComplete}
        quizPayload={quizPayload}
      />

      {/* Linked Quiz — appears inline after the linked video completes */}
      {linkedQuizItem && linkedQuizItem.quiz_id && activeItem.item_type === 'video' ? (
        <LinkedQuizPanel
          collegeSlug={collegeSlug}
          courseId={course.id}
          linkedQuizItem={linkedQuizItem}
          setCompletedItems={setCompletedItems}
          setLinkedQuizItem={setLinkedQuizItem}
        />
      ) : null}

      {/* Course Resources Panel (for video lessons) */}
      {activeItem.item_type === 'video' && courseResourceMeta.length > 0 ? (
        <LessonResourcesPanel
          collegeSlug={collegeSlug}
          courseId={course.id}
          resources={courseResourceMeta}
          onOpenResource={handleOpenResource}
        />
      ) : null}

      {/* Lesson meta + compact title (below the hero) */}
      {!isQuiz ? (
        <LessonMeta
          activeItem={activeItem}
          collegeSlug={collegeSlug}
          completed={completedItems.has(currentItemId)}
          courseTitle={course.title}
          learnVariantId={learnVariantId}
          parentCourseTitle={parentCourseTitle}
          quickActionExcalidraw={quickActionExcalidraw}
          quickActionNotes={quickActionNotes}
        />
      ) : null}

      {/* Lesson engagement — Tabbed layout showing Overview & Resources */}
      {activeItem.item_type !== 'quiz_placeholder' ? (
        <LessonEngagementTabs
          collegeSlug={collegeSlug}
          courseId={course.id}
          itemId={currentItemId}
          resources={currentResources}
          onOpenResource={handleOpenResource}
          description={lessonForPlayback.description}
          courseResourceSections={courseResourceSections}
          noteCollectionSlugMap={noteCollectionSlugMap}
          activeModuleId={activeModuleId}
          className="px-4 md:px-6"
        />
      ) : null}

      {/* Navigation Controls */}
      <div className="px-4 md:px-6">
        <LessonNavigation
          prevLesson={prevLesson}
          nextLesson={nextLesson}
          currentItemId={currentItemId}
          isCompleted={completedItems.has(currentItemId)}
          markingComplete={markingComplete}
          onMarkComplete={handleMarkComplete}
          hideMarkComplete={isQuiz}
        />
      </div>
    </div>
  );
}
