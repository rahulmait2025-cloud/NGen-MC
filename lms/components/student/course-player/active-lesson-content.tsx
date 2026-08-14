'use client';

import React from 'react';
import { AlertCircle, CheckCircle, Loader2, PenTool, StickyNote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { TPStreamsPlayer } from './tpstreams-player';
import { YouTubeLessonPlayer } from '@/components/student/course-player/youtube-lesson-player';
import { NonVideoLessonRenderer } from '@/components/student/non-video-lesson-renderer';
import { ResourceItemPlayer } from '@/components/student/resource-item-player';
import { QuizPlayer } from '@/components/student/course-player/quiz/quiz-player';
import type { TpStreamsPlayerRef } from '@/components/student/tpstreams-player';
import type { PlaybackTokenResult, CurriculumItem } from '@/types/student-runtime';
import type { LessonQuizPayload } from '@/types/lesson-quiz';
import type { MasterCourseItemsRow } from '@/types/database';
import type { LessonVideoSource } from '@/lib/lessons/lesson-video-source';

const QUIZ_NOT_CONFIGURED_JSX = (
  <div className="flex flex-col items-center justify-center min-h-[300px] p-8 text-center">
    <p className="text-muted-foreground">This quiz has not been configured yet.</p>
  </div>
);

type ActiveLessonContentProps = {
  activeItem: CurriculumItem;
  activeModuleId: string | null;
  activePlaybackToken: PlaybackTokenResult | null;
  collegeSlug: string;
  courseId: string;
  currentItemId: string;
  currentTime: number;
  isQuiz: boolean;
  learnVariantId: string | null;
  playbackError: string | null;
  playbackErrorKind: 'unavailable' | 'access';
  playerRef: React.MutableRefObject<TpStreamsPlayerRef | null>;
  resolvedQuizId: string | null;
  resumePosition: number;
  seekPlayer: (time: number) => void;
  setCompletedItems: React.Dispatch<React.SetStateAction<Set<string>>>;
  studentId: string;
  videoContainerRef: React.MutableRefObject<HTMLDivElement | null>;
  videoSource: LessonVideoSource;
  youtubeEmbedUrl: string | null;
  handleRefreshPlayback: () => void;
  handleTimeUpdate: (currentTimeSeconds: number, durationSeconds: number) => void;
  handleVideoComplete: () => void;
  /** Pre-fetched quiz payload — avoids client-side fetch waterfall */
  quizPayload?: LessonQuizPayload | null;
};

export function ActiveLessonContent({
  activeItem,
  activeModuleId,
  activePlaybackToken,
  collegeSlug,
  courseId,
  currentItemId,
  currentTime,
  isQuiz,
  learnVariantId,
  playbackError,
  playbackErrorKind,
  playerRef,
  resolvedQuizId,
  resumePosition,
  seekPlayer,
  setCompletedItems,
  studentId,
  videoContainerRef,
  videoSource,
  youtubeEmbedUrl,
  handleRefreshPlayback,
  handleTimeUpdate,
  handleVideoComplete,
  quizPayload,
}: ActiveLessonContentProps) {
  return (
    <div
      ref={videoContainerRef}
      className={cn(
        'relative',
        activeItem.item_type === 'video' ? 'overflow-hidden bg-background' : '',
      )}
    >
      {isQuiz ? (
        resolvedQuizId ? (
          <QuizPlayer
            key={currentItemId}
            courseId={courseId}
            itemId={currentItemId}
            collegeSlug={collegeSlug}
            initialPayload={quizPayload}
            onComplete={() => {
              setCompletedItems((prev) => {
                const next = new Set(prev);
                next.add(currentItemId);
                return next;
              });
            }}
          />
        ) : (
          QUIZ_NOT_CONFIGURED_JSX
        )
      ) : activeItem.item_type === 'video' ? (
        videoSource.kind === 'youtube' ? (
          <YoutubeLessonSurface
            activeItem={activeItem}
            playbackError={playbackError}
            videoSource={videoSource}
            youtubeEmbedUrl={youtubeEmbedUrl}
          />
        ) : (
          <TpStreamsLessonSurface
            activeModuleId={activeModuleId}
            activePlaybackToken={activePlaybackToken}
            collegeSlug={collegeSlug}
            courseId={courseId}
            currentItemId={currentItemId}
            currentTime={currentTime}
            learnVariantId={learnVariantId}
            playbackError={playbackError}
            playbackErrorKind={playbackErrorKind}
            playerRef={playerRef}
            resumePosition={resumePosition}
            seekPlayer={seekPlayer}
            studentId={studentId}
            handleRefreshPlayback={handleRefreshPlayback}
            handleTimeUpdate={handleTimeUpdate}
            handleVideoComplete={handleVideoComplete}
          />
        )
      ) : activeItem.item_type === 'pdf' ||
        activeItem.item_type === 'markdown' ||
        activeItem.item_type === 'external_link' ? (
        <ResourceItemPlayer
          collegeSlug={collegeSlug}
          courseId={courseId}
          itemId={currentItemId}
          itemType={activeItem.item_type}
          title={activeItem.title}
          description={activeItem.description}
          metadata={activeItem.metadata}
          resourceId={(activeItem as unknown as MasterCourseItemsRow).resource_id}
          markdownContent={activeItem.markdownContent}
        />
      ) : (
        <NonVideoLessonRenderer item={activeItem as unknown as MasterCourseItemsRow} />
      )}
    </div>
  );
}

function YoutubeLessonSurface({
  activeItem,
  playbackError,
  videoSource,
  youtubeEmbedUrl,
}: Pick<ActiveLessonContentProps, 'activeItem' | 'playbackError' | 'videoSource' | 'youtubeEmbedUrl'>) {
  if (videoSource.kind !== 'youtube') return null;
  if (youtubeEmbedUrl) {
    return (
      <YouTubeLessonPlayer
        key={youtubeEmbedUrl}
        videoId={videoSource.videoId}
        embedUrl={youtubeEmbedUrl}
        title={activeItem.title}
      />
    );
  }
  if (playbackError) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-none bg-background text-muted-foreground w-full">
        <div className="space-y-6 px-10 text-center">
          <p className="text-sm opacity-80">{playbackError}</p>
        </div>
      </div>
    );
  }
  return (
    <div className="aspect-video flex items-center justify-center bg-background w-full animate-pulse">
      <div className="animate-spin"><Loader2 className="size-12 text-primary/40" /></div>
    </div>
  );
}

