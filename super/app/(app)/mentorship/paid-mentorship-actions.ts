'use server';

import { revalidatePath } from 'next/cache';
import { getSession } from '@/lib/auth/session';
import {
  listPaidMentorshipCategories,
  createPaidMentorshipCategory,
  updatePaidMentorshipCategory,
  deletePaidMentorshipCategory,
  listPaidMentorshipAvailability,
  upsertPaidMentorshipAvailability,
  getPaidMentorshipPricing,
  updatePaidMentorshipPricing,
  listPaidMentorshipBookings,
  getPaidMentorshipBookingById,
  markBookingCompleted,
  cancelBookingAndRefund,
  type CustomQuestion,
} from '@/lib/services/paid-mentorship';

// ─── Categories ──────────────────────────────────────────────────────────────

export async function listPaidMentorshipCategoriesAction() {
  const { session } = await getSession();
  if (!session?.user) return { ok: false as const, error: 'Unauthorized' };
  try {
    const categories = await listPaidMentorshipCategories();
    return { ok: true as const, categories };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : 'Failed' };
  }
}

export async function createPaidMentorshipCategoryAction(formData: FormData) {
  const { session } = await getSession();
  if (!session?.user) return { ok: false as const, error: 'Unauthorized' };
  try {
    const customQuestionsRaw = formData.get('custom_questions');
    const customQuestions: CustomQuestion[] = customQuestionsRaw
      ? JSON.parse(String(customQuestionsRaw))
      : [];
    const category = await createPaidMentorshipCategory({
      title: String(formData.get('title') ?? ''),
      description: String(formData.get('description') ?? ''),
      custom_questions: customQuestions,
    });
    revalidatePath('/mentorship');
    return { ok: true as const, category };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : 'Failed' };
  }
}

export async function updatePaidMentorshipCategoryAction(id: string, formData: FormData) {
  const { session } = await getSession();
  if (!session?.user) return { ok: false as const, error: 'Unauthorized' };
  try {
    const customQuestionsRaw = formData.get('custom_questions');
    const updates: {
      title: string;
      description: string;
      is_active: boolean;
      custom_questions?: CustomQuestion[];
    } = {
      title: String(formData.get('title') ?? ''),
      description: String(formData.get('description') ?? ''),
      is_active: formData.get('is_active') === 'true',
    };
    if (customQuestionsRaw) {
      updates.custom_questions = JSON.parse(String(customQuestionsRaw));
    }
    const category = await updatePaidMentorshipCategory(id, updates);
    revalidatePath('/mentorship');
    return { ok: true as const, category };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : 'Failed' };
  }
}

export async function togglePaidMentorshipCategoryAction(id: string, isActive: boolean) {
  const { session } = await getSession();
  if (!session?.user) return { ok: false as const, error: 'Unauthorized' };
  try {
    await updatePaidMentorshipCategory(id, { is_active: isActive });
    revalidatePath('/mentorship');
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : 'Failed' };
  }
}

export async function deletePaidMentorshipCategoryAction(id: string) {
  const { session } = await getSession();
  if (!session?.user) return { ok: false as const, error: 'Unauthorized' };
  try {
    await deletePaidMentorshipCategory(id);
    revalidatePath('/mentorship');
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : 'Failed' };
  }
}

// ─── Availability ────────────────────────────────────────────────────────────

export async function listPaidMentorshipAvailabilityAction() {
  const { session } = await getSession();
  if (!session?.user) return { ok: false as const, error: 'Unauthorized' };
  try {
    const availability = await listPaidMentorshipAvailability();
    return { ok: true as const, availability };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : 'Failed' };
  }
}

export async function savePaidMentorshipAvailabilityAction(slots: Array<{
  available_date: string;
  start_time_ist: string;
  end_time_ist: string;
  is_active: boolean;
}>) {
  const { session } = await getSession();
  if (!session?.user) return { ok: false as const, error: 'Unauthorized' };
  try {
    await upsertPaidMentorshipAvailability(slots);
    revalidatePath('/mentorship');
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : 'Failed' };
  }
}

// ─── Pricing ─────────────────────────────────────────────────────────────────

export async function getPaidMentorshipPricingAction() {
  const { session } = await getSession();
  if (!session?.user) return { ok: false as const, error: 'Unauthorized' };
  try {
    const pricing = await getPaidMentorshipPricing();
    return { ok: true as const, pricing };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : 'Failed' };
  }
}

export async function updatePaidMentorshipPricingAction(formData: FormData) {
  const { session } = await getSession();
  if (!session?.user) return { ok: false as const, error: 'Unauthorized' };
  try {
    const original = Number(formData.get('original_price_minor') ?? 0);
    const selling = Number(formData.get('selling_price_minor') ?? 0);
    if (selling > original) {
      return { ok: false as const, error: 'Selling price cannot be greater than MRP.' };
    }
    const pricing = await updatePaidMentorshipPricing({
      original_price_minor: original,
      selling_price_minor: selling,
    });
    revalidatePath('/mentorship');
    return { ok: true as const, pricing };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : 'Failed' };
  }
}

// ─── Bookings ────────────────────────────────────────────────────────────────

export async function listPaidMentorshipBookingsAction(options?: {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}) {
  const { session } = await getSession();
  if (!session?.user) return { ok: false as const, error: 'Unauthorized' };
  try {
    const result = await listPaidMentorshipBookings(options);
    return { ok: true as const, ...result };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : 'Failed' };
  }
}

export async function getBookingDetailAction(id: string) {
  const { session } = await getSession();
  if (!session?.user) return { ok: false as const, error: 'Unauthorized' };
  try {
    const booking = await getPaidMentorshipBookingById(id);
    return { ok: true as const, booking };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : 'Failed' };
  }
}

export async function markBookingCompletedAction(bookingId: string) {
  const { session } = await getSession();
  if (!session?.user) return { ok: false as const, error: 'Unauthorized' };
  try {
    await markBookingCompleted(bookingId);

    // Fire-and-forget: send session completed email via LMS
    const booking = await getPaidMentorshipBookingById(bookingId);
    if (booking) {
      const lmsUrl = process.env.NEXT_PUBLIC_LMS_URL ?? process.env.LMS_INTERNAL_URL;
      const apiSecret = process.env.INTERNAL_API_SECRET;
      if (lmsUrl && apiSecret) {
        void fetch(`${lmsUrl}/api/internal/mentorship/session-completed`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiSecret}`,
          },
          body: JSON.stringify({
            userId: booking.user_id,
            categoryId: booking.category_id,
            sessionDate: booking.session_date,
            bookingId: booking.id,
          }),
        }).catch(() => {});
      }
    }

    revalidatePath('/mentorship');
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : 'Failed' };
  }
}

export async function cancelBookingAndRefundAction(bookingId: string, reason?: string) {
  const { session } = await getSession();
  if (!session?.user) return { ok: false as const, error: 'Unauthorized' };
  try {
    const result = await cancelBookingAndRefund(bookingId, reason, session.user.id);
    revalidatePath('/mentorship');
    return { ok: true as const, ...result };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : 'Failed' };
  }
}
