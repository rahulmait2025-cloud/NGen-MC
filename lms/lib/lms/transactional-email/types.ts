import type { EmailCategory } from '@/lib/email/types';

export type LmsEmailEventType =
  | 'google_welcome'
  | 'account_welcome'
  | 'campus_ambassador_approval'
  | 'payment_confirmation'
  | 'batch_enrollment_success'
  | 'mentorship_payment_confirmation'
  | 'mentorship_booking_confirmed'
  | 'mentorship_reminder'
  | 'mentorship_reschedule_confirmed'
  | 'mentorship_session_completed'
  | 'mentorship_admin_booking_notification'
  | 'mentorship_admin_reschedule_notification';

export type QueueLmsEmailInput = {
  eventType: LmsEmailEventType;
  userId?: string | null;
  studentId?: string | null;
  /** Must be a public.orders id when set (FK). Never pass note_payment_orders.id here. */
  orderId?: string | null;
  /** Notes purchases only — stored in metadata, not order_id. */
  notePaymentOrderId?: string | null;
  invoiceId?: string | null;
  toEmail: string;
  subject: string;
  htmlBody: string;
  textBody: string;
  category: EmailCategory;
  idempotencyKey: string;
  metadata?: Record<string, unknown>;
};

export type QueueLmsEmailResult = {
  ok: boolean;
  outboxId?: string;
  skipped: boolean;
  error?: string;
};

export type ProcessLmsEmailOutboxResult = {
  processed: number;
  sent: number;
  failed: number;
};
