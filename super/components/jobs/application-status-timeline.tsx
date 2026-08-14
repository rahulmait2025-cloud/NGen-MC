'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import type { StatusHistoryRow } from '@/lib/superadmin/jobs/applicant-queries';

const STATUS_BADGE_STYLES: Record<string, string> = {
  applied: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  under_review: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  shortlisted: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  assessment: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
  interview: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  selected: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  on_hold: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  withdrawn: 'bg-gray-100 text-gray-600 dark:bg-gray-800/30 dark:text-gray-400',
};

interface ApplicationStatusTimelineProps {
  history: StatusHistoryRow[];
}

export function ApplicationStatusTimeline({ history }: ApplicationStatusTimelineProps) {
  if (history.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No status changes recorded.</p>
    );
  }

  return (
    <div className="relative pl-6">
      <div className="absolute left-2 top-0 bottom-0 w-px bg-border" />
      <div className="space-y-6">
        {history.map((entry) => (
          <div key={entry.id} className="relative">
            <div className="absolute -left-4 top-1.5 size-2.5 rounded-full bg-primary border-2 border-background" />
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                {entry.old_status && (
                  <>
                    <Badge className={STATUS_BADGE_STYLES[entry.old_status] ?? ''}>
                      {entry.old_status.replace(/_/g, ' ')}
                    </Badge>
                    <span className="text-xs text-muted-foreground">→</span>
                  </>
                )}
                <Badge className={STATUS_BADGE_STYLES[entry.new_status] ?? ''}>
                  {entry.new_status.replace(/_/g, ' ')}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {entry.actor_role === 'superadmin' ? 'by Admin' : entry.actor_role === 'student' ? 'by Student' : ''}
                </span>
              </div>
              {entry.note && (
                <p className="text-sm text-muted-foreground">{entry.note}</p>
              )}
              <p className="text-xs text-muted-foreground">
                {new Date(entry.created_at).toLocaleString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
