import type {
  CollegeVideoAnalyticsFilters,
  CollegeVideoAnalyticsSortBy,
  CollegeVideoAnalyticsStatusFilter,
} from '@/lib/services/college-video-analytics';

const SORT_VALUES: CollegeVideoAnalyticsSortBy[] = [
  'watch_time',
  'lectures_watched',
  'completed_lectures',
  'completion_pct',
  'last_active',
];

const STATUS_VALUES: CollegeVideoAnalyticsStatusFilter[] = [
  'all',
  'active',
  'inactive',
  'completed_lecture',
];

function readParam(
  params: Record<string, string | string[] | undefined>,
  key: string,
): string | undefined {
  const value = params[key];
  return typeof value === 'string' ? value : undefined;
}

function parseSortBy(value: string | undefined): CollegeVideoAnalyticsSortBy {
  if (value && SORT_VALUES.includes(value as CollegeVideoAnalyticsSortBy)) {
    return value as CollegeVideoAnalyticsSortBy;
  }
  return 'watch_time';
}

function parseStatus(value: string | undefined): CollegeVideoAnalyticsStatusFilter {
  if (value && STATUS_VALUES.includes(value as CollegeVideoAnalyticsStatusFilter)) {
    return value as CollegeVideoAnalyticsStatusFilter;
  }
  return 'all';
}

export function parseVideoAnalyticsFilters(
  params: Record<string, string | string[] | undefined>,
): CollegeVideoAnalyticsFilters {
  return {
    search: readParam(params, 'q') ?? null,
    courseId: readParam(params, 'course') ?? null,
    from: readParam(params, 'from') ?? null,
    to: readParam(params, 'to') ?? null,
    sortBy: parseSortBy(readParam(params, 'sort')),
    sortDir: readParam(params, 'dir') === 'asc' ? 'asc' : 'desc',
    status: parseStatus(readParam(params, 'status')),
  };
}

export function hasVideoAnalyticsTableFilters(filters: CollegeVideoAnalyticsFilters): boolean {
  return Boolean(
    filters.search?.trim() ||
      filters.courseId ||
      filters.from ||
      filters.to ||
      (filters.status && filters.status !== 'all'),
  );
}

export function parseVideoAnalyticsChartPeriods(
  params: Record<string, string | string[] | undefined>,
): { weekStart: string | null; month: string | null } {
  return {
    weekStart: readParam(params, 'chartWeek') ?? null,
    month: readParam(params, 'chartMonth') ?? null,
  };
}

export function buildVideoAnalyticsSearchParams(
  filters: CollegeVideoAnalyticsFilters,
  chartPeriods?: { weekStart?: string | null; month?: string | null },
): string {
  const params = new URLSearchParams();
  if (filters.search?.trim()) {
    params.set('q', filters.search.trim());
  }
  if (filters.courseId) {
    params.set('course', filters.courseId);
  }
  if (filters.from) {
    params.set('from', filters.from);
  }
  if (filters.to) {
    params.set('to', filters.to);
  }
  if (filters.status && filters.status !== 'all') {
    params.set('status', filters.status);
  }
  if (filters.sortBy && filters.sortBy !== 'watch_time') {
    params.set('sort', filters.sortBy);
  }
  if (filters.sortDir === 'asc') {
    params.set('dir', 'asc');
  }
  if (chartPeriods?.weekStart) {
    params.set('chartWeek', chartPeriods.weekStart);
  }
  if (chartPeriods?.month) {
    params.set('chartMonth', chartPeriods.month);
  }
  return params.toString();
}
