'use client';

import Image from 'next/image';
import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type CampusCampaignVisualVariant =
  | 'hero'
  | 'internship'
  | 'movement'
  | 'who-should-apply'
  | 'dashboard';

interface CampusCampaignVisualProps {
  variant: CampusCampaignVisualVariant;
  className?: string;
  couponCode?: string;
  referralCount?: number;
  milestoneLabel?: string;
  progressPercent?: number;
}

const HERO_CAMPAIGN_IMAGE = '/assets/campus-ambassador/hero-campaign.png';
const MOVEMENT_CAMPAIGN_IMAGE = '/assets/campus-ambassador/movement-campaign.png';

function CampaignImageFrame({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('relative w-full', className)}>
      <div className="campus-campaign-image-frame relative overflow-hidden rounded-[2rem] border border-border/70 bg-black shadow-2xl">
        {children}
      </div>
    </div>
  );
}

function HeroVisual({ className }: { className?: string }) {
  return (
    <CampaignImageFrame className={className}>
      <div className="relative aspect-[3/2] w-full">
        <Image
          src={HERO_CAMPAIGN_IMAGE}
          alt="NextGen CTO Campus Ambassador Program"
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 52vw"
          className="object-contain"
        />
      </div>
    </CampaignImageFrame>
  );
}

function MovementVisual({ className }: { className?: string }) {
  return (
    <CampaignImageFrame className={className}>
      <div className="relative aspect-[3/2] w-full">
        <Image
          src={MOVEMENT_CAMPAIGN_IMAGE}
          alt="NextGen CTO student-led campus ambassador movement"
          fill
          sizes="(max-width: 1024px) 100vw, 1180px"
          className="object-contain"
        />
      </div>
    </CampaignImageFrame>
  );
}

