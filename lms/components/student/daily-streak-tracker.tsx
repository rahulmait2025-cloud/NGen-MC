'use client';

import { useEffect, useRef } from 'react';
import { useTenant } from '@/providers/tenant-provider';
import { useStudentAuth } from '@/providers/student-auth-provider';
import { recordStudentStreak } from '@/lib/api/student-client';

const STREAK_TIMEZONE = 'Asia/Kolkata';

function streakDayKey(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: STREAK_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = new Map(parts.map((part) => [part.type, part.value]));
  return `${values.get('year')}-${values.get('month')}-${values.get('day')}`;
}

/**
 * On first authenticated load per tab session, records today's visit (+1 streak if new day).
 * Server dedupes multiple calls the same calendar day.
 * Non-blocking — failures are silently ignored in production.
 * Uses POST (not GET) because the endpoint mutates DB (INSERT + UPSERT).
 */
export function DailyStreakTracker() {
  const { slug } = useTenant();
  const user = useStudentAuth();
  const ranRef = useRef(false);

  useEffect(() => {
    if (!slug || !user?.id || ranRef.current) return;
    ranRef.current = true;

    const storageKey = `lms_v1:streak-recorded:` + user.id + ':' + streakDayKey();
    if (window.localStorage.getItem(storageKey) === '1') return;

    void recordStudentStreak(slug).then((response) => {
      if (response.ok) window.localStorage.setItem(storageKey, '1');
    }).catch((error) => {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[DailyStreakTracker] Failed to record streak', error);
      }
    });
  }, [slug, user?.id]);

  return null;
}
