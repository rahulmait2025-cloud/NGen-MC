'use client';

import { useEffect, useReducer } from 'react';
import { useRouter } from 'next/navigation';
import { FilterX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { CollegeVideoAnalyticsFilters } from '@/lib/services/college-video-analytics';
import {
  buildVideoAnalyticsSearchParams,
  hasVideoAnalyticsTableFilters,
} from '@/lib/college-admin/analytics/parse-video-analytics-filters';

const COURSE_ALL = '__all__';

const EMPTY_COURSE_OPTIONS: Array<{ id: string; title: string }> = [];

type DraftFilters = {
  search: string;
  status: CollegeVideoAnalyticsFilters['status'];
  courseId: string;
};

type DraftAction =
  | { type: 'SET'; field: keyof DraftFilters; value: string }
  | { type: 'SYNC'; payload: DraftFilters }
  | { type: 'CLEAR' };

function draftReducer(state: DraftFilters, action: DraftAction): DraftFilters {
  switch (action.type) {
    case 'SET':
      return { ...state, [action.field]: action.value };
    case 'SYNC':
      return action.payload;
    case 'CLEAR':
      return { search: '', status: 'all', courseId: COURSE_ALL };
    default:
      return state;
  }
}

export function VideoAnalyticsLeaderboardFilters({
  basePath,
  appliedFilters,
  courseOptions = EMPTY_COURSE_OPTIONS,
}: {
  basePath: string;
  appliedFilters: CollegeVideoAnalyticsFilters;
  courseOptions?: Array<{ id: string; title: string }>;
}) {
  const { push } = useRouter();

  const [draft, dispatch] = useReducer(draftReducer, {
    search: appliedFilters.search ?? '',
    status: appliedFilters.status ?? 'all',
    courseId: appliedFilters.courseId ?? COURSE_ALL,
  });

  useEffect(() => {
    dispatch({
      type: 'SYNC',
      payload: {
        search: appliedFilters.search ?? '',
        status: appliedFilters.status ?? 'all',
        courseId: appliedFilters.courseId ?? COURSE_ALL,
      },
    });
  }, [appliedFilters.search, appliedFilters.status, appliedFilters.courseId]);

  const applyFilters = () => {
    const next: CollegeVideoAnalyticsFilters = {
      search: draft.search.trim() || null,
      status: draft.status ?? 'all',
      courseId: draft.courseId === COURSE_ALL ? null : draft.courseId,
      sortBy: 'watch_time',
      sortDir: 'desc',
    };
    const qs = buildVideoAnalyticsSearchParams(next);
    push(qs ? `${basePath}?${qs}` : basePath);
  };

  const clearFilters = () => {
    dispatch({ type: 'CLEAR' });
    push(basePath);
  };

  const filtersActive = hasVideoAnalyticsTableFilters({
    search: draft.search,
    status: draft.status,
    courseId: draft.courseId,
  });

  return (
    <Card className="card-tier-1 border-0">
      <CardHeader className="px-6 py-4 border-b border-border/30">
        <CardTitle className="text-sm font-semibold">Filter rankings</CardTitle>
      </CardHeader>
      <CardContent className="p-4 sm:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl">
          <div>
            <label htmlFor="lb-filter-search" className="text-xs text-muted-foreground block mb-1">
              Search student
            </label>
            <Input
              id="lb-filter-search"
              placeholder="Name or email"
              value={draft.search}
              onChange={(e) => dispatch({ type: 'SET', field: 'search', value: e.target.value })}
              className="h-9 text-sm"
            />
          </div>
          <div>
            <label htmlFor="lb-filter-course" className="text-xs text-muted-foreground block mb-1">
              Course
            </label>
            <Select
              value={draft.courseId}
              onValueChange={(v) => dispatch({ type: 'SET', field: 'courseId', value: v })}
            >
              <SelectTrigger id="lb-filter-course" className="w-full h-9 text-sm">
                <SelectValue placeholder="All courses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={COURSE_ALL}>All courses</SelectItem>
                {courseOptions.map((course) => (
                  <SelectItem key={course.id} value={course.id}>
                    {course.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label htmlFor="lb-filter-status" className="text-xs text-muted-foreground block mb-1">
              Status
            </label>
            <Select
              value={draft.status ?? 'all'}
              onValueChange={(v) => dispatch({ type: 'SET', field: 'status', value: v })}
            >
              <SelectTrigger id="lb-filter-status" className="w-full h-9 text-sm">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All students</SelectItem>
                <SelectItem value="active">Active watchers</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="completed_lecture">Completed a lecture</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-4">
          <Button type="button" size="sm" onClick={applyFilters} className="rounded-full">
            Apply
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={clearFilters}
            className="rounded-full gap-1.5"
          >
            <FilterX className="size-3.5" />
            Clear
          </Button>
          {filtersActive && (
            <span className="text-xs text-muted-foreground">Filters applied</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