type TpStreamsLessonSurfaceProps = Pick<
  ActiveLessonContentProps,
  | 'activeModuleId'
  | 'activePlaybackToken'
  | 'collegeSlug'
  | 'courseId'
  | 'currentItemId'
  | 'currentTime'
  | 'learnVariantId'
  | 'playbackError'
  | 'playbackErrorKind'
  | 'playerRef'
  | 'resumePosition'
  | 'seekPlayer'
  | 'studentId'
  | 'handleRefreshPlayback'
  | 'handleTimeUpdate'
  | 'handleVideoComplete'
>;

function TpStreamsLessonSurface({
  activeModuleId,
  activePlaybackToken,
  collegeSlug,
  courseId,
  currentItemId,
  currentTime,
  learnVariantId,
  playbackError,
  playbackErrorKind,
  playerRef,
  resumePosition,
  seekPlayer,
  studentId,
  handleRefreshPlayback,
  handleTimeUpdate,
  handleVideoComplete,
}: TpStreamsLessonSurfaceProps) {
  return (
    <div className="relative aspect-video w-full bg-background overflow-hidden">
      {!activePlaybackToken && !playbackError ? (
        <div className="absolute inset-0 bg-background z-50" />
      ) : null}
      {playbackError ? (
        <PlaybackErrorState
          playbackError={playbackError}
          playbackErrorKind={playbackErrorKind}
          onRefresh={handleRefreshPlayback}
        />
      ) : activePlaybackToken ? (
        <TPStreamsPlayer
          playerRef={playerRef}
          collegeSlug={collegeSlug}
          studentId={studentId}
          courseId={courseId}
          itemId={currentItemId}
          moduleId={activeModuleId}
          videoAssetId={activePlaybackToken.videoAssetId ?? ''}
          contentProtectionType={activePlaybackToken.contentProtectionType ?? null}
          learnVariantId={learnVariantId}
          embedUrl={activePlaybackToken.embedUrl}
          playbackToken={activePlaybackToken.playbackToken ?? undefined}
          resumePosition={resumePosition}
          onComplete={handleVideoComplete}
          onRefresh={handleRefreshPlayback}
          currentTime={currentTime}
          setCurrentTime={handleTimeUpdate}
          seekPlayer={seekPlayer}
        />
      ) : null}
    </div>
  );
}

