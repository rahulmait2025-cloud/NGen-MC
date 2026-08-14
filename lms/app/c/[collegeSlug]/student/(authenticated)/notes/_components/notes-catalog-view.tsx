'use client';

import { useState, useMemo, useId } from 'react';
import Link from 'next/link';
import {
  Search,
  X,
  Check,
  Lock,
  BookOpen,
  ArrowRight,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from '@/components/ui/empty';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { formatPrice } from '@/lib/utils/format-price';
import type { NoteCollectionSummary } from '@/lib/services/note-catalog';

interface EnrichedCollection extends NoteCollectionSummary {
  access: {
    hasAccess: boolean;
    source: 'free' | 'entitlement' | 'course_unlock' | null;
    linkedCourseId: string | null;
    validUntil: string | null;
  };
}

interface NotesCatalogViewProps {
  collections: EnrichedCollection[];
  collegeSlug: string;
}

type AccessFilter = 'all' | 'available' | 'locked';

const ACCESS_FILTERS: ReadonlyArray<{ id: AccessFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'available', label: 'Mine' },
  { id: 'locked', label: 'Locked' },
];

export function NotesCatalogView({ collections, collegeSlug }: NotesCatalogViewProps) {
  const [search, setSearch] = useState('');
  const [accessFilter, setAccessFilter] = useState<AccessFilter>('all');
  const searchId = useId();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return collections.filter((c) => {
      if (accessFilter === 'available' && !c.access.hasAccess) return false;
      if (accessFilter === 'locked' && c.access.hasAccess) return false;
      if (!q) return true;
      return (
        c.title.toLowerCase().includes(q) ||
        (c.short_description && c.short_description.toLowerCase().includes(q))
      );
    });
  }, [collections, search, accessFilter]);

  const hasSearch = search.trim().length > 0;
  const hasCollections = collections.length > 0;

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Toolbar */}
        {hasCollections && (
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
            <div className="relative flex-1 max-w-sm">
              <label htmlFor={searchId} className="sr-only">
                Search notes
              </label>
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <input
                id={searchId}
                type="text"
                placeholder="Search collections…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={cn(
                  'h-9 w-full rounded-lg border border-border bg-card pl-9 pr-9 text-sm',
                  'outline-none transition-colors placeholder:text-muted-foreground/60',
                  'focus:border-primary/50 focus:ring-2 focus:ring-primary/15',
                )}
              />
              {hasSearch && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  aria-label="Clear search"
                  className={cn(
                    'absolute right-2 top-1/2 inline-flex size-6 -translate-y-1/2 items-center justify-center',
                    'rounded-md text-muted-foreground transition-colors',
                    'hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring',
                  )}
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            <div
              role="radiogroup"
              aria-label="Filter notes by access"
              className="inline-flex h-9 items-center rounded-lg border border-border bg-card px-1 gap-0.5"
            >
              {ACCESS_FILTERS.map((f) => {
                const active = accessFilter === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setAccessFilter(f.id)}
                    className={cn(
                      'inline-flex h-7 items-center justify-center rounded-md px-3 text-xs font-medium transition duration-150',
                      'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                      active
                        ? 'bg-primary text-primary-foreground shadow-xs'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    )}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Results */}
        {filtered.length === 0 ? (
          <Empty className="border-dashed border-border/60 bg-card/40 py-14">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <BookOpen className="size-6 text-muted-foreground" aria-hidden="true" />
              </EmptyMedia>
              <EmptyTitle>
                {!hasCollections
                  ? 'Your study library is empty'
                  : hasSearch
                    ? 'No notes match your search'
                    : 'No notes in this filter'}
              </EmptyTitle>
              <EmptyDescription>
                {!hasCollections
                  ? "Collections will appear here once published for your courses."
                  : hasSearch
                    ? 'Try a different search term or clear the search.'
                    : 'Switch the filter to see all notes.'}
              </EmptyDescription>
              {(hasSearch || accessFilter !== 'all') && (
                <div className="mt-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearch('');
                      setAccessFilter('all');
                    }}
                  >
                    Reset filters
                  </Button>
                </div>
              )}
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {filtered.map((collection) => (
              <NoteCollectionCard
                key={collection.id}
                collection={collection}
                collegeSlug={collegeSlug}
              />
            ))}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

interface NoteCollectionCardProps {
  collection: EnrichedCollection;
  collegeSlug: string;
}

function NoteCollectionCard({ collection, collegeSlug }: NoteCollectionCardProps) {
  const { access } = collection;
  const isFree = collection.pricing_model === 'free';
  const isUnlocked = access.hasAccess;
  const isCourseLinked = access.source === 'course_unlock';
  const isPaid = collection.pricing_model === 'paid';

  return (
    <article
      className={cn(
        'group relative flex flex-col rounded-2xl border bg-card overflow-hidden',
        'border-border/70 transition duration-200 ease-out',
        'hover:border-primary/30 hover:shadow-[0_4px_20px_oklch(0.62_0.15_45_/_0.08)]',
        'focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background',
        !isUnlocked && isPaid && 'opacity-95',
      )}
    >
      {/* Top strip: status */}
      <div
        className={cn(
          'flex items-center justify-between gap-2 px-4 py-2 text-xs font-medium border-b',
          isUnlocked
            ? 'bg-primary/8 text-primary/80 border-primary/10'
            : 'bg-muted/50 text-muted-foreground border-border/40',
        )}
        aria-label={isUnlocked ? 'Available to study' : 'Purchase required'}
      >
        <span className="inline-flex items-center gap-1.5">
          {isUnlocked ? (
            <>
              <Check className="size-3" aria-hidden="true" />
              Available to study
            </>
          ) : isFree ? (
            <>
              <Check className="size-3" aria-hidden="true" />
              Free to access
            </>
          ) : (
            <>
              <Lock className="size-3" aria-hidden="true" />
              Unlock to access
            </>
          )}
        </span>
        {isCourseLinked && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                className="inline-flex items-center gap-1 rounded-full bg-card/80 px-2 py-0.5 text-[10px] font-medium tracking-wide text-muted-foreground cursor-help border border-border/50"
                tabIndex={0}
              >
                Course-linked
              </span>
            </TooltipTrigger>
            <TooltipContent side="top">
              Unlocks automatically when you have course access
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-1">
            <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug tracking-tight text-foreground">
              {collection.title}
            </h3>
            {collection.short_description && (
              <p className="line-clamp-2 text-[12px] text-muted-foreground leading-relaxed">
                {collection.short_description}
              </p>
            )}
          </div>
          {/* Icon — appears on right for locked, replaced by study count for unlocked */}
          {isUnlocked ? (
            <div className="flex shrink-0 size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <BookOpen className="size-4" aria-hidden="true" />
            </div>
          ) : (
            <div className="flex shrink-0 size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <Lock className="size-4" aria-hidden="true" />
            </div>
          )}
        </div>

        {/* Footer: price + CTA */}
        <div className="mt-auto flex items-center justify-between gap-3 pt-1 border-t border-border/40">
          <div>
            {isFree ? (
              <Badge variant="secondary" className="text-[11px] font-medium">Free</Badge>
            ) : isUnlocked ? (
              <span className="text-[12px] font-semibold text-success/80 tabular-nums">Unlocked</span>
            ) : (
              <div className="flex items-baseline gap-1">
                <span className="text-base font-bold tabular-nums text-foreground leading-none">
                  {formatPrice(collection.price_minor, collection.currency)}
                </span>
                <span className="text-[10px] text-muted-foreground">one-time</span>
              </div>
            )}
          </div>

          <Button
            asChild
            size="sm"
            variant={isUnlocked ? 'default' : isPaid ? 'default' : 'secondary'}
            className={cn(
              'shrink-0 gap-1.5',
              isUnlocked && 'bg-primary/90 hover:bg-primary text-primary-foreground',
            )}
          >
            <Link
              href={`/c/${collegeSlug}/student/notes/${collection.slug}`}
              aria-label={
                isUnlocked
                  ? `Study ${collection.title}`
                  : isFree
                    ? `View ${collection.title}`
                    : `Unlock ${collection.title}`
              }
            >
              {isUnlocked ? (
                <>
                  Study
                  <ArrowRight className="size-3.5" aria-hidden="true" />
                </>
              ) : isFree ? (
                <>
                  View
                  <ArrowRight className="size-3.5" aria-hidden="true" />
                </>
              ) : (
                <>
                  Unlock
                  <ArrowRight className="size-3.5" aria-hidden="true" />
                </>
              )}
            </Link>
          </Button>
        </div>
      </div>
    </article>
  );
}