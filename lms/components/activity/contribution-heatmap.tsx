'use client';

import { useMemo, useState, useDeferredValue, type CSSProperties } from 'react';
import { CircleHelp } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  buildHeatmapGrid,
  getAvailableHeatmapYears,
  getContributionLevel,
  getHeatmapActivityTooltip,
  getHeatmapLevelClass,
  getHeatmapLevelStyle,
  type HeatmapDayCell,
} from '@/lib/activity/heatmap-utils';

const CELL_PX = 12;
const GAP_PX = 3;
const MONTH_GAP_PX = 12;

const DAY_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', ''];

type ContributionHeatmapProps = {
  dailyCounts: Record<string, number>;
  className?: string;
};

function cellStyle(): CSSProperties {
  return {
    width: CELL_PX,
    height: CELL_PX,
    flexShrink: 0,
  };
}

const monthBlockWidth = (weekCount: number) =>
  weekCount * CELL_PX + Math.max(0, weekCount - 1) * GAP_PX;

export function ContributionHeatmap({ dailyCounts, className = '' }: ContributionHeatmapProps) {
  const deferredDailyCounts = useDeferredValue(dailyCounts);

  const availableYears = useMemo(
    () => getAvailableHeatmapYears(deferredDailyCounts),
    [deferredDailyCounts],
  );

  const defaultYear = availableYears[0] ?? new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(defaultYear);

  const activeYear = availableYears.includes(selectedYear) ? selectedYear : defaultYear;

  const { monthGroups, maxCount, activeDays, totalActivity, maxStreak, year } = useMemo(
    () => buildHeatmapGrid(deferredDailyCounts, { year: activeYear }),
    [deferredDailyCounts, activeYear],
  );

  const renderCell = (day: HeatmapDayCell | null, key: string) => {
    const base = 'rounded-[3px] shrink-0';
    if (!day) {
      return (
        <div
          key={key}
          className={`${base} bg-transparent border border-transparent`}
          style={cellStyle()}
          aria-hidden
        />
      );
    }

    const level = getContributionLevel(day.count, maxCount);
    const hasActivity = level > 0;
    const tooltip = getHeatmapActivityTooltip(day.date, day.count);

    return (
      <Tooltip key={key}>
        <TooltipTrigger asChild>
          <div
            className={`${base} cursor-default ${hasActivity ? 'border border-primary/25' : getHeatmapLevelClass(0)}`}
            style={{
              ...cellStyle(),
              ...(hasActivity ? getHeatmapLevelStyle(day.count, maxCount) : {}),
            }}
            aria-label={tooltip}
          />
        </TooltipTrigger>
        <TooltipContent side="top" sideOffset={6} className="text-xs">
          {tooltip}
        </TooltipContent>
      </Tooltip>
    );
  };

  return (
    <div className={`w-full space-y-4 ${className}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-2">
          <p className="text-sm text-foreground">
            <span className="font-semibold">{totalActivity}</span>
            <span className="text-muted-foreground"> activity in {year}</span>
          </p>
          <CircleHelp className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground sm:justify-end">
          <span>
            Total active days:{' '}
            <span className="font-medium text-foreground">{activeDays}</span>
          </span>
          <span>
            Max streak: <span className="font-medium text-foreground">{maxStreak}</span>
          </span>
          <Select
            value={String(activeYear)}
            onValueChange={(value) => setSelectedYear(Number(value))}
          >
            <SelectTrigger size="sm" className="h-8 w-[92px] bg-card text-xs">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent align="end">
              {availableYears.map((y) => (
                <SelectItem key={y} value={String(y)} className="text-xs">
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <TooltipProvider delayDuration={150}>
        <div className="overflow-x-auto pb-1">
          <div className="inline-flex min-w-0 items-start gap-2">
            <div className="flex shrink-0 flex-col" style={{ gap: GAP_PX }}>
              {DAY_LABELS.map((label) => (
                <span
                  key={label}
                  className="flex w-7 shrink-0 items-center justify-end pr-1 text-[10px] font-medium text-muted-foreground"
                  style={{ height: CELL_PX, lineHeight: `${CELL_PX}px` }}
                >
                  {label}
                </span>
              ))}
            </div>

            <div className="inline-flex" style={{ gap: MONTH_GAP_PX }}>
              {monthGroups.map((group) => (
                <div
                  key={group.id}
                  className="flex shrink-0 flex-col"
                  style={{ gap: 6, contentVisibility: 'auto', containIntrinsicSize: `0 ${group.weeks.length * 7 * (CELL_PX + GAP_PX)}px` }}
                >
                  <div className="flex" style={{ gap: GAP_PX }}>
                    {group.weeks.map((week, wi) => {
                      const weekKey = week.find((d) => d?.date)?.date ?? `${group.id}-w${wi}`;
                      return (
                        <div key={weekKey} className="flex flex-col" style={{ gap: GAP_PX }}>
                          {week.map((day, di) =>
                            renderCell(day, day?.date ?? `${weekKey}-pad-${di}`),
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <span
                    className="text-[10px] font-medium text-muted-foreground"
                    style={{ width: monthBlockWidth(group.weeks.length) }}
                  >
                    {group.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </TooltipProvider>

      <div className="flex flex-col gap-2 border-t border-border/50 pt-3 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-xs text-muted-foreground">
          Darker squares = more activity that day
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground">Less</span>
          <div className="flex gap-1.5">
            {([0, 1, 2, 3, 4] as const).map((level) => (
              <div
                key={level}
                className={`rounded-[3px] shrink-0 ${getHeatmapLevelClass(level)}`}
                style={{
                  width: CELL_PX,
                  height: CELL_PX,
                  ...(level > 0
                    ? getHeatmapLevelStyle(
                        Math.max(1, Math.ceil(maxCount * (level / 4))),
                        maxCount,
                      )
                    : {}),
                }}
              />
            ))}
          </div>
          <span className="text-[10px] text-muted-foreground">More</span>
        </div>
      </div>
    </div>
  );
}
