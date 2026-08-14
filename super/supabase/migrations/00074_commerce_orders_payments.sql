-- Phase 6A: Commerce Core — Orders, Payments, Coupons, Refunds
-- Supports both LMS and CollegeAdmin purchase flows via Razorpay.

-- ─── Enums ─────────────────────────────────────────────────────────────────────

-- Order lifecycle
CREATE TYPE order_status AS ENUM (
  'pending',
  'paid',
  'failed',
  'cancelled',
  'refunded'
);

-- Payment lifecycle
CREATE TYPE payment_status AS ENUM (
  'initiated',
  'authorized',
  'captured',
  'failed',
  'refunded'
);

-- Purchase source portal
CREATE TYPE purchase_source AS ENUM (
  'lms',
  'college_admin'
);

-- Sellable entity type
CREATE TYPE sellable_entity_type AS ENUM (
  'course_variant',
  'course_bundle'
);

-- Coupon discount type
CREATE TYPE coupon_discount_type AS ENUM (
  'fixed',
  'percentage'
);

-- Coupon status
CREATE TYPE coupon_status AS ENUM (
  'active',
  'expired',
  'exhausted',
  'disabled'
);

-- ─── Orders Table ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Sellable entity reference
  entity_type sellable_entity_type NOT NULL,
  entity_id UUID NOT NULL,
  
  -- Purchaser info
  purchaser_user_id UUID,
  purchaser_email TEXT NOT NULL,
  purchaser_name TEXT,
  
  -- Purchase origin
  source purchase_source NOT NULL DEFAULT 'lms',
  
  -- Pricing (server-computed, INR minor units — paise)
  base_amount_minor INTEGER NOT NULL,
  discount_amount_minor INTEGER NOT NULL DEFAULT 0,
  total_amount_minor INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  
  -- Coupon reference (if applied)
  coupon_code TEXT,
  
  -- Order lifecycle
  status order_status NOT NULL DEFAULT 'pending',
  
  -- Gateway references (Razorpay)
  gateway_name TEXT NOT NULL DEFAULT 'razorpay',
  gateway_order_id TEXT,
  gateway_payment_id TEXT,
  gateway_signature TEXT,
  
  -- Metadata (flexible audit trail)
  metadata JSONB NOT NULL DEFAULT '{}',
  
  -- Audit trail
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  cancelled_by UUID,
  cancel_reason TEXT,
  
  -- Idempotency key (prevent duplicate orders)
  idempotency_key TEXT UNIQUE
);

-- Indexes for orders
CREATE INDEX idx_orders_entity ON orders (entity_type, entity_id);
CREATE INDEX idx_orders_purchaser ON orders (purchaser_user_id);
CREATE INDEX idx_orders_purchaser_email ON orders (purchaser_email);
CREATE INDEX idx_orders_gateway_order ON orders (gateway_order_id);
CREATE INDEX idx_orders_gateway_payment ON orders (gateway_payment_id);
CREATE INDEX idx_orders_status ON orders (status);
CREATE INDEX idx_orders_source ON orders (source);
CREATE INDEX idx_orders_idempotency ON orders (idempotency_key);
CREATE INDEX idx_orders_created_at ON orders (created_at DESC);

-- ─── Order Items Table (for future multi-item cart support) ────────────────────

CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  
  entity_type sellable_entity_type NOT NULL,
  entity_id UUID NOT NULL,
  
  -- Snapshot of pricing at time of purchase
  unit_amount_minor INTEGER NOT NULL,
  discount_amount_minor INTEGER NOT NULL DEFAULT 0,
  total_amount_minor INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  
  -- Metadata
  metadata JSONB NOT NULL DEFAULT '{}',
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_order_items_order ON order_items (order_id);
CREATE INDEX idx_order_items_entity ON order_items (entity_type, entity_id);

-- ─── Payments Table (full payment lifecycle tracking) ──────────────────────────

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  
  -- Gateway references
  gateway_name TEXT NOT NULL DEFAULT 'razorpay',
  gateway_payment_id TEXT,
  gateway_order_id TEXT,
  gateway_signature TEXT,
  
  -- Payment details
  amount_minor INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  status payment_status NOT NULL DEFAULT 'initiated',
  method TEXT, -- card, upi, netbanking, wallet, etc.
  
  -- Metadata (raw gateway payload for audit)
  gateway_payload JSONB NOT NULL DEFAULT '{}',
  metadata JSONB NOT NULL DEFAULT '{}',
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  captured_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  failure_reason TEXT,
  refunded_at TIMESTAMPTZ
);

CREATE INDEX idx_payments_order ON payments (order_id);
CREATE INDEX idx_payments_gateway_payment ON payments (gateway_payment_id);
CREATE INDEX idx_payments_gateway_order ON payments (gateway_order_id);
CREATE INDEX idx_payments_status ON payments (status);

-- ─── Coupons Table ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  
  -- Discount configuration
  discount_type coupon_discount_type NOT NULL DEFAULT 'fixed',
  discount_value INTEGER NOT NULL, -- paise for fixed, percentage (0-100) for percentage
  
  -- Usage limits
  max_uses INTEGER, -- NULL = unlimited
  uses_count INTEGER NOT NULL DEFAULT 0,
  max_uses_per_user INTEGER DEFAULT 1,
  
  -- Validity window
  valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  
  -- Status
  status coupon_status NOT NULL DEFAULT 'active',
  
  -- Restrictions
  applicable_entity_types sellable_entity_type[] DEFAULT ARRAY['course_variant', 'course_bundle']::sellable_entity_type[],
  applicable_entity_ids UUID[], -- NULL = all entities of applicable types
  min_order_amount_minor INTEGER, -- minimum order value to apply coupon
  
  -- Portal restrictions
  applicable_sources purchase_source[] DEFAULT ARRAY['lms', 'college_admin']::purchase_source[],
  
  -- Metadata
  metadata JSONB NOT NULL DEFAULT '{}',
  
  -- Audit
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  disabled_at TIMESTAMPTZ,
  disabled_reason TEXT
);

