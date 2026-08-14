import { NextRequest, NextResponse } from 'next/server';
import { sendMentorshipSessionCompleted } from '@/lib/lms/transactional-email/mentorship-emails';

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.INTERNAL_API_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { userId, categoryId, sessionDate, bookingId } = body;

  if (!userId || !categoryId || !sessionDate || !bookingId) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  try {
    await sendMentorshipSessionCompleted({
      userId,
      categoryId,
      sessionDate,
      bookingId,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[mentorship-email] Failed to send session completed email:', error);
    return NextResponse.json({ ok: true }); // Don't fail the request
  }
}
