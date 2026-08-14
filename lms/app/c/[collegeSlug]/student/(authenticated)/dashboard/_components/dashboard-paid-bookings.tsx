'use client';

import Link from 'next/link';
import { Calendar, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { BookingWithDetails } from '@/lib/services/paid-mentorship';

function formatTime(t: string) {
  const [h, m] = String(t).slice(0, 5).split(':');
  const hour = parseInt(h);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

export function DashboardPaidBookings({
  bookings,
}: {
  bookings: BookingWithDetails[];
}) {
  if (bookings.length === 0) return null;

  const next = bookings[0];

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">Upcoming paid sessions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-foreground">
              {next.category?.title ?? 'Mentorship Session'}
            </p>
            <span className="inline-flex items-center rounded-md bg-green-50 px-1.5 py-0.5 text-[10px] font-medium text-green-700 dark:bg-green-950 dark:text-green-300">
              Paid
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="size-4 text-primary" />
              {formatDate(next.session_date)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="size-4 text-primary" />
              {formatTime(next.start_time_ist)} - {formatTime(next.end_time_ist)}
            </span>
          </div>
          {next.meeting_url ? (
            <Button asChild className="mt-4 rounded-xl" size="sm">
              <Link href={next.meeting_url} target="_blank" rel="noopener noreferrer">
                Join Session
              </Link>
            </Button>
          ) : (
            <p className="mt-3 text-xs text-muted-foreground">
              Meeting link will be shared before the session.
            </p>
          )}
        </div>

        {bookings.length > 1 ? (
          <div className="space-y-2">
            {bookings.slice(1, 3).map((booking) => (
              <div
                key={booking.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border/50 px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium">{booking.category?.title ?? 'Session'}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(booking.session_date)} · {formatTime(booking.start_time_ist)} - {formatTime(booking.end_time_ist)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
