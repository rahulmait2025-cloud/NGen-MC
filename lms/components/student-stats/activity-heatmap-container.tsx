'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { AvailableYearsByPlatform, CodingPlatform, CombinedHeatmapDay, PlatformSyncStatus } from '@/types/student-stats';
import { ActivityHeatmapGrid } from './activity-heatmap-grid';
import { StatsOnboardingEmptyState } from './stats-onboarding-empty-state';
import { getCachedStudentCodingStats, syncStudentPlatformYear } from '@/lib/actions/coding-stats-actions';

export interface CachedYearData {
  activitiesMap: Record<string, CombinedHeatmapDay>;
  syncStatusByPlatform: Record<CodingPlatform, PlatformSyncStatus>;
  isYearFullyCached: boolean;
  warnings: string[];
  fetchedAt: string | null;
}

interface ActivityHeatmapContainerProps {
  initialActivitiesMap: Record<string, CombinedHeatmapDay>;
  initialYear: number;
  initialPlatform?: CodingPlatform | 'combined';
  initialAvailableYears: AvailableYearsByPlatform;
  initialSyncStatus: Record<CodingPlatform, PlatformSyncStatus>;
  initialIsFullyCached?: boolean;
}

export function ActivityHeatmapContainer({
  initialActivitiesMap,
  initialYear,
  initialPlatform = 'combined',
  initialAvailableYears,
  initialSyncStatus,
  initialIsFullyCached = true,
}: ActivityHeatmapContainerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [selectedYear, setSelectedYear] = useState<number>(initialYear);
  const [selectedPlatform, setSelectedPlatform] = useState<CodingPlatform | 'combined'>(initialPlatform);
  const [yearCache, setYearCache] = useState<Record<string, CachedYearData>>({
    [`${initialPlatform}_${initialYear}`]: {
      activitiesMap: initialActivitiesMap,
      syncStatusByPlatform: initialSyncStatus,
      isYearFullyCached: initialIsFullyCached,
      warnings: [],
      fetchedAt: new Date().toISOString(),
    },
  });
  const [availableYears, setAvailableYears] = useState<AvailableYearsByPlatform>(initialAvailableYears);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Check URL query parameters for GitHub OAuth redirect handling
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const urlParams = new URLSearchParams(window.location.search);
    const connected = urlParams.get('connected');
    const importing = urlParams.get('importing');
    const errorParam = urlParams.get('error');

    if (errorParam) {
      if (errorParam === 'oauth_denied') toast.error('GitHub connection denied.');
      else if (errorParam === 'github_account_already_linked') {
        toast.error('This GitHub account is already linked to another student. Please sign into your own GitHub account.', {
          action: {
            label: 'Switch Account',
            onClick: () => {
              window.location.href = '/api/integrations/github/connect';
            },
          },
          duration: 8000,
        });
      } else toast.error('GitHub connection could not be verified.');

      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    if (connected === 'github' || importing === 'github') {
      toast.success('GitHub account connected successfully. Importing coding history…');
      window.history.replaceState({}, document.title, window.location.pathname);
      router.refresh();
    }
  }, [router]);

  const updateUrl = (year: number, platform: CodingPlatform | 'combined') => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('year', String(year));
    params.set('platform', platform);
    router.push(`${pathname}?${params.toString()}`);
  };

  const loadDataForYearAndPlatform = async (year: number, platform: CodingPlatform | 'combined') => {
    const cacheKey = `${platform}_${year}`;
    if (yearCache[cacheKey]) {
      setSelectedYear(year);
      setSelectedPlatform(platform);
      return;
    }

    setIsLoading(true);
    try {
      // Pure DB cached read with ZERO provider API calls
      const cachedData = await getCachedStudentCodingStats(year, platform);

      if (cachedData) {
        setAvailableYears(cachedData.availableYearsByPlatform);

        const warnings: string[] = [];
        if (cachedData.platformErrors) {
          for (const [plat, err] of Object.entries(cachedData.platformErrors)) {
            if (err) warnings.push(`${plat.toUpperCase()}: ${err}`);
          }
        }

        setYearCache((prev) => ({
          ...prev,
          [cacheKey]: {
            activitiesMap: cachedData.activitiesMap || {},
            syncStatusByPlatform: cachedData.syncStatusByPlatform || {
              github: 'uncached',
              leetcode: 'uncached',
              codeforces: 'uncached',
              gfg: 'uncached',
            },
            isYearFullyCached: cachedData.isYearFullyCached || false,
            warnings,
            fetchedAt: cachedData.fetchedAt || new Date().toISOString(),
          },
        }));

        setSelectedYear(cachedData.selectedYear);
        setSelectedPlatform(cachedData.selectedPlatform || platform);
      }
    } catch (err) {
      console.warn('[ActivityHeatmapContainer] Failed to load activity data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleYearChange = (newYear: number) => {
    updateUrl(newYear, selectedPlatform);
    loadDataForYearAndPlatform(newYear, selectedPlatform);
  };

  const handlePlatformChange = (newPlatform: CodingPlatform | 'combined') => {
    const platformYears = availableYears[newPlatform] || availableYears.combined;
    const targetYear = platformYears.length > 0 && !platformYears.includes(selectedYear)
      ? platformYears[0]
      : selectedYear;

    updateUrl(targetYear, newPlatform);
    loadDataForYearAndPlatform(targetYear, newPlatform);
  };

  const handleForceRefresh = async () => {
    setIsLoading(true);
    try {
      const refreshedData = await syncStudentPlatformYear(selectedYear, undefined, true);
      if (refreshedData) {
        const warnings: string[] = [];
        if (refreshedData.platformErrors) {
          for (const [plat, err] of Object.entries(refreshedData.platformErrors)) {
            if (err) warnings.push(`${plat.toUpperCase()}: ${err}`);
          }
        }

        const cacheKey = `${selectedPlatform}_${selectedYear}`;
        setYearCache((prev) => ({
          ...prev,
          [cacheKey]: {
            activitiesMap: refreshedData.activitiesMap || {},
            syncStatusByPlatform: refreshedData.syncStatusByPlatform,
            isYearFullyCached: refreshedData.isYearFullyCached,
            warnings,
            fetchedAt: refreshedData.fetchedAt || new Date().toISOString(),
          },
        }));
        setAvailableYears(refreshedData.availableYearsByPlatform);
      }
    } catch (err) {
      console.warn('[ActivityHeatmapContainer] Force refresh failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const currentCacheKey = `${selectedPlatform}_${selectedYear}`;
  const currentData = yearCache[currentCacheKey] ?? {
    activitiesMap: initialActivitiesMap,
    syncStatusByPlatform: initialSyncStatus,
    isYearFullyCached: false,
    warnings: [],
    fetchedAt: null,
  };

  useEffect(() => {
    const key = `${initialPlatform}_${initialYear}`;
    setYearCache((prev) => ({
      ...prev,
      [key]: {
        activitiesMap: initialActivitiesMap,
        syncStatusByPlatform: initialSyncStatus,
        isYearFullyCached: initialIsFullyCached,
        warnings: [],
        fetchedAt: new Date().toISOString(),
      },
    }));
    setAvailableYears(initialAvailableYears);
    setSelectedYear(initialYear);
    setSelectedPlatform(initialPlatform);

    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      const urlYear = url.searchParams.get('year');
      const urlPlatform = url.searchParams.get('platform');
      if (urlYear !== String(initialYear) || urlPlatform !== initialPlatform) {
        url.searchParams.set('platform', initialPlatform);
        url.searchParams.set('year', String(initialYear));
        window.history.replaceState(null, '', url.pathname + url.search);
      }
    }
  }, [initialActivitiesMap, initialYear, initialPlatform, initialAvailableYears, initialSyncStatus, initialIsFullyCached]);

  const hasAnyAccountLinked = Object.values(initialSyncStatus).some(
    (status) => status !== 'not_configured',
  );

  if (!hasAnyAccountLinked) {
    return <StatsOnboardingEmptyState />;
  }

  return (
    <ActivityHeatmapGrid
      activitiesMap={currentData.activitiesMap}
      selectedYear={selectedYear}
      selectedPlatform={selectedPlatform}
      availableYears={availableYears}
      syncStatus={currentData.syncStatusByPlatform}
      warnings={currentData.warnings}
      isLoading={isLoading}
      onYearChange={handleYearChange}
      onPlatformChange={handlePlatformChange}
      onForceRefresh={handleForceRefresh}
    />
  );
}
