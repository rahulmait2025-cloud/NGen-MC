/**
 * Service for fetching active platform announcements for students.
 * Uses the LMS admin client (service-role) to bypass RLS.
 */
import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';

export interface ActiveAnnouncement {
  id: string;
  type: 'text' | 'coupon' | 'custom_html';
  title: string;
  message: string | null;
  html_content: string | null;
  cta_label: string | null;
  cta_url: string | null;
  coupon_id: string | null;
  starts_at: string;
  expires_at: string | null;
  coupons?: {
    code: string;
    discount_type: string;
    discount_value: number;
    valid_until: string | null;
  } | null;
}

/**
 * Fetch the currently active announcement for the student-facing landing page.
 * Returns null if no active announcement exists or if the active one has expired.
 */
export async function getActiveAnnouncement(): Promise<ActiveAnnouncement | null> {
  const sb = createAdminClient();

  const { data, error } = await sb
    .from('platform_announcements')
    .select('*, coupons(code, discount_type, discount_value, valid_until)')
    .eq('is_active', true)
    .lte('starts_at', new Date().toISOString())
    .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())
    .limit(1)
    .maybeSingle();

  if (error) {
    // Table may not exist yet — migration not applied
    if (error.message?.includes('does not exist') || error.message?.includes('schema cache')) {
      return null;
    }
    console.error('[announcements] Failed to fetch active announcement:', error);
    return null;
  }

  return data as ActiveAnnouncement | null;
}
