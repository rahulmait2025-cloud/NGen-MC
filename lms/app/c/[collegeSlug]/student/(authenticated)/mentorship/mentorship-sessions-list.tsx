'use client';

import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Calendar, Video, Users, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import type { MentorshipSessionRow } from '@/lib/services/job-ready-bootcamp';

function formatIstTimeRange(start: string, end: string): string {
  const trim = (t: string) => t.slice(0, 5);
  return `${trim(start)} – ${trim(end)} IST`;
}

function formatDate(dateStr: string): string {
  const parts = dateStr.split(/[-/]/);
  const [year, month, day] = parts;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function getSessionStatus(session: MentorshipSessionRow): 'upcoming' | 'today' | 'past' {
  if (session.status === 'completed' || session.status === 'cancelled') return 'past';
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return session.session_date === todayStr ? 'today' : 'upcoming';
}

export function MentorshipSessionsList({
  sessions,
  title,
  emptyTitle = 'No upcoming sessions',
  emptyDescription = "You don't have any mentorship sessions scheduled yet. Check back later.",
  variant = 'upcoming',
}: {
  sessions: MentorshipSessionRow[];
  title?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  variant?: 'upcoming' | 'history';
}) {
  if (sessions.length === 0) {
    if (variant === 'history') return null;
    return (
      <EmptyState
        icon={<Users />}
        title={emptyTitle}
        description={emptyDescription}
      />
    );
  }

  const [next, ...rest] = sessions;
  const nextStatus = variant === 'history' ? 'past' : getSessionStatus(next);

  return (
    <div className="space-y-6">
      {title ? (
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
      ) : null}

      <Card className={cn(
        "overflow-hidden transition-colors",
        nextStatus === 'today'
          ? "border-primary/30 bg-primary/[0.03]"
          : "border-border/60",
      )}>
        <CardContent className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                {nextStatus === 'today' ? (
                  <Badge variant="default" className="gap-1.5 bg-primary text-primary-foreground border-primary/40 shadow-sm">
                    <span className="size-1.5 rounded-full bg-current animate-pulse" />
                    Today
                  </Badge>
                ) : nextStatus === 'past' ? (
                  <Badge variant="secondary" className="gap-1.5 border-border/60">
                    {next.status === 'cancelled' ? 'Cancelled' : next.status === 'completed' ? 'Completed' : 'Past'}
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="gap-1.5 border-border/60">
                    Upcoming
                  </Badge>
                )}
              </div>
              <h2 className="text-lg font-semibold text-foreground sm:text-xl">
                {next.title}
              </h2>
              {next.description ? (
                <p className="mt-2 text-sm text-muted-foreground line-clamp-3">
                  {next.description}
                </p>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="size-4 text-primary" />
                  {formatDate(next.session_date)}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="size-4 text-primary" />
                  {formatIstTimeRange(next.start_time_ist, next.end_time_ist)}
                </span>
              </div>
            </div>
          </div>
          {variant !== 'history' && next.meeting_url ? (
            <div className="mt-5 flex items-center gap-3">
              <Button asChild className={cn(
                "rounded-xl",
                nextStatus === 'today' ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-md shadow-primary/15" : "",
              )}>
                <Link href={next.meeting_url} target="_blank" rel="noopener noreferrer">
                  <Video className="mr-2 size-4" />
                  Join Session
                </Link>
              </Button>
              {nextStatus === 'today' && (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary">
                  <span className="relative flex size-2">
                    <span className="absolute inline-flex size-full rounded-full bg-primary opacity-75 animate-ping" />
                    <span className="relative inline-flex size-2 rounded-full bg-primary" />
                  </span>
                  Live now
                </span>
              )}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {rest.length > 0 ? (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">
            {variant === 'history' ? 'More past sessions' : 'More sessions'}
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {rest.map((session) => {
              const status = variant === 'history' ? 'past' : getSessionStatus(session);
              return (
                <Card
                  key={session.id}
                  className={cn(
                    "border transition-colors hover:bg-muted/30",
                    status === 'today'
                      ? "border-primary/30 bg-primary/[0.02] shadow-sm"
                      : "border-border/60",
                  )}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {status === 'today' ? (
                            <Badge variant="default" className="gap-1 text-[10px] px-1.5 py-0 bg-primary text-primary-foreground border-primary/40 shadow-sm">
                              <span className="size-1 rounded-full bg-current animate-pulse" />
                              Today
                            </Badge>
                          ) : status === 'past' ? (
                            <Badge variant="secondary" className="gap-1 text-[10px] px-1.5 py-0 border-border/60">
                              {session.status === 'cancelled' ? 'Cancelled' : session.status === 'completed' ? 'Completed' : 'Past'}
                            </Badge>
                          ) : null}
                        </div>
                        <p className="font-medium text-foreground line-clamp-1">
                          {session.title}
                        </p>
                        {session.description ? (
                          <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                            {session.description}
                          </p>
                        ) : null}
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span>{session.session_day}, {session.session_date}</span>
                          <span>{formatIstTimeRange(session.start_time_ist, session.end_time_ist)}</span>
                        </div>
                      </div>
                      {variant !== 'history' && session.meeting_url ? (
                        <Button asChild variant="outline" size="sm" className="shrink-0 rounded-lg">
                          <Link href={session.meeting_url} target="_blank" rel="noopener noreferrer">
                            <Video className="mr-1.5 size-3.5" />
                            Join
                          </Link>
                        </Button>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
