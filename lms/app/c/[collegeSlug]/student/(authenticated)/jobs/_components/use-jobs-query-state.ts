'use client';

import { useState, useEffect, useCallback, useTransition } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

export type SortField = 'title' | 'company_name' | 'location' | 'work_mode' | 'employment_type' | 'application_deadline';
export type SortOrder = 'asc' | 'desc' | null;

export function useJobsQueryState() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isPending, startTransition] = useTransition();
  const urlSearch = searchParams.get('search') || '';
  const [searchTerm, setSearchTerm] = useState(urlSearch);

  // Synchronize local search term when URL changes externally
  useEffect(() => {
    setSearchTerm(urlSearch);
  }, [urlSearch]);

  const updateQuery = useCallback((updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '' || value === 'all') {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });
    if (!Object.prototype.hasOwnProperty.call(updates, 'page')) {
      params.delete('page');
    }
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }, [pathname, router, searchParams]);

  // Debounced search trigger
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm !== urlSearch) {
        updateQuery({ search: searchTerm });
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm, urlSearch, updateQuery]);

  const workModeFilter = searchParams.get('workMode') || 'all';
  const employmentTypeFilter = searchParams.get('employmentType') || 'all';
  const sortField = searchParams.get('sortBy') as SortField | null;
  const sortOrder = searchParams.get('sortOrder') as SortOrder;

  const handleWorkModeChange = (mode: string) => {
    updateQuery({ workMode: mode });
  };

  const handleEmploymentTypeChange = (type: string) => {
    updateQuery({ employmentType: type });
  };

  const clearFilters = () => {
    setSearchTerm('');
    updateQuery({
      search: null,
      workMode: null,
      employmentType: null,
      sortBy: null,
      sortOrder: null,
      page: null,
    });
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortOrder === 'asc') {
        updateQuery({ sortBy: field, sortOrder: 'desc' });
      } else if (sortOrder === 'desc') {
        updateQuery({ sortBy: null, sortOrder: null });
      } else {
        updateQuery({ sortBy: field, sortOrder: 'asc' });
      }
    } else {
      updateQuery({ sortBy: field, sortOrder: 'asc' });
    }
  };

  return {
    isPending,
    searchTerm,
    setSearchTerm,
    workModeFilter,
    employmentTypeFilter,
    sortField,
    sortOrder,
    handleWorkModeChange,
    handleEmploymentTypeChange,
    clearFilters,
    toggleSort,
    updateQuery,
  };
}
