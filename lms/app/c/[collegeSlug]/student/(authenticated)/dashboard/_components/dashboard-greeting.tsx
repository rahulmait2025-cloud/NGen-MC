'use client';

import { useSyncExternalStore } from 'react';
import { Flame } from 'lucide-react';
import { StaggerReveal, StaggerChild } from '@/components/_animations/stagger-reveal';

interface DashboardGreetingProps {
  firstName: string | null;
  streak: number;
  collegeSlug?: string;
}

function getGreetingFromHour(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function getStreakMessage(streak: number): string {
  if (streak === 0) return 'Start a streak today';
  if (streak === 1) return "You're on a 1-day streak";
  if (streak < 7) return `${streak}-day streak — keep it going`;
  if (streak < 30) return `${streak}-day streak — incredible focus`;
  return `${streak}-day streak — you're unstoppable`;
}

function subscribe() {
  return () => {};
}

function getClientGreeting(): string {
  return getGreetingFromHour(new Date().getHours());
}

function getServerGreeting(): string {
  return 'Hello';
}

export function DashboardGreeting({ firstName, streak }: DashboardGreetingProps) {
  const greeting = useSyncExternalStore(subscribe, getClientGreeting, getServerGreeting);
  const displayName = firstName?.trim().split(/\s+/)[0] || 'there';
  const streakMsg = getStreakMessage(streak);

  return (
    <StaggerReveal className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-1" stagger={0.06} delay={0.05}>
      <div className="space-y-1">
        <StaggerChild>
          <h1 className="text-[26px] sm:text-[30px] font-bold tracking-tight leading-[1.15] text-foreground">
            {greeting}, {displayName}
          </h1>
        </StaggerChild>
        <StaggerChild>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {streak > 0 && (
              <span className="inline-flex items-center gap-1 text-primary font-semibold">
                <Flame className="size-4 flame-icon" />
              </span>
            )}
            <span>{streakMsg}</span>
          </div>
        </StaggerChild>
      </div>
    </StaggerReveal>
  );
}
