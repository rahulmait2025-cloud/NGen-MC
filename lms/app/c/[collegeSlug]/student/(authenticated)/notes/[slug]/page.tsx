import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  ChevronRight,
  Lock,
  Check,
  BookOpen,
  Clock,
  Layers,
  BookMarked,
} from 'lucide-react';
import { requireStudent } from '@/lib/auth/require-student';
import { getNoteCollectionBySlug } from '@/lib/services/note-catalog';
import { resolveStudentNoteAccess } from '@/lib/services/student-note-access';
import { formatPrice } from '@/lib/utils/format-price';
import { NotePurchaseButton } from './note-purchase-button';
import { cn } from '@/lib/utils';

interface CollectionPageProps {
  params: Promise<{ collegeSlug: string; slug: string }>;
}

function formatValidity(validUntil: string | null, source: string): string {
  if (source === 'course_unlock') return 'Follows course access';
  if (!validUntil) return 'Lifetime access';
  const date = new Date(validUntil);
  return `Valid until ${date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`;
}

export default async function NoteCollectionPage({
  params,
}: CollectionPageProps): Promise<ReactNode> {
  const { collegeSlug, slug } = await params;
  const [ctx, collection] = await Promise.all([
    requireStudent(collegeSlug),
    getNoteCollectionBySlug(slug),
  ]);
  const { studentId, isGlobal } = ctx;

  if (!collection) notFound();

  const access = await resolveStudentNoteAccess(studentId, collection.id, isGlobal);
  const isUnlocked = access.hasAccess;
  const isFree = collection.pricing_model === 'free';
  const isPaid = collection.pricing_model === 'paid';

  const validityText = isUnlocked && !isFree
    ? formatValidity(access.validUntil, access.source ?? '')
    : null;

  const moduleCount = collection.modules.length;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 pb-28 lg:pb-8">

      {/* Back nav */}
      <nav aria-label="Breadcrumb" className="mb-6">
        <Link
          href={`/c/${collegeSlug}/student/notes`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 rounded-md"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          <span>Notes Library</span>
        </Link>
      </nav>

      {/* Hero section */}
      <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card mb-5">
        {/* Ambient gradient accent */}
        <div
          className="absolute inset-0 opacity-30 pointer-events-none"
          aria-hidden="true"
          style={{
            background: 'linear-gradient(135deg, oklch(0.72 0.19 45 / 0.15) 0%, transparent 60%)',
          }}
        />
        <div className="relative p-6 pb-5">
          {/* Breadcrumb + status row */}
          <div className="flex items-center gap-2 mb-3">
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
                isUnlocked
                  ? 'bg-primary/12 text-primary/90'
                  : 'bg-muted text-muted-foreground',
              )}
            >
              {isUnlocked ? (
                <Check className="size-3" aria-hidden="true" />
              ) : (
                <Lock className="size-3" aria-hidden="true" />
              )}
              {isUnlocked ? 'Unlocked' : 'Locked'}
            </span>
            {isPaid && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold text-primary">
                {isUnlocked ? (
                  <span className="text-primary/70 font-medium mr-0.5">Unlocked for</span>
                ) : null}
                {formatPrice(collection.price_minor, collection.currency)}
              </span>
            )}
            {isFree && (
              <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-0.5 text-[11px] font-semibold text-success">
                Free
              </span>
            )}
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold tracking-tight text-foreground text-wrap balance mb-1.5">
            {collection.title}
          </h1>

          {/* Description */}
          {collection.short_description && (
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xl">
              {collection.short_description}
            </p>
          )}

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-4 pt-4 border-t border-border/40">
            {moduleCount > 0 && (
              <span className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground">
                <Layers className="size-3.5" aria-hidden="true" />
                {moduleCount} {moduleCount === 1 ? 'module' : 'modules'}
              </span>
            )}
            {validityText && (
              <span className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground">
                <Clock className="size-3.5" aria-hidden="true" />
                {validityText}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Purchase card — locked + paid */}
      {!isUnlocked && isPaid && (
        <section
          className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.06] via-card to-card p-5 mb-5"
          aria-labelledby="purchase-heading"
        >
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-primary/10 to-transparent rounded-bl-full pointer-events-none" aria-hidden="true" />
          <div className="relative space-y-3">
            <div className="space-y-1">
              <h2 id="purchase-heading" className="text-[15px] font-semibold text-foreground">
                Unlock full access
              </h2>
              <p className="text-[13px] text-muted-foreground leading-relaxed">
                {moduleCount > 0
                  ? `Get all ${moduleCount} modules and every page — one payment, lifetime access.`
                  : 'Get lifetime access to this collection when published.'}
              </p>
            </div>
            <NotePurchaseButton
              collegeSlug={collegeSlug}
              noteCollectionId={collection.id}
              noteCollectionSlug={collection.slug}
              priceMinor={collection.price_minor}
              currency={collection.currency}
            />
          </div>
        </section>
      )}

      {/* Modules list */}
      {isUnlocked && (
        <section aria-labelledby="modules-heading">
          <div className="flex items-center gap-2 mb-3">
            <h2
              id="modules-heading"
              className="flex items-center gap-2 text-[15px] font-semibold text-foreground"
            >
              <BookOpen className="size-4 text-primary" aria-hidden="true" />
              Modules
              {moduleCount > 0 && (
                <span className="text-xs font-medium text-muted-foreground">({moduleCount})</span>
              )}
            </h2>
          </div>

          {moduleCount === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/20 py-12 text-center">
              <div className="mb-2.5 flex size-10 items-center justify-center rounded-xl bg-primary/8 text-primary/50">
                <BookMarked className="size-5" aria-hidden="true" />
              </div>
              <p className="text-[13px] font-medium text-foreground">No modules published yet</p>
              <p className="mt-1 max-w-[240px] text-xs text-muted-foreground">
                Modules will appear here once published by the instructor.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {collection.modules.map((mod, index) => (
                <Link
                  key={mod.id}
                  href={`/c/${collegeSlug}/student/notes/${collection.slug}/${mod.slug}`}
                  className={cn(
                    'group flex items-center gap-3.5 rounded-xl border bg-card px-4 py-3.5',
                    'border-border/60 transition duration-150 ease-out',
                    'hover:border-primary/35 hover:bg-primary/[0.02] hover:-translate-y-px',
                    'hover:shadow-[0_3px_14px_oklch(0.62_0.15_45_/_0.09)]',
                    'focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2',
                  )}
                >
                  {/* Module number */}
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary tabular-nums">
                    {index + 1}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-medium text-foreground leading-snug transition-colors group-hover:text-primary">
                      {mod.title}
                    </p>
                    {mod.description_md && (
                      <p className="mt-0.5 truncate text-[12px] text-muted-foreground leading-relaxed">
                        {mod.description_md}
                      </p>
                    )}
                  </div>

                  <ChevronRight
                    className="size-4 shrink-0 text-border transition-colors group-hover:text-primary/50"
                    aria-hidden="true"
                  />
                </Link>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}