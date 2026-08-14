'use client';

import React, { useState } from 'react';
import { format, startOfWeek } from 'date-fns';
import { CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface WeekDatePickerProps {
  value: string;
  onChange: (date: string) => void;
}

export function WeekDatePicker({ value, onChange }: WeekDatePickerProps) {
  const [open, setOpen] = useState(false);
  const currentDate = value ? new Date(value) : new Date();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs font-medium border-border/60"
        >
          <CalendarDays className="size-3.5 text-muted-foreground" />
          Week of {value}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <CalendarComponent
          mode="single"
          selected={currentDate}
          onSelect={(date) => {
            if (date) {
              const weekStart = startOfWeek(date, { weekStartsOn: 1 });
              onChange(format(weekStart, 'yyyy-MM-dd'));
            }
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
