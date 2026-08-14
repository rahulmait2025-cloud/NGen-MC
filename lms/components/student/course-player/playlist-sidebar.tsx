'use client';

import React, { useMemo, useState, useCallback, useEffect, useRef, memo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ChevronDown, Search, Check, ClipboardCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buildPlayerLessonList, type PlayerLessonItem } from '@/lib/utils/player-lessons';
import { shouldClosePlaylistSheetForViewport } from '@/lib/playlist-close-on-narrow';
import { useCoursePlayer } from './context';

function formatDuration(seconds: number): string {
  const mins = Math.max(1, Math.round(seconds / 60));
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  return remainingMins > 0 ? `${hrs} hr ${remainingMins} min` : `${hrs} hr`;
}

function getDisplayDuration(item: { duration_seconds?: number | null; progress?: { total_seconds: number } | null }): number {
  return item.duration_seconds && item.duration_seconds > 0
    ? item.duration_seconds
    : item.progress?.total_seconds || 0;
}

function getModuleSectionClass(isFirst: boolean): string {
  return cn(
    'bg-transparent shadow-none',
    !isFirst && 'border-t border-border/[0.08]',
  );
}

function getModuleHeaderClass(isCurrentModule: boolean, isExpanded: boolean): string {
  return cn(
    'relative flex w-full items-start gap-3 px-4 py-4 text-left transition-colors duration-150',
    isCurrentModule && [
      'bg-foreground/[0.035] text-foreground dark:bg-foreground/[0.035] dark:text-foreground',
      'before:pointer-events-none before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[2px] before:bg-primary',
    ],
    !isCurrentModule && 'bg-transparent hover:bg-foreground/[0.03]',
    isExpanded && 'border-b border-border/[0.07]',
  );
}

const QUIZ_ICON_CLASS = 'flex size-4 items-center justify-center rounded-md border border-primary/20 bg-primary/10 text-primary dark:border-primary/15 dark:bg-primary/10 dark:text-primary';
const QUIZ_BADGE_CLASS = 'shrink-0 rounded border border-primary/20 bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary dark:border-primary/15 dark:bg-primary/10 dark:text-primary';

// OPTIMIZATION: Memoized LessonRow to prevent re-renders when other lessons complete
interface LessonRowProps {
  lesson: PlayerLessonItem;
  currentItemId: string;
  completedItems: Set<string>;
  moduleById: Map<string, { items: Array<{ id: string; duration_seconds?: number | null }> }>;
  onSelect: (id: string, href: string) => void;
  onPrefetch: (id: string) => void;
  onMouseEnter: (id: string) => void;
  onMouseLeave: () => void;
  activeLessonRef: React.RefObject<HTMLAnchorElement | null>;
}