CREATE INDEX idx_coupons_code ON coupons (code);
CREATE INDEX idx_coupons_status ON coupons (status);
CREATE INDEX idx_coupons_validity ON coupons (valid_from, valid_until);

-- ─── Coupon Usage Tracking ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS coupon_usages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID NOT NULL REFERENCES coupons (id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders (id) ON DELETE SET NULL,
  purchaser_user_id UUID,
  purchaser_email TEXT NOT NULL,
  
  discount_amount_minor INTEGER NOT NULL,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Prevent duplicate usage per user per coupon
  CONSTRAINT unique_coupon_usage_per_user UNIQUE (coupon_id, purchaser_user_id)
);

CREATE INDEX idx_coupon_usages_coupon ON coupon_usages (coupon_id);
CREATE INDEX idx_coupon_usages_order ON coupon_usages (order_id);
CREATE INDEX idx_coupon_usages_user ON coupon_usages (purchaser_user_id);

-- ─── Refund Events Table ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS refund_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  payment_id UUID REFERENCES payments (id) ON DELETE SET NULL,
  
  -- Gateway references
  gateway_refund_id TEXT,
  
  -- Refund details
  amount_minor INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'initiated', -- initiated, processed, completed, failed
  
  -- Audit
  initiated_by UUID,
  reason TEXT,
  gateway_payload JSONB NOT NULL DEFAULT '{}',
  metadata JSONB NOT NULL DEFAULT '{}',
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  failure_reason TEXT
);

CREATE INDEX idx_refund_events_order ON refund_events (order_id);
CREATE INDEX idx_refund_events_payment ON refund_events (payment_id);
CREATE INDEX idx_refund_events_gateway ON refund_events (gateway_refund_id);

-- ─── Webhook Audit Log ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS webhook_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL DEFAULT 'razorpay',
  event_type TEXT NOT NULL,
  event_id TEXT NOT NULL,
  raw_payload JSONB NOT NULL,
  signature_valid BOOLEAN NOT NULL DEFAULT FALSE,
  processing_status TEXT NOT NULL DEFAULT 'pending', -- pending, processed, failed, duplicate
  error_message TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_webhook_audit_provider_event ON webhook_audit_logs (provider, event_type, event_id);
CREATE INDEX idx_webhook_audit_created ON webhook_audit_logs (created_at DESC);

-- ─── Updated Pricing Fields for Variants/Bundles ──────────────────────────────

-- Ensure currency column exists on course_variants
ALTER TABLE course_variants
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'INR',
  ADD COLUMN IF NOT EXISTS pricing_model TEXT CHECK (pricing_model IN ('one_time', 'subscription_ready', 'per_seat', 'free', 'invite_only')),
  ADD COLUMN IF NOT EXISTS base_price INTEGER,
  ADD COLUMN IF NOT EXISTS publish_status TEXT CHECK (publish_status IN ('draft', 'published', 'unpublished')) DEFAULT 'draft';

-- Ensure currency column exists on course_bundles
ALTER TABLE course_bundles
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'INR',
  ADD COLUMN IF NOT EXISTS pricing_model TEXT CHECK (pricing_model IN ('one_time', 'subscription_ready', 'per_seat', 'free', 'invite_only')),
  ADD COLUMN IF NOT EXISTS base_price INTEGER,
  ADD COLUMN IF NOT EXISTS publish_status TEXT CHECK (publish_status IN ('draft', 'published', 'unpublished')) DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS lifecycle_status TEXT CHECK (lifecycle_status IN ('draft', 'active', 'expired', 'ended', 'archived')) DEFAULT 'draft';

-- ─── Row Level Security (RLS) ─────────────────────────────────────────────────

-- Orders: only authenticated users can see their own orders
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own orders"
  ON orders FOR SELECT
  USING (auth.uid() = purchaser_user_id);

-- Order items: follow order ownership
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own order items"
  ON order_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.purchaser_user_id = auth.uid()
  ));

-- Payments: follow order ownership
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payments"
  ON payments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM orders WHERE orders.id = payments.order_id AND orders.purchaser_user_id = auth.uid()
  ));

-- Coupons: public read for active coupons
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active coupons"
  ON coupons FOR SELECT
  USING (status = 'active');

-- Coupon usages: users can see their own
ALTER TABLE coupon_usages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own coupon usages"
  ON coupon_usages FOR SELECT
  USING (purchaser_user_id = auth.uid());

-- Refund events: follow order ownership
ALTER TABLE refund_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own refund events"
  ON refund_events FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM orders WHERE orders.id = refund_events.order_id AND orders.purchaser_user_id = auth.uid()
  ));

-- Webhook audit logs: admin only (superadmin service role bypass)
ALTER TABLE webhook_audit_logs ENABLE ROW LEVEL SECURITY;

-- ─── Helper Functions ──────────────────────────────────────────────────────────

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to tables with updated_at
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_coupons_updated_at BEFORE UPDATE ON coupons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-increment coupon usage count
CREATE OR REPLACE FUNCTION increment_coupon_usage()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE coupons
  SET uses_count = uses_count + 1,
      status = CASE
        WHEN max_uses IS NOT NULL AND uses_count + 1 >= max_uses THEN 'exhausted'::coupon_status
        ELSE status
      END
  WHERE id = NEW.coupon_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_coupon_usage_insert
  AFTER INSERT ON coupon_usages
  FOR EACH ROW
  EXECUTE FUNCTION increment_coupon_usage();
