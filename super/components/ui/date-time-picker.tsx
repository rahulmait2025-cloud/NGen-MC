'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { TimePicker } from '@/components/ui/time-picker';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface DateTimePickerProps {
  value?: Date;
  onChange?: (date: Date | undefined) => void;
  placeholder?: string;
  className?: string;
}

function dateTo24hString(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function apply24hTimeString(date: Date, timeStr: string): Date {
  const match = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return date;
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const d = new Date(date);
  d.setHours(hours, minutes, 0, 0);
  return d;
}

export function DateTimePicker({
  value,
  onChange,
  placeholder = 'Pick a date & time',
  className,
}: DateTimePickerProps) {
  const [dateOpen, setDateOpen] = React.useState(false);

  const dateValue = value instanceof Date && !isNaN(value.getTime()) ? value : undefined;
  const timeString = dateValue ? dateTo24hString(dateValue) : '';

  return (
    <div className={cn('flex flex-row gap-2 items-end flex-nowrap', className)}>
      {/* Date */}
      <div className="flex-1 space-y-1.5 min-w-0">
        <Popover open={dateOpen} onOpenChange={setDateOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className={cn(
                'w-full justify-start text-left font-normal h-9 text-xs',
                !dateValue && 'text-muted-foreground',
              )}
            >
              <CalendarIcon className="mr-2 size-3.5 shrink-0" />
              {dateValue ? format(dateValue, 'MMM d, yyyy') : placeholder}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dateValue}
              onSelect={(date) => {
                if (!date) {
                  onChange?.(undefined);
                  setDateOpen(false);
                  return;
                }
                // Preserve existing time or default to now
                const existing = dateValue ?? new Date();
                date.setHours(existing.getHours(), existing.getMinutes(), 0, 0);
                onChange?.(date);
                setDateOpen(false);
              }}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Time */}
      <div className="shrink-0 w-36">
        <TimePicker
          value={timeString}
          onChange={(timeStr) => {
            if (dateValue) {
              onChange?.(apply24hTimeString(dateValue, timeStr));
            } else {
              // No date selected yet — create one with today + selected time
              const d = new Date();
              const match = timeStr.match(/^(\d{1,2}):(\d{2})$/);
              if (match) {
                d.setHours(parseInt(match[1], 10), parseInt(match[2], 10), 0, 0);
              }
              onChange?.(d);
            }
          }}
        />
      </div>
    </div>
  );
}
