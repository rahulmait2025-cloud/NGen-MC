import { NextRequest, NextResponse } from 'next/server';
import { getAvailableSlots, getAvailableDates } from '@/lib/services/paid-mentorship';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const month = searchParams.get('month');

    if (month) {
      const dates = await getAvailableDates(month);
      return NextResponse.json({ ok: true, dates });
    }

    if (!date) {
      return NextResponse.json({ ok: false, error: 'Date or month parameter required.' }, { status: 400 });
    }

    const slots = await getAvailableSlots(date);
    return NextResponse.json({ ok: true, slots });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch slots';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
