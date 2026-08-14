const HOURS_DECIMALS = 2;

/** Coerce unknown numeric values safely. */
export function safeNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** Convert seconds to hours (rounded). */
export function secondsToHours(seconds: number): number {
  const s = safeNumber(seconds);
  if (s <= 0) return 0;
  return Number((s / 3600).toFixed(HOURS_DECIMALS));
}

/** Human-readable hours label for display layers. */
function _formatHours(seconds: number): string {
  const hours = secondsToHours(seconds);
  return `${hours.toLocaleString('en-IN', { maximumFractionDigits: HOURS_DECIMALS })}h`;
}

/** Completion percentage 0–100 from watched vs total duration. */
export function calculateCompletionPercentage(watchedSeconds: number, totalSeconds: number): number {
  const watched = safeNumber(watchedSeconds);
  const total = safeNumber(totalSeconds);
  if (total <= 0) {
    return watched > 0 ? 100 : 0;
  }
  return Math.min(100, Math.round((watched / total) * 100));
}

export interface ProgressCompletionInput {
  watched_seconds: number;
  total_seconds: number;
  completed: boolean;
}

/** Watched = watched_seconds > 0; completed = flag or >= 90% ratio. */
export function isCompletedLecture(row: ProgressCompletionInput): boolean {
  if (row.completed) return true;
  const watched = safeNumber(row.watched_seconds);
  const total = safeNumber(row.total_seconds);
  if (watched <= 0) return false;
  if (total <= 0) return false;
  return watched / total >= 0.9;
}

export function isWatchedLecture(watchedSeconds: number): boolean {
  return safeNumber(watchedSeconds) > 0;
}

/** Pie slices: not started, in progress, completed (catalog-level counts). */
function _buildContentPieData(
  totalAvailable: number,
  watched: number,
  completed: number,
): Array<{ name: string; value: number }> {
  const total = Math.max(0, safeNumber(totalAvailable));
  const watchedCount = Math.min(total, Math.max(0, safeNumber(watched)));
  const completedCount = Math.min(watchedCount, Math.max(0, safeNumber(completed)));
  const notStarted = Math.max(0, total - watchedCount);
  const inProgress = Math.max(0, watchedCount - completedCount);

  const slices = [
    { name: 'Not started', value: notStarted },
    { name: 'In progress', value: inProgress },
    { name: 'Completed', value: completedCount },
  ];
  const filtered = slices.filter((slice) => slice.value > 0);
  if (filtered.length > 0) return filtered;

  // Catalog count is 0 but watch/completed metrics exist — avoid empty pie with hidden engagement.
  const rawWatched = Math.max(0, safeNumber(watched));
  const rawCompleted = Math.min(rawWatched, Math.max(0, safeNumber(completed)));
  if (rawWatched <= 0 && rawCompleted <= 0) return [];

  return [
    { name: 'In progress', value: Math.max(0, rawWatched - rawCompleted) },
    { name: 'Completed', value: rawCompleted },
  ].filter((slice) => slice.value > 0);
}

/** True when pie slices have a positive, finite total for chart rendering. */
function _hasPieChartData(
  slices: Array<{ value: number }>,
): boolean {
  if (!slices?.length) return false;
  const total = slices.reduce((sum, item) => sum + safeNumber(item.value), 0);
  return Number.isFinite(total) && total > 0;
}

/**
 * Pie from lecture watch counts (matches KPI cards).
 * Use on overview/college/student — NOT full catalog size (that dwarfs small activity).
 */
export function buildEngagementActivityPie(
  lecturesWatched: number,
  completedLectures: number,
): Array<{ name: string; value: number }> {
  const watched = Math.max(0, safeNumber(lecturesWatched));
  const completed = Math.min(watched, Math.max(0, safeNumber(completedLectures)));
  const inProgress = Math.max(0, watched - completed);

  return [
    { name: 'Completed', value: completed },
    { name: 'In progress', value: inProgress },
  ].filter((slice) => slice.value > 0);
}

/** Short weekday label for chart axis. */
export function formatDayLabel(date: Date): string {
  return date.toLocaleDateString('en-IN', { weekday: 'short' });
}

/** Week range label e.g. "1–7 Jan". */
export function formatWeekLabel(weekStart: Date, weekEnd: Date): string {
  const startDay = weekStart.getDate();
  const endDay = weekEnd.getDate();
  const month = weekStart.toLocaleDateString('en-IN', { month: 'short' });
  if (weekStart.getMonth() === weekEnd.getMonth()) {
    return `${startDay}–${endDay} ${month}`;
  }
  const endMonth = weekEnd.toLocaleDateString('en-IN', { month: 'short' });
  return `${startDay} ${month} – ${endDay} ${endMonth}`;
}
