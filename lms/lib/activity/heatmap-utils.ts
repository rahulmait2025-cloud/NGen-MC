import type { CSSProperties } from 'react';
import { computeStreaks } from '@/lib/profile/activity-stats';

const CALENDAR_FORMATTER = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' });

const calendarFormatterCache = new Map<string, Intl.DateTimeFormat>([
  ['Asia/Kolkata', CALENDAR_FORMATTER],
]);

function getCalendarFormatter(timeZone: string): Intl.DateTimeFormat {
  let fmt = calendarFormatterCache.get(timeZone);
  if (!fmt) {
     
    fmt = new Intl.DateTimeFormat('en-CA', { timeZone });
    calendarFormatterCache.set(timeZone, fmt);
  }
  return fmt;
}

/** Calendar day YYYY-MM-DD in a given IANA timezone. */
export function toActivityCalendarDay(
  isoTimestamp: string,
  timeZone = 'Asia/Kolkata',
): string {
  const d = new Date(isoTimestamp);
  if (Number.isNaN(d.getTime())) return '';
  return getCalendarFormatter(timeZone).format(d);
}

export function getTodayCalendarDay(timeZone = 'Asia/Kolkata'): string {
  return getCalendarFormatter(timeZone).format(new Date());
}

export type HeatmapDayCell = { date: string; count: number; month: number };

export type HeatmapWeek = (HeatmapDayCell | null)[];

/** e.g. "May 19, 2026" from YYYY-MM-DD */
function formatHeatmapDayLabel(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/** e.g. "0 activity on May 19, 2026" or "3 activities on May 19, 2026" */
export function getHeatmapActivityTooltip(dateStr: string, count: number): string {
  const noun = count === 1 || count === 0 ? 'activity' : 'activities';
  return `${count} ${noun} on ${formatHeatmapDayLabel(dateStr)}`;
}

export type HeatmapMonthGroup = {
  id: string;
  label: string;
  monthIndex: number;
  weeks: HeatmapWeek[];
};

export type HeatmapGrid = {
  year: number;
  weeks: HeatmapWeek[];
  monthGroups: HeatmapMonthGroup[];
  maxCount: number;
  activeDays: number;
  totalActivity: number;
  maxStreak: number;
};

/** Map daily count → contribution level 0–4 (GitHub-style buckets). */
export function getContributionLevel(count: number, maxCount: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0) return 0;
  if (maxCount <= 1) return 4;
  const ratio = count / maxCount;
  if (ratio <= 0.25) return 1;
  if (ratio <= 0.5) return 2;
  if (ratio <= 0.75) return 3;
  return 4;
}

const LEVEL_CELL_CLASS: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: 'bg-muted/50 border border-border/90',
  1: 'bg-primary/20 border border-primary/15',
  2: 'bg-primary/40 border border-primary/25',
  3: 'bg-primary/65 border border-primary/35',
  4: 'bg-primary border border-primary/50',
};

export function getHeatmapLevelClass(level: 0 | 1 | 2 | 3 | 4): string {
  return LEVEL_CELL_CLASS[level];
}

/** Optional smooth fill for active cells (theme primary). */
export function getHeatmapLevelStyle(
  count: number,
  maxCount: number,
): CSSProperties | undefined {
  if (count <= 0) return undefined;
  const ratio = Math.min(1, count / Math.max(1, maxCount));
  const mixPercent = Math.round(20 + ratio * 80);
  return {
    backgroundColor: `color-mix(in oklch, var(--primary) ${mixPercent}%, var(--muted))`,
  };
}

function parseCalendarDayParts(dateStr: string): { y: number; m: number; d: number } {
  const [y, m, d] = dateStr.split('-').map(Number);
  return { y, m, d };
}

