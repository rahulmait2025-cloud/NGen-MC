import 'server-only';

import { cache } from 'react';
import { cacheLife, cacheTag, revalidateTag } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { localDateTimeToUtc } from '@/lib/time/application-timezone';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CustomQuestion {
  id: string;
  question: string;
  type: 'text' | 'textarea' | 'select' | 'radio';
  options?: string[];
  required: boolean;
  sort_order: number;
}

export interface CustomAnswer {
  question_id: string;
  question: string;
  answer: string;
}

export interface PaidMentorshipCategory {
  id: string;
  title: string;
  description: string | null;
  custom_questions: CustomQuestion[];
  is_active: boolean;
  sort_order: number;
}

export interface PaidMentorshipPricing {
  id: string;
  original_price_minor: number;
  selling_price_minor: number;
  currency: string;
}

export interface PaidMentorshipAvailability {
  id: string;
  available_date: string;
  start_time_ist: string;
  end_time_ist: string;
  is_active: boolean;
}

export interface PaidMentorshipBooking {
  id: string;
  user_id: string;
  student_id: string;
  college_id: string;
  category_id: string;
  session_date: string;
  start_time_ist: string;
  end_time_ist: string;
  achievement_goal: string;
  skill_level: 'beginner' | 'intermediate' | 'advanced';
  additional_notes: string | null;
  whatsapp_number: string | null;
  custom_answers: CustomAnswer[];
  meeting_url: string | null;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'rescheduled' | 'missed';
  reschedule_count: number;
  rescheduled_from: string | null;
  coupon_code: string | null;
  discount_amount_minor: number;
  original_price_minor: number;
  selling_price_minor: number;
  final_amount_minor: number;
  currency: string;
  order_id: string | null;
  expires_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TimeSlot {
  start: string;
  end: string;
  available: boolean;
}

export interface BookingWithDetails extends PaidMentorshipBooking {
  category?: PaidMentorshipCategory;
}

// ─── Categories ──────────────────────────────────────────────────────────────

export const listActiveCategories = cache(async function listActiveCategories(): Promise<PaidMentorshipCategory[]> {
  'use cache';
  cacheLife('weeks');
  cacheTag('mentorship-categories');

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('paid_mentorship_categories')
    .select('id, title, description, is_active, sort_order')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as PaidMentorshipCategory[];
});

// ─── Pricing ─────────────────────────────────────────────────────────────────

export const getActivePricing = cache(async function getActivePricing(): Promise<PaidMentorshipPricing | null> {
  'use cache';
  cacheLife('weeks');
  cacheTag('mentorship-pricing');

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('paid_mentorship_pricing')
    .select('id, original_price_minor, selling_price_minor, currency')
    .eq('is_active', true)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as PaidMentorshipPricing | null) ?? null;
});

// ─── Availability & Slots ────────────────────────────────────────────────────

export async function getAvailableSlots(date: string): Promise<TimeSlot[]> {
  const admin = createAdminClient();

  const { data: availability } = await admin
    .from('paid_mentorship_availability')
    .select('id, available_date, start_time_ist, end_time_ist, is_active')
    .eq('available_date', date)
    .eq('is_active', true)
    .order('start_time_ist', { ascending: true });

  if (!availability || availability.length === 0) return [];

  const slots: TimeSlot[] = [];

  for (const avail of availability) {
    const startMinutes = timeToMinutes(String(avail.start_time_ist));
    const endMinutes = timeToMinutes(String(avail.end_time_ist));

    for (let m = startMinutes; m + 30 <= endMinutes; m += 30) {
      slots.push({
        start: minutesToTime(m),
        end: minutesToTime(m + 30),
        available: true,
      });
    }
  }

  const now = new Date().toISOString();

  const [{ data: bookings }, { data: pendingBookings }] = await Promise.all([
    admin
      .from('paid_mentorship_bookings')
      .select('id, start_time_ist, end_time_ist, status, expires_at')
      .eq('session_date', date)
      .in('status', ['confirmed', 'rescheduled']),
    admin
      .from('paid_mentorship_bookings')
      .select('id, start_time_ist, end_time_ist, status, expires_at')
      .eq('session_date', date)
      .eq('status', 'pending')
      .gt('expires_at', now),
  ]);

  const allBookings = [...(bookings ?? []), ...(pendingBookings ?? [])];

  for (const slot of slots) {
    const slotStart = timeToMinutes(slot.start);
    const slotEnd = timeToMinutes(slot.end);

    for (const booking of allBookings) {
      const bStart = timeToMinutes(String(booking.start_time_ist));
      const bEnd = timeToMinutes(String(booking.end_time_ist));

      if (slotStart < bEnd && slotEnd > bStart) {
        slot.available = false;
        break;
      }
    }
  }

  return slots;
}

