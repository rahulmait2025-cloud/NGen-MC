"use client";

import * as React from "react";
import { format } from "date-fns";
import { CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DatePickerProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  className,
  id,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);

  const selectedDate = value ? parseDateString(value) : undefined;

  const handleSelect = (date: Date | undefined) => {
    if (!date) {
      onChange?.("");
      setOpen(false);
      return;
    }
    const formatted = format(date, "yyyy-MM-dd");
    onChange?.(formatted);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          className={cn(
            "h-9 w-full justify-start text-left text-sm font-normal",
            !value && "text-muted-foreground",
            className
          )}
        >
          <CalendarDays className="mr-2 size-4 shrink-0" />
          {selectedDate ? format(selectedDate, "PPP") : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleSelect}
          captionLayout="label"
        />
      </PopoverContent>
    </Popover>
  );
}

interface MonthPickerProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
}

export function MonthPicker({
  value,
  onChange,
  placeholder = "Pick a month",
  className,
  id,
}: MonthPickerProps) {
  const [open, setOpen] = React.useState(false);

  const selectedDate = value ? parseMonthString(value) : undefined;

  const handleSelect = (date: Date | undefined) => {
    if (!date) {
      onChange?.("");
      setOpen(false);
      return;
    }
    const formatted = format(date, "yyyy-MM");
    onChange?.(formatted);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          className={cn(
            "h-9 w-full justify-start text-left text-sm font-normal",
            !value && "text-muted-foreground",
            className
          )}
        >
          <CalendarDays className="mr-2 size-4 shrink-0" />
          {selectedDate ? format(selectedDate, "MMMM yyyy") : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleSelect}
          captionLayout="dropdown"
          startMonth={new Date(2020, 0)}
          endMonth={new Date(2030, 11)}
        />
      </PopoverContent>
    </Popover>
  );
}

function parseDateString(dateStr: string): Date | undefined {
  if (!dateStr) return undefined;
  const parts = dateStr.split("-");
  if (parts.length !== 3) return undefined;
  const [year, month, day] = parts.map(Number);
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day);
}

function parseMonthString(monthStr: string): Date | undefined {
  if (!monthStr) return undefined;
  const parts = monthStr.split("-");
  if (parts.length !== 2) return undefined;
  const [year, month] = parts.map(Number);
  if (!year || !month) return undefined;
  return new Date(year, month - 1, 1);
}