function InternshipVisual({ className }: { className?: string }) {
  return (
    <div className={cn('relative w-full', className)}>
      <div className="overflow-hidden rounded-2xl border border-border bg-card p-6 md:p-8">
        <div className="relative mx-auto max-w-md">
          <div className="absolute -right-2 -top-2 rounded-full border border-primary/30 bg-card px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-primary">
            Top Performer
          </div>
          <div className="campus-surface-panel rounded-2xl p-6">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">
              Internship Offer
            </p>
            <p className="mt-3 font-display text-2xl font-bold text-foreground">NextGen CTO</p>
            <div className="mt-5 space-y-2.5">
              <div className="h-2 w-3/4 rounded-full bg-muted" />
              <div className="h-2 w-full rounded-full bg-muted" />
              <div className="h-2 w-5/6 rounded-full bg-muted" />
            </div>
            <div className="mt-7 flex items-center justify-between gap-4">
              <div className="flex size-14 items-center justify-center rounded-xl border border-border bg-card">
                <svg viewBox="0 0 24 24" className="size-7 text-primary" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                  <rect x="3" y="4" width="18" height="12" rx="2" />
                  <path d="M2 20h20" />
                </svg>
              </div>
              <div className="flex size-16 items-center justify-center rounded-full border-2 border-primary bg-primary/5">
                <svg viewBox="0 0 24 24" className="size-8 text-primary" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function WhoShouldApplyVisual({ className }: { className?: string }) {
  const tags = ['Coding', 'AI', 'Community', 'Leadership', 'Content', 'Events'];

  return (
    <div
      className={cn(
        'campus-surface-panel relative overflow-hidden rounded-[2rem] p-8 md:p-10',
        className,
      )}
    >
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
        Campus Ambassador Candidate
      </p>
      <div className="mt-6 flex items-center gap-4">
        <div className="flex size-20 shrink-0 items-center justify-center rounded-2xl border border-border bg-muted font-display text-2xl font-bold text-foreground">
          AK
        </div>
        <div className="min-w-0">
          <p className="font-display text-2xl font-bold text-foreground">Student Leader</p>
          <p className="mt-1 text-base text-muted-foreground">3rd Year · Computer Science</p>
        </div>
      </div>
      <div className="mt-7 flex flex-wrap gap-2">
        {tags.map((tag) => (
          <span
            key={tag}
            className="rounded-full border border-border bg-muted px-3.5 py-1.5 text-sm font-medium text-foreground"
          >
            {tag}
          </span>
        ))}
      </div>
      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        {['Tech Club', 'Peer Network', 'Campus Community'].map((stat) => (
          <div
            key={stat}
            className="rounded-xl border border-border bg-muted px-4 py-3 text-center text-sm font-medium text-foreground"
          >
            {stat}
          </div>
        ))}
      </div>
    </div>
  );
}

function DashboardVisual({
  className,
  couponCode,
  referralCount = 0,
  milestoneLabel = 'Bronze',
  progressPercent = 0,
}: {
  className?: string;
  couponCode?: string;
  referralCount?: number;
  milestoneLabel?: string;
  progressPercent?: number;
}) {
  return (
    <div className={cn('campus-surface-panel relative overflow-hidden rounded-[2rem] p-8', className)}>
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Ambassador hub</p>
      {couponCode ? (
        <div className="mt-5 rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 px-6 py-5">
          <p className="text-sm text-muted-foreground">Your coupon</p>
          <p className="mt-2 font-mono text-3xl font-bold tracking-[0.18em] text-primary md:text-4xl">
            {couponCode}
          </p>
        </div>
      ) : null}
      <div className="mt-5 grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-muted p-4">
          <p className="text-sm text-muted-foreground">Referrals</p>
          <p className="font-display text-3xl font-bold text-foreground">{referralCount}</p>
        </div>
        <div className="rounded-xl border border-border bg-muted p-4">
          <p className="text-sm text-muted-foreground">Milestone</p>
          <p className="font-display text-lg font-bold text-foreground">{milestoneLabel}</p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function CampusCampaignVisual({
  variant,
  className,
  couponCode,
  referralCount,
  milestoneLabel,
  progressPercent,
}: CampusCampaignVisualProps) {
  switch (variant) {
    case 'hero':
      return <HeroVisual className={className} />;
    case 'internship':
      return <InternshipVisual className={className} />;
    case 'movement':
      return <MovementVisual className={className} />;
    case 'who-should-apply':
      return <WhoShouldApplyVisual className={className} />;
    case 'dashboard':
      return (
        <DashboardVisual
          className={className}
          couponCode={couponCode}
          referralCount={referralCount}
          milestoneLabel={milestoneLabel}
          progressPercent={progressPercent}
        />
      );
    default:
      return null;
  }
}

export function RewardSilhouette({ type }: { type: 'shirt' | 'hoodie' | 'mug' | 'certificate' | 'gift' | 'badge' | 'mentorship' }) {
  const shared = 'mx-auto h-20 w-20 text-primary opacity-70';
  switch (type) {
    case 'shirt':
      return (
        <svg viewBox="0 0 80 80" className={shared} fill="none" aria-hidden>
          <path d="M28 18h24l8 10v38H20V28l8-10z" stroke="currentColor" strokeWidth="2" fill="oklch(from currentcolor l c h / 0.08)" />
          <path d="M32 18V12h16v6" stroke="currentColor" strokeWidth="2" />
        </svg>
      );
    case 'hoodie':
      return (
        <svg viewBox="0 0 80 80" className={shared} fill="none" aria-hidden>
          <path d="M24 24c0-6 6-10 16-10s16 4 16 10v34H24V24z" stroke="currentColor" strokeWidth="2" fill="oklch(from currentcolor l c h / 0.08)" />
          <path d="M24 30l-8 6v8l8-4M56 30l8 6v8l-8-4" stroke="currentColor" strokeWidth="2" />
        </svg>
      );
    case 'mug':
      return (
        <svg viewBox="0 0 80 80" className={shared} fill="none" aria-hidden>
          <rect x="22" y="24" width="30" height="36" rx="4" stroke="currentColor" strokeWidth="2" fill="oklch(from currentcolor l c h / 0.08)" />
          <path d="M52 32h8a8 8 0 010 16h-8" stroke="currentColor" strokeWidth="2" />
        </svg>
      );
    case 'certificate':
      return (
        <svg viewBox="0 0 80 80" className={shared} fill="none" aria-hidden>
          <rect x="16" y="20" width="48" height="40" rx="3" stroke="currentColor" strokeWidth="2" fill="oklch(from currentcolor l c h / 0.06)" />
          <circle cx="40" cy="52" r="8" stroke="currentColor" strokeWidth="2" />
          <path d="M20 30h40M20 38h28" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
        </svg>
      );
    case 'gift':
      return (
        <svg viewBox="0 0 80 80" className={shared} fill="none" aria-hidden>
          <rect x="20" y="34" width="40" height="28" rx="2" stroke="currentColor" strokeWidth="2" fill="oklch(from currentcolor l c h / 0.08)" />
          <path d="M40 34V62M20 42h40" stroke="currentColor" strokeWidth="2" />
          <path d="M40 34c-8 0-12-6-8-10s10-2 8 4c2-6 12-4 8 6" stroke="currentColor" strokeWidth="2" />
        </svg>
      );
    case 'badge':
      return (
        <svg viewBox="0 0 80 80" className={shared} fill="none" aria-hidden>
          <circle cx="40" cy="36" r="18" stroke="currentColor" strokeWidth="2" fill="oklch(from currentcolor l c h / 0.08)" />
          <path d="M32 54l8 10 8-10" stroke="currentColor" strokeWidth="2" />
          <path d="M34 36l4 4 8-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case 'mentorship':
      return (
        <svg viewBox="0 0 80 80" className={shared} fill="none" aria-hidden>
          <circle cx="30" cy="32" r="10" stroke="currentColor" strokeWidth="2" />
          <circle cx="52" cy="32" r="10" stroke="currentColor" strokeWidth="2" />
          <path d="M18 58c4-10 14-14 22-14s18 4 22 14" stroke="currentColor" strokeWidth="2" />
        </svg>
      );
    default:
      return null;
  }
}
