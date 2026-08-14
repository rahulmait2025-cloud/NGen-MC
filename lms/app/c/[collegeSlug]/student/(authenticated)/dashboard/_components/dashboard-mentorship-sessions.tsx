'use client';

import Link from 'next/link';
import { Calendar, Video, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { MentorshipSessionRow } from '@/lib/services/job-ready-bootcamp';

function formatIstTimeRange(start: string, end: string): string {
  const trim = (t: string) => t.slice(0, 5);
  return `${trim(start)} – ${trim(end)} IST`;
}

function getSessionStatus(session: MentorshipSessionRow): 'today' | 'upcoming' {
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return session.session_date === todayStr ? 'today' : 'upcoming';
}

export function DashboardMentorshipSessions({
  sessions,
}: {
  sessions: MentorshipSessionRow[];
}) {
  const next = sessions[0];
  const nextStatus = next ? getSessionStatus(next) : 'upcoming';

  return (
    <Card className="border-border/60 shadow-sm overflow-hidden">
      <CardHeader className={cn(
        "pb-3 border-b transition-colors",
        nextStatus === 'today' ? "bg-primary/[0.03] border-primary/20" : "border-border/40 bg-muted/20",
      )}>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            {nextStatus === 'today' && (
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full rounded-full bg-primary opacity-75 animate-ping" />
                <span className="relative inline-flex size-2 rounded-full bg-primary" />
              </span>
            )}
            Upcoming mentorship sessions
          </CardTitle>
          <span className="text-xs font-medium text-primary bg-primary/8 text-primary px-2 py-0.5 rounded-full border border-primary/15">
            {sessions.length} {sessions.length === 1 ? 'session' : 'sessions'}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        {sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No upcoming mentorship sessions scheduled yet.
          </p>
        ) : (
          <>
            <div className={cn(
              "rounded-xl border p-4 transition-colors",
              nextStatus === 'today'
                ? "border-primary/30 bg-primary/[0.03] shadow-sm"
                : "border-border/60 bg-muted/20",
            )}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  {nextStatus === 'today' && (
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20 mb-2">
                      <span className="relative flex size-1.5">
                        <span className="absolute inline-flex size-full rounded-full bg-primary opacity-75 animate-ping" />
                        <span className="relative inline-flex size-1.5 rounded-full bg-primary" />
                      </span>
                      Today
                    </span>
                  )}
                  <p className="font-semibold text-foreground">{next.title}</p>
                  {next.description ? (
                    <p className="mt-2 text-sm text-muted-foreground line-clamp-3">{next.description}</p>
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar className="size-4 text-primary" />
                      {next.session_day}, {next.session_date}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="size-4 text-primary" />
                      {formatIstTimeRange(next.start_time_ist, next.end_time_ist)}
                    </span>
                  </div>
                </div>
              </div>
              <Button asChild className={cn(
                "mt-4 rounded-xl",
                nextStatus === 'today' ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-md shadow-primary/15" : "",
              )}>
                <Link href={next.meeting_url} target="_blank" rel="noopener noreferrer">
                  <Video className="mr-2 size-4" />
                  Join Session
                </Link>
              </Button>
            </div>

            {sessions.length > 1 ? (
              <div className="space-y-2">
                {sessions.slice(1, 5).map((session) => {
                  const status = getSessionStatus(session);
                  return (
                    <div
                      key={session.id}
                      className={cn(
                        "flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors",
                        status === 'today'
                          ? "border-primary/25 bg-primary/[0.02]"
                          : "border-border/50",
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        {status === 'today' && (
                          <span className="text-[10px] font-semibold text-primary bg-primary/8 px-1.5 py-0.5 rounded-full border border-primary/15 mr-2">
                            Today
                          </span>
                        )}
                        <p className="font-medium inline">{session.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {session.session_date} · {formatIstTimeRange(session.start_time_ist, session.end_time_ist)}
                        </p>
                      </div>
                      <Button asChild variant="outline" size="sm" className={cn(
                        "shrink-0 rounded-lg",
                        status === 'today' ? "border-primary/30 text-primary hover:bg-primary/5 hover:border-primary/50" : "",
                      )}>
                        <Link href={session.meeting_url} target="_blank" rel="noopener noreferrer">
                          <Video className="mr-1.5 size-3.5" />
                          Join
                        </Link>
                      </Button>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}