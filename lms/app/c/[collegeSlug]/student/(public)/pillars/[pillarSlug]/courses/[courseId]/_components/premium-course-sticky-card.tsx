'use client';

import React, { use, Suspense } from 'react';
import {
  Video,
  Layers,
  CheckCircle2,
  Clock,
  ShieldCheck,
  ArrowRight,
  PlayCircle,
} from 'lucide-react';
import { StudentCtaButton } from '@/components/student/ui/student-cta-button';
import { LandingPreviewMedia } from './premium-course-hero';
import type { CourseLandingDetail } from './premium-course-landing-client';

function DynamicStickyCardCta({
  promise,
}: {
  promise: Promise<React.ReactNode>;
}) {
  const node = use(promise);
  return <>{node}</>;
}

function StickyCardCtaSkeleton() {
  return (
    <div className="h-28 w-full animate-pulse rounded-2xl border border-border/40 bg-muted/20" />
  );
}

function DynamicVariantExplorer({
  promise,
}: {
  promise: Promise<React.ReactNode>;
}) {
  const node = use(promise);
  return <>{node}</>;
}

function VariantExplorerSkeleton() {
  return (
    <div className="h-24 w-full animate-pulse rounded-3xl border border-border/40 bg-muted/20" />
  );
}

export interface PremiumCourseStickyCardProps {
  detail: CourseLandingDetail;
  hasLearningAccess: boolean;
  isProductEnrolled: boolean;
  inclusionMessage?: string;
  learnHref: string;
  enrollCtaLabel: string;
  continueCtaLabel: string;
  enrollmentSlot?: React.ReactNode;
  variantExplorer?: React.ReactNode;
  enrollmentPromise?: Promise<React.ReactNode>;
  variantExplorerPromise?: Promise<React.ReactNode>;
  scrollToSection: (id: string) => void;
}

export function PremiumCourseStickyCard({
  detail,
  hasLearningAccess,
  isProductEnrolled: _isProductEnrolled,
  inclusionMessage,
  learnHref,
  enrollCtaLabel,
  continueCtaLabel,
  enrollmentSlot,
  variantExplorer,
  enrollmentPromise,
  variantExplorerPromise,
  scrollToSection,
}: PremiumCourseStickyCardProps) {
  return (
    <div className="sticky top-28 space-y-6">
      <div className="overflow-hidden rounded-3xl border border-border/60 bg-card p-6 shadow-xl">
        <div className="mb-6 overflow-hidden rounded-2xl">
          <LandingPreviewMedia
            detail={detail}
            aspectClassName="aspect-video"
            priority={false}
          />
        </div>

        {/* Enrollment / Access status block */}
        <div id="enrollment-section" className="space-y-5">
          {enrollmentPromise ? (
            <Suspense fallback={<StickyCardCtaSkeleton />}>
              <DynamicStickyCardCta promise={enrollmentPromise} />
            </Suspense>
          ) : hasLearningAccess ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 text-center">
                <div className="flex items-center justify-center gap-2 font-bold text-primary">
                  <CheckCircle2 className="size-5" />
                  <span>Access Unlocked</span>
                </div>
                {inclusionMessage && (
                  <p className="mt-1 text-xs text-muted-foreground">{inclusionMessage}</p>
                )}
              </div>
              <StudentCtaButton href={learnHref} size="lg" className="w-full">
                <PlayCircle className="size-5" />
                {continueCtaLabel} Learning
              </StudentCtaButton>
            </div>
          ) : enrollmentSlot ? (
            <div className="w-full">{enrollmentSlot}</div>
          ) : (
            <div className="space-y-3">
              <StudentCtaButton
                onClick={() => scrollToSection('enrollment-section')}
                size="lg"
                className="w-full"
              >
                {enrollCtaLabel}
                <ArrowRight className="size-5" />
              </StudentCtaButton>
            </div>
          )}

          {/* Quick specs */}
          <div className="space-y-3 border-t border-border/50 pt-4 text-sm font-medium">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-muted-foreground">
                <Video className="size-4 text-primary" />
                Lectures
              </span>
              <span className="font-bold">{detail.video_count} videos</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-muted-foreground">
                <Layers className="size-4 text-primary" />
                Modules
              </span>
              <span className="font-bold">{detail.module_count} modules</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-muted-foreground">
                <Clock className="size-4 text-primary" />
                Pace
              </span>
              <span className="font-bold">Self-paced</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-muted-foreground">
                <ShieldCheck className="size-4 text-primary" />
                Access
              </span>
              <span className="font-bold">Full Course Access</span>
            </div>
          </div>
        </div>
      </div>

      {/* Variant explorer if available */}
      {variantExplorerPromise ? (
        <Suspense fallback={<VariantExplorerSkeleton />}>
          <DynamicVariantExplorer promise={variantExplorerPromise} />
        </Suspense>
      ) : (
        variantExplorer && <div className="w-full">{variantExplorer}</div>
      )}
    </div>
  );
}
