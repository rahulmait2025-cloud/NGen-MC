/**
 * Payment and Order shared types for LMS.
 * Adapts types used in SuperAdmin for consistency.
 */

export type PurchaseSource = 'lms' | 'college_admin';
export type SellableEntityType =
  | 'course_variant'
  | 'course_bundle'
  | 'master_course'
  | 'job_ready_bootcamp'
  | 'paid_mentorship_booking'
  | 'note_collection';

export type OrderStatus = 'pending' | 'paid' | 'failed' | 'cancelled' | 'refunded';
export type PaymentStatus = 'initiated' | 'authorized' | 'captured' | 'failed' | 'refunded';

export interface OrderRecord {
  id: string;
  entity_type: SellableEntityType;
  entity_id: string;
  purchaser_user_id: string | null;
  purchaser_email: string;
  purchaser_name: string | null;
  source: PurchaseSource;
  base_amount_minor: number;
  discount_amount_minor: number;
  total_amount_minor: number;
  currency: string;
  coupon_code: string | null;
  status: OrderStatus;
  gateway_name: string;
  gateway_order_id: string | null;
  gateway_payment_id: string | null;
  gateway_signature: string | null;
  metadata: Record<string, unknown>;
  idempotency_key: string | null;
  price_plan_id: string | null;
  bundle_price_plan_id?: string | null;
  content_type?: string | null;
  bundle_id?: string | null;
  created_at: string;
  updated_at: string;
  paid_at: string | null;
}

export interface OrderWithItems extends OrderRecord {
  order_items: Array<{
    id: string;
    entity_type: SellableEntityType;
    entity_id: string;
    unit_amount_minor: number;
    discount_amount_minor: number;
    total_amount_minor: number;
    currency: string;
    metadata: Record<string, unknown>;
  }>;
}

export interface RazorpayWebhookEvent {
  id?: string;
  event?: string;
  payload?: {
    payment?: {
      entity?: Record<string, unknown>;
    };
    order?: {
      entity?: Record<string, unknown>;
    };
  };
}