const LessonRow = memo(function LessonRow({
  lesson,
  currentItemId,
  completedItems,
  moduleById,
  onSelect,
  onPrefetch: _onPrefetch,
  onMouseEnter,
  onMouseLeave,
  activeLessonRef,
}: LessonRowProps) {
  const isActive = currentItemId === lesson.id;
  const isCompleted = completedItems.has(lesson.id);
  const isQuiz = lesson.type === 'quiz_placeholder';

  const mod = moduleById.get(lesson.moduleId);
  const item = mod?.items.find((i) => i.id === lesson.id);
  const duration = item ? getDisplayDuration(item) : 0;

  return (
    <Link
      key={lesson.id}
      ref={isActive ? activeLessonRef : undefined}
      href={lesson.href}
      prefetch={false}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey) return;
        e.preventDefault();
        onSelect(lesson.id, lesson.href);
      }}
      onMouseEnter={() => onMouseEnter(lesson.id)}
      onMouseLeave={onMouseLeave}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'group relative flex w-full items-center gap-3 border-b px-4 py-3.5 text-left transition-colors duration-150',
        isActive
          ? 'border-border/[0.08] bg-primary/8 text-foreground shadow-[inset_3px_0_0_theme(colors.primary)] dark:border-border/[0.08] dark:bg-primary/[0.105] dark:text-foreground'
          : 'border-border/[0.07] bg-transparent text-foreground/78 hover:bg-foreground/[0.045] hover:text-foreground dark:border-border/[0.07] dark:text-foreground/78 dark:hover:bg-foreground/[0.045] dark:hover:text-foreground/92',
      )}
      style={{ contentVisibility: 'auto', containIntrinsicSize: '0 500px' }}
    >
      <span className="flex w-5 shrink-0 items-center justify-center">
        {isCompleted ? (
          <span className="flex size-4 items-center justify-center rounded-full border border-success/80 bg-success">
            <Check className="size-2.5 text-white" strokeWidth={3.5} />
          </span>
        ) : isQuiz ? (
          <span className={QUIZ_ICON_CLASS}>
            <ClipboardCheck className="size-3" />
          </span>
        ) : (
          <span
            className={cn(
              'flex size-4 items-center justify-center rounded-full border transition-colors',
              isActive
                ? 'border-primary/55 dark:border-primary/50'
                : 'border-border group-hover:border-border dark:border-foreground/[0.22] dark:group-hover:border-foreground/[0.32]',
            )}
          />
        )}
      </span>

      <span className={cn('line-clamp-2 min-w-0 flex-1 text-[16px] leading-snug', isActive ? 'font-semibold' : 'font-medium')}>
        {lesson.title}
      </span>

      {isQuiz && (
        <span className={QUIZ_BADGE_CLASS}>
          Quiz
        </span>
      )}

      {duration > 0 && !isQuiz && (
        <span
          className={cn(
            'shrink-0 text-[13px] tabular-nums',
            isActive ? 'text-muted-foreground dark:text-foreground/68' : 'text-muted-foreground dark:text-foreground/48',
          )}
        >
          {formatDuration(duration)}
        </span>
      )}
    </Link>
  );
}, (prev, next) => {
  // OPTIMIZATION: Custom comparison - only re-render if this specific lesson changed
  return (
    prev.lesson.id === next.lesson.id &&
    prev.currentItemId === next.currentItemId &&
    prev.completedItems.has(prev.lesson.id) === next.completedItems.has(next.lesson.id)
  );
});