function formatCalendarDay(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function addCalendarDays(dateStr: string, delta: number): string {
  const { y, m, d } = parseCalendarDayParts(dateStr);
  const dt = new Date(y, m - 1, d + delta);
  return formatCalendarDay(dt.getFullYear(), dt.getMonth() + 1, dt.getDate());
}

function mondayOnOrBefore(dateStr: string): string {
  const { y, m, d } = parseCalendarDayParts(dateStr);
  const dt = new Date(y, m - 1, d);
  const weekday = dt.getDay();
  const daysSinceMonday = weekday === 0 ? 6 : weekday - 1;
  return addCalendarDays(dateStr, -daysSinceMonday);
}

function isDayInYear(dateStr: string, year: number): boolean {
  return dateStr.startsWith(`${year}-`);
}

function monthIndexFromDate(dateStr: string): number {
  return parseCalendarDayParts(dateStr).m - 1;
}

function buildMonthGroups(weeks: HeatmapWeek[], year: number): HeatmapMonthGroup[] {
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const groups: HeatmapMonthGroup[] = [];

  const firstDayInYearByWeek = new Map<HeatmapWeek, HeatmapDayCell | undefined>();
  for (const week of weeks) {
    for (const day of week) {
      if (day && isDayInYear(day.date, year)) {
        firstDayInYearByWeek.set(week, day);
        break;
      }
    }
  }

  for (const week of weeks) {
    const firstInYear = firstDayInYearByWeek.get(week);
    if (!firstInYear) continue;

    const monthIndex = firstInYear.month;
    const label = monthNames[monthIndex] ?? '';
    const last = groups[groups.length - 1];
    if (last && last.monthIndex === monthIndex) {
      last.weeks.push(week);
    } else {
      groups.push({
        id: `${year}-${firstInYear.date}`,
        label,
        monthIndex,
        weeks: [week],
      });
    }
  }

  return groups;
}

export function getAvailableHeatmapYears(
  dailyCounts: Record<string, number>,
  options?: { timeZone?: string },
): number[] {
  const timeZone = options?.timeZone ?? 'Asia/Kolkata';
  const currentYear = parseInt(getTodayCalendarDay(timeZone).slice(0, 4), 10);
  const years = new Set<number>([currentYear]);

  for (const day of Object.keys(dailyCounts)) {
    const year = parseInt(day.slice(0, 4), 10);
    if (!Number.isNaN(year)) years.add(year);
  }

  return Array.from(years).sort((a, b) => b - a);
}

/** Calendar-year grid (Jan–Dec); current year ends at today. */
export function buildHeatmapGrid(
  dailyCounts: Record<string, number>,
  options?: { year?: number; timeZone?: string },
): HeatmapGrid {
  const timeZone = options?.timeZone ?? 'Asia/Kolkata';
  const today = getTodayCalendarDay(timeZone);
  const currentYear = parseInt(today.slice(0, 4), 10);
  const year = options?.year ?? currentYear;

  const yearStart = `${year}-01-01`;
  const yearEnd = year === currentYear ? today : `${year}-12-31`;
  const gridStart = mondayOnOrBefore(yearStart);

  const weeks: HeatmapWeek[] = [];
  let currentWeek: HeatmapWeek = [];
  let cursor = gridStart;

  while (cursor <= yearEnd) {
    const inYear = isDayInYear(cursor, year);
    const notFuture = cursor <= today;

    if (inYear && notFuture) {
      currentWeek.push({
        date: cursor,
        count: dailyCounts[cursor] ?? 0,
        month: monthIndexFromDate(cursor),
      });
    } else {
      currentWeek.push(null);
    }

    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }

    cursor = addCalendarDays(cursor, 1);
  }

  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) currentWeek.push(null);
    weeks.push(currentWeek);
  }

  const yearCounts: Record<string, number> = {};
  for (const [day, count] of Object.entries(dailyCounts)) {
    if (isDayInYear(day, year) && day <= today && count > 0) {
      yearCounts[day] = count;
    }
  }

  const activeDayKeys = Object.keys(yearCounts);
  const counts = Object.values(yearCounts);
  const maxCount = Math.max(1, ...counts, 0);
  const activeDays = activeDayKeys.length;
  const totalActivity = counts.reduce((sum, c) => sum + c, 0);
  const maxStreak = computeStreaks(new Set(activeDayKeys)).best;

  return {
    year,
    weeks,
    monthGroups: buildMonthGroups(weeks, year),
    maxCount,
    activeDays,
    totalActivity,
    maxStreak,
  };
}
