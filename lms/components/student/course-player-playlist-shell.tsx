'use client';

import * as React from 'react';
import { LazyMotion, domAnimation } from 'framer-motion';
import { ReactLenis } from 'lenis/react';
import { Search, X, ListVideo } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { useMinWidthLg } from '@/hooks/use-min-width-lg';

export type CoursePlayerPlaylistShellProps = {
  /** Center text in bar (lesson / video title) — used when richer top bar props are not provided. */
  headerCenterTitle: React.ReactNode;
  sheetTitle: string;
  sheetSubtitle: string;
  totalLessonCount: number;
  /** When null, hides the overall progress card (e.g. free YouTube playlists) */
  overallProgressPercent: number | null;
  searchPlaceholder?: string;
  /** Wording next to playlist count - default `lesson` for LMS - `video` for YouTube playlists */
  lessonNoun?: 'lesson' | 'video';
  playlistOpen: boolean;
  onPlaylistOpenChange: (open: boolean) => void;
  playlistSearch: string;
  onPlaylistSearchChange: (query: string) => void;
  /** Result count helper line under search; omit when searching if you pass zero and empty state handles it */
  searchResultSummary?: React.ReactNode;
  playlistScrollChildren: React.ReactNode;
  mainChildren: React.ReactNode;
  /** When true, locks player + playlist to viewport height with independent sidebar scroll (free YouTube). */
  viewportLockedLayout?: boolean;
  /** Optional rich top bar (LMS Cinema Mode). When provided, replaces the simple `headerCenterTitle` bar. */
  brandSlot?: React.ReactNode;
  breadcrumb?: React.ReactNode;
  topBarRight?: React.ReactNode;
  /** Optional sticky card rendered at the top of the sidebar dock (e.g. Up Next). */
  upNextCard?: React.ReactNode;
  /** Dock width override — defaults to 320px. Use a smaller value for compact layouts. */
  dockWidthClass?: string;
  /** Optional progress bar below the header. */
  progressBlock?: React.ReactNode;
};

type PlaylistChromeProps = {
  sheetTitle: string;
  sheetSubtitle: string;
  totalLessonCount: number;
  lessonNoun: 'lesson' | 'video';
  searchPlaceholder: string;
  playlistSearch: string;
  onPlaylistSearchChange: (query: string) => void;
  searchResultSummary?: React.ReactNode;
  playlistScrollChildren: React.ReactNode;
  /** Sheet uses Radix header; dock uses a compact bar with collapse control */
  layout: 'sheet' | 'dock';
  onRequestCollapse?: () => void;
  /** Sticky element rendered above the search block (e.g. Up Next card). */
  stickyTop?: React.ReactNode;
};

const playlistPanelClass =
  'bg-sidebar text-foreground border-border/[0.08] dark:bg-sidebar dark:text-foreground dark:border-border/[0.08]';

const courseContentHeadingClass =
  'text-[1.45rem] font-semibold tracking-[-0.02em] leading-tight text-foreground dark:text-foreground/95';

const lenisScrollOptions = {
  lerp: 0.1,
  duration: 1.15,
  allowNestedScroll: true,
} as const;

function CoursePlayerScrollPane({
  children,
  className,
}: {
  children: React.ReactNode;
  className: string;
}) {
  return (
    <ReactLenis root="asChild" options={lenisScrollOptions} className={className}>
      {children}
    </ReactLenis>
  );
}

