import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';

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
  created_at: string;
  updated_at: string;
}

export interface PaidMentorshipAvailability {
  id: string;
  available_date: string;
  start_time_ist: string;
  end_time_ist: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PaidMentorshipPricing {
  id: string;
  original_price_minor: number;
  selling_price_minor: number;
  currency: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
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
  cancel_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface BookingWithDetails extends PaidMentorshipBooking {
  category?: PaidMentorshipCategory;
  student?: {
    id: string;
    user_id: string;
    student_code: string | null;
  };
  profile?: {
    full_name: string | null;
    email: string | null;
  };
  college?: {
    name: string;
  };
}

export interface TimeSlot {
  start: string;
  end: string;
  available: boolean;
  booking_id?: string;
}

// ─── Categories ──────────────────────────────────────────────────────────────

export async function listPaidMentorshipCategories(): Promise<PaidMentorshipCategory[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('paid_mentorship_categories')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as PaidMentorshipCategory[];
}

export async function listActivePaidMentorshipCategories(): Promise<PaidMentorshipCategory[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('paid_mentorship_categories')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as PaidMentorshipCategory[];
}

export async function createPaidMentorshipCategory(input: {
  title: string;
  description?: string;
  custom_questions?: CustomQuestion[];
}): Promise<PaidMentorshipCategory> {
  const admin = createAdminClient();
  if (!input.title.trim()) throw new Error('Title is required.');

  const { count } = await admin
    .from('paid_mentorship_categories')
    .select('id', { count: 'exact', head: true });

  const { data, error } = await admin
    .from('paid_mentorship_categories')
    .insert({
      title: input.title.trim(),
      description: input.description?.trim() || null,
      custom_questions: input.custom_questions ?? [],
      sort_order: (count ?? 0) + 1,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as PaidMentorshipCategory;
}

export async function updatePaidMentorshipCategory(
  id: string,
  input: { title?: string; description?: string; custom_questions?: CustomQuestion[]; is_active?: boolean; sort_order?: number },
): Promise<PaidMentorshipCategory> {
  const admin = createAdminClient();
  if (!id) throw new Error('Category id is required.');

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.title !== undefined) updates.title = input.title.trim();
  if (input.description !== undefined) updates.description = input.description?.trim() || null;
  if (input.custom_questions !== undefined) updates.custom_questions = input.custom_questions;
  if (input.is_active !== undefined) updates.is_active = input.is_active;
  if (input.sort_order !== undefined) updates.sort_order = input.sort_order;

  const { data, error } = await admin
    .from('paid_mentorship_categories')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as PaidMentorshipCategory;
}

export async function deletePaidMentorshipCategory(id: string): Promise<void> {
  const admin = createAdminClient();
  if (!id) throw new Error('Category id is required.');

  const { count } = await admin
    .from('paid_mentorship_bookings')
    .select('id', { count: 'exact', head: true })
    .eq('category_id', id)
    .in('status', ['pending', 'confirmed', 'rescheduled']);

  if (count && count > 0) {
    throw new Error('Cannot delete category with active bookings. Deactivate it instead.');
  }

  const { error } = await admin
    .from('paid_mentorship_categories')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);
}

// ─── Availability ────────────────────────────────────────────────────────────

export async function listPaidMentorshipAvailability(): Promise<PaidMentorshipAvailability[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('paid_mentorship_availability')
    .select('*')
    .eq('is_active', true)
    .gte('available_date', new Date().toISOString().slice(0, 10))
    .order('available_date', { ascending: true })
    .order('start_time_ist', { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as PaidMentorshipAvailability[];
}

export async function upsertPaidMentorshipAvailability(slots: Array<{
  available_date: string;
  start_time_ist: string;
  end_time_ist: string;
  is_active: boolean;
}>): Promise<void> {
  const admin = createAdminClient();

  const { error: deleteError } = await admin
    .from('paid_mentorship_availability')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');

  if (deleteError) throw new Error(deleteError.message);

  const rows = slots.map((s) => ({
    available_date: s.available_date,
    start_time_ist: s.start_time_ist,
    end_time_ist: s.end_time_ist,
    is_active: s.is_active,
  }));

  if (rows.length === 0) return;

  const { error } = await admin
    .from('paid_mentorship_availability')
    .insert(rows);

  if (error) throw new Error(error.message);
}

export async function generateTimeSlots(
  date: string,
): Promise<TimeSlot[]> {
  const admin = createAdminClient();

  const { data: availability, error: availError } = await admin
    .from('paid_mentorship_availability')
    .select('*')
    .eq('available_date', date)
    .eq('is_active', true);

  if (availError) throw new Error(availError.message);
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

  const { data: bookings } = await admin
    .from('paid_mentorship_bookings')
    .select('id, start_time_ist, end_time_ist, status')
    .eq('session_date', date)
    .in('status', ['confirmed', 'rescheduled', 'pending']);

  for (const slot of slots) {
    const slotStart = timeToMinutes(slot.start);
    const slotEnd = timeToMinutes(slot.end);

    for (const booking of bookings ?? []) {
      const bStart = timeToMinutes(String(booking.start_time_ist));
      const bEnd = timeToMinutes(String(booking.end_time_ist));

      if (slotStart < bEnd && slotEnd > bStart) {
        slot.available = false;
        slot.booking_id = booking.id;
        break;
      }
    }
  }

  return slots;
}

// ─── Pricing ─────────────────────────────────────────────────────────────────

export async function getPaidMentorshipPricing(): Promise<PaidMentorshipPricing | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('paid_mentorship_pricing')
    .select('*')
    .eq('is_active', true)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as PaidMentorshipPricing | null) ?? null;
}

export async function updatePaidMentorshipPricing(input: {
  original_price_minor: number;
  selling_price_minor: number;
}): Promise<PaidMentorshipPricing> {
  const admin = createAdminClient();

  const { data: existing } = await admin
    .from('paid_mentorship_pricing')
    .select('id')
    .eq('is_active', true)
    .maybeSingle();

  if (existing) {
    const { data, error } = await admin
      .from('paid_mentorship_pricing')
      .update({
        original_price_minor: input.original_price_minor,
        selling_price_minor: input.selling_price_minor,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as PaidMentorshipPricing;
  }

  const { data, error } = await admin
    .from('paid_mentorship_pricing')
    .insert({
      original_price_minor: input.original_price_minor,
      selling_price_minor: input.selling_price_minor,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as PaidMentorshipPricing;
}

// ─── Bookings ────────────────────────────────────────────────────────────────

export async function listPaidMentorshipBookings(options?: {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}): Promise<{ bookings: BookingWithDetails[]; total: number }> {
  const admin = createAdminClient();
  const page = options?.page ?? 1;
  const limit = options?.limit ?? 20;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = admin
    .from('paid_mentorship_bookings')
    .select('*', { count: 'exact' });

  if (options?.status && options.status !== 'all') {
    query = query.eq('status', options.status);
  }

  query = query
    .order('created_at', { ascending: false })
    .range(from, to);

  const { data, error, count } = await query;

  if (error) throw new Error(error.message);

  const bookings = (data ?? []) as PaidMentorshipBooking[];

  const enriched = await Promise.all(
    bookings.map(async (booking) => {
      const [categoryResult, studentResult, profileResult, collegeResult] = await Promise.all([
        admin
          .from('paid_mentorship_categories')
          .select('*')
          .eq('id', booking.category_id)
          .maybeSingle(),
        admin
          .from('students')
          .select('id, user_id, student_code')
          .eq('id', booking.student_id)
          .maybeSingle(),
        admin
          .from('profiles')
          .select('full_name, email')
          .eq('id', booking.user_id)
          .maybeSingle(),
        admin
          .from('colleges')
          .select('name')
          .eq('id', booking.college_id)
          .maybeSingle(),
      ]);

      return {
        ...booking,
        category: categoryResult.data as PaidMentorshipCategory | undefined,
        student: studentResult.data as { id: string; user_id: string; student_code: string | null } | undefined,
        profile: profileResult.data as { full_name: string | null; email: string | null } | undefined,
        college: collegeResult.data as { name: string } | undefined,
      };
    }),
  );

  return { bookings: enriched, total: count ?? 0 };
}

export async function getPaidMentorshipBookingById(
  id: string,
): Promise<BookingWithDetails | null> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from('paid_mentorship_bookings')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const booking = data as PaidMentorshipBooking;

  const [categoryResult, studentResult, profileResult, collegeResult] = await Promise.all([
    admin
      .from('paid_mentorship_categories')
      .select('*')
      .eq('id', booking.category_id)
      .maybeSingle(),
    admin
      .from('students')
      .select('id, user_id, student_code')
      .eq('id', booking.student_id)
      .maybeSingle(),
    admin
      .from('profiles')
      .select('full_name, email')
      .eq('id', booking.user_id)
      .maybeSingle(),
    admin
      .from('colleges')
      .select('name')
      .eq('id', booking.college_id)
      .maybeSingle(),
  ]);

  return {
    ...booking,
    category: categoryResult.data as PaidMentorshipCategory | undefined,
    student: studentResult.data as { id: string; user_id: string; student_code: string | null } | undefined,
    profile: profileResult.data as { full_name: string | null; email: string | null } | undefined,
    college: collegeResult.data as { name: string } | undefined,
  };
}

export async function markBookingCompleted(bookingId: string): Promise<void> {
  const admin = createAdminClient();

  const { error } = await admin
    .from('paid_mentorship_bookings')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', bookingId)
    .eq('status', 'confirmed');

  if (error) throw new Error(error.message);
}

export { cancelBookingAndRefund } from '@/lib/services/paid-mentorship-cancel-refund';

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
