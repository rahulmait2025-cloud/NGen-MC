'use client';

import React, { useMemo, useReducer, useEffect, useCallback, useState, useTransition } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  PlayCircle,
  Youtube,
  ExternalLink,
  Search,
  Video,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { YouTubeThumbnail } from '@/components/student/youtube-thumbnail';
import { markFreeYoutubeVideoDoneAction } from '@/lib/actions/free-youtube-playlists';
import { getPlaylistVideos, type YouTubeVideo } from '@/lib/actions/youtube';
import { shouldClosePlaylistSheetForViewport } from '@/lib/playlist-close-on-narrow';
import { formatYoutubeLessonTitle } from '@/lib/utils/format-youtube-lesson-title';
import { cn } from '@/lib/utils';
import { CoursePlayerPlaylistShell } from '@/components/student/course-player-playlist-shell';

const EMPTY_COMPLETED_IDS: string[] = [];

type YouTubePlaylistPlayerProps = {
  collegeSlug: string;
  playlistId: string;
  initialTitle: string;
  defaultPlaylistOpen?: boolean;
  initialCompletedVideoIds?: string[];
};

function VideoMarkDoneButton({
  video,
  completedVideoIds,
  pendingVideoIds,
  onMarkDone,
}: {
  video: YouTubeVideo;
  completedVideoIds: Set<string>;
  pendingVideoIds: Set<string>;
  onMarkDone: (video: YouTubeVideo) => void;
}) {
  const isCompleted = completedVideoIds.has(video.videoId);
  const isPending = pendingVideoIds.has(video.videoId);

  if (isCompleted) {
    return (
      <Badge variant="outline" className="bg-success/10 text-success border-success/30 gap-1.5">
        <CheckCircle2 className="size-3.5 shrink-0" aria-hidden />
        Completed
      </Badge>
    );
  }

  return (
    <Button
      type="button"
      variant="default"
      size="sm"
      disabled={isPending}
      className="h-9 rounded-md font-semibold"
      onClick={() => onMarkDone(video)}
    >
      {isPending ? (
        <>
          <div className="animate-spin"><Loader2 className="mr-1.5 size-3.5" aria-hidden /></div>
          Saving
        </>
      ) : (
        'Mark as done'
      )}
    </Button>
  );
}

