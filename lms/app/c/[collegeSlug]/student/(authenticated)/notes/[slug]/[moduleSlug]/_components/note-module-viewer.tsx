'use client';

import { useState, useEffect, useCallback, useRef, useId } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
  Maximize2,
  BookOpen,
} from 'lucide-react';

interface NotePage {
  id: string;
  title: string | null;
  alt_text: string | null;
  width: number | null;
  height: number | null;
}

interface NoteModule {
  id: string;
  title: string;
  slug: string | null;
  sort_order: number;
}

interface NoteModuleViewerProps {
  pages: NotePage[];
  collegeSlug: string;
  moduleName: string;
  modules?: NoteModule[];
  currentModuleSlug?: string;
  collectionSlug?: string;
  header?: React.ReactNode;
}

function formatPageLabel(index: number, title: string | null): string {
  return title ? `Page ${index + 1} — ${title}` : `Page ${index + 1}`;
}

export function NoteModuleViewer({
  pages,
  collegeSlug,
  moduleName,
  modules = [],
  currentModuleSlug,
  collectionSlug,
  header,
}: NoteModuleViewerProps) {
  const [activePage, setActivePage] = useState(0);
  const [lightboxPage, setLightboxPage] = useState<number | null>(null);
  const [lightboxImageError, setLightboxImageError] = useState(false);
  const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set());
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());
  const pageRefs = useRef<Map<number, HTMLElement>>(new Map());
  const jumpBarRef = useRef<HTMLDivElement>(null);
  const lightboxDialogRef = useRef<HTMLDialogElement>(null);
  const viewerId = useId();

  // Find active module to initialize state
  const currentModule = modules.find((m) => m.slug === currentModuleSlug);
  // Derive expanded module ID from current module slug (URL is source of truth)
  const expandedModuleId: string = currentModule?.id ?? '';

  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    pages.forEach((_, index) => {
      const el = pageRefs.current.get(index);
      if (!el) return;

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && entry.intersectionRatio > 0.4) {
              setActivePage(index);
            }
          });
        },
        { threshold: [0.4], rootMargin: '-15% 0px -35% 0px' },
      );

      observer.observe(el);
      observers.push(observer);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, [pages]);

  useEffect(() => {
    const bar = jumpBarRef.current;
    if (!bar) return;
    const btn = bar.querySelector(`[data-page="${activePage}"]`) as HTMLElement;
    if (btn) {
      const containerWidth = bar.clientWidth;
      const btnLeft = btn.offsetLeft;
      const btnWidth = btn.clientWidth;
      bar.scrollTo({
        left: btnLeft - containerWidth / 2 + btnWidth / 2,
        behavior: 'smooth',
      });
    }
  }, [activePage]);

  const scrollToPage = useCallback((index: number) => {
    const el = pageRefs.current.get(index);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActivePage(index);
    }
  }, []);

  const openLightbox = useCallback((index: number) => {
    setLightboxPage(index);
    setLightboxImageError(false);
    requestAnimationFrame(() => {
      lightboxDialogRef.current?.showModal();
    });
  }, []);

  const closeLightbox = useCallback(() => {
    setLightboxPage(null);
    lightboxDialogRef.current?.close();
  }, []);

  // Wire dialog onclose event (not React onClose — HTMLDialogElement uses native onclose)
  useEffect(() => {
    const dialog = lightboxDialogRef.current;
    if (!dialog) return;
    function handleClose() {
      setLightboxPage(null);
    }
    dialog.addEventListener('close', handleClose);
    return () => dialog.removeEventListener('close', handleClose);
  }, []);

  const navigateLightbox = useCallback(
    (direction: -1 | 1) => {
      setLightboxPage((p) => {
        if (p === null) return null;
        const next = p + direction;
        if (next < 0 || next >= pages.length) return p;
        return next;
      });
    },
    [pages.length],
  );

  const handleImageLoad = useCallback((index: number) => {
    setLoadedImages((prev) => new Set(prev).add(index));
    setImageErrors((prev) => {
      const next = new Set(prev);
      next.delete(index);
      return next;
    });
  }, []);

  const handleImageError = useCallback((index: number) => {
    setImageErrors((prev) => new Set(prev).add(index));
    setLoadedImages((prev) => {
      const next = new Set(prev);
      next.delete(index);
      return next;
    });
  }, []);

  const retryImage = useCallback((index: number) => {
    setImageErrors((prev) => {
      const next = new Set(prev);
      next.delete(index);
      return next;
    });
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (lightboxPage !== null) {
        if (e.key === 'Escape') {
          e.preventDefault();
          closeLightbox();
        } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          e.preventDefault();
          setLightboxPage((p) => (p !== null ? Math.min(p + 1, pages.length - 1) : null));
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          e.preventDefault();
          setLightboxPage((p) => (p !== null ? Math.max(p - 1, 0) : null));
        }
        return;
      }

      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        scrollToPage(Math.min(activePage + 1, pages.length - 1));
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        scrollToPage(Math.max(activePage - 1, 0));
      } else if (e.key === 'Home') {
        e.preventDefault();
        scrollToPage(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        scrollToPage(pages.length - 1);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activePage, lightboxPage, pages.length, scrollToPage, closeLightbox]);

  const hasSidebar = modules && modules.length > 0;

  return (
    <>
      <div className={cn('grid grid-cols-1 gap-8', hasSidebar && 'lg:grid-cols-12')}>
        {/* Main pages feed */}
        <div className={cn('space-y-8', hasSidebar && 'lg:col-span-8 xl:col-span-9')}>
          {header}
          <div
            className="space-y-8"
            role="region"
            aria-label={`${moduleName} pages`}
            id={viewerId}
          >
            {pages.map((page, index) => {
              const imgWidth = page.width ?? 1920;
              const imgHeight = page.height ?? 1080;
              const isLoaded = loadedImages.has(index);
              const hasError = imageErrors.has(index);
              const isActive = index === activePage;

              return (
                <figure
                  key={page.id}
                  ref={(el) => {
                    if (el) pageRefs.current.set(index, el);
                  }}
                  data-page={index}
                  className={cn(
                    'mx-auto max-w-2xl space-y-2',
                    'transition-shadow duration-200',
                    isActive && 'scale-[1.01] origin-top',
                  )}
                >
                  {/* Page image */}
                  <div
                    className={cn(
                      'relative overflow-hidden rounded-2xl border bg-card cursor-zoom-in group',
                      'border-border/50 shadow-sm',
                      'transition duration-200 ease-out',
                      hasError
                        ? 'border-destructive/30 bg-destructive/5'
                        : 'hover:border-primary/25 hover:shadow-[0_6px_28px_oklch(0.62_0.15_45_/_0.12)]',
                      'focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background',
                    )}
                    style={{ aspectRatio: `${imgWidth}/${imgHeight}` }}
                    onClick={() => !hasError && openLightbox(index)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (!hasError && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault();
                        openLightbox(index);
                      }
                    }}
                    aria-label={hasError ? `Page ${index + 1} — failed to load` : `Open ${formatPageLabel(index, page.title)} in fullscreen`}
                    aria-disabled={hasError}
                  >
                    {!isLoaded && !hasError && (
                      <Skeleton
                        className="absolute inset-0 rounded-2xl"
                      />
                    )}
                    {hasError ? (
                      /* Error state */
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center">
                        <div className="flex size-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                          <svg className="size-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                          </svg>
                        </div>
                        <p className="text-[12px] font-medium text-destructive/80">
                          Failed to load page {index + 1}
                        </p>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            retryImage(index);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                          <svg className="size-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                          </svg>
                          Retry
                        </button>
                      </div>
                    ) : (
                      <>
                        <Image
                          src={`/api/notes/pages/${page.id}/image?collegeSlug=${encodeURIComponent(collegeSlug)}`}
                          alt={
                            page.alt_text ||
                            page.title ||
                            `${moduleName}, page ${index + 1}`
                          }
                          width={imgWidth}
                          height={imgHeight}
                          priority={index < 2}
                          loading={index < 2 ? undefined : 'lazy'}
                          unoptimized
                          draggable={false}
                          onLoad={() => handleImageLoad(index)}
                          onError={() => handleImageError(index)}
                          className={cn(
                            'h-auto w-full object-contain transition duration-300',
                            isLoaded ? 'opacity-100' : 'opacity-0',
                          )}
                          style={{ aspectRatio: `${imgWidth}/${imgHeight}` }}
                        />
                        {/* Fullscreen hint overlay */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-foreground/10">
                          <div className="flex items-center justify-center rounded-full bg-foreground/50 backdrop-blur-sm p-2">
                            <Maximize2 className="size-4 text-white" aria-hidden="true" />
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Page caption */}
                  <figcaption className="text-center text-[12px] text-muted-foreground leading-relaxed">
                    <span className="font-semibold text-foreground/50 tabular-nums">
                      {index + 1}
                    </span>
                    {page.title && (
                      <>
                        <span className="mx-1.5 text-border">·</span>
                        <span className="text-muted-foreground/80">{page.title}</span>
                      </>
                    )}
                  </figcaption>
                </figure>
              );
            })}
          </div>
        </div>

        {/* Right sticky sidebar */}
        {hasSidebar && (
          <aside className="hidden lg:block lg:col-span-4 xl:col-span-3 self-start sticky top-6 space-y-6 max-h-[calc(100vh-3rem)] overflow-y-auto pr-1 pb-4">
            {/* Curriculum Accordion Card */}
            <div className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-md p-4 shadow-sm space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80 flex items-center gap-1.5 px-1">
                <BookOpen className="size-3.5" />
                Modules
              </h3>
              <div className="space-y-2.5">
                {modules.map((m) => {
                  const isCurrent = m.slug === currentModuleSlug;
                  const isExpanded = expandedModuleId === m.id;

                  return (
                    <div
                      key={m.id}
                      className={cn(
                        'rounded-xl border transition duration-200 overflow-hidden',
                        isCurrent
                          ? 'border-primary/20 bg-primary/[0.02]'
                          : 'border-border/50 bg-transparent'
                      )}
                    >
                      {/* Accordion Header */}
                      {isCurrent ? (
                        <div
                          className="flex items-center justify-between w-full px-3 py-2.5 text-sm font-medium text-primary"
                        >
                          <span className="truncate pr-2 text-left font-semibold" title={m.title}>
                            {m.title}
                          </span>
                          <ChevronDown className="size-4 shrink-0 text-primary rotate-180" />
                        </div>
                      ) : (
                        <Link
                          href={`/c/${collegeSlug}/student/notes/${collectionSlug}/${m.slug}`}
                          className="flex items-center justify-between w-full px-3 py-2.5 text-sm font-medium text-foreground/80 hover:text-foreground hover:bg-muted/30 transition"
                        >
                          <span className="truncate pr-2 text-left" title={m.title}>
                            {m.title}
                          </span>
                          <ChevronDown className="size-4 shrink-0 text-muted-foreground/70 -rotate-90" />
                        </Link>
                      )}

                      {/* Accordion Content */}
                      {isExpanded && (
                        <div className="px-3 pb-3 pt-1 border-t border-dashed border-border/50 space-y-3">
                          {isCurrent ? (
                            /* Current Module Pages Grid */
                            <div className="space-y-2.5">
                              <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground">
                                <span>Select Page</span>
                                <span className="tabular-nums bg-muted px-1.5 py-0.5 rounded">
                                  {activePage + 1} / {pages.length}
                                </span>
                              </div>
                              <div className="grid grid-cols-4 xl:grid-cols-5 gap-1.5">
                                {pages.map((page, index) => {
                                  const isActive = index === activePage;
                                  return (
                                    <button
                                      key={page.id}
                                      type="button"
                                      onClick={() => scrollToPage(index)}
                                      className={cn(
                                        'aspect-square rounded-lg text-xs font-semibold transition duration-200 flex items-center justify-center',
                                        isActive
                                          ? 'bg-primary text-primary-foreground shadow-md scale-105'
                                          : 'bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground'
                                      )}
                                    >
                                      {index + 1}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          ) : (
                            /* Inactive Module Quick Actions */
                            <div className="space-y-2 text-xs">
                              <p className="text-muted-foreground leading-normal">
                                Switch to this module to view its pages and start studying.
                              </p>
                              <Link
                                href={`/c/${collegeSlug}/student/notes/${collectionSlug}/${m.slug}`}
                                className="w-full bg-primary/10 text-primary hover:bg-primary/20 text-xs font-semibold py-2 px-3 rounded-lg text-center transition block"
                              >
                                Open Module
                              </Link>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* Sticky page-jump bar — study environment bottom bar (mobile/tablet only) */}
      {pages.length > 1 && (
        <nav
          ref={jumpBarRef}
          aria-label="Jump to page"
          className={cn(
            'fixed bottom-0 inset-x-0 z-40',
            'border-t border-border/60 bg-card/95 backdrop-blur-md',
            'px-4 py-2.5',
            'flex items-center gap-1.5 overflow-x-auto scrollbar-hide',
            hasSidebar && 'lg:hidden',
          )}
          style={{ scrollbarWidth: 'none' } as React.CSSProperties}
        >
          <span className="mr-3 shrink-0 text-[11px] font-semibold text-muted-foreground tabular-nums">
            {activePage + 1}/{pages.length}
          </span>
          {pages.map((page, index) => (
            <button
              key={page.id}
              type="button"
              data-page={index}
              onClick={() => scrollToPage(index)}
              aria-label={formatPageLabel(index, page.title)}
              aria-current={index === activePage ? 'step' : undefined}
              className={cn(
                'inline-flex size-7 shrink-0 items-center justify-center rounded-md text-[11px] font-medium transition duration-150',
                'focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2',
                index === activePage
                  ? 'bg-primary text-primary-foreground shadow-sm scale-110'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              {index + 1}
            </button>
          ))}
        </nav>
      )}

      {/* Fullscreen lightbox */}
      <dialog
        ref={lightboxDialogRef}
        className="backdrop:bg-black/95 bg-transparent p-0 max-w-none w-full h-full m-0 rounded-none open:fixed open:inset-0 open:z-50"
        aria-label="Fullscreen page viewer"
        onKeyDown={(e) => {
          if (e.key !== 'Tab') return;
          const dialog = e.currentTarget as HTMLDialogElement;
          const focusable = dialog.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
          );
          if (focusable.length === 0) return;
          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          if (e.shiftKey) {
            if (document.activeElement === first) {
              e.preventDefault();
              last.focus();
            }
          } else {
            if (document.activeElement === last) {
              e.preventDefault();
              first.focus();
            }
          }
        }}
      >
        {lightboxPage !== null && (
          <div className="relative flex h-full w-full flex-col bg-black">
            {/* Top bar */}
            <div className="absolute top-0 inset-x-0 z-10 flex items-center justify-between px-5 py-3 bg-gradient-to-b from-black/80 to-transparent">
              <span className="text-[13px] font-semibold text-white/80 tabular-nums">
                {lightboxPage + 1} / {pages.length}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[13px] text-white/50 truncate max-w-[40vw]">
                  {pages[lightboxPage].title ?? moduleName}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={closeLightbox}
                  aria-label="Close fullscreen"
                  className="text-white/70 hover:text-white hover:bg-white/10 -mr-1"
                >
                  <X className="size-5" />
                </Button>
              </div>
            </div>

            {/* Image area */}
            <div className="flex-1 flex items-center justify-center overflow-auto p-6 pt-20 pb-16">
              {lightboxImageError ? (
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="flex size-12 items-center justify-center rounded-full bg-white/10 text-white/60">
                    <svg className="size-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                    </svg>
                  </div>
                  <p className="text-sm text-white/60">Failed to load page {lightboxPage + 1}</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => { setLightboxImageError(false); setLightboxPage((p) => p); }}
                    className="text-white/70 hover:text-white hover:bg-white/10"
                  >
                    Retry
                  </Button>
                </div>
              ) : (
                <Image
                  src={`/api/notes/pages/${pages[lightboxPage].id}/image?collegeSlug=${encodeURIComponent(collegeSlug)}`}
                  alt={
                    pages[lightboxPage].alt_text ||
                    pages[lightboxPage].title ||
                    `${moduleName}, page ${lightboxPage + 1}`
                  }
                  width={pages[lightboxPage].width ?? 1920}
                  height={pages[lightboxPage].height ?? 1080}
                  unoptimized
                  draggable={false}
                  onLoad={() => setLightboxImageError(false)}
                  onError={() => setLightboxImageError(true)}
                  className="max-h-[calc(100vh-10rem)] w-auto object-contain rounded-lg shadow-2xl"
                />
              )}
            </div>

            {/* Navigation arrows */}
            {lightboxPage > 0 && (
              <button
                type="button"
                onClick={() => navigateLightbox(-1)}
                aria-label="Previous page"
                className={cn(
                  'absolute left-4 top-1/2 -translate-y-1/2',
                  'inline-flex size-11 items-center justify-center rounded-full',
                  'bg-white/10 text-white/80 backdrop-blur-sm transition duration-150',
                  'hover:bg-white/20 hover:text-white hover:scale-110',
                  'focus-visible:outline-2 focus-visible:outline-white',
                )}
              >
                <ChevronLeft className="size-6" />
              </button>
            )}
            {lightboxPage < pages.length - 1 && (
              <button
                type="button"
                onClick={() => navigateLightbox(1)}
                aria-label="Next page"
                className={cn(
                  'absolute right-4 top-1/2 -translate-y-1/2',
                  'inline-flex size-11 items-center justify-center rounded-full',
                  'bg-white/10 text-white/80 backdrop-blur-sm transition duration-150',
                  'hover:bg-white/20 hover:text-white hover:scale-110',
                  'focus-visible:outline-2 focus-visible:outline-white',
                )}
              >
                <ChevronRight className="size-6" />
              </button>
            )}

            {/* Bottom page dots */}
            <div className="absolute bottom-0 inset-x-0 z-50 flex items-center justify-center gap-1.5 px-5 py-3 bg-gradient-to-t from-black/80 to-transparent overflow-x-auto"
              style={{ scrollbarWidth: 'none' } as React.CSSProperties}>
              {pages.map((page, index) => (
                <button
                  key={page.id}
                  type="button"
                  onClick={() => setLightboxPage(index)}
                  aria-label={formatPageLabel(index, page.title)}
                  aria-current={index === lightboxPage ? 'step' : undefined}
                  className={cn(
                    'inline-flex shrink-0 items-center justify-center rounded-full transition duration-150',
                    index === lightboxPage
                      ? 'w-6 h-2.5 bg-white'
                      : 'w-2 h-2.5 bg-white/30 hover:bg-white/50',
                  )}
                />
              ))}
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}