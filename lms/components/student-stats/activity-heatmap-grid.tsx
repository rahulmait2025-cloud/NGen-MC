'use client';

import { useState, useMemo, useCallback, lazy, Suspense } from 'react';
import { Github, BarChart2, Code, Terminal, Sparkles, CheckCircle2, RefreshCw, Loader2, AlertTriangle } from 'lucide-react';
import { CodePulseFilters } from '@/components/code-pulse/code-pulse-filters';
import {
  AvailableYearsByPlatform,
  CodingPlatform,
  CombinedHeatmapDay,
  PlatformSyncStatus,
} from '@/types/student-stats';

const Calendar = lazy(() => import('@/components/ui/calendar').then((m) => ({ default: m.Calendar })));

interface ActivityHeatmapGridProps {
  activitiesMap: Record<string, CombinedHeatmapDay>;
  selectedYear: number;
  selectedPlatform?: CodingPlatform | 'combined';
  availableYears: AvailableYearsByPlatform;
  syncStatus?: Record<CodingPlatform, PlatformSyncStatus>;
  warnings?: string[];
  isLoading?: boolean;
  onYearChange: (year: number) => void;
  onPlatformChange?: (platform: CodingPlatform | 'combined') => void;
  onForceRefresh?: () => void;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', ''];

function getDaysInYear(year: number): Date[] {
  const dates: Date[] = [];
  const cursor = new Date(Date.UTC(year, 0, 1));
  const end = new Date(Date.UTC(year + 1, 0, 1));

  while (cursor < end) {
    dates.push(new Date(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return dates;
}

function formatUtcDateKey(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

// Local timezone safe date formatter 'YYYY-MM-DD'
function formatLocalDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function ActivityHeatmapGrid({
  activitiesMap,
  selectedYear,
  selectedPlatform = 'combined',
  availableYears,
  syncStatus,
  warnings = [],
  isLoading = false,
  onYearChange: _onYearChange,
  onPlatformChange: _onPlatformChange,
  onForceRefresh,
}: ActivityHeatmapGridProps) {
  const [internalPlatformTab] = useState<CodingPlatform | 'combined'>(selectedPlatform);
  const [viewMode, setViewMode] = useState<'heatmap' | 'calendar'>('heatmap');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  const isPlatformLinked = useCallback((platform: CodingPlatform): boolean => {
    if (!syncStatus) return true;
    return syncStatus[platform] !== 'not_configured';
  }, [syncStatus]);

  const currentTab = selectedPlatform || internalPlatformTab;
  const activePlatformTab = currentTab !== 'combined' && !isPlatformLinked(currentTab) ? 'combined' : currentTab;

  const { dateList, startOffset, numCols, monthLabelPositions, days, totalVisiblePoints } = useMemo(() => {
    const dates = getDaysInYear(selectedYear);
    const jan1 = dates[0];
    const startOffset = jan1.getUTCDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
    const totalDays = dates.length;
    const numCols = Math.ceil((startOffset + totalDays) / 7);

    const monthLabelPositions: { month: string; colIdx: number }[] = [];
    let seenMonth = -1;

    for (let dayIdx = 0; dayIdx < dates.length; dayIdx++) {
      const dateObj = dates[dayIdx];
      const monthIdx = dateObj.getUTCMonth();
      if (monthIdx !== seenMonth) {
        const gridSlot = startOffset + dayIdx;
        const colIdx = Math.floor(gridSlot / 7);
        monthLabelPositions.push({ month: MONTH_NAMES[monthIdx], colIdx });
        seenMonth = monthIdx;
      }
    }

    const days: CombinedHeatmapDay[] = dates.map((dateObj) => {
      const dateStr = formatUtcDateKey(dateObj);
      const existing = activitiesMap[dateStr];

      if (existing) {
        return existing;
      }

      return {
        date: dateStr,
        formattedDate: dateObj.toLocaleDateString('en-US', {
          timeZone: 'UTC',
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
        githubCount: 0,
        leetcodeCount: 0,
        codeforcesCount: 0,
        gfgCount: 0,
        totalPoints: 0,
      };
    });

    const totalVisiblePoints = days.reduce((sum, d) => {
      if (activePlatformTab === 'combined') {
        let daySum = 0;
        if (isPlatformLinked('github')) daySum += d.githubCount;
        if (isPlatformLinked('leetcode')) daySum += d.leetcodeCount;
        if (isPlatformLinked('codeforces')) daySum += d.codeforcesCount;
        if (isPlatformLinked('gfg')) daySum += d.gfgCount;
        return sum + daySum;
      }
      if (activePlatformTab === 'github' && isPlatformLinked('github')) return sum + d.githubCount;
      if (activePlatformTab === 'leetcode' && isPlatformLinked('leetcode')) return sum + d.leetcodeCount;
      if (activePlatformTab === 'codeforces' && isPlatformLinked('codeforces')) return sum + d.codeforcesCount;
      if (activePlatformTab === 'gfg' && isPlatformLinked('gfg')) return sum + d.gfgCount;
      return sum;
    }, 0);

    return {
      dateList: dates,
      startOffset,
      numCols,
      monthLabelPositions,
      days,
      totalVisiblePoints,
    };
  }, [selectedYear, activitiesMap, activePlatformTab, isPlatformLinked]);

  // Check platform sync status for the current active view
  const currentTabStatus: PlatformSyncStatus | 'mixed' =
    activePlatformTab === 'combined'
      ? syncStatus
        ? (Object.values(syncStatus).every((st) => st === 'empty' || st === 'success')
            ? 'success'
            : Object.values(syncStatus).some((st) => st === 'failed')
            ? 'failed'
            : Object.values(syncStatus).some((st) => st === 'uncached' || st === 'pending')
            ? 'uncached'
            : 'mixed')
        : 'success'
      : syncStatus?.[activePlatformTab] || 'uncached';

  const showEmptyBanner = totalVisiblePoints === 0 && !isLoading && (currentTabStatus === 'empty' || currentTabStatus === 'success');
  const showFailedBanner = !isLoading && currentTabStatus === 'failed';

  const getCellColorClass = (day: CombinedHeatmapDay) => {
    let count = 0;
    let type = 'comb';

    const ghCount = isPlatformLinked('github') ? day.githubCount : 0;
    const cfCount = isPlatformLinked('codeforces') ? day.codeforcesCount : 0;
    const lcCount = isPlatformLinked('leetcode') ? day.leetcodeCount : 0;
    const gfgCount = isPlatformLinked('gfg') ? day.gfgCount : 0;

    if (activePlatformTab === 'combined') {
      count = ghCount + cfCount + lcCount + gfgCount;
      if (cfCount > ghCount && cfCount > lcCount && cfCount > gfgCount) type = 'cf';
      else if (lcCount > ghCount && lcCount > cfCount && lcCount > gfgCount) type = 'lc';
      else if (gfgCount > ghCount && gfgCount > cfCount && gfgCount > lcCount) type = 'gfg';
      else type = 'gh';
    } else if (activePlatformTab === 'github') { count = ghCount; type = 'gh'; }
    else if (activePlatformTab === 'codeforces') { count = cfCount; type = 'cf'; }
    else if (activePlatformTab === 'leetcode') { count = lcCount; type = 'lc'; }
    else if (activePlatformTab === 'gfg') { count = gfgCount; type = 'gfg'; }

    if (count === 0) return 'bg-muted/70 dark:bg-muted/30';

    // GitHub: Forest green — growth, commits, open-source roots
    if (type === 'gh') {
      if (count <= 1) return 'bg-[oklch(0.82_0.12_155)] dark:bg-[oklch(0.32_0.08_155)]';
      if (count <= 3) return 'bg-[oklch(0.72_0.16_155)] dark:bg-[oklch(0.42_0.12_155)]';
      if (count <= 5) return 'bg-[oklch(0.62_0.18_155)] dark:bg-[oklch(0.55_0.14_155)]';
      return 'bg-[oklch(0.52_0.2_155)] dark:bg-[oklch(0.65_0.16_155)]';
    }
    // Codeforces: Deep sapphire — competitive, analytical
    if (type === 'cf') {
      if (count <= 1) return 'bg-[oklch(0.82_0.1_260)] dark:bg-[oklch(0.32_0.08_260)]';
      if (count <= 3) return 'bg-[oklch(0.72_0.14_260)] dark:bg-[oklch(0.42_0.12_260)]';
      if (count <= 5) return 'bg-[oklch(0.62_0.16_260)] dark:bg-[oklch(0.55_0.14_260)]';
      return 'bg-[oklch(0.52_0.18_260)] dark:bg-[oklch(0.65_0.15_260)]';
    }
    // LeetCode: Burnt amber — warm, matches brand primary energy
    if (type === 'lc') {
      if (count <= 1) return 'bg-[oklch(0.82_0.12_55)] dark:bg-[oklch(0.35_0.1_55)]';
      if (count <= 3) return 'bg-[oklch(0.72_0.16_50)] dark:bg-[oklch(0.45_0.14_50)]';
      if (count <= 5) return 'bg-[oklch(0.64_0.18_45)] dark:bg-[oklch(0.55_0.16_45)]';
      return 'bg-[oklch(0.55_0.2_42)] dark:bg-[oklch(0.65_0.16_45)]';
    }
    // GFG: Teal — fresh, distinct from GitHub's green
    if (type === 'gfg') {
      if (count <= 1) return 'bg-[oklch(0.84_0.09_175)] dark:bg-[oklch(0.33_0.07_175)]';
      if (count <= 3) return 'bg-[oklch(0.74_0.12_175)] dark:bg-[oklch(0.43_0.1_175)]';
      if (count <= 5) return 'bg-[oklch(0.65_0.14_175)] dark:bg-[oklch(0.55_0.12_175)]';
      return 'bg-[oklch(0.55_0.16_175)] dark:bg-[oklch(0.65_0.13_175)]';
    }
    return 'bg-[oklch(0.62_0.18_155)]';
  };

  const handleCalendarSelect = (date: Date | undefined) => {
    setSelectedDate(date);
  };

  const selectedDateStr = selectedDate ? formatLocalDate(selectedDate) : '';
  const selectedDayData = selectedDateStr ? activitiesMap[selectedDateStr] : null;

  const formattedSelectedDate = selectedDate
    ? selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })
    : 'Select a date';

  return (
    <div className="w-full bg-card border border-border/80 rounded-3xl p-6 sm:p-8 shadow-2xs font-sans relative overflow-hidden">
      {/* Explicit Full Grid Loading State Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-background/70 backdrop-blur-2xs flex flex-col items-center justify-center z-30 rounded-3xl p-6 transition-all duration-300">
          <div className="flex items-center gap-3 px-5 py-3.5 bg-card border border-border/80 rounded-2xl shadow-xl text-sm font-semibold text-foreground animate-pulse">
            <div className="animate-spin"><Loader2 className="w-5 h-5 text-primary" /></div>
            <span>Fetching coding activity history...</span>
          </div>
        </div>
      )}

      {/* Top Controls Bar with Shared CodePulseFilters */}
      <div className="relative">
        <CodePulseFilters
          selectedPlatform={activePlatformTab}
          selectedYear={selectedYear}
          availableYearsByPlatform={availableYears}
          syncStatus={syncStatus}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          isLoading={isLoading}
        />
        {onForceRefresh && (
          <div className="absolute right-0 top-1.5 flex items-center gap-2">
            <button
              onClick={onForceRefresh}
              disabled={isLoading}
              title="Force Refresh Selected Year Data"
              className="p-1.5 rounded-xl border border-border/80 bg-background hover:bg-muted text-muted-foreground hover:text-foreground transition cursor-pointer disabled:opacity-50"
            >
              <div className={isLoading ? 'animate-spin' : ''}><RefreshCw className="w-3.5 h-3.5" /></div>
            </button>
          </div>
        )}
      </div>

      {/* Subtitle Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-muted-foreground mb-4 gap-2">
        <div className="flex items-center gap-2">
          <strong className="text-foreground font-semibold">{totalVisiblePoints} activity points</strong> in {selectedYear}
          {isLoading && (
            <span className="flex items-center gap-1 text-[11px] text-primary font-medium animate-pulse">
              <div className="animate-spin"><Loader2 className="w-3 h-3" /></div> Fetching activity data...
            </span>
          )}
        </div>
        <div className="text-muted-foreground/70">Click any day to view platform activity details inline</div>
      </div>

      {/* Status Banners */}
      {showEmptyBanner && (
        <div className="mb-4 p-3 rounded-2xl bg-muted/40 border border-border/60 text-xs text-muted-foreground text-center font-medium">
          No coding activity was recorded for this year.
        </div>
      )}

      {showFailedBanner && (
        <div className="mb-4 p-3 rounded-2xl bg-[oklch(0.95_0.03_25_/_0.1)] border border-[oklch(0.65_0.2_25_/_0.2)] text-xs text-[oklch(0.55_0.2_25)] dark:text-[oklch(0.75_0.15_25)] flex items-center justify-between gap-2 font-medium">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-[oklch(0.6_0.2_25)]" />
            <span>Some platform data for {selectedYear} could not be loaded.</span>
          </div>
          {onForceRefresh && (
            <button
              onClick={onForceRefresh}
              className="px-3 py-1 rounded-xl bg-[oklch(0.6_0.2_25)] text-white text-[11px] font-semibold hover:opacity-90 transition cursor-pointer"
            >
              Retry Sync
            </button>
          )}
        </div>
      )}

      {warnings.length > 0 && (
        <div className="mb-4 p-3 rounded-2xl bg-[oklch(0.95_0.04_75_/_0.1)] border border-[oklch(0.75_0.15_75_/_0.2)] text-xs text-[oklch(0.55_0.15_75)] dark:text-[oklch(0.75_0.12_75)] space-y-1">
          {warnings.map((w, idx) => (
            <div key={idx} className="flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-[oklch(0.65_0.15_75)]" />
              <span>{w}</span>
            </div>
          ))}
        </div>
      )}

      {/* VIEW MODE 1: 365-Day Contribution Heatmap Grid */}
      {viewMode === 'heatmap' && (
        <div className="space-y-4">
          <div className="overflow-x-auto pb-3 pt-1 relative">
            <div className="min-w-[760px] space-y-2">
              {/* Month Labels Header (Positioned exact to column index) */}
              <div className="relative text-[11px] font-semibold text-muted-foreground/80 h-5 pl-7">
                {monthLabelPositions.map((pos, i) => (
                  <span
                    key={`${pos.month}-${i}`}
                    className="absolute transform -translate-x-1/4"
                    style={{ left: `calc(28px + ${pos.colIdx} * 18px)` }}
                  >
                    {pos.month}
                  </span>
                ))}
              </div>

              {/* Heatmap Grid Row */}
              <div className="flex gap-2 items-start">
                {/* Day of Week Side Labels */}
                <div className="grid grid-rows-7 gap-1 text-[10px] font-semibold text-muted-foreground/70 pr-1 select-none shrink-0 pt-0.5">
                  {DAY_LABELS.map((lbl, i) => (
                    <span key={i} className="h-3.5 flex items-center justify-end leading-none">
                      {lbl}
                    </span>
                  ))}
                </div>

                {/* Exact Columns Grid for selectedYear */}
                <div
                  className="inline-grid grid-flow-col gap-[4px]"
                  style={{ gridTemplateColumns: `repeat(${numCols}, 14px)` }}
                >
                  {Array.from({ length: numCols }).map((_, colIdx) => (
                    <div key={colIdx} className="grid grid-rows-7 gap-[4px]">
                      {Array.from({ length: 7 }).map((_, rowIdx) => {
                        const gridSlot = colIdx * 7 + rowIdx;
                        const dayIdx = gridSlot - startOffset;

                        if (dayIdx < 0 || dayIdx >= dateList.length) {
                          return (
                            <div
                              key={`empty-${colIdx}-${rowIdx}`}
                              className="w-3.5 h-3.5 opacity-0 pointer-events-none"
                            />
                          );
                        }

                        const day = days[dayIdx];
                        const isSelected = selectedDateStr === day.date;

                        return (
                          <div
                            key={day.date}
                            onClick={() => {
                              setSelectedDate(new Date(day.date + 'T00:00:00Z'));
                            }}
                            title={`${day.formattedDate}: ${day.totalPoints} points`}
                            className={`w-3.5 h-3.5 rounded-xs transition-all duration-150 transform hover:scale-130 hover:z-20 cursor-pointer ${getCellColorClass(
                              day
                            )} ${
                              isSelected
                                ? 'border border-foreground/80 scale-110 z-20'
                                : ''
                            }`}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Click Selected Day Live Inspection Breakdown Card */}
          {(() => {
            const selectedDayTotalPoints = selectedDayData
              ? (isPlatformLinked('github') ? selectedDayData.githubCount : 0) +
                (isPlatformLinked('codeforces') ? selectedDayData.codeforcesCount : 0) +
                (isPlatformLinked('leetcode') ? selectedDayData.leetcodeCount : 0) +
                (isPlatformLinked('gfg') ? selectedDayData.gfgCount : 0)
              : 0;

            return (
              <div className="bg-muted/20 border border-border/70 rounded-2xl p-4 transition-all min-h-[115px]">
                <div className="flex items-center justify-between pb-2 mb-3 border-b border-border/60">
                  <span className="text-xs font-bold text-foreground">{formattedSelectedDate}</span>
                  {selectedDayData && selectedDayTotalPoints > 0 ? (
                    <span className="px-2.5 py-0.5 rounded-full bg-[oklch(0.62_0.18_155_/_0.1)] text-[oklch(0.52_0.18_155)] dark:text-[oklch(0.72_0.14_155)] font-bold text-[11px] border border-[oklch(0.62_0.18_155_/_0.2)]">
                      {selectedDayTotalPoints} Points
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground font-medium text-[11px]">
                      0 Points
                    </span>
                  )}
                </div>

                {selectedDayData && selectedDayTotalPoints > 0 ? (
                  <div className="flex flex-wrap gap-2.5 text-xs">
                    {isPlatformLinked('github') && (
                      <div className="flex-1 min-w-[120px] p-2.5 rounded-xl bg-[oklch(0.62_0.18_155_/_0.1)] border border-[oklch(0.62_0.18_155_/_0.2)]">
                        <span className="text-[10px] text-[oklch(0.52_0.18_155)] dark:text-[oklch(0.72_0.14_155)] font-bold block mb-0.5">GitHub</span>
                        <span className="text-sm font-bold text-[oklch(0.45_0.18_155)] dark:text-[oklch(0.78_0.14_155)]">{selectedDayData.githubCount} commits</span>
                      </div>
                    )}
                    {isPlatformLinked('codeforces') && (
                      <div className="flex-1 min-w-[120px] p-2.5 rounded-xl bg-[oklch(0.62_0.16_260_/_0.1)] border border-[oklch(0.62_0.16_260_/_0.2)]">
                        <span className="text-[10px] text-[oklch(0.52_0.16_260)] dark:text-[oklch(0.72_0.12_260)] font-bold block mb-0.5">Codeforces</span>
                        <span className="text-sm font-bold text-[oklch(0.45_0.16_260)] dark:text-[oklch(0.78_0.12_260)]">{selectedDayData.codeforcesCount} subs</span>
                      </div>
                    )}
                    {isPlatformLinked('leetcode') && (
                      <div className="flex-1 min-w-[120px] p-2.5 rounded-xl bg-[oklch(0.64_0.18_45_/_0.1)] border border-[oklch(0.64_0.18_45_/_0.2)]">
                        <span className="text-[10px] text-[oklch(0.55_0.18_45)] dark:text-[oklch(0.75_0.14_45)] font-bold block mb-0.5">LeetCode</span>
                        <span className="text-sm font-bold text-[oklch(0.48_0.18_45)] dark:text-[oklch(0.8_0.14_45)]">{selectedDayData.leetcodeCount} subs</span>
                      </div>
                    )}
                    {isPlatformLinked('gfg') && (
                      <div className="flex-1 min-w-[120px] p-2.5 rounded-xl bg-[oklch(0.65_0.14_175_/_0.1)] border border-[oklch(0.65_0.14_175_/_0.2)]">
                        <span className="text-[10px] text-[oklch(0.55_0.14_175)] dark:text-[oklch(0.74_0.11_175)] font-bold block mb-0.5">GeeksforGeeks</span>
                        <span className="text-sm font-bold text-[oklch(0.48_0.14_175)] dark:text-[oklch(0.78_0.11_175)]">{selectedDayData.gfgCount} subs</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-2 italic">
                    Click any square above to inspect daily activity breakdown.
                  </p>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* VIEW MODE 2: Rich 2-Column Calendar Dashboard View */}
      {viewMode === 'calendar' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 p-5 bg-muted/20 border border-border/60 rounded-3xl mb-4">
          {/* Left Column: Interactive Calendar Picker */}
          <div className="md:col-span-5 flex justify-center items-center">
            <Suspense fallback={<div className="h-[280px] w-[250px] rounded-2xl border border-border bg-card animate-pulse" />}>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleCalendarSelect}
                showOutsideDays={false}
                className="rounded-2xl border border-border bg-card shadow-2xs p-3"
              />
            </Suspense>
          </div>

          {/* Right Column: Live Day Activity Breakdown Panel */}
          <div className="md:col-span-7 flex flex-col justify-between bg-card border border-border/80 rounded-2xl p-5 shadow-2xs">
            <div>
              {(() => {
                const selectedDayTotalPoints = selectedDayData
                  ? (isPlatformLinked('github') ? selectedDayData.githubCount : 0) +
                    (isPlatformLinked('codeforces') ? selectedDayData.codeforcesCount : 0) +
                    (isPlatformLinked('leetcode') ? selectedDayData.leetcodeCount : 0) +
                    (isPlatformLinked('gfg') ? selectedDayData.gfgCount : 0)
                  : 0;

                return (
                  <>
                    <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-border/80">
                      <div>
                        <h4 className="font-heading font-bold text-base text-foreground">{formattedSelectedDate}</h4>
                        <p className="text-xs text-muted-foreground mt-0.5 font-medium">Daily Platform Submissions & Points</p>
                      </div>
                      {selectedDayData && selectedDayTotalPoints > 0 ? (
                        <span className="px-3 py-1 rounded-full bg-[oklch(0.62_0.18_155_/_0.1)] text-[oklch(0.52_0.18_155)] dark:text-[oklch(0.72_0.14_155)] font-bold text-xs border border-[oklch(0.62_0.18_155_/_0.2)]">
                          {selectedDayTotalPoints} Total Points
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full bg-muted text-muted-foreground font-semibold text-xs border border-border/80">
                          0 Points
                        </span>
                      )}
                    </div>

                    {selectedDayData && selectedDayTotalPoints > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-medium">
                        {isPlatformLinked('github') && (
                          <div className="p-4 rounded-xl bg-[oklch(0.62_0.18_155_/_0.1)] border border-[oklch(0.62_0.18_155_/_0.2)] text-[oklch(0.52_0.18_155)] dark:text-[oklch(0.72_0.14_155)]">
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="flex items-center gap-2 font-bold"><Github className="w-4 h-4" /> GitHub</span>
                              <CheckCircle2 className="w-3.5 h-3.5 text-[oklch(0.62_0.18_155)]" />
                            </div>
                            <p className="text-xl font-bold font-heading">{selectedDayData.githubCount} <span className="text-xs font-medium opacity-80">commits</span></p>
                          </div>
                        )}

                        {isPlatformLinked('codeforces') && (
                          <div className="p-4 rounded-xl bg-[oklch(0.62_0.16_260_/_0.1)] border border-[oklch(0.62_0.16_260_/_0.2)] text-[oklch(0.52_0.16_260)] dark:text-[oklch(0.72_0.12_260)]">
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="flex items-center gap-2 font-bold"><BarChart2 className="w-4 h-4 text-[oklch(0.62_0.16_260)]" /> Codeforces</span>
                              <CheckCircle2 className="w-3.5 h-3.5 text-[oklch(0.62_0.16_260)]" />
                            </div>
                            <p className="text-xl font-bold font-heading">{selectedDayData.codeforcesCount} <span className="text-xs font-medium opacity-80">submissions</span></p>
                          </div>
                        )}

                        {isPlatformLinked('leetcode') && (
                          <div className="p-4 rounded-xl bg-[oklch(0.64_0.18_45_/_0.1)] border border-[oklch(0.64_0.18_45_/_0.2)] text-[oklch(0.55_0.18_45)] dark:text-[oklch(0.75_0.14_45)]">
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="flex items-center gap-2 font-bold"><Code className="w-4 h-4 text-[oklch(0.64_0.18_45)]" /> LeetCode</span>
                              <CheckCircle2 className="w-3.5 h-3.5 text-[oklch(0.64_0.18_45)]" />
                            </div>
                            <p className="text-xl font-bold font-heading">{selectedDayData.leetcodeCount} <span className="text-xs font-medium opacity-80">submissions</span></p>
                          </div>
                        )}

                        {isPlatformLinked('gfg') && (
                          <div className="p-4 rounded-xl bg-[oklch(0.65_0.14_175_/_0.1)] border border-[oklch(0.65_0.14_175_/_0.2)] text-[oklch(0.55_0.14_175)] dark:text-[oklch(0.74_0.11_175)]">
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="flex items-center gap-2 font-bold"><Terminal className="w-4 h-4 text-[oklch(0.65_0.14_175)]" /> GeeksforGeeks</span>
                              <CheckCircle2 className="w-3.5 h-3.5 text-[oklch(0.65_0.14_175)]" />
                            </div>
                            <p className="text-xl font-bold font-heading">{selectedDayData.gfgCount} <span className="text-xs font-medium opacity-80">submissions</span></p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="py-8 text-center bg-muted/20 rounded-xl border border-dashed border-border/80">
                        <Sparkles className="w-6 h-6 text-primary mx-auto mb-2 opacity-80" />
                        <p className="text-xs font-semibold text-foreground">No submissions recorded for this date</p>
                        <p className="text-[11px] text-muted-foreground mt-1">Keep building your daily coding activity by solving problems today!</p>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>

            <p className="text-[11px] text-muted-foreground/70 italic mt-4 pt-3 border-t border-border/60">
              Select any date on the calendar to inspect platform-by-platform submission counts.
            </p>
          </div>
        </div>
      )}

      {/* Platform Legend */}
      <div className="flex flex-wrap items-center justify-end gap-5 pt-4 text-xs text-muted-foreground border-t border-border/80 mt-4">
        <span className="text-muted-foreground/70 font-medium">Legend:</span>
        {isPlatformLinked('github') && (
          <div className="flex items-center gap-1.5 font-medium">
            <span className="w-3 h-3 rounded-xs bg-[oklch(0.62_0.18_155)] inline-block"></span> GitHub
          </div>
        )}
        {isPlatformLinked('codeforces') && (
          <div className="flex items-center gap-1.5 font-medium">
            <span className="w-3 h-3 rounded-xs bg-[oklch(0.62_0.16_260)] inline-block"></span> Codeforces
          </div>
        )}
        {isPlatformLinked('leetcode') && (
          <div className="flex items-center gap-1.5 font-medium">
            <span className="w-3 h-3 rounded-xs bg-[oklch(0.64_0.18_45)] inline-block"></span> LeetCode
          </div>
        )}
        {isPlatformLinked('gfg') && (
          <div className="flex items-center gap-1.5 font-medium">
            <span className="w-3 h-3 rounded-xs bg-[oklch(0.65_0.14_175)] inline-block"></span> GFG
          </div>
        )}
      </div>
    </div>
  );
}
