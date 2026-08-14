'use client';

import { useState, useTransition, useEffect } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2, Save, CalendarIcon, Clock, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { TimePicker } from '@/components/ui/time-picker';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import {
  listPaidMentorshipAvailabilityAction,
  savePaidMentorshipAvailabilityAction,
} from './paid-mentorship-actions';

interface TimeRange {
  start_time_ist: string;
  end_time_ist: string;
}

interface DateEntry {
  available_date: string;
  is_active: boolean;
  time_ranges: TimeRange[];
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function generateSlots(start: string, end: string): string[] {
  if (!start || !end) return [];
  const startMin = timeToMinutes(start);
  const endMin = timeToMinutes(end);
  const slots: string[] = [];
  for (let m = startMin; m + 30 <= endMin; m += 30) {
    const h = Math.floor(m / 60);
    const min = m % 60;
    const endH = Math.floor((m + 30) / 60);
    const endMinV = (m + 30) % 60;
    slots.push(
      `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')} - ${String(endH).padStart(2, '0')}:${String(endMinV).padStart(2, '0')}`,
    );
  }
  return slots;
}

function flattenToDateEntries(entries: DateEntry[]): Array<{
  available_date: string;
  start_time_ist: string;
  end_time_ist: string;
  is_active: boolean;
}> {
  const rows: Array<{
    available_date: string;
    start_time_ist: string;
    end_time_ist: string;
    is_active: boolean;
  }> = [];
  for (const entry of entries) {
    for (const tr of entry.time_ranges) {
      rows.push({
        available_date: entry.available_date,
        start_time_ist: tr.start_time_ist,
        end_time_ist: tr.end_time_ist,
        is_active: entry.is_active,
      });
    }
  }
  return rows;
}

export function PaidMentorshipAvailability() {
  const [isPending, startTransition] = useTransition();
  const [entries, setEntries] = useState<DateEntry[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [dateOpen, setDateOpen] = useState(false);
  const [today] = useState(() => new Date());

  useEffect(() => {
    listPaidMentorshipAvailabilityAction().then((result) => {
      if (result.ok) {
        // Group by date
        const grouped = new Map<string, DateEntry>();
        for (const a of result.availability) {
          const date = a.available_date;
          if (!grouped.has(date)) {
            grouped.set(date, {
              available_date: date,
              is_active: a.is_active,
              time_ranges: [],
            });
          }
          grouped.get(date)!.time_ranges.push({
            start_time_ist: String(a.start_time_ist).slice(0, 5),
            end_time_ist: String(a.end_time_ist).slice(0, 5),
          });
        }
        setEntries(Array.from(grouped.values()));
      }
    });
  }, []);

  const addDate = () => {
    if (!selectedDate) return;
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const alreadyExists = entries.some((e) => e.available_date === dateStr);
    if (alreadyExists) {
      toast.error('This date already exists. Add more time ranges below.');
      setSelectedDate(undefined);
      return;
    }
    setEntries((prev) => [
      ...prev,
      {
        available_date: dateStr,
        is_active: true,
        time_ranges: [{ start_time_ist: '10:00', end_time_ist: '10:30' }],
      },
    ]);
    setSelectedDate(undefined);
  };

  const addTimeRange = (dateIndex: number) => {
    setEntries((prev) =>
      prev.map((e, i) =>
        i === dateIndex
          ? { ...e, time_ranges: [...e.time_ranges, { start_time_ist: '10:00', end_time_ist: '10:30' }] }
          : e,
      ),
    );
  };

  const updateTimeRange = (dateIndex: number, rangeIndex: number, updates: Partial<TimeRange>) => {
    setEntries((prev) =>
      prev.map((e, i) =>
        i === dateIndex
          ? {
              ...e,
              time_ranges: e.time_ranges.map((tr, j) =>
                j === rangeIndex ? { ...tr, ...updates } : tr,
              ),
            }
          : e,
      ),
    );
  };

  const removeTimeRange = (dateIndex: number, rangeIndex: number) => {
    setEntries((prev) =>
      prev
        .map((e, i) =>
          i === dateIndex
            ? { ...e, time_ranges: e.time_ranges.filter((_, j) => j !== rangeIndex) }
            : e,
        )
        .filter((e) => e.time_ranges.length > 0),
    );
  };

  const removeDate = (dateIndex: number) => {
    setEntries((prev) => prev.filter((_, i) => i !== dateIndex));
  };

  const handleSave = () => {
    // Validate no overlapping time ranges per date
    for (const entry of entries) {
      for (let i = 0; i < entry.time_ranges.length; i++) {
        for (let j = i + 1; j < entry.time_ranges.length; j++) {
          const a = entry.time_ranges[i];
          const b = entry.time_ranges[j];
          const aStart = timeToMinutes(a.start_time_ist);
          const aEnd = timeToMinutes(a.end_time_ist);
          const bStart = timeToMinutes(b.start_time_ist);
          const bEnd = timeToMinutes(b.end_time_ist);
          if (aStart < bEnd && aEnd > bStart) {
            toast.error(`Overlapping time ranges on ${formatDate(entry.available_date)}: ${a.start_time_ist}-${a.end_time_ist} and ${b.start_time_ist}-${b.end_time_ist}`);
            return;
          }
        }
      }
    }

    startTransition(async () => {
      const rows = flattenToDateEntries(entries);
      const result = await savePaidMentorshipAvailabilityAction(rows);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success('Availability saved.');
    });
  };

  const totalSlots = entries.reduce((acc, entry) => {
    if (!entry.is_active) return acc;
    for (const tr of entry.time_ranges) {
      acc += generateSlots(tr.start_time_ist, tr.end_time_ist).length;
    }
    return acc;
  }, 0);

  const totalRanges = entries.reduce((acc, e) => acc + e.time_ranges.length, 0);

  const formatDate = (d: string) =>
    new Date(d + 'T00:00:00').toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Available Dates</h3>
          <p className="text-sm text-muted-foreground">
            Pick dates when you&apos;re available. Add multiple time ranges per date.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right text-sm text-muted-foreground">
            <p>{entries.length} date{entries.length !== 1 ? 's' : ''} · {totalRanges} range{totalRanges !== 1 ? 's' : ''}</p>
            <p className="font-medium text-foreground">{totalSlots} slot{totalSlots !== 1 ? 's' : ''}</p>
          </div>
          <Button onClick={handleSave} disabled={isPending} size="sm">
            <Save className="mr-2 size-4" />
            {isPending ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      <div className="flex gap-2">
        <Popover open={dateOpen} onOpenChange={setDateOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'justify-start text-left font-normal h-10',
                !selectedDate && 'text-muted-foreground',
              )}
            >
              <CalendarIcon className="mr-2 size-4" />
              {selectedDate ? format(selectedDate, 'PPP') : 'Pick a date'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => {
                setSelectedDate(date);
                setDateOpen(false);
              }}
              disabled={(date) => date < new Date(today.toDateString())}
            />
          </PopoverContent>
        </Popover>
        <Button onClick={addDate} disabled={!selectedDate} size="sm">
          <Plus className="mr-1 size-3.5" />
          Add Date
        </Button>
      </div>

      <div className="rounded-xl border border-border/60 bg-card">
        {entries.length === 0 && (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No dates added yet. Pick a date above to get started.
          </div>
        )}
        <div className="divide-y divide-border/60">
          {entries.map((entry, dateIndex) => {
            const allPreviewSlots = entry.time_ranges.flatMap((tr) =>
              generateSlots(tr.start_time_ist, tr.end_time_ist),
            );
            return (
              <div key={entry.available_date} className="p-4 space-y-4">
                {/* Date header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">{formatDate(entry.available_date)}</span>
                    {!entry.is_active && (
                      <span className="inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                        Inactive
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {entry.time_ranges.length} range{entry.time_ranges.length !== 1 ? 's' : ''} ·{' '}
                      {allPreviewSlots.length} slot{allPreviewSlots.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-destructive"
                    onClick={() => removeDate(dateIndex)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>

                {/* Time ranges */}
                <div className="space-y-3">
                  {entry.time_ranges.map((tr, rangeIndex) => (
                    <div key={rangeIndex} className="flex items-center gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Start</Label>
                        <TimePicker
                          value={tr.start_time_ist}
                          onChange={(val) => updateTimeRange(dateIndex, rangeIndex, { start_time_ist: val })}
                        />
                      </div>
                      <span className="text-muted-foreground mt-5">to</span>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">End</Label>
                        <TimePicker
                          value={tr.end_time_ist}
                          onChange={(val) => updateTimeRange(dateIndex, rangeIndex, { end_time_ist: val })}
                        />
                      </div>
                      <div className="mt-5 flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Clock className="size-3.5" />
                        <span>{generateSlots(tr.start_time_ist, tr.end_time_ist).length}</span>
                      </div>
                      {entry.time_ranges.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 mt-5 text-destructive"
                          onClick={() => removeTimeRange(dateIndex, rangeIndex)}
                        >
                          <X className="size-3.5" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Add time range button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addTimeRange(dateIndex)}
                  className="w-full"
                >
                  <Plus className="mr-1 size-3.5" />
                  Add Time Range
                </Button>

                {/* Slot preview */}
                {allPreviewSlots.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {allPreviewSlots.map((s, i) => (
                      <span
                        key={`${s}-${i}`}
                        className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
