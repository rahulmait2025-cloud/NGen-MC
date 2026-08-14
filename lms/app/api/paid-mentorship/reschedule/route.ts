import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { rescheduleBooking } from '@/lib/services/paid-mentorship';

export async function POST(request: NextRequest) {
  try {
    // #9 Parallelize independent I/O: headers() and request.json() have no dependency
    const [headerStore, body] = await Promise.all([headers(), request.json()]);
    const userId = headerStore.get('x-user-id');

    if (!userId) {
      return NextResponse.json({ ok: false, error: 'Unauthorized.' }, { status: 401 });
    }

    const { bookingId, newDate, newStart, newEnd } = body;

    if (!bookingId || !newDate || !newStart || !newEnd) {
      return NextResponse.json({ ok: false, error: 'Missing required fields.' }, { status: 400 });
    }

    const newBooking = await rescheduleBooking(bookingId, userId, newDate, newStart, newEnd);

    return NextResponse.json({ ok: true, booking: newBooking });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to reschedule';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