export function YouTubePlaylistPlayer({
  collegeSlug,
  playlistId,
  initialTitle,
  defaultPlaylistOpen = false,
  initialCompletedVideoIds = EMPTY_COMPLETED_IDS,
}: YouTubePlaylistPlayerProps) {
  type PlaylistState = {
    videos: YouTubeVideo[];
    loadingVideos: boolean;
    activeVideoId: string | null;
    playlistOpen: boolean;
    playlistSearch: string;
  };

  const initialPlaylistState: PlaylistState = {
    videos: [],
    loadingVideos: true,
    activeVideoId: null,
    playlistOpen: defaultPlaylistOpen,
    playlistSearch: '',
  };

  const [state, setState] = useReducer(
    (prev: PlaylistState, next: Partial<PlaylistState>) => ({ ...prev, ...next }),
    initialPlaylistState,
  );
  const [completedVideoIds, setCompletedVideoIds] = useState(
    () => new Set(initialCompletedVideoIds),
  );
  const [markDoneError, setMarkDoneError] = useState<string | null>(null);
  const [pendingVideoIds, setPendingVideoIds] = useState<Set<string>>(() => new Set());
  const [, startMarkDoneTransition] = useTransition();

  const backHref = `/c/${encodeURIComponent(collegeSlug)}/student/courses`;

  useEffect(() => {
    let cancelled = false;

    void getPlaylistVideos(playlistId).then((data) => {
      if (cancelled) return;
      setState({
        videos: data,
        activeVideoId: data.length > 0 ? data[0].videoId : null,
        loadingVideos: false,
      });
    });

    return () => {
      cancelled = true;
    };
  }, [playlistId]);

  const pickVideo = useCallback((videoId: string) => {
    setState({ activeVideoId: videoId });
    if (shouldClosePlaylistSheetForViewport()) setState({ playlistOpen: false });
  }, []);

  const markVideoDone = useCallback(
    (video: YouTubeVideo) => {
      if (completedVideoIds.has(video.videoId) || pendingVideoIds.has(video.videoId)) {
        return;
      }

      setMarkDoneError(null);
      setPendingVideoIds((prev) => new Set(prev).add(video.videoId));

      startMarkDoneTransition(async () => {
        const result = await markFreeYoutubeVideoDoneAction({
          collegeSlug,
          playlistId,
          youtubeVideoId: video.videoId,
          videoTitle: video.title,
        });

        setPendingVideoIds((prev) => {
          const next = new Set(prev);
          next.delete(video.videoId);
          return next;
        });

        if (!result.ok) {
          setMarkDoneError(result.error);
          return;
        }

        setCompletedVideoIds((prev) => new Set(prev).add(result.youtubeVideoId));
      });
    },
    [collegeSlug, completedVideoIds, pendingVideoIds, playlistId],
  );

  const filteredVideos = useMemo(() => {
    const norm = state.playlistSearch.trim().toLowerCase();
    if (!norm.length) return state.videos;
    return state.videos.filter((v) => {
      const displayTitle = formatYoutubeLessonTitle(v.title);
      return (
        displayTitle.toLowerCase().includes(norm) ||
        v.title.toLowerCase().includes(norm)
      );
    });
  }, [state.videos, state.playlistSearch]);

  const searchResultCount = filteredVideos.length;

  const activeIndex = useMemo(() => state.videos.findIndex((v) => v.videoId === state.activeVideoId), [state.videos, state.activeVideoId]);

  const prevVideo = activeIndex > 0 ? state.videos[activeIndex - 1] : null;
  const nextVideo =
    activeIndex >= 0 && activeIndex < state.videos.length - 1 ? state.videos[activeIndex + 1] : null;

  const activeMeta = state.videos.find((v) => v.videoId === state.activeVideoId) ?? null;
  const activeDisplayTitle = activeMeta ? formatYoutubeLessonTitle(activeMeta.title) : initialTitle;

  const completedLessonCount = useMemo(
    () => state.videos.filter((video) => completedVideoIds.has(video.videoId)).length,
    [state.videos, completedVideoIds],
  );

  const overallProgressPercent =
    state.videos.length > 0
      ? Math.round((completedLessonCount / state.videos.length) * 100)
      : null;

  const playlistPanelContent = state.loadingVideos ? (
    <div className="space-y-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={`playlist-sk-${i}`}
          className="flex animate-pulse gap-3 rounded-xl border border-border/25 bg-muted/15 p-3"
        >
          <div className="aspect-video w-28 shrink-0 rounded-lg bg-muted/60" />
          <div className="flex flex-1 flex-col justify-center gap-2 py-0.5">
            <div className="h-2.5 w-[85%] rounded bg-muted/60" />
            <div className="h-2 w-1/3 rounded bg-muted/40" />
          </div>
        </div>
      ))}
    </div>
  ) : filteredVideos.length === 0 ? (
    <div className="rounded-2xl border border-dashed border-border/70 bg-muted/20 px-4 py-14 text-center">
      <Search className="mx-auto mb-3 size-8 text-muted-foreground/45" aria-hidden />
      <p className="text-sm font-semibold text-foreground">{state.playlistSearch.trim() ? 'No videos match' : 'No videos'}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        {state.playlistSearch.trim() ? 'Try a different search or clear it.' : 'This playlist appears empty.'}
      </p>
      {state.playlistSearch.trim() ? (
        <Button type="button" variant="outline" size="sm" className="mt-4 rounded-full" onClick={() => setState({ playlistSearch: '' })}>
          Clear search
        </Button>
      ) : null}
    </div>
  ) : (
    <div className="space-y-0.5">
      {filteredVideos.map((video) => {
        const active = state.activeVideoId === video.videoId;
        const completed = completedVideoIds.has(video.videoId);
        return (
          <button
            key={video.id}
            type="button"
            onClick={() => pickVideo(video.videoId)}
            className={cn(
              'group flex w-full items-start gap-2.5 rounded-lg border border-transparent px-2 py-2 text-left transition-colors',
              active
                ? 'border-primary/20 bg-primary/8 text-foreground'
                : completed
                  ? 'text-muted-foreground hover:bg-muted/50'
                  : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
            )}
          >
            <span className="w-12 shrink-0 overflow-hidden rounded-md border border-border/40 bg-muted">
              <span className="relative block aspect-video w-full">
                  <YouTubeThumbnail
                    src={video.thumbnail}
                    alt={formatYoutubeLessonTitle(video.title)}
                    fill
                  className={cn(active ? 'opacity-100' : 'opacity-90')}
                />
                {active ? (
                  <span className="absolute inset-0 flex items-center justify-center bg-foreground/35">
                    <PlayCircle className="size-5 fill-primary-foreground text-primary-foreground" aria-hidden />
                  </span>
                ) : null}
                {completed ? (
                  <span className="absolute right-0.5 top-0.5 flex size-3.5 items-center justify-center rounded-full bg-success text-success-foreground">
                    <CheckCircle2 className="size-2.5" aria-hidden />
                  </span>
                ) : null}
              </span>
            </span>
            <span className="min-w-0 flex-1">
              <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                {video.position + 1}
              </span>
              <span className="mt-0.5 block line-clamp-2 text-[12.5px] leading-snug">
                {formatYoutubeLessonTitle(video.title)}
              </span>
            </span>
            <span className="mt-0.5 shrink-0 text-[10px] tabular-nums text-muted-foreground/70">
              {video.duration}
            </span>
          </button>
        );
      })}
    </div>
  );

  const watchYtUrl = state.activeVideoId ? `https://www.youtube.com/watch?v=${state.activeVideoId}` : null;

  const searchResultSummaryContent = useMemo(
    () =>
      state.playlistSearch.trim() && !state.loadingVideos ? (
        <p className="mt-2 text-[11px] text-muted-foreground">
          Showing {searchResultCount} {searchResultCount === 1 ? 'video' : 'videos'}
        </p>
      ) : null,
    [state.playlistSearch, state.loadingVideos, searchResultCount],
  );

  const mainChildrenContent = useMemo(
    () => (
      <>
        {state.loadingVideos || !state.activeVideoId ? (
          <div className="flex min-h-[50vh] w-full flex-col items-center justify-center px-10" role="status" aria-busy="true" aria-live="polite">
            <div className="relative size-12">
              <div className="animate-spin"><Loader2 className="size-12 text-primary/30" aria-hidden /></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Video className="size-5 text-primary" aria-hidden />
              </div>
            </div>
            <span className="sr-only">Loading playlist</span>
          </div>
        ) : (
          <div className="mx-auto w-full max-w-5xl space-y-5 px-4 pb-8 pt-4 md:px-6 md:pb-6">
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="sm" className="gap-1.5 rounded-md text-muted-foreground hover:text-foreground" asChild>
                <Link href={backHref}>
                  <ArrowLeft className="size-3.5" aria-hidden />
                  Back
                </Link>
              </Button>
              <span className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                Lesson {activeIndex + 1} of {state.videos.length}
              </span>
            </div>

            <div className="overflow-hidden rounded-xl border border-border/50 bg-background shadow-sm">
              <div className="relative aspect-video w-full">
                <iframe
                  key={state.activeVideoId}
                  src={`https://www.youtube.com/embed/${state.activeVideoId}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
                  className="absolute inset-0 h-full w-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                  allowFullScreen
                  title={activeDisplayTitle}
                />
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex-1">
                <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                  <Badge variant="secondary" className="text-[10px] uppercase tracking-widest">
                    video
                  </Badge>
                  <Badge variant="destructive" className="text-[10px] uppercase tracking-widest bg-destructive/10 border-destructive/20">
                    youtube
                  </Badge>
                  {activeMeta && completedVideoIds.has(activeMeta.videoId) ? (
                    <Badge className="text-[10px] uppercase tracking-widest bg-success/10 text-success border-success/20">
                      done
                    </Badge>
                  ) : null}
                </div>
                <h1 className="line-clamp-2 text-base font-semibold tracking-tight text-foreground md:text-lg">
                  {activeDisplayTitle}
                </h1>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  From {initialTitle}
                </p>
              </div>
              {activeMeta ? (
                <div className="shrink-0"><VideoMarkDoneButton video={activeMeta} completedVideoIds={completedVideoIds} pendingVideoIds={pendingVideoIds} onMarkDone={markVideoDone} /></div>
              ) : null}
            </div>

            {markDoneError ? (
              <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {markDoneError}
              </p>
            ) : null}

            <div className="flex flex-wrap items-center gap-2 border-t border-border/50 pt-4">
              {watchYtUrl ? (
                <Button asChild variant="outline" size="sm" className="h-8 gap-1.5 rounded-md text-xs">
                  <a href={watchYtUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="size-3.5" aria-hidden />
                    Open on YouTube
                  </a>
                </Button>
              ) : null}
              <Button asChild variant="outline" size="sm" className="h-8 gap-1.5 rounded-md text-xs">
                <a
                  href={`https://www.youtube.com/playlist?list=${encodeURIComponent(playlistId)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Youtube className="size-3.5 text-destructive" aria-hidden />
                  Full playlist
                </a>
              </Button>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-border/50 pt-4">
              <Button
                variant="ghost"
                size="sm"
                disabled={!prevVideo}
                onClick={() => prevVideo && pickVideo(prevVideo.videoId)}
                className="gap-1.5 rounded-md text-muted-foreground hover:text-foreground"
              >
                <ChevronLeft className="size-4" aria-hidden />
                Previous
              </Button>
              <Button
                size="sm"
                disabled={!nextVideo}
                onClick={() => nextVideo && pickVideo(nextVideo.videoId)}
                className="gap-1.5 rounded-md"
              >
                Next video
                <ChevronRight className="size-4" aria-hidden />
              </Button>
            </div>
          </div>
        )}
      </>
    ),
    [state.loadingVideos, state.activeVideoId, state.videos, activeMeta, completedVideoIds, pendingVideoIds, markDoneError, markVideoDone, pickVideo, prevVideo, nextVideo, activeIndex, activeDisplayTitle, watchYtUrl, playlistId, backHref, initialTitle],
  );

  return (
    <CoursePlayerPlaylistShell
      viewportLockedLayout
      headerCenterTitle={activeDisplayTitle}
      sheetTitle="Course playlist"
      sheetSubtitle={initialTitle}
      totalLessonCount={state.videos.length}
      overallProgressPercent={overallProgressPercent}
      lessonNoun="video"
      playlistOpen={state.playlistOpen}
      onPlaylistOpenChange={(next) => setState({ playlistOpen: next })}
      playlistSearch={state.playlistSearch}
      onPlaylistSearchChange={(next) => setState({ playlistSearch: next })}
      searchPlaceholder="Search videos..."
      searchResultSummary={searchResultSummaryContent}
      playlistScrollChildren={playlistPanelContent}
      mainChildren={mainChildrenContent}
    />
  );
}