function PlaylistChrome({
  sheetTitle: _sheetTitle,
  sheetSubtitle,
  totalLessonCount: _totalLessonCount,
  lessonNoun: _lessonNoun,
  searchPlaceholder,
  playlistSearch,
  onPlaylistSearchChange,
  searchResultSummary,
  playlistScrollChildren,
  layout,
  onRequestCollapse: _onRequestCollapse,
  stickyTop,
}: PlaylistChromeProps) {
  const headerInner = layout === 'sheet' ? (
    <>
      <SheetTitle className={cn('text-left', courseContentHeadingClass)}>
        Course content
      </SheetTitle>
      <SheetDescription className="line-clamp-1 text-[14px] text-muted-foreground dark:text-foreground/52">
        {sheetSubtitle}
      </SheetDescription>
    </>
  ) : (
    <div className="flex items-baseline justify-between gap-2">
      <h2 className={cn('truncate', courseContentHeadingClass)}>
        Course content
      </h2>
    </div>
  );

  const searchBlock = (
    <div className="shrink-0 px-4 pb-3 pt-1">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground dark:text-foreground/38"
          aria-hidden
        />
        <Input
          value={playlistSearch}
          onChange={(e) => onPlaylistSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          autoComplete="off"
          aria-label="Search in playlist"
          className="h-9 rounded-lg border border-border/[0.10] bg-card pl-9 pr-8 text-[14px] text-foreground shadow-none placeholder:text-muted-foreground transition-colors focus-visible:border-border/[0.18] focus-visible:bg-card focus-visible:ring-0 dark:border-border/[0.08] dark:bg-secondary dark:text-foreground/80 dark:placeholder:text-foreground/38 dark:focus-visible:border-border/[0.18] dark:focus-visible:bg-secondary"
        />
        {playlistSearch.trim() ? (
          <button
            type="button"
            onClick={() => onPlaylistSearchChange('')}
            className="absolute right-1.5 top-1/2 flex size-5 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground dark:text-foreground/35 dark:hover:text-foreground/70"
            aria-label="Clear search"
          >
            <X className="size-3" aria-hidden />
          </button>
        ) : null}
      </div>
      {playlistSearch.trim() ? searchResultSummary : null}
    </div>
  );

  const chromeHeaderClass = cn(
    'relative z-10 shrink-0 border-b px-4 text-left',
    playlistPanelClass,
  );

  if (layout === 'sheet') {
    return (
      <>
        {stickyTop}
        <SheetHeader className={cn(chromeHeaderClass, 'pb-3 pt-4')}>
          {headerInner}
        </SheetHeader>
        {searchBlock}
        <CoursePlayerScrollPane className="custom-scrollbar relative z-10 min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain pb-2">
          {playlistScrollChildren}
        </CoursePlayerScrollPane>
      </>
    );
  }

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden">
      {stickyTop ? (
        <div className={cn(chromeHeaderClass, 'pb-2 pt-3')}>
          {stickyTop}
        </div>
      ) : null}
      <div className={cn(chromeHeaderClass, 'pb-3 pt-4')}>
        {headerInner}
      </div>
      {searchBlock}
      <CoursePlayerScrollPane className="custom-scrollbar relative z-10 min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain pb-2">
        {playlistScrollChildren}
      </CoursePlayerScrollPane>
    </div>
  );
}

/**
 * Shared course watch chrome: searchable playlist (drawer on small screens, YouTube-style dock on `lg+`).
 * Used by pillar `LearnCourseClient` and free YouTube playlist watch routes.
 */