function PlaybackErrorState({
  playbackError,
  playbackErrorKind,
  onRefresh,
}: {
  playbackError: string;
  playbackErrorKind: 'unavailable' | 'access';
  onRefresh: () => void;
}) {
  return (
    <div
      className={cn(
        'flex aspect-video items-center justify-center rounded-none w-full h-full absolute inset-0 z-50',
        playbackErrorKind === 'access'
          ? 'bg-destructive/5 text-destructive'
          : 'bg-background text-muted-foreground',
      )}
    >
      <div className="space-y-6 px-10 text-center">
        <div
          className={cn(
            'mx-auto flex size-20 items-center justify-center rounded-full',
            playbackErrorKind === 'access' ? 'bg-destructive/10' : 'bg-muted/30',
          )}
        >
          <AlertCircle
            className={cn(
              'size-10',
              playbackErrorKind === 'access' ? '' : 'text-muted-foreground',
            )}
          />
        </div>
        <div className="space-y-2">
          <h3 className="text-2xl font-semibold text-foreground">
            {playbackErrorKind === 'access' ? 'Playback unavailable' : 'Video not available yet'}
          </h3>
          <p className="mx-auto max-w-md text-sm opacity-80">{playbackError}</p>
        </div>
        {playbackErrorKind === 'access' ? (
          <Button onClick={onRefresh} variant="destructive" className="h-10 rounded-lg px-6 text-sm font-semibold">
            Try Again
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export function LinkedQuizPanel({
  collegeSlug,
  courseId,
  linkedQuizItem,
  setCompletedItems,
  setLinkedQuizItem,
}: {
  collegeSlug: string;
  courseId: string;
  linkedQuizItem: CurriculumItem;
  setCompletedItems: React.Dispatch<React.SetStateAction<Set<string>>>;
  setLinkedQuizItem: React.Dispatch<React.SetStateAction<CurriculumItem | null>>;
}) {
  if (!linkedQuizItem.quiz_id) return null;
  return (
    <div className="px-4 md:px-6">
      <div className="rounded-xl border border-success/30 bg-success/5 p-4 mb-4">
        <p className="text-sm font-medium text-success mb-1">
          Quiz available: {linkedQuizItem.title}
        </p>
        <p className="text-xs text-muted-foreground">
          Take the quiz to test your understanding of this lesson.
        </p>
      </div>
      <QuizPlayer
        courseId={courseId}
        itemId={linkedQuizItem.id}
        collegeSlug={collegeSlug}
        onComplete={() => {
          setCompletedItems((prev) => {
            const next = new Set(prev);
            next.add(linkedQuizItem.id);
            return next;
          });
          setLinkedQuizItem(null);
        }}
      />
    </div>
  );
}

export function LessonMeta({
  activeItem,
  collegeSlug,
  completed,
  courseTitle,
  learnVariantId,
  parentCourseTitle,
  quickActionExcalidraw,
  quickActionNotes,
}: {
  activeItem: CurriculumItem;
  collegeSlug: string;
  completed: boolean;
  courseTitle: string;
  learnVariantId: string | null;
  parentCourseTitle: string | null;
  quickActionExcalidraw: { id: string; excalidraw_url?: string | null } | null;
  quickActionNotes: { slug: string } | null;
}) {
  return (
    <div className="space-y-2 px-4 md:px-6">
      <div className="flex flex-wrap items-center gap-2">
        {completed ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-success">
            <CheckCircle className="size-3.5 shrink-0" aria-hidden />
            Completed
          </span>
        ) : null}
      </div>
      <h1 className="line-clamp-2 text-lg font-bold tracking-tight text-foreground md:text-xl md:leading-snug">
        {activeItem.title}
      </h1>
      {learnVariantId && parentCourseTitle ? (
        <p className="text-xs text-muted-foreground/60">
          {courseTitle} · Based on {parentCourseTitle}
        </p>
      ) : null}
      {(quickActionExcalidraw || quickActionNotes) && (
        <div className="flex items-center gap-2 pt-1">
          {quickActionNotes && (
            <a
              href={`/c/${collegeSlug}/student/notes/${quickActionNotes.slug}`}
              className="inline-flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/5 px-2.5 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
            >
              <StickyNote className="size-3" aria-hidden />
              Notes
            </a>
          )}
          {quickActionExcalidraw?.excalidraw_url && (
            <a
              href={`/c/${collegeSlug}/student/excalidraw/${quickActionExcalidraw.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border border-blue-500/30 bg-blue-500/5 px-2.5 py-1.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/10"
            >
              <PenTool className="size-3" aria-hidden />
              Whiteboard
            </a>
          )}
        </div>
      )}
    </div>
  );
}
