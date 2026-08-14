import 'server-only';

import { cache } from 'react';
import { cacheLife, cacheTag } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';

/** Calendar day boundary for streaks (local midnight in this timezone). */
export const STREAK_TIMEZONE =
  process.env.STREAK_TIMEZONE?.trim() || 'Asia/Kolkata';

const streakFormatterCache = new Map<string, Intl.DateTimeFormat>();

const defaultStreakFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: STREAK_TIMEZONE });
streakFormatterCache.set(STREAK_TIMEZONE, defaultStreakFormatter);

function getStreakFormatter(timeZone: string): Intl.DateTimeFormat {
  let fmt = streakFormatterCache.get(timeZone);
  if (!fmt) {
     
    fmt = new Intl.DateTimeFormat('en-CA', { timeZone });
    streakFormatterCache.set(timeZone, fmt);
  }
  return fmt;
}

function getStreakCalendarDay(
  date: Date = new Date(),
  timeZone: string = STREAK_TIMEZONE,
): string {
  return getStreakFormatter(timeZone).format(date);
}

function getYesterdayCalendarDay(
  timeZone: string = STREAK_TIMEZONE,
): string {
  const now = new Date();
  return getStreakCalendarDay(new Date(now.getTime() - 24 * 60 * 60 * 1000), timeZone);
}

export type DailyStreakResult = {
  currentStreak: number;
  longestStreak: number;
  lastVisitDate: string | null;
  today: string;
  /** True when this request newly counted today (first visit of the day). */
  incrementedToday: boolean;
  activeDates?: string[];
};

function emptyStreakResult(today: string): DailyStreakResult {
  return {
    currentStreak: 0,
    longestStreak: 0,
    lastVisitDate: null,
    today,
    incrementedToday: false,
    activeDates: [],
  };
}

function isStreakTableMissing(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  if (error.code === 'PGRST205') return true;
  const message = error.message ?? '';
  return message.includes('student_streaks') || message.includes('student_daily_visits');
}

let streakTablesMissingLogged = false;

function logStreakTablesMissingOnce(): void {
  if (streakTablesMissingLogged) return;
  streakTablesMissingLogged = true;
  const hint =
    'Run scripts/add-student-daily-streak.sql in Supabase SQL Editor, or: node scripts/run-streak-migration.mjs';
  if (process.env.NODE_ENV === 'development') {
    console.warn(`[streak] Tables missing. ${hint}`);
  }
}

/**
 * Records today's first visit (idempotent) and updates consecutive-day streak.
 * +1 only once per calendar day; next +1 only after midnight in STREAK_TIMEZONE.
 * Wrapped with React.cache so multiple calls within the same render deduplicate.
 */
