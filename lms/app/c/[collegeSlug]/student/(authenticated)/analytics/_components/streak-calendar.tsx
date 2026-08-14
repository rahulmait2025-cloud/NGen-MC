'use client';

import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function StreakCalendar({ activeDays }: { activeDays: string[] }) {
  const [currentDate, setCurrentDate] = useState(() => new Date());

  const todayDate = new Date();
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const earliestDateStr = activeDays.length > 0 ? activeDays[0] : null;
  const earliestDate = earliestDateStr ? new Date(earliestDateStr + 'T00:00:00') : new Date();

  const canGoPrev = earliestDateStr
    ? (year > earliestDate.getFullYear() || (year === earliestDate.getFullYear() && month > earliestDate.getMonth()))
    : false;

  const canGoNext = (year < todayDate.getFullYear() || (year === todayDate.getFullYear() && month < todayDate.getMonth()));

  const handlePrevMonth = () => {
    if (canGoPrev) {
      setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    }
  };

  const handleNextMonth = () => {
    if (canGoNext) {
      setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    }
  };

  const calendarData = useMemo(() => {
    const viewYear = currentDate.getFullYear();
    const viewMonth = currentDate.getMonth();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
    const now = new Date();
    const today = now.getDate();
    const isCurrentMonth = now.getFullYear() === viewYear && now.getMonth() === viewMonth;
    const activeSet = new Set(activeDays);

    const days: { day: number; active: boolean; isToday: boolean; isFuture: boolean }[] = [];
    for (let i = 0; i < firstDayOfWeek; i++) days.push({ day: 0, active: false, isToday: false, isFuture: false });
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isFuture = (viewYear > now.getFullYear()) ||
                       (viewYear === now.getFullYear() && viewMonth > now.getMonth()) ||
                       (viewYear === now.getFullYear() && viewMonth === now.getMonth() && d > today);
      days.push({ day: d, active: activeSet.has(dateStr), isToday: isCurrentMonth && d === today, isFuture });
    }
    return days;
  }, [activeDays, currentDate]);

  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-4 max-w-md mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">{monthName}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Daily activity this month</p>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="size-7"
            onClick={handlePrevMonth}
            disabled={!canGoPrev}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="size-7"
            onClick={handleNextMonth}
            disabled={!canGoNext}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <div>
        <div className="grid grid-cols-7 gap-1.5">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} className="text-center text-[10px] text-muted-foreground font-semibold py-1">{d}</div>
          ))}
          {calendarData.map((d, i) => {
            if (d.day === 0) return <div key={`empty-${i}`} />;
            const bg = d.active
              ? 'var(--primary)'
              : d.isToday
              ? 'color-mix(in oklch, var(--primary) 15%, transparent)'
              : d.isFuture
              ? 'transparent'
              : 'var(--muted)';
            return (
              <div
                key={d.day}
                className={cn(
                  'aspect-square rounded-lg flex items-center justify-center text-xs font-medium transition-transform hover:scale-110 border',
                  d.active
                    ? 'text-primary-foreground font-bold border-transparent'
                    : d.isFuture
                    ? 'text-muted-foreground/45 border-dashed border-border/40'
                    : d.isToday
                    ? 'text-foreground border-transparent'
                    : 'text-foreground border-transparent',
                )}
                style={{ background: bg, ...(d.isToday ? { outline: '2px solid var(--primary)', outlineOffset: '2px' } : {}) }}
                title={d.isFuture ? 'Future day' : `${d.active ? 'Active' : 'Inactive'} day`}
              >
                {d.day}
              </div>
            );
          })}
        </div>
        <div className="flex items-center justify-center gap-4 mt-3 text-[10px] text-muted-foreground">
          <div className="flex items-center gap-1"><span className="size-3 rounded-sm" style={{ background: 'var(--muted)' }} />Rest</div>
          <div className="flex items-center gap-1"><span className="size-3 rounded-sm" style={{ background: 'var(--primary)' }} />Active</div>
        </div>
      </div>
    </div>
  );
}
