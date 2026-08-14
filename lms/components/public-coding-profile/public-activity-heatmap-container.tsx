'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { AvailableYearsByPlatform, CodingPlatform, CombinedHeatmapDay } from '@/types/student-stats';
import { ActivityHeatmapGrid } from '@/components/student-stats/activity-heatmap-grid';

interface PublicActivityHeatmapContainerProps {
  activitiesMap: Record<string, CombinedHeatmapDay>;
  selectedYear: number;
  selectedPlatform?: CodingPlatform | 'combined';
  availableYearsByPlatform: AvailableYearsByPlatform;
}

export function PublicActivityHeatmapContainer({
  activitiesMap,
  selectedYear,
  selectedPlatform = 'combined',
  availableYearsByPlatform,
}: PublicActivityHeatmapContainerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleYearChange = (newYear: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('year', String(newYear));
    router.push(`${pathname}?${params.toString()}`);
  };

  const handlePlatformChange = (newPlatform: CodingPlatform | 'combined') => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('platform', newPlatform);

    const platformYears = availableYearsByPlatform[newPlatform] || availableYearsByPlatform.combined;
    if (platformYears.length > 0 && !platformYears.includes(selectedYear)) {
      params.set('year', String(platformYears[0]));
    }

    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <ActivityHeatmapGrid
      activitiesMap={activitiesMap}
      selectedYear={selectedYear}
      selectedPlatform={selectedPlatform}
      availableYears={availableYearsByPlatform}
      onYearChange={handleYearChange}
      onPlatformChange={handlePlatformChange}
    />
  );
}