export function PlaylistSidebar() {
  const { course, collegeSlug, learnVariantId, completedItems, playlistSearch, activeItemId, navigateToLesson, prefetchLesson, setPlaylistOpen } = useCoursePlayer();
  const params = useParams();
  const currentItemId = activeItemId || (params.itemId as string) || '';
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Eagerly prefetch lesson token+resume on hover (150ms debounce)
  const handleLessonMouseEnter = useCallback((lessonId: string) => {
    hoverTimerRef.current = setTimeout(() => {
      prefetchLesson(lessonId);
    }, 150);
  }, [prefetchLesson]);

  const handleLessonMouseLeave = useCallback(() => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
  }, []);

  const handleSelectLesson = useCallback((id: string, href: string) => {
    navigateToLesson(id, href);
    if (shouldClosePlaylistSheetForViewport()) {
      setPlaylistOpen(false);
    }
  }, [navigateToLesson, setPlaylistOpen]);

  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});
  const activeLessonRef = useRef<HTMLAnchorElement | null>(null);

  useEffect(() => {
    if (activeLessonRef.current) {
      activeLessonRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [currentItemId]);

  const playerLessons = useMemo(
    () => buildPlayerLessonList(course, collegeSlug, learnVariantId),
    [course, collegeSlug, learnVariantId]
  );

  const toggleModule = useCallback((moduleId: string) => {
    setExpandedModules((prev) => ({
      ...prev,
      [moduleId]: !prev[moduleId],
    }));
  }, []);

  const visibleModules = useMemo(
    () => course.modules.filter((m) => m.visible_to_students !== false),
    [course.modules]
  );

  const getModuleDuration = useCallback((moduleId: string): number => {
    const mod = course.modules.find((m) => m.id === moduleId);
    if (!mod) return 0;
    return mod.items.reduce((acc, item) => {
      const duration = getDisplayDuration(item);
      return acc + duration;
    }, 0);
  }, [course.modules]);

  const playlistSections = useMemo(() => {
    const norm = playlistSearch.trim().toLowerCase();
    const moduleBlocks = visibleModules.map((mod) => ({
      module: mod,
      items: playerLessons.filter((l) => l.moduleId === mod.id),
    }));
    if (!norm.length) return moduleBlocks.filter((b) => b.items.length > 0);
    return moduleBlocks.flatMap((block) => {
      const moduleMatches = block.module.title.toLowerCase().includes(norm);
      const items = moduleMatches
        ? block.items
        : block.items.filter((l) => l.title.toLowerCase().includes(norm));
      return items.length > 0 ? [{ module: block.module, items }] : [];
    });
  }, [visibleModules, playlistSearch, playerLessons]);

  const moduleById = useMemo(() => {
    const map = new Map<string, (typeof course.modules)[number]>();
    for (const m of course.modules) {
      map.set(m.id, m);
    }
    return map;
  }, [course]);

  const renderLessonRow = useCallback((lesson: PlayerLessonItem) => (
    <LessonRow
      key={lesson.id}
      lesson={lesson}
      currentItemId={currentItemId}
      completedItems={completedItems}
      moduleById={moduleById}
      onSelect={handleSelectLesson}
      onPrefetch={prefetchLesson}
      onMouseEnter={handleLessonMouseEnter}
      onMouseLeave={handleLessonMouseLeave}
      activeLessonRef={activeLessonRef}
    />
  ), [
    currentItemId,
    completedItems,
    moduleById,
    handleSelectLesson,
    prefetchLesson,
    handleLessonMouseEnter,
    handleLessonMouseLeave,
  ]);

  const renderModuleHeader = (
    mod: { id: string; title: string },
    items: PlayerLessonItem[],
    options: { isExpanded: boolean; isSearchMode: boolean; onToggle?: () => void },
  ) => {
    const completedInModule = items.filter((item) => completedItems.has(item.id)).length;
    const totalDuration = getModuleDuration(mod.id);
    const allComplete = completedInModule === items.length && items.length > 0;
    const isCurrentModule = items.some((item) => item.id === currentItemId);

    const headerContent = (
      <>
        {!options.isSearchMode && (
          <ChevronDown
            className={cn(
              'mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform duration-200 ease-out hover:text-foreground dark:text-foreground/45 dark:hover:text-foreground/75',
              !options.isExpanded && '-rotate-90',
            )}
            aria-hidden
          />
        )}
        <div className="min-w-0 flex-1">
          <span className="block truncate text-[18px] font-semibold text-foreground dark:text-foreground/90">
            {mod.title}
          </span>
          {!options.isSearchMode && (
            <span className="mt-1 flex items-center gap-1.5 text-[14px] font-medium text-muted-foreground dark:text-foreground/52">
              <span className={cn(allComplete && 'text-success dark:text-success')}>
                {completedInModule}/{items.length} completed
              </span>
              {totalDuration > 0 && (
                <>
                  <span className="text-slate-300 dark:text-white/30">·</span>
                  <span>{formatDuration(totalDuration)}</span>
                </>
              )}
            </span>
          )}
        </div>
      </>
    );

    if (options.isSearchMode) {
      return (
        <div className={getModuleHeaderClass(isCurrentModule, true)}>
          {headerContent}
        </div>
      );
    }

    return (
      <button
        type="button"
        onClick={options.onToggle}
        aria-expanded={options.isExpanded}
        aria-controls={`module-${mod.id}-lessons`}
        className={getModuleHeaderClass(isCurrentModule, options.isExpanded)}
      >
        {headerContent}
      </button>
    );
  };

  if (playlistSections.length === 0) {
    return (
      <div className="px-4 py-12 text-center">
        <Search className="mx-auto mb-2 size-6 text-muted-foreground dark:text-foreground/25" aria-hidden />
        <p className="text-[17px] font-medium text-foreground dark:text-foreground/60">No lessons match</p>
        <p className="mt-0.5 text-[14px] text-muted-foreground dark:text-foreground/40">Try a different search or clear it.</p>
      </div>
    );
  }

  const isSearchMode = !!playlistSearch.trim();

  return (
    <div className="pb-1">
      {playlistSections.map(({ module: mod, items }, sectionIndex) => {
        const isExpanded = isSearchMode || expandedModules[mod.id] !== false;

        return (
          <section key={mod.id} className={getModuleSectionClass(sectionIndex === 0)}>
            {renderModuleHeader(mod, items, {
              isExpanded,
              isSearchMode,
              onToggle: () => toggleModule(mod.id),
            })}
            {isExpanded ? (
              <div id={`module-${mod.id}-lessons`}>
                {items.map((item) => renderLessonRow(item))}
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