export const recordDailyVisitAndGetStreak = cache(
  async function recordDailyVisitAndGetStreakInner(
    studentId: string,
  ): Promise<DailyStreakResult> {
  const admin = createAdminClient();
  const today = getStreakCalendarDay();
  const yesterday = getYesterdayCalendarDay();

  const [{ data: existingVisit, error: visitLookupError }, { data: streakRow, error: streakLookupError }] = await Promise.all([
    admin
      .from('student_daily_visits')
      .select('id')
      .eq('student_id', studentId)
      .eq('visit_date', today)
      .maybeSingle(),
    admin
      .from('student_streaks')
      .select('current_streak, longest_streak, last_visit_date')
      .eq('student_id', studentId)
      .maybeSingle(),
  ]);

  if (isStreakTableMissing(visitLookupError) || isStreakTableMissing(streakLookupError)) {
    logStreakTablesMissingOnce();
    return emptyStreakResult(today);
  }

  if (existingVisit) {
    return {
      currentStreak: streakRow?.current_streak ?? 0,
      longestStreak: streakRow?.longest_streak ?? 0,
      lastVisitDate: streakRow?.last_visit_date ?? today,
      today,
      incrementedToday: false,
      activeDates: [],
    };
  }

  const { error: visitInsertError } = await admin.from('student_daily_visits').insert({
    student_id: studentId,
    visit_date: today,
  });

  if (visitInsertError?.code === '23505') {
    return getDailyStreak(studentId);
  }
  if (visitInsertError && isStreakTableMissing(visitInsertError)) {
    return emptyStreakResult(today);
  }
  if (visitInsertError) {
    throw new Error(`Failed to record daily visit: ${visitInsertError.message}`);
  }

  if (isStreakTableMissing(streakLookupError)) {
    return emptyStreakResult(today);
  }

  // Fetch active dates only when recording a new visit (not on existing visit early-return)
  const { data: visits } = await admin
    .from('student_daily_visits')
    .select('visit_date')
    .eq('student_id', studentId)
    .order('visit_date', { ascending: true });

  const activeDates = visits ? visits.map((v) => v.visit_date) : [];

  let currentStreak = 1;
  let longestStreak = 1;

  if (streakRow?.last_visit_date) {
    const last = streakRow.last_visit_date;
    if (last === yesterday) {
      currentStreak = (streakRow.current_streak ?? 0) + 1;
    } else if (last === today) {
      currentStreak = streakRow.current_streak ?? 1;
    } else {
      currentStreak = 1;
    }
    // Trust stored longest_streak; only extend if current streak is now longer.
    // The stored value is maintained by the upsert below and is accurate.
    longestStreak = Math.max(streakRow.longest_streak ?? 0, currentStreak);
  }

  const { error: upsertError } = await admin.from('student_streaks').upsert(
    {
      student_id: studentId,
      current_streak: currentStreak,
      longest_streak: longestStreak,
      last_visit_date: today,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'student_id' },
  );

  if (upsertError && isStreakTableMissing(upsertError)) {
    return emptyStreakResult(today);
  }
  if (upsertError) {
    throw new Error(`Failed to update streak: ${upsertError.message}`);
  }

  const finalActiveDates = activeDates.includes(today) ? activeDates : [...activeDates, today].sort();

  return {
    currentStreak,
    longestStreak,
    lastVisitDate: today,
    today,
    incrementedToday: true,
    activeDates: finalActiveDates,
  };
  },
);

export async function getDailyStreakCached(studentId: string): Promise<DailyStreakResult> {
  'use cache';
  cacheLife('days');
  cacheTag(`student-streak-${studentId}`);
  return getDailyStreak(studentId);
}

async function getDailyStreak(studentId: string): Promise<DailyStreakResult> {
  const admin = createAdminClient();
  const today = getStreakCalendarDay();
  const yesterday = getYesterdayCalendarDay();

  const { data: streakRow, error: streakLookupError } = await admin
    .from('student_streaks')
    .select('current_streak, longest_streak, last_visit_date')
    .eq('student_id', studentId)
    .maybeSingle();

  if (isStreakTableMissing(streakLookupError)) {
    return emptyStreakResult(today);
  }

  const { data: visits } = await admin
    .from('student_daily_visits')
    .select('visit_date')
    .eq('student_id', studentId)
    .order('visit_date', { ascending: true });

  const activeDates = visits ? visits.map((v) => v.visit_date) : [];

  if (!streakRow) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      lastVisitDate: null,
      today,
      incrementedToday: false,
      activeDates,
    };
  }

  const last = streakRow.last_visit_date;
  let currentStreak = streakRow.current_streak ?? 0;

  if (last && last !== today && last !== yesterday) {
    currentStreak = 0;
  }

  // Trust stored longest_streak — it's maintained by recordDailyVisitAndGetStreak upsert
  const longestStreak = streakRow.longest_streak ?? 0;

  return {
    currentStreak,
    longestStreak: Math.max(longestStreak, currentStreak),
    lastVisitDate: last,
    today,
    incrementedToday: false,
    activeDates,
  };
}
