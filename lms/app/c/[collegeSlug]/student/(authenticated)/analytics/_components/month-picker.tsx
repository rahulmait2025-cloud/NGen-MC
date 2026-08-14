'use client';

import React, { useState } from 'react';
import { CalendarDays, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface MonthPickerProps {
  value: string;
  onChange: (month: string) => void;
}

export function MonthPicker({ value, onChange }: MonthPickerProps) {
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => {
    const [year, month] = value.split('-').map(Number);
    return new Date(year, (month || 1) - 1);
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs font-medium border-border/60"
        >
          <CalendarDays className="size-3.5 text-muted-foreground" />
          {viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="end">
        <div className="flex items-center justify-between mb-3">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => setViewDate(new Date(viewDate.getFullYear() - 1, viewDate.getMonth()))}
          >
            <ChevronDown className="size-3.5 rotate-90" />
          </Button>
          <span className="text-sm font-medium">{viewDate.getFullYear()}</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => setViewDate(new Date(viewDate.getFullYear() + 1, viewDate.getMonth()))}
          >
            <ChevronDown className="size-3.5 -rotate-90" />
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {MONTHS.map((month, idx) => {
            const isSelected = viewDate.getMonth() === idx;
            const monthStr = `${viewDate.getFullYear()}-${String(idx + 1).padStart(2, '0')}`;
            return (
              <Button
                key={month}
                variant={isSelected ? 'default' : 'ghost'}
                size="sm"
                className="h-8 text-xs"
                onClick={() => {
                  onChange(monthStr);
                  setOpen(false);
                }}
              >
                {month}
              </Button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