export function CoursePlayerPlaylistShell({
  headerCenterTitle,
  sheetTitle,
  sheetSubtitle,
  totalLessonCount,
  overallProgressPercent: _overallProgressPercent,
  searchPlaceholder = 'Search lessons or modules...',
  lessonNoun = 'lesson',
  playlistOpen,
  onPlaylistOpenChange,
  playlistSearch,
  onPlaylistSearchChange,
  searchResultSummary,
  playlistScrollChildren,
  mainChildren,
  viewportLockedLayout = false,
  brandSlot,
  breadcrumb,
  topBarRight,
  upNextCard,
  dockWidthClass = 'w-[min(20rem,30vw)]',
  progressBlock,
}: CoursePlayerPlaylistShellProps) {
  const isLg = useMinWidthLg();
  const [hasMounted, setHasMounted] = React.useState(false);
  const prevIsLgRef = React.useRef<boolean | null>(null);
  const hasRichDesktopHeader = !!(
    brandSlot ||
    breadcrumb ||
    topBarRight ||
    progressBlock
  );

  const collapsePlaylist = React.useCallback(() => {
    onPlaylistOpenChange(false);
    onPlaylistSearchChange('');
  }, [onPlaylistOpenChange, onPlaylistSearchChange]);

  const collapsePlaylistRef = React.useRef(collapsePlaylist);
  const onPlaylistOpenChangeRef = React.useRef(onPlaylistOpenChange);

  React.useEffect(() => {
    collapsePlaylistRef.current = collapsePlaylist;
    onPlaylistOpenChangeRef.current = onPlaylistOpenChange;
  }, [collapsePlaylist, onPlaylistOpenChange]);

  React.useEffect(() => {
    setHasMounted(true);
  }, []);

  // Only auto-close when shrinking from desktop → narrow (half-screen).
  // Do not force-close when the user opens the playlist sheet manually on a narrow viewport.
  React.useEffect(() => {
    if (!hasMounted) return;

    const wasLg = prevIsLgRef.current;
    prevIsLgRef.current = isLg;

    if (wasLg === true && !isLg) {
      collapsePlaylistRef.current();
      return;
    }

    // First desktop paint, or expanding back to desktop — open the dock.
    if (isLg && (wasLg === false || wasLg === null)) {
      onPlaylistOpenChangeRef.current(true);
    }
  }, [hasMounted, isLg]);

  // Defer search value to avoid re-rendering the entire playlist tree on every keystroke
  const deferredPlaylistSearch = React.useDeferredValue(playlistSearch);

  const sharedChromeProps: Omit<PlaylistChromeProps, 'layout' | 'onRequestCollapse'> = {
    sheetTitle,
    sheetSubtitle,
    totalLessonCount,
    lessonNoun,
    searchPlaceholder,
    playlistSearch: deferredPlaylistSearch,
    onPlaylistSearchChange,
    searchResultSummary,
    playlistScrollChildren,
    stickyTop: upNextCard,
  };

  const narrowPlaylistButton = (
    <Button
      variant="ghost"
      size="icon"
      className="size-11 shrink-0 rounded-lg lg:hidden"
      type="button"
      onClick={() => {
        onPlaylistOpenChange(!playlistOpen);
      }}
      aria-label={playlistOpen ? 'Close course playlist' : 'Open course playlist'}
      aria-expanded={playlistOpen}
    >
      <ListVideo className="size-5" aria-hidden />
    </Button>
  );

  const rightSidebarClass = cn(
    'relative flex shrink-0 self-stretch overflow-hidden shadow-none lg:min-h-0',
    'border-l border-border/[0.08] bg-sidebar text-foreground',
    'dark:border-border/[0.08] dark:bg-sidebar dark:text-foreground',
    dockWidthClass,
    viewportLockedLayout && 'lg:max-h-full',
  );

  return (
    <LazyMotion features={domAnimation}>
      <div
        className={cn(
          'course-player-container flex min-h-0 flex-1 flex-col overflow-hidden bg-background font-sans dark:bg-background',
          viewportLockedLayout && 'h-full max-h-full min-h-0',
        )}
      >
        <header
          className={cn(
            'z-40 shrink-0 border-b border-border/[0.08] bg-card text-foreground dark:border-border/[0.08] dark:bg-background dark:text-foreground',
            'pt-[max(0px,env(safe-area-inset-top))]',
            !hasRichDesktopHeader && 'lg:hidden',
          )}
        >
          <div className="flex items-center gap-2 px-[max(0.5rem,env(safe-area-inset-left))] py-2 pr-[max(0.5rem,env(safe-area-inset-right))] sm:px-3">
            {brandSlot ?? null}
            {narrowPlaylistButton}
            {breadcrumb ?? (
              <p className="min-w-0 flex-1 truncate text-left text-sm font-semibold text-foreground dark:text-foreground">
                {headerCenterTitle ?? (playlistOpen ? 'Course content' : 'Open course content')}
              </p>
            )}
            {breadcrumb ? <div className="hidden min-w-0 flex-1 sm:block">{breadcrumb}</div> : null}
            <div className="ml-auto flex shrink-0 items-center gap-1.5">
              {topBarRight ?? null}
            </div>
          </div>
          {progressBlock ? (
            <div className="px-3 pb-2 pt-0">
              {progressBlock}
            </div>
          ) : _overallProgressPercent != null && _overallProgressPercent > 0 ? (
            <div className="px-3 pb-2 pt-0">
              <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-200 ease-[var(--ease-out)]"
                  style={{ width: `${Math.min(_overallProgressPercent, 100)}%` }}
                />
              </div>
            </div>
          ) : null}
        </header>

        <div
          className={cn(
            'relative flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row lg:items-stretch',
            viewportLockedLayout && 'min-h-0 max-h-full',
          )}
        >
          <main
            className={cn(
              'relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background dark:bg-background',
            )}
          >
            <CoursePlayerScrollPane className="custom-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain">
              {mainChildren}
            </CoursePlayerScrollPane>
          </main>

          {isLg && playlistOpen ? (
            <aside className={rightSidebarClass} aria-label="Course playlist">
              <div className="relative z-10 flex h-full min-h-0 w-full max-h-full flex-col">
                <PlaylistChrome {...sharedChromeProps} layout="dock" onRequestCollapse={collapsePlaylist} />
              </div>
            </aside>
          ) : null}
        </div>

        {hasMounted && !isLg ? (
          <Sheet
            open={playlistOpen}
            onOpenChange={(open) => {
              onPlaylistOpenChange(open);
              if (!open) onPlaylistSearchChange('');
            }}
          >
            <SheetContent
              side="right"
              className={cn(
                // Do not use `relative` here — it overrides Sheet's `fixed` via twMerge
                // and drops the playlist into the page flow (bottom-left ghost panel).
                'flex h-[100dvh] max-h-[100dvh] w-[min(100%,24rem)] flex-col gap-0 overflow-hidden p-0 shadow-none sm:max-w-sm',
                'border-border/[0.08] bg-sidebar text-foreground',
                'pt-[max(0px,env(safe-area-inset-top))] pb-[max(0px,env(safe-area-inset-bottom))]',
                'dark:border-border/[0.08] dark:bg-sidebar dark:text-foreground',
              )}
            >
              <PlaylistChrome {...sharedChromeProps} layout="sheet" />
            </SheetContent>
          </Sheet>
        ) : null}
      </div>
    </LazyMotion>
  );
}
