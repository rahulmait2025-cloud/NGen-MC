"use client";

import * as React from "react";
import { ClockIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface TimePickerProps {
  value?: string;
  onChange?: (time: string) => void;
  placeholder?: string;
  className?: string;
}

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0"));
const PERIODS = ["AM", "PM"];

function parseTime(t: string) {
  if (!t) return { hour: "11", minute: "00", period: "AM" };
  const match24 = t.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    let h = parseInt(match24[1], 10);
    const m = match24[2];
    const period = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    return { hour: String(h).padStart(2, "0"), minute: m, period };
  }
  const match12 = t.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match12) {
    return { hour: match12[1].padStart(2, "0"), minute: match12[2], period: match12[3].toUpperCase() };
  }
  return { hour: "11", minute: "00", period: "AM" };
}

export function TimePicker({
  value = "",
  onChange,
  placeholder = "Select time",
  className,
}: TimePickerProps) {
  const [open, setOpen] = React.useState(false);

  const parsed = parseTime(value);
  const [selectedHour, setSelectedHour] = React.useState(() => parseTime(value).hour);
  const [selectedMinute, setSelectedMinute] = React.useState(() => parseTime(value).minute);
  const [selectedPeriod, setSelectedPeriod] = React.useState(() => parseTime(value).period);

  const emitChange = (h: string, m: string, period: string) => {
    let hour24 = parseInt(h, 10);
    if (period === "PM" && hour24 !== 12) hour24 += 12;
    if (period === "AM" && hour24 === 12) hour24 = 0;
    onChange?.(`${String(hour24).padStart(2, "0")}:${m}`);
  };

  const displayValue = value
    ? `${parsed.hour}:${parsed.minute} ${parsed.period}`
    : "";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal h-10",
            !value && "text-muted-foreground",
            className,
          )}
        >
          <ClockIcon className="mr-2 size-4" />
          {displayValue || placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex gap-1 p-3">
          {/* Hours */}
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-medium text-muted-foreground text-center mb-1">Hour</span>
            <div className="flex flex-col gap-0.5">
              {HOURS.map((h) => (
                <button
                  key={h}
                  type="button"
                  className={cn(
                    "w-10 h-8 rounded-md text-xs font-medium transition-colors",
                    selectedHour === h
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted text-foreground",
                  )}
                  onClick={() => {
                    setSelectedHour(h);
                    emitChange(h, selectedMinute, selectedPeriod);
                  }}
                >
                  {h}
                </button>
              ))}
            </div>
          </div>

          {/* Separator */}
          <span className="text-lg font-bold text-muted-foreground self-start mt-7">:</span>

          {/* Minutes */}
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-medium text-muted-foreground text-center mb-1">Min</span>
            <div className="flex flex-col gap-0.5">
              {MINUTES.map((m) => (
                <button
                  key={m}
                  type="button"
                  className={cn(
                    "w-10 h-8 rounded-md text-xs font-medium transition-colors",
                    selectedMinute === m
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted text-foreground",
                  )}
                  onClick={() => {
                    setSelectedMinute(m);
                    emitChange(selectedHour, m, selectedPeriod);
                  }}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* AM/PM */}
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-medium text-muted-foreground text-center mb-1">Period</span>
            <div className="flex flex-col gap-0.5">
              {PERIODS.map((p) => (
                <button
                  key={p}
                  type="button"
                  className={cn(
                    "w-12 h-8 rounded-md text-xs font-semibold transition-colors",
                    selectedPeriod === p
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted text-foreground",
                  )}
                  onClick={() => {
                    setSelectedPeriod(p);
                    emitChange(selectedHour, selectedMinute, p);
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
