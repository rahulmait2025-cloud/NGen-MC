'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export function RiskBadge({ status }: { status: string }) {
  const isOnTrack = status === 'On Track';
  return (
    <div
      className={cn(
        'flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-bold uppercase tracking-wider leading-none',
        isOnTrack
          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
          : 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20',
      )}
    >
      <div className={cn('size-1.5 rounded-full shrink-0', isOnTrack ? 'bg-emerald-600 dark:bg-emerald-400' : 'bg-rose-600 dark:bg-rose-400')} />
      {status}
    </div>
  );
}
