'use client';

import React, { useMemo } from 'react';
import { Clock } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const TIME_COLORS = {
  morning: 'oklch(0.82 0.17 85)',
  afternoon: 'oklch(0.78 0.2 45)',
  evening: 'oklch(0.65 0.22 250)',
  night: 'oklch(0.6 0.22 290)',
  peak: 'var(--primary)',
} as const;

function TimeOfDayBar({ hour, maxHours, isPeak }: { hour: { hour: number; hours: number }; maxHours: number; isPeak: boolean }) {
  const heightPercent = maxHours > 0 ? (hour.hours / maxHours) * 100 : 0;
  let barColor: string = 'oklch(0.92 0.01 250)';
  if (isPeak) barColor = TIME_COLORS.peak;
  else if (hour.hour >= 5 && hour.hour < 12) barColor = TIME_COLORS.morning;
  else if (hour.hour >= 12 && hour.hour < 17) barColor = TIME_COLORS.afternoon;
  else if (hour.hour >= 17 && hour.hour < 21) barColor = TIME_COLORS.evening;
  else if (hour.hour >= 21 || hour.hour < 5) barColor = TIME_COLORS.night;

  const label = `${hour.hour.toString().padStart(2, '0')}:00`;
  const displayHours = hour.hours >= 1 ? `${hour.hours.toFixed(1)}h` : `${Math.round(hour.hours * 60)}m`;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
            <div className="w-full h-[100px] flex items-end" aria-label={`${label} — ${displayHours}`}>
              <div
                className="w-full rounded-t-sm transition-[height] duration-300 ease-out"
                style={{ height: `${Math.max(heightPercent, 3)}%`, background: barColor }}
              />
            </div>
            {hour.hour % 3 === 0 && <span className="text-[10px] text-muted-foreground tabular-nums">{hour.hour.toString().padStart(2, '0')}</span>}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs font-medium">{label} — {displayHours} watched</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function StudyTimesChart({ hourly, peakHourIndex }: { hourly: { hour: number; hours: number }[]; peakHourIndex: number }) {
  const activeHours = useMemo(() => {
    const sorted = [...hourly].sort((a, b) => a.hour - b.hour);
    const nonZero = sorted.filter(h => h.hours > 0);
    if (nonZero.length === 0) return sorted.map(h => ({ ...h, displayHours: h.hours }));
    const p95Idx = Math.floor(nonZero.length * 0.95);
    const p95Value = nonZero[p95Idx]?.hours ?? nonZero[nonZero.length - 1].hours;
    return nonZero.map(h => ({ ...h, displayHours: Math.min(h.hours, p95Value) }));
  }, [hourly]);

  const maxDisplayHours = useMemo(() => Math.max(...activeHours.map(h => h.displayHours), 0.1), [activeHours]);
  const totalHours = useMemo(() => activeHours.reduce((s, h) => s + h.hours, 0), [activeHours]);

  if (activeHours.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        <Clock className="size-5 mx-auto mb-2 opacity-50" />
        No study time data yet
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-1 overflow-x-auto pb-1">
        {activeHours.map((h) => (
          <TimeOfDayBar key={h.hour} hour={h} maxHours={maxDisplayHours} isPeak={h.hour === activeHours[peakHourIndex]?.hour} />
        ))}
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{activeHours.length} active {activeHours.length === 1 ? 'hour' : 'hours'}</span>
        <span>{totalHours >= 1 ? `${totalHours.toFixed(1)}h total` : `${Math.round(totalHours * 60)}m total`}</span>
      </div>
    </div>
  );
}