export async function getAvailableDates(yearMonth: string): Promise<string[]> {
  const admin = createAdminClient();
  const [year, month] = yearMonth.split('-').map(Number);
  const startDate = `${yearMonth}-01`;
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(new Date(year, month, 0).getDate()).padStart(2, '0')}`;

  const { data: availability } = await admin
    .from('paid_mentorship_availability')
    .select('available_date')
    .eq('is_active', true)
    .gte('available_date', startDate)
    .lte('available_date', endDate);

  if (!availability || availability.length === 0) return [];

  const today = new Date().toISOString().slice(0, 10);
  return availability.reduce<string[]>((acc, a) => {
    if (a.available_date >= today) acc.push(a.available_date);
    return acc;
  }, []);
}

export interface DateAvailabilityStatus {
  date: string;
  status: 'available' | 'full';
  availableSlots: number;
}

export async function getDateAvailabilityStatuses(yearMonth: string): Promise<DateAvailabilityStatus[]> {
  const admin = createAdminClient();
  const [year, month] = yearMonth.split('-').map(Number);
  const startDate = `${yearMonth}-01`;
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(new Date(year, month, 0).getDate()).padStart(2, '0')}`;

  const { data: availability } = await admin
    .from('paid_mentorship_availability')
    .select('available_date, start_time_ist, end_time_ist')
    .eq('is_active', true)
    .gte('available_date', startDate)
    .lte('available_date', endDate);

  if (!availability || availability.length === 0) return [];

  const today = new Date().toISOString().slice(0, 10);
  const dates = [...new Set(availability.map((a) => a.available_date))].filter((d) => d >= today);

  if (dates.length === 0) return [];

  const { data: bookings } = await admin
    .from('paid_mentorship_bookings')
    .select('session_date, start_time_ist, end_time_ist')
    .in('session_date', dates)
    .in('status', ['confirmed', 'rescheduled', 'pending']);

  return dates.map((date) => {
    const dateAvailability = availability.filter((a) => a.available_date === date);
    let totalSlots = 0;
    let bookedSlots = 0;

    for (const avail of dateAvailability) {
      const startMin = timeToMinutes(String(avail.start_time_ist));
      const endMin = timeToMinutes(String(avail.end_time_ist));
      for (let m = startMin; m + 30 <= endMin; m += 30) {
        totalSlots++;
      }
    }

    const dateBookings = (bookings ?? []).filter((b) => b.session_date === date);
    for (const booking of dateBookings) {
      const bStart = timeToMinutes(String(booking.start_time_ist));
      const bEnd = timeToMinutes(String(booking.end_time_ist));
      for (let m = bStart; m + 30 <= bEnd; m += 30) {
        bookedSlots++;
      }
    }

    return {
      date,
      status: bookedSlots >= totalSlots ? 'full' as const : 'available' as const,
      availableSlots: Math.max(0, totalSlots - bookedSlots),
    };
  });
}

// ─── Bookings ────────────────────────────────────────────────────────────────

export const getActiveBookingForUser = cache(async function getActiveBookingForUser(userId: string): Promise<BookingWithDetails | null> {
  'use cache';
  // Short cache life: "active" is time-sensitive (a session can transition to
  // "ended" without any booking mutation to trigger a tag-based revalidation).
  cacheLife('minutes');
  cacheTag(`mentorship-bookings-${userId}`);

  const admin = createAdminClient();

  const { data, error } = await admin
    .from('paid_mentorship_bookings')
    .select('id, user_id, student_id, college_id, category_id, session_date, start_time_ist, end_time_ist, achievement_goal, skill_level, additional_notes, whatsapp_number, custom_answers, meeting_url, status, reschedule_count, rescheduled_from, coupon_code, discount_amount_minor, original_price_minor, selling_price_minor, final_amount_minor, currency, order_id, expires_at, completed_at, cancelled_at, created_at, updated_at')
    .eq('user_id', userId)
    .in('status', ['pending', 'confirmed', 'rescheduled'])
    .order('created_at', { ascending: false })
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const booking = data as PaidMentorshipBooking;

  if (booking.status === 'pending') {
    if (isPendingBookingExpired(booking)) return null;
  } else if (isBookingSessionOver(booking)) {
    // Confirmed/rescheduled bookings whose session has already ended are no
    // longer "active" — they belong in booking history instead.
    return null;
  }

  const { data: category } = await admin
    .from('paid_mentorship_categories')
    .select('id, title, description, is_active, sort_order')
    .eq('id', booking.category_id)
    .maybeSingle();

  return {
    ...booking,
    category: category as PaidMentorshipCategory | undefined,
  };
});

