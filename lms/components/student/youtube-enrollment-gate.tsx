'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2,
  Clock,
  Loader2,
  PlayCircle,
  Sparkles,
  Youtube,
} from 'lucide-react';

import { enrollFreeDbCourseAction } from '@/app/c/[collegeSlug]/student/(authenticated)/free-courses/actions';
import { YouTubeThumbnail } from '@/components/student/youtube-thumbnail';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type YouTubeEnrollmentGateProps = {
  collegeSlug: string;
  courseId: string;
  title: string;
  thumbnail?: string | null;
};

const FEATURE_CHIPS = [
  { label: 'Free access', icon: Sparkles },
  { label: 'Progress tracking', icon: PlayCircle },
  { label: 'Mark as done', icon: CheckCircle2 },
  { label: 'Learn at your pace', icon: Clock },
] as const;

const UNLOCK_POINTS = [
  'Full playlist access',
  'Progress tracking',
  'Continue anytime',
] as const;

export function YouTubeEnrollmentGate({
  collegeSlug,
  courseId,
  title,
  thumbnail,
}: YouTubeEnrollmentGateProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleEnroll() {
    setError(null);
    startTransition(async () => {
      const result = await enrollFreeDbCourseAction(collegeSlug, courseId);

      if (result?.ok === false) {
        setError(result.error ?? 'Enrollment failed.');
      } else {
        router.push(`/c/${collegeSlug}/student/payment-success?courseId=${courseId}&enrollment=free`);
      }
    });
  }

  return (
    <div className="relative min-h-0 flex-1 p-4 sm:p-8">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute -right-16 top-8 size-64 rounded-full bg-primary/[0.12] blur-3xl dark:bg-primary/[0.18]" />
        <div className="absolute -left-20 bottom-0 size-72 rounded-full bg-orange-200/30 blur-3xl dark:bg-primary/[0.08]" />
      </div>

      <div className="relative mx-auto w-full max-w-2xl py-2 sm:py-4">
        <div className="overflow-hidden rounded-[1.75rem] border border-border/60 bg-card shadow-xl shadow-primary/5 ring-1 ring-black/[0.03] dark:shadow-black/30">
        <div className="relative aspect-[16/10] min-h-[12rem] overflow-hidden sm:min-h-[14rem]">
          <YouTubeThumbnail
            src={thumbnail}
            alt={title}
            fill
            fallbackClassName="from-primary/[0.12] via-orange-50 to-amber-50/80 dark:from-primary/20 dark:via-card dark:to-muted/60"
            iconClassName="size-8 sm:size-10"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/10" />
          <div className="absolute left-4 top-4 flex flex-wrap items-center gap-2">
            <Badge className="border border-white/20 bg-foreground/50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-background backdrop-blur-md">
              <Youtube className="mr-1.5 inline size-3 text-destructive" aria-hidden />
              Free Playlist
            </Badge>
            <Badge className="border border-primary/30 bg-primary/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-primary-foreground shadow-sm">
              No payment
            </Badge>
          </div>
          <div className="absolute bottom-4 left-4 right-4 sm:bottom-6 sm:left-6 sm:right-6">
            <div className="mb-3 flex size-11 items-center justify-center rounded-2xl bg-primary/15 text-primary-foreground ring-1 ring-primary/25 backdrop-blur-sm">
              <PlayCircle className="size-6 fill-white/20" aria-hidden />
            </div>
            <h1 className="text-balance text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {title}
            </h1>
          </div>
        </div>

        <div className="space-y-6 bg-gradient-to-b from-orange-50/50 via-card to-card p-6 dark:from-primary/[0.04] sm:p-8">
          <div className="space-y-3">
            <h2 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
              Start this free course
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
              Enroll once to unlock all lectures, track your progress, and continue anytime.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {FEATURE_CHIPS.map(({ label, icon: Icon }) => (
              <span
                key={label}
                className="inline-flex items-center gap-1.5 rounded-full border border-primary/15 bg-primary/[0.06] px-3 py-1.5 text-[11px] font-semibold text-foreground dark:bg-primary/10"
              >
                <Icon className="size-3.5 shrink-0 text-primary" aria-hidden />
                {label}
              </span>
            ))}
          </div>

          <div className="rounded-2xl border border-border/60 bg-background/70 p-4 shadow-inner">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
              What you&apos;ll unlock
            </p>
            <ul className="mt-3 space-y-2">
              {UNLOCK_POINTS.map((point) => (
                <li key={point} className="flex items-start gap-2.5 text-sm text-foreground">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                  {point}
                </li>
              ))}
            </ul>
          </div>

          {error ? (
            <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <div className="space-y-2 pt-1">
            <Button
              type="button"
              size="lg"
              disabled={isPending}
              onClick={handleEnroll}
              className={cn(
                'h-12 w-full rounded-2xl bg-gradient-orange text-base font-bold text-primary-foreground shadow-lg shadow-primary/25 transition-[opacity,transform] hover:opacity-95 active:scale-[0.99]',
              )}
            >
              {isPending ? (
                <>
                  <div className="animate-spin"><Loader2 className="mr-2 size-4" aria-hidden /></div>
                  Enrolling...
                </>
              ) : (
                'Enroll for Free'
              )}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              No payment required. Instant access after enrollment.
            </p>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
