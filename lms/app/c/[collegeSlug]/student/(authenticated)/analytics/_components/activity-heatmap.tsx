'use client';

import React, { useMemo } from 'react';
import type { HeatmapDay } from './unified-analytics';

function ActivityHeatmapBase({ days, useMinutes }: { days: HeatmapDay[]; useMinutes: boolean }) {
  const heatmapData = useMemo(() => {
    if (days.length === 0) return { weeks: [] as { days: (HeatmapDay | null)[] }[] };
    const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));
    const weeks: { days: (HeatmapDay | null)[] }[] = [];
    let currentWeek: (HeatmapDay | null)[] = [];
    
    const firstDate = new Date(sorted[0].date);
    const dayOfWeek = firstDate.getDay();
    // Align with dayLabels: Mon is 0, Tue is 1, ..., Sun is 6
    const startDayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    
    for (let i = 0; i < startDayOffset; i++) {
      currentWeek.push(null);
    }
    
    for (const day of sorted) {
      currentWeek.push(day);
      if (currentWeek.length === 7) {
        weeks.push({ days: currentWeek });
        currentWeek = [];
      }
    }
    
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push(null);
      }
      weeks.push({ days: currentWeek });
    }
    
    return { weeks };
  }, [days]);

  if (days.length === 0) return null;

  const maxHours = Math.max(...days.map(d => d.hours), 0.01);
  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div role="img" aria-label="Activity heatmap showing daily learning hours over 16 weeks">
      <div className="flex gap-0 w-full">
        <div className="flex flex-col mr-3 shrink-0" role="presentation" style={{ gap: '3px' }}>
          {dayLabels.map((l, i) => (
            <div key={i} className="h-[26px] flex items-center text-[11px] text-muted-foreground font-medium tabular-nums">{l}</div>
          ))}
        </div>
        <div className="flex flex-1 min-w-0" style={{ gap: '3px' }}>
          {heatmapData.weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col flex-1 min-w-0" style={{ gap: '3px' }}>
              {week.days.map((day, di) => {
                if (!day) return <div key={di} className="h-[26px]" />;
                const intensity = day.hours / maxHours;
                const bg = day.hours === 0
                  ? 'var(--muted)'
                  : intensity < 0.25
                    ? 'color-mix(in oklch, var(--primary) 20%, transparent)'
                    : intensity < 0.5
                      ? 'color-mix(in oklch, var(--primary) 45%, transparent)'
                      : intensity < 0.75
                        ? 'color-mix(in oklch, var(--primary) 70%, transparent)'
                        : 'var(--primary)';
                
                const displayVal = useMinutes
                  ? `${Math.round(day.hours * 60)}m`
                  : `${day.hours.toFixed(1)}h`;
                
                const labelVal = useMinutes
                  ? `${Math.round(day.hours * 60)} minutes`
                  : `${day.hours.toFixed(1)} hours`;

                return (
                  <div
                    key={di}
                    className="h-[26px] rounded-[4px] ring-1 ring-inset ring-black/[0.04] transition-colors hover:ring-black/10"
                    style={{ background: bg }}
                    aria-label={`${day.date}: ${labelVal}`}
                    title={`${day.date}: ${displayVal}`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export const ActivityHeatmap = React.memo(ActivityHeatmapBase);
