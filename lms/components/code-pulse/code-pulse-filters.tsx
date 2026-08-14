'use client';

import { useTransition, useCallback } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { LayoutGrid, Github, BarChart2, Code, Terminal, Calendar as CalendarIcon } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AvailableYearsByPlatform, CodingPlatform, PlatformSyncStatus } from '@/types/student-stats';

interface CodePulseFiltersProps {
  selectedPlatform: CodingPlatform | 'combined';
  selectedYear: number;
  availableYearsByPlatform: AvailableYearsByPlatform;
  syncStatus?: Record<CodingPlatform, PlatformSyncStatus>;
  viewMode?: 'heatmap' | 'calendar';
  onViewModeChange?: (mode: 'heatmap' | 'calendar') => void;
  isLoading?: boolean;
}

export function useCodePulseNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const navigateTo = useCallback(
    (newPlatform: CodingPlatform | 'combined', newYear: number) => {
      startTransition(() => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('platform', newPlatform);
        params.set('year', String(newYear));
        router.push(`${pathname}?${params.toString()}`);
      });
    },
    [router, pathname, searchParams]
  );

  return { navigateTo, isPending };
}

export function CodePulseFilters({
  selectedPlatform,
  selectedYear,
  availableYearsByPlatform,
  syncStatus,
  viewMode = 'heatmap',
  onViewModeChange,
  isLoading = false,
}: CodePulseFiltersProps) {
  const { navigateTo, isPending } = useCodePulseNavigation();

  const isPlatformConnected = useCallback(
    (platform: CodingPlatform): boolean => {
      if (!syncStatus) return true;
      return syncStatus[platform] !== 'not_configured';
    },
    [syncStatus]
  );

  const platformYears = availableYearsByPlatform[selectedPlatform] || availableYearsByPlatform.combined || [selectedYear];

  const handleTabChange = (nextPlatform: CodingPlatform | 'combined') => {
    if (nextPlatform === selectedPlatform) return;

    const targetYears = availableYearsByPlatform[nextPlatform] || availableYearsByPlatform.combined;

    // RULE 5: Keep currently selected year if valid for new platform; select newest available ONLY when current year is unavailable.
    let targetYear = selectedYear;
    if (targetYears.length > 0 && !targetYears.includes(selectedYear)) {
      targetYear = targetYears[0];
    }

    navigateTo(nextPlatform, targetYear);
  };

  const handleYearChange = (newYearStr: string) => {
    const newYear = parseInt(newYearStr, 10);
    if (!isNaN(newYear) && newYear !== selectedYear) {
      navigateTo(selectedPlatform, newYear);
    }
  };

  const isBusy = isLoading || isPending;

  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-border/80 mb-6">
      {/* Platform Filter Tabs */}
      <div className="p-1 bg-muted/80 border border-border/60 rounded-2xl flex flex-wrap items-center gap-1 text-xs font-medium relative">
        <button
          onClick={() => handleTabChange('combined')}
          disabled={isBusy}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition cursor-pointer ${
            selectedPlatform === 'combined'
              ? 'bg-card text-foreground font-semibold shadow-2xs border border-border/50'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <LayoutGrid className="w-3.5 h-3.5" /> Combined
        </button>

        {isPlatformConnected('github') && (
          <button
            onClick={() => handleTabChange('github')}
            disabled={isBusy}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition cursor-pointer ${
              selectedPlatform === 'github'
                ? 'bg-card text-foreground font-semibold shadow-2xs border border-border/50'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Github className="w-3.5 h-3.5" /> GitHub
          </button>
        )}

        {isPlatformConnected('codeforces') && (
          <button
            onClick={() => handleTabChange('codeforces')}
            disabled={isBusy}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition cursor-pointer ${
              selectedPlatform === 'codeforces'
                ? 'bg-card text-foreground font-semibold shadow-2xs border border-border/50'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5 text-[oklch(0.62_0.16_260)]" /> Codeforces
          </button>
        )}

        {isPlatformConnected('leetcode') && (
          <button
            onClick={() => handleTabChange('leetcode')}
            disabled={isBusy}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition cursor-pointer ${
              selectedPlatform === 'leetcode'
                ? 'bg-card text-foreground font-semibold shadow-2xs border border-border/50'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Code className="w-3.5 h-3.5 text-[oklch(0.64_0.18_45)]" /> LeetCode
          </button>
        )}

        {isPlatformConnected('gfg') && (
          <button
            onClick={() => handleTabChange('gfg')}
            disabled={isBusy}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition cursor-pointer ${
              selectedPlatform === 'gfg'
                ? 'bg-card text-foreground font-semibold shadow-2xs border border-border/50'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Terminal className="w-3.5 h-3.5 text-[oklch(0.65_0.14_175)]" /> GFG
          </button>
        )}
      </div>

      {/* View Switcher & Year Dropdown */}
      <div className="flex items-center gap-2">
        {onViewModeChange && (
          <div className="p-1 bg-muted/80 border border-border/60 rounded-2xl flex items-center text-xs font-medium">
            <button
              onClick={() => onViewModeChange('heatmap')}
              className={`px-3 py-1 rounded-xl transition cursor-pointer ${
                viewMode === 'heatmap' ? 'bg-card text-foreground font-semibold shadow-2xs' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Heatmap
            </button>
            <button
              onClick={() => onViewModeChange('calendar')}
              className={`flex items-center gap-1 px-3 py-1 rounded-xl transition cursor-pointer ${
                viewMode === 'calendar' ? 'bg-card text-foreground font-semibold shadow-2xs' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5" /> Calendar
            </button>
          </div>
        )}

        {platformYears.length > 0 && (
          <Select
            value={String(selectedYear)}
            onValueChange={handleYearChange}
            disabled={isBusy}
          >
            <SelectTrigger className="h-8 w-[95px] text-xs font-semibold rounded-xl bg-background border-input text-foreground px-3 cursor-pointer shadow-2xs">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent className="rounded-xl font-sans text-xs min-w-[95px]">
              {platformYears.map((y) => (
                <SelectItem key={y} value={String(y)} className="text-xs font-semibold cursor-pointer">
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
    </div>
  );
}