/**
 * Past/completed booking history for a user: explicitly `completed`,
 * `confirmed`/`rescheduled` bookings whose session has already ended, or
 * `cancelled` bookings (kept for a full history view).
 */
export const getPastOrCompletedBookingsForUser = cache(async function getPastOrCompletedBookingsForUser(userId: string): Promise<BookingWithDetails[]> {
  'use cache';
  cacheLife('minutes');
  cacheTag(`mentorship-bookings-${userId}`);

  const admin = createAdminClient();

  const { data, error } = await admin
    .from('paid_mentorship_bookings')
    .select('id, user_id, student_id, college_id, category_id, session_date, start_time_ist, end_time_ist, achievement_goal, skill_level, additional_notes, whatsapp_number, custom_answers, meeting_url, status, reschedule_count, rescheduled_from, coupon_code, discount_amount_minor, original_price_minor, selling_price_minor, final_amount_minor, currency, order_id, expires_at, completed_at, cancelled_at, created_at, updated_at')
    .eq('user_id', userId)
    .in('status', ['completed', 'confirmed', 'rescheduled', 'cancelled'])
    .order('session_date', { ascending: false })
    .order('start_time_ist', { ascending: false });

  if (error) throw new Error(error.message);

  const bookings = (data ?? []) as PaidMentorshipBooking[];
  const pastOrCompleted = bookings.filter((booking) => {
    if (booking.status === 'completed' || booking.status === 'cancelled') return true;
    // 'confirmed' | 'rescheduled': only history once the session has ended.
    return isBookingSessionOver(booking);
  });

  if (pastOrCompleted.length === 0) return [];

  const categoryIds = Array.from(new Set(pastOrCompleted.map((b) => b.category_id)));
  const { data: categories, error: catError } = await admin
    .from('paid_mentorship_categories')
    .select('id, title, description, custom_questions, is_active, sort_order')
    .in('id', categoryIds);

  if (catError) throw new Error(catError.message);

  const categoryMap = new Map((categories ?? []).map((c) => [c.id as string, c]));

  return pastOrCompleted.map((booking) => ({
    ...booking,
    category: categoryMap.get(booking.category_id) as PaidMentorshipCategory | undefined,
  }));
});

export const getUpcomingBookingsForUser = cache(async function getUpcomingBookingsForUser(userId: string): Promise<BookingWithDetails[]> {
  'use cache';
  cacheLife('minutes');
  cacheTag(`mentorship-bookings-${userId}`);

  const admin = createAdminClient();

  // Fetch eligible statuses; classify active vs past using UTC end instants
  // (not date-only string compares against UTC calendar day).
  const { data, error } = await admin
    .from('paid_mentorship_bookings')
    .select('id, user_id, student_id, college_id, category_id, session_date, start_time_ist, end_time_ist, achievement_goal, skill_level, additional_notes, whatsapp_number, custom_answers, meeting_url, status, reschedule_count, rescheduled_from, coupon_code, discount_amount_minor, original_price_minor, selling_price_minor, final_amount_minor, currency, order_id, expires_at, completed_at, cancelled_at, created_at, updated_at')
    .eq('user_id', userId)
    .in('status', ['confirmed', 'rescheduled'])
    .order('session_date', { ascending: true })
    .order('start_time_ist', { ascending: true });

  if (error) throw new Error(error.message);

  const bookings = ((data ?? []) as PaidMentorshipBooking[]).filter(
    (booking) => !isBookingSessionOver(booking),
  );
  if (bookings.length === 0) return [];

  const categoryIds = Array.from(new Set(bookings.map((b) => b.category_id)));
  const { data: categories, error: catError } = await admin
    .from('paid_mentorship_categories')
    .select('id, title, description, custom_questions, is_active, sort_order')
    .in('id', categoryIds);

  if (catError) throw new Error(catError.message);

  const categoryMap = new Map((categories ?? []).map((c) => [c.id as string, c]));

  return bookings.map((booking) => ({
    ...booking,
    category: categoryMap.get(booking.category_id) as PaidMentorshipCategory | undefined,
  }));
});

