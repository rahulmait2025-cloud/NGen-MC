'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Flame, Trophy, TrendingUp } from 'lucide-react';
import { StaggerReveal, StaggerChild } from '@/components/_animations/stagger-reveal';
import { cn } from '@/lib/utils';

interface DashboardStreakCalendarProps {
  currentStreak: number;
  longestStreak: number;
  visitDates: string[];
  activeDaysThisMonth: number;
  todayLocalDate: string;
  joinedAt?: string;
}

function parseLocalDateParts(localDate: string): { year: number; month: number; day: number } {
  const [year, month, day] = localDate.split('-').map(Number);
  return { year, month: month - 1, day };
}

function getMonthData(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startDayOfWeek = firstDay.getDay();
  return { daysInMonth, startDayOfWeek, year, month };
}

function formatDayKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function addDaysToKey(dayKey: string, days: number): string {
  const { year, month, day } = parseLocalDateParts(dayKey);
  const date = new Date(year, month, day);
  date.setDate(date.getDate() + days);
  return formatDayKey(date.getFullYear(), date.getMonth(), date.getDate());
}

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const WEEKDAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function DashboardStreakCalendarBase({
  currentStreak,
  longestStreak,
  visitDates,
  activeDaysThisMonth,
  todayLocalDate,
  joinedAt,
}: DashboardStreakCalendarProps) {
  const today = parseLocalDateParts(todayLocalDate);
  const [viewMonth, setViewMonth] = useState(() => today.month);
  const [viewYear, setViewYear] = useState(() => today.year);

  const visitSet = useMemo(() => new Set(visitDates), [visitDates]);
  const { daysInMonth, startDayOfWeek } = getMonthData(viewYear, viewMonth);

  const streakDays = useMemo(() => {
    const sortedVisits = Array.from(visitSet).sort();
    const currentDays = new Set<string>();
    const pastDays = new Set<string>();
    const todayKey = formatDayKey(today.year, today.month, today.day);
    const yesterdayKey = addDaysToKey(todayKey, -1);

    const addRun = (run: string[]) => {
      if (run.length < 2) return;

      const target = run[run.length - 1] === todayKey || run[run.length - 1] === yesterdayKey ? currentDays : pastDays;
      for (const day of run) {
        target.add(day);
      }
    };

    let run: string[] = [];
    for (const date of sortedVisits) {
      const previous = run[run.length - 1];
      if (!previous || addDaysToKey(previous, 1) === date) {
        run.push(date);
      } else {
        addRun(run);
        run = [date];
      }
    }
    addRun(run);

    return { currentDays, pastDays };
  }, [visitSet, today.year, today.month, today.day]);

  const activeStreak = streakDays.currentDays.size > 0 ? streakDays.currentDays.size : currentStreak;

  const isCurrentMonth = viewYear === today.year && viewMonth === today.month;
  const activeDaysInMonth = useMemo(
    () =>
      isCurrentMonth
        ? activeDaysThisMonth
        : visitDates.filter((date) => date.startsWith(`${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-`)).length,
    [isCurrentMonth, activeDaysThisMonth, visitDates, viewYear, viewMonth],
  );

  const joinedDate = useMemo(() => joinedAt ? new Date(joinedAt) : null, [joinedAt]);

  const isPrevDisabled = useMemo(() => {
    if (!joinedDate) return false;
    const targetMonth = viewMonth === 0 ? 11 : viewMonth - 1;
    const targetYear = viewMonth === 0 ? viewYear - 1 : viewYear;
    const joinedYear = joinedDate.getFullYear();
    const joinedMonth = joinedDate.getMonth();
    return targetYear < joinedYear || (targetYear === joinedYear && targetMonth < joinedMonth);
  }, [joinedDate, viewMonth, viewYear]);

  const isNextDisabled = viewYear === today.year && viewMonth === today.month;

  const prevMonth = useCallback(() => {
    if (isPrevDisabled) return;
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  }, [isPrevDisabled, viewMonth]);

  const nextMonth = useCallback(() => {
    if (isNextDisabled) return;
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }, [isNextDisabled, viewMonth]);

  const cells = useMemo(() => {
    const result: { day: number | null; visited: boolean; isToday: boolean; isCurrentStreak: boolean; isPastStreak: boolean }[] = [];
    for (let i = 0; i < startDayOfWeek; i++) {
      result.push({ day: null, visited: false, isToday: false, isCurrentStreak: false, isPastStreak: false });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const key = formatDayKey(viewYear, viewMonth, d);
      const isToday = d === today.day && viewMonth === today.month && viewYear === today.year;
      const visited = visitSet.has(key);

      const isCurrentStreak = streakDays.currentDays.has(key);
      const isPastStreak = streakDays.pastDays.has(key);

      result.push({ day: d, visited, isToday, isCurrentStreak, isPastStreak });
    }
    return result;
  }, [startDayOfWeek, daysInMonth, viewYear, viewMonth, today, visitSet, streakDays]);

  return (
    <StaggerReveal stagger={0.06} delay={0.15}>
      <StaggerChild>
        <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
          {/* Header */}
          <div className="p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <Flame className="size-5 text-primary flame-icon" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-foreground tracking-tight">Streak</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {activeDaysInMonth > 0
                      ? `${activeDaysInMonth} day${activeDaysInMonth !== 1 ? 's' : ''} active ${isCurrentMonth ? 'this month' : 'that month'}`
                      : 'Start a streak today'}
                  </p>
                </div>
              </div>
            </div>

            {/* Streak stats */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/8">
                <Flame className="size-3.5 text-primary" />
                <span className="text-sm font-bold tabular-nums text-foreground">{activeStreak}</span>
                <span className="text-xs text-muted-foreground">current</span>
              </div>
              <div className="w-px h-5 bg-border/60" />
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/50">
                <Trophy className="size-3.5 text-primary/60" />
                <span className="text-sm font-bold tabular-nums text-foreground">{longestStreak}</span>
                <span className="text-xs text-muted-foreground">best</span>
              </div>
            </div>
          </div>

          {/* Calendar */}
          <div className="px-4 sm:px-5 pb-4 sm:pb-5">
            {/* Month nav */}
            <div className="flex items-center justify-between mb-4">
              <button
                type="button"
                onClick={prevMonth}
                disabled={isPrevDisabled}
                aria-label={`Go to ${MONTH_NAMES[viewMonth === 0 ? 11 : viewMonth - 1]}`}
                className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted/80 transition-all duration-200 disabled:opacity-25 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="size-4 text-muted-foreground" />
              </button>
              <h3 className="text-sm font-semibold text-foreground tabular-nums">
                {MONTH_NAMES[viewMonth]} {viewYear}
              </h3>
              <button
                type="button"
                onClick={nextMonth}
                disabled={isNextDisabled}
                aria-label={`Go to ${MONTH_NAMES[viewMonth === 11 ? 0 : viewMonth + 1]}`}
                className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted/80 transition-all duration-200 disabled:opacity-25 disabled:cursor-not-allowed"
              >
                <ChevronRight className="size-4 text-muted-foreground" />
              </button>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-0 mb-1">
              {WEEKDAYS.map((wd, i) => (
                <div
                  key={wd}
                  className="text-center text-[11px] font-medium text-muted-foreground/70 py-1.5"
                  aria-label={WEEKDAY_LABELS[i]}
                >
                  {wd}
                </div>
              ))}
            </div>

            {/* Day grid */}
            <div className="grid grid-cols-7 gap-0" role="grid" aria-label={`${MONTH_NAMES[viewMonth]} ${viewYear} calendar`}>
              {cells.map((cell, i) => {
                // Connect current streak days, including runs that cross month boundaries
                const hasLeftConnect =
                  cell.isCurrentStreak &&
                  i % 7 !== 0 &&
                  cells[i - 1]?.isCurrentStreak &&
                  cells[i - 1]?.day !== null;
                const hasRightConnect =
                  cell.isCurrentStreak &&
                  i % 7 !== 6 &&
                  cells[i + 1]?.isCurrentStreak &&
                  cells[i + 1]?.day !== null;

                // Connect previous streak runs, even inside the current month
                const hasPastLeftConnect =
                  cell.isPastStreak &&
                  i % 7 !== 0 &&
                  cells[i - 1]?.isPastStreak &&
                  cells[i - 1]?.day !== null;
                const hasPastRightConnect =
                  cell.isPastStreak &&
                  i % 7 !== 6 &&
                  cells[i + 1]?.isPastStreak &&
                  cells[i + 1]?.day !== null;

                // Determine border radius based on connection type
                const leftRound = (hasLeftConnect || hasPastLeftConnect) ? 'rounded-none' : 'rounded-l-[8px]';
                const rightRound = (hasRightConnect || hasPastRightConnect) ? 'rounded-none' : 'rounded-r-[8px]';

                return (
                  <div
                    key={cell.day !== null ? cell.day : `empty-${i}`}
                    className={cn(
                      'flex items-center justify-center aspect-square p-[3px]',
                      (hasLeftConnect || hasPastLeftConnect) && 'pl-0',
                      (hasRightConnect || hasPastRightConnect) && 'pr-0',
                    )}
                  >
                    {cell.day !== null ? (
                      <div
                        role="gridcell"
                        aria-label={`${WEEKDAY_LABELS[i % 7]}, ${MONTH_NAMES[viewMonth]} ${cell.day}${cell.isToday ? ' (today)' : ''}${cell.isCurrentStreak ? ' (current streak day)' : ''}${cell.isPastStreak ? ' (past streak day)' : ''}${cell.visited && !cell.isCurrentStreak && !cell.isPastStreak ? ' (active)' : ''}`}
                        className={cn(
                          'relative flex items-center justify-center w-full h-full text-[12px] font-semibold transition-all duration-200',
                          leftRound,
                          rightRound,
                          // Today: bright orange with ring + glow
                          cell.isToday && 'bg-primary text-primary-foreground font-bold shadow-[0_0_12px_rgba(232,92,26,0.4)] ring-2 ring-primary/40 ring-offset-1 ring-offset-card z-10',
                          // Current streak day: bright orange with subtle glow
                          cell.isCurrentStreak && !cell.isToday && 'bg-primary text-primary-foreground shadow-[0_0_8px_rgba(232,92,26,0.25)]',
                          // Previous streak run: orange fill, regardless of month
                          cell.isPastStreak && 'bg-primary/80 text-primary-foreground',
                          // Active visit that is not part of a streak run: muted dot only
                          cell.visited && !cell.isCurrentStreak && !cell.isPastStreak && !cell.isToday && 'text-muted-foreground/70',
                          // Inactive day
                          !cell.visited && !cell.isToday && 'text-muted-foreground/50 hover:bg-muted/30',
                        )}
                      >
                        {cell.day}
                        {/* Current streak day dot indicator */}
                        {cell.isCurrentStreak && !cell.isToday && (
                          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary-foreground/70" />
                        )}
                        {/* Today's animated dot */}
                        {cell.isToday && (
                          <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-primary-foreground animate-pulse" />
                        )}
                        {/* Active visit not in a streak run: subtle muted dot */}
                        {cell.visited && !cell.isCurrentStreak && !cell.isPastStreak && !cell.isToday && (
                          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary/40" />
                        )}
                        {/* Previous streak run: dot indicator */}
                        {cell.isPastStreak && (
                          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary-foreground/60" />
                        )}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div
              className="flex flex-wrap items-center gap-x-3 gap-y-2 mt-4 pt-3 border-t border-border/40 text-[11px] leading-none text-muted-foreground"
              aria-label="Calendar legend"
            >
              <div className="flex shrink-0 items-center gap-1.5 whitespace-nowrap">
                <div className="size-2.5 rounded-sm bg-primary shadow-[0_0_6px_rgba(232,92,26,0.3)]" />
                <span>Current</span>
              </div>
              <div className="flex shrink-0 items-center gap-1.5 whitespace-nowrap">
                <div className="relative w-2.5 h-2.5 rounded-sm">
                  <div className="absolute inset-0 rounded-sm bg-primary ring-1 ring-primary/40 ring-offset-0.5" />
                </div>
                <span>Today</span>
              </div>
              <div className="flex shrink-0 items-center gap-1.5 whitespace-nowrap">
                <div className="size-2.5 rounded-sm bg-primary/80" />
                <span>Past streak</span>
              </div>
              <div className="flex shrink-0 items-center gap-1.5 whitespace-nowrap">
                <div className="size-1.5 rounded-full bg-primary/40" />
                <span>Active</span>
              </div>
              {longestStreak > activeStreak && (
                <div className="flex shrink-0 items-center gap-1.5 sm:ml-auto whitespace-nowrap">
                  <TrendingUp className="size-3 text-primary/50" />
                  <span>Best {longestStreak}d</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </StaggerChild>
    </StaggerReveal>
  );
}

export const DashboardStreakCalendar = React.memo(DashboardStreakCalendarBase);
