'use client';

import { useState } from 'react';
import { Calendar, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BookingDetail } from './booking-detail';
import type { BookingWithDetails } from '@/lib/services/paid-mentorship';

interface PaidBookingsListProps {
  collegeSlug: string;
  userId: string;
  bookings: BookingWithDetails[];
  title?: string;
}

const formatDateShort = (d: string) =>
  new Date(d + 'T00:00:00').toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

const formatTimeSlot = (t: string) => {
  const [h, m] = String(t).slice(0, 5).split(':');
  const hour = parseInt(h);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour % 12 || 12;
  return `${h12}:${m} ${ampm}`;
};

const getStatusBadge = (status: string) => {
  const variantMap: Record<string, 'default' | 'secondary' | 'success' | 'destructive'> = {
    confirmed: 'default',
    rescheduled: 'secondary',
    completed: 'success',
    cancelled: 'destructive',
  };
  const variant = variantMap[status] ?? 'secondary';
  return (
    <Badge variant={variant} className="gap-1.5">
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
};

export function PaidBookingsList({ collegeSlug, userId, bookings, title = 'Your Upcoming Paid Sessions' }: PaidBookingsListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [nowMs] = useState(() => Date.now());

  if (bookings.length === 0) return null;

  const canRescheduleBooking = (b: BookingWithDetails) => {
    const isConfirmed = b.status === 'confirmed';
    const hasRescheduleLeft = b.reschedule_count < 1;
    const sessionFuture = new Date(`${b.session_date}T${b.start_time_ist}`).getTime() > nowMs;
    return isConfirmed && hasRescheduleLeft && sessionFuture;
  };

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold">{title}</h3>
      <div className="space-y-3">
        {bookings.map((booking) => (
          <Card key={booking.id} className="overflow-hidden border-border/60">
            <CardContent className="p-0">
              <div className="flex w-full items-center justify-between gap-2 p-4">
                <button
                  type="button"
                  onClick={() => setExpandedId(expandedId === booking.id ? null : booking.id)}
                  className="flex min-w-0 flex-1 items-center gap-4 rounded-md text-left hover:bg-muted/30 transition-colors -m-1 p-1"
                >
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Calendar className="size-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium">{booking.category?.title ?? 'Mentorship Session'}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDateShort(booking.session_date)} · {formatTimeSlot(booking.start_time_ist)} - {formatTimeSlot(booking.end_time_ist)}
                    </p>
                  </div>
                </button>
                <div className="flex shrink-0 items-center gap-2">
                  {getStatusBadge(booking.status)}
                  {canRescheduleBooking(booking) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1.5 text-xs text-muted-foreground hover:text-primary"
                      onClick={() => setExpandedId(booking.id)}
                    >
                      <RefreshCw className="size-3.5" />
                      Reschedule
                    </Button>
                  )}
                  <button
                    type="button"
                    aria-label={expandedId === booking.id ? 'Collapse booking' : 'Expand booking'}
                    onClick={() => setExpandedId(expandedId === booking.id ? null : booking.id)}
                    className="rounded-md p-1 text-muted-foreground hover:bg-muted/30"
                  >
                    {expandedId === booking.id ? (
                      <ChevronUp className="size-4" />
                    ) : (
                      <ChevronDown className="size-4" />
                    )}
                  </button>
                </div>
              </div>

              {expandedId === booking.id && (
                <div className="border-t border-border/60 p-4">
                  <BookingDetail
                    collegeSlug={collegeSlug}
                    userId={userId}
                    booking={booking}
                    onClose={() => setExpandedId(null)}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
