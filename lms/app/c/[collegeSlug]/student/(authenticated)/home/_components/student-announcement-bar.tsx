'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { LazyMotion, domAnimation, m } from 'framer-motion';
import { landingHref } from './landing-content';
import { useLandingReducedMotion } from './landing-motion';
import type { ActiveAnnouncement } from '@/lib/services/announcements';

interface StudentAnnouncementBarProps {
  collegeSlug: string;
  announcement: ActiveAnnouncement | null;
}

interface CountdownValues {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function computeCountdown(expiresAt: string): CountdownValues {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((diff % (1000 * 60)) / 1000),
  };
}

function CountdownTimer({ expiresAt }: { expiresAt: string }) {
  const [values, setValues] = useState(() => computeCountdown(expiresAt));

  useEffect(() => {
    const interval = setInterval(() => {
      setValues(computeCountdown(expiresAt));
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  const units = [
    { label: 'days', value: values.days },
    { label: 'hours', value: values.hours },
    { label: 'minutes', value: values.minutes },
    { label: 'seconds', value: values.seconds },
  ].filter((u) => u.value > 0 || u.label === 'hours' || u.label === 'minutes' || u.label === 'seconds');

  return (
    <div className="inline-flex items-center gap-1.5">
      {units.map((unit, i) => (
        <span key={unit.label} className="inline-flex items-center gap-1">
          <span className="inline-flex items-center justify-center min-w-[28px] h-7 rounded bg-black/80 px-1.5 font-mono text-xs font-bold tabular-nums text-white">
            {String(unit.value).padStart(2, '0')}
          </span>
          <span className="text-[10px] font-medium uppercase tracking-wide text-white hidden sm:inline">{unit.label}</span>
          {i < units.length - 1 && i < 2 && <span className="text-white/60 text-xs hidden sm:inline">:</span>}
        </span>
      ))}
    </div>
  );
}

function CouponBadge({ coupons }: { coupons: ActiveAnnouncement['coupons'] }) {
  if (!coupons) return null;
  const discount = coupons.discount_type === 'percentage'
    ? `${coupons.discount_value}% OFF`
    : `₹${(coupons.discount_value / 100).toFixed(0)} OFF`;
  return (
    <span className="inline-flex items-center bg-white/20 rounded px-2 py-0.5 text-xs font-bold">
      {discount}
    </span>
  );
}

export function StudentAnnouncementBar({ collegeSlug, announcement }: StudentAnnouncementBarProps) {
  const reduceMotion = useLandingReducedMotion();

  if (!announcement) return null;

  const ctaHref = announcement.cta_url || landingHref(collegeSlug, 'courses');
  const isExternal = announcement.cta_url?.startsWith('http');

  return (
    <div className="landing-announcement-bar relative flex w-full items-center overflow-hidden px-4 py-2.5 text-sm sm:px-6 lg:px-8">
      {!reduceMotion && (
        <LazyMotion features={domAnimation}>
          <m.div
            className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent"
            animate={{ x: ['-100%', '200%'] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'linear', repeatDelay: 2 }}
          />
        </LazyMotion>
      )}
      <div className="relative z-[1] flex w-full items-center justify-between gap-3">
        {/* Left: coupon badge + message */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {announcement.type === 'coupon' && (
            <CouponBadge coupons={announcement.coupons} />
          )}
          <span className="min-w-0 truncate leading-snug font-medium tracking-tight landing-announcement-shimmer">
            {announcement.type === 'custom_html'
              ? announcement.title
              : announcement.message || announcement.title}
          </span>
        </div>

        {/* Right: countdown + CTA */}
        <div className="flex items-center gap-3 shrink-0">
          {announcement.expires_at && (
            <CountdownTimer expiresAt={announcement.expires_at} />
          )}
          {announcement.cta_label && (
            isExternal ? (
              <a
                href={ctaHref}
                target="_blank"
                rel="noopener noreferrer"
                className="landing-announcement-cta shrink-0 rounded-full px-4 py-1.5 text-xs font-bold transition-colors"
              >
                {announcement.cta_label}
              </a>
            ) : (
              <Link
                href={ctaHref}
                className="landing-announcement-cta shrink-0 rounded-full px-4 py-1.5 text-xs font-bold transition-colors"
              >
                {announcement.cta_label}
              </Link>
            )
          )}
        </div>
      </div>
    </div>
  );
}