export async function createPendingBooking(input: {
  userId: string;
  studentId: string;
  collegeId: string;
  categoryId: string;
  sessionDate: string;
  startTimeIst: string;
  endTimeIst: string;
  achievementGoal: string;
  skillLevel: string;
  additionalNotes?: string;
  whatsappNumber?: string;
  customAnswers?: CustomAnswer[];
  couponCode?: string;
  originalPriceMinor: number;
  sellingPriceMinor: number;
  discountAmountMinor: number;
  finalAmountMinor: number;
  orderId: string;
}): Promise<PaidMentorshipBooking> {
  const admin = createAdminClient();

  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  const { data, error } = await admin
    .from('paid_mentorship_bookings')
    .insert({
      user_id: input.userId,
      student_id: input.studentId,
      college_id: input.collegeId,
      category_id: input.categoryId,
      session_date: input.sessionDate,
      start_time_ist: input.startTimeIst,
      end_time_ist: input.endTimeIst,
      achievement_goal: input.achievementGoal,
      skill_level: input.skillLevel,
      additional_notes: input.additionalNotes || null,
      whatsapp_number: input.whatsappNumber || null,
      custom_answers: input.customAnswers ?? [],
      coupon_code: input.couponCode || null,
      original_price_minor: input.originalPriceMinor,
      selling_price_minor: input.sellingPriceMinor,
      discount_amount_minor: input.discountAmountMinor,
      final_amount_minor: input.finalAmountMinor,
      order_id: input.orderId,
      status: 'pending',
      expires_at: expiresAt,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as PaidMentorshipBooking;
}

export async function confirmBooking(bookingId: string, orderId: string): Promise<void> {
  const admin = createAdminClient();

  const { data: booking, error: fetchError } = await admin
    .from('paid_mentorship_bookings')
    .select('user_id, category_id, session_date, start_time_ist, end_time_ist, meeting_url, final_amount_minor')
    .eq('id', bookingId)
    .eq('order_id', orderId)
    .eq('status', 'pending')
    .maybeSingle();

  if (fetchError) throw new Error(fetchError.message);
  if (!booking) return;

  const { error } = await admin
    .from('paid_mentorship_bookings')
    .update({
      status: 'confirmed',
      expires_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', bookingId)
    .eq('order_id', orderId)
    .eq('status', 'pending');

  if (error) throw new Error(error.message);

  revalidateTag(`mentorship-bookings-${booking.user_id}`, 'max');
  revalidateTag(`student-payment-history-${booking.user_id}`, 'max');

  // Fire-and-forget transactional emails after booking is confirmed — logged on failure
  // instead of dropped silently, since callers don't await these.
  const { sendMentorshipPaymentConfirmation, sendMentorshipBookingConfirmed } = await import('@/lib/lms/transactional-email/mentorship-emails');
  if ((booking.final_amount_minor ?? 0) > 0) {
    void sendMentorshipPaymentConfirmation({
      userId: booking.user_id,
      categoryTitle: '',
      categoryId: booking.category_id,
      sessionDate: booking.session_date,
      startTime: booking.start_time_ist,
      endTime: booking.end_time_ist,
      orderId,
      totalMinor: booking.final_amount_minor,
    }).catch((err) => console.error('[paid-mentorship] payment confirmation email failed', { bookingId, orderId, err }));
  }
  void sendMentorshipBookingConfirmed({
    userId: booking.user_id,
    categoryId: booking.category_id,
    sessionDate: booking.session_date,
    startTime: booking.start_time_ist,
    endTime: booking.end_time_ist,
    meetingUrl: booking.meeting_url,
    orderId,
    bookingId,
  }).catch((err) => console.error('[paid-mentorship] booking confirmation email failed', { bookingId, orderId, err }));
}

export async function rescheduleBooking(
  bookingId: string,
  userId: string,
  newDate: string,
  newStart: string,
  newEnd: string,
): Promise<PaidMentorshipBooking> {
  const admin = createAdminClient();

  const { data: existing, error: fetchError } = await admin
    .from('paid_mentorship_bookings')
    .select('id, user_id, student_id, college_id, category_id, session_date, start_time_ist, end_time_ist, achievement_goal, skill_level, additional_notes, whatsapp_number, custom_answers, meeting_url, status, reschedule_count, rescheduled_from, coupon_code, discount_amount_minor, original_price_minor, selling_price_minor, final_amount_minor, currency, order_id, expires_at, completed_at, cancelled_at, created_at, updated_at')
    .eq('id', bookingId)
    .eq('user_id', userId)
    .eq('status', 'confirmed')
    .maybeSingle();

  if (fetchError || !existing) throw new Error('Booking not found or not reschedulable.');

  const booking = existing as PaidMentorshipBooking;

  if (booking.reschedule_count >= 1) {
    throw new Error('You have already used your one reschedule opportunity.');
  }

  const normalizeTime = (t: string) => String(t).slice(0, 5);
  if (
    booking.session_date === newDate &&
    normalizeTime(booking.start_time_ist) === normalizeTime(newStart) &&
    normalizeTime(booking.end_time_ist) === normalizeTime(newEnd)
  ) {
    throw new Error('New schedule is identical to the existing schedule.');
  }

  const sessionStart = new Date(`${booking.session_date}T${booking.start_time_ist}`);
  const now = new Date();
  const hoursUntil = (sessionStart.getTime() - now.getTime()) / (1000 * 60 * 60);
  if (hoursUntil < 24) {
    throw new Error('Reschedule must be at least 24 hours before the session.');
  }

  const { error: updateError } = await admin
    .from('paid_mentorship_bookings')
    .update({
      status: 'rescheduled',
      updated_at: new Date().toISOString(),
    })
    .eq('id', bookingId);

  if (updateError) throw new Error(updateError.message);

  const { data: newBooking, error: insertError } = await admin
    .from('paid_mentorship_bookings')
    .insert({
      user_id: booking.user_id,
      student_id: booking.student_id,
      college_id: booking.college_id,
      category_id: booking.category_id,
      session_date: newDate,
      start_time_ist: newStart,
      end_time_ist: newEnd,
      achievement_goal: booking.achievement_goal,
      skill_level: booking.skill_level,
      additional_notes: booking.additional_notes,
      whatsapp_number: booking.whatsapp_number,
      meeting_url: booking.meeting_url,
      coupon_code: booking.coupon_code,
      original_price_minor: booking.original_price_minor,
      selling_price_minor: booking.selling_price_minor,
      discount_amount_minor: booking.discount_amount_minor,
      final_amount_minor: booking.final_amount_minor,
      order_id: booking.order_id,
      status: 'confirmed',
      reschedule_count: booking.reschedule_count + 1,
      rescheduled_from: booking.id,
    })
    .select()
    .single();

  if (insertError) throw new Error(insertError.message);

  revalidateTag(`mentorship-bookings-${booking.user_id}`, 'max');
  revalidateTag(`student-payment-history-${booking.user_id}`, 'max');

  const created = newBooking as PaidMentorshipBooking;

  // Fire-and-forget after successful commit: reschedule notification only (no invoice/payment email).
  const { sendMentorshipRescheduleConfirmed } = await import(
    '@/lib/lms/transactional-email/mentorship-emails'
  );
  void sendMentorshipRescheduleConfirmed({
    userId: booking.user_id,
    categoryId: booking.category_id,
    previousDate: booking.session_date,
    previousStartTime: booking.start_time_ist,
    previousEndTime: booking.end_time_ist,
    newDate,
    newStartTime: newStart,
    newEndTime: newEnd,
    bookingId: created.id,
    rescheduleVersion: created.reschedule_count,
    meetingUrl: created.meeting_url ?? booking.meeting_url,
    statusLabel: created.status === 'confirmed' ? 'Confirmed' : created.status,
  });

  return created;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeToMinutes(time: string): number {
  const [h, m] = String(time).split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Resolves the true UTC end instant for a paid mentorship session.
 *
 * Schema (00238): `session_date` is DATE, `start_time_ist`/`end_time_ist` are TIME
 * (wall-clock IST). There is no `ends_at` timestamptz column. Comparisons use the
 * absolute UTC instant derived from those IST-local fields; IST is never compared
 * as a date-only string for active/past classification.
 */
export function getBookingSessionEndsAt(sessionDate: string, endTimeIst: string): Date {
  const [hourStr, minuteStr, secondStr] = String(endTimeIst).split(':');
  return localDateTimeToUtc(sessionDate, 'Asia/Kolkata', {
    hour: Number(hourStr) || 0,
    minute: Number(minuteStr) || 0,
    second: Number(secondStr) || 0,
  });
}

export function getBookingSessionStartsAt(sessionDate: string, startTimeIst: string): Date {
  const [hourStr, minuteStr, secondStr] = String(startTimeIst).split(':');
  return localDateTimeToUtc(sessionDate, 'Asia/Kolkata', {
    hour: Number(hourStr) || 0,
    minute: Number(minuteStr) || 0,
    second: Number(secondStr) || 0,
  });
}

function isBookingSessionOver(booking: Pick<PaidMentorshipBooking, 'session_date' | 'end_time_ist'>): boolean {
  return getBookingSessionEndsAt(booking.session_date, booking.end_time_ist).getTime() < Date.now();
}

function isPendingBookingExpired(booking: Pick<PaidMentorshipBooking, 'expires_at'>): boolean {
  // expires_at is timestamptz — compare as absolute UTC instant.
  return Boolean(booking.expires_at) && new Date(booking.expires_at as string).getTime() < Date.now();
}
