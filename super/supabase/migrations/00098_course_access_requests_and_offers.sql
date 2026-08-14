-- Migration 00098: Course Access Requests and Offers
--
-- BUSINESS MODEL:
--   Requests store demand/customization intent.
--   Offers store negotiated price and validity.
--   Payments (later) unlock access.
--
-- This migration:
--   1. Creates course_access_requests table.
--   2. Creates course_access_offers table.
--   3. Adds indexes for common query patterns.
--   4. Enables RLS with SuperAdmin-compatible policies.
--   5. Uses existing set_updated_at() trigger function.
--   6. Does NOT create TPStreams folders/assets.
--   7. Does NOT create payments/entitlements.

BEGIN;

-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 1: course_access_requests
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.course_access_requests (
  id                       uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  request_code             text           UNIQUE NOT NULL,

  request_source           text           NOT NULL
    CHECK (request_source IN ('super_admin', 'college_admin', 'student', 'system')),
  requester_user_id        uuid           NULL,
  requester_email          text           NULL,
  requester_name           text           NULL,

  target_type              text           NOT NULL
    CHECK (target_type IN ('college', 'batch', 'group', 'student', 'direct_student')),
  target_id                uuid           NULL,
  college_id               uuid           NULL,
  student_id               uuid           NULL,

  requested_entity_type    text           NOT NULL
    CHECK (requested_entity_type IN (
      'master_course', 'variant', 'bundle', 'custom_variant', 'custom_bundle'
    )),
  requested_entity_id      uuid           NULL,
  proposed_parent_course_id uuid          NULL,
  proposed_title           text           NULL,
  proposed_description     text           NULL,
  proposed_content         jsonb          NOT NULL DEFAULT '{}'::jsonb,
  requested_seats          integer        NULL
    CHECK (requested_seats IS NULL OR requested_seats > 0),
  requested_validity_days  integer        NULL
    CHECK (requested_validity_days IS NULL OR requested_validity_days > 0),
  requested_start_at       timestamptz    NULL,
  requested_notes          text           NULL,

  status                   text           NOT NULL DEFAULT 'submitted'
    CHECK (status IN (
      'draft', 'submitted', 'under_review', 'needs_clarification',
      'approved', 'rejected', 'cancelled', 'offer_created'
    )),
  priority                 text           NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  review_notes             text           NULL,
  reviewed_by              uuid           NULL,
  reviewed_at              timestamptz    NULL,

  metadata                 jsonb          NOT NULL DEFAULT '{}'::jsonb,
  created_at               timestamptz    NOT NULL DEFAULT now(),
  updated_at               timestamptz    NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_course_access_requests_updated_at
  BEFORE UPDATE ON public.course_access_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

GRANT ALL ON public.course_access_requests TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 2: course_access_offers
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.course_access_offers (
  id                       uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_code               text           UNIQUE NOT NULL,

  request_id               uuid           NULL
    REFERENCES public.course_access_requests(id) ON DELETE SET NULL,
  offer_source             text           NOT NULL DEFAULT 'request'
    CHECK (offer_source IN ('request', 'direct', 'renewal', 'manual')),

  target_type              text           NOT NULL
    CHECK (target_type IN ('college', 'batch', 'group', 'student', 'direct_student')),
  target_id                uuid           NULL,
  college_id               uuid           NULL,
  student_id               uuid           NULL,

  offered_entity_type      text           NOT NULL
    CHECK (offered_entity_type IN ('master_course', 'variant', 'bundle')),
  offered_entity_id        uuid           NOT NULL,

  final_price              numeric(12,2)  NOT NULL
    CHECK (final_price >= 0),
  currency                 text           NOT NULL DEFAULT 'INR',
  validity_days            integer        NOT NULL
    CHECK (validity_days > 0),
  seats                    integer        NULL
    CHECK (seats IS NULL OR seats > 0),
  payment_required         boolean        NOT NULL DEFAULT true,

  status                   text           NOT NULL DEFAULT 'draft'
    CHECK (status IN (
      'draft', 'sent', 'viewed', 'accepted', 'rejected',
      'expired', 'cancelled', 'payment_pending', 'paid', 'activated'
    )),
  valid_from               timestamptz    NULL,
  valid_until              timestamptz    NULL,
  accepted_at              timestamptz    NULL,
  rejected_at              timestamptz    NULL,
  sent_at                  timestamptz    NULL,

  payment_status           text           NOT NULL DEFAULT 'not_started'
    CHECK (payment_status IN (
      'not_started', 'pending', 'paid', 'failed', 'refunded', 'not_required'
    )),
  payment_reference_id     uuid           NULL,
  assignment_id            uuid           NULL,
  activated_at             timestamptz    NULL,

  created_by               uuid           NULL,
  updated_by               uuid           NULL,
  terms                    text           NULL,
  internal_notes           text           NULL,
  metadata                 jsonb          NOT NULL DEFAULT '{}'::jsonb,
  created_at               timestamptz    NOT NULL DEFAULT now(),
  updated_at               timestamptz    NOT NULL DEFAULT now(),

  CONSTRAINT course_access_offers_valid_window_check
    CHECK (valid_until IS NULL OR valid_from IS NULL OR valid_until > valid_from)
);

CREATE TRIGGER trg_course_access_offers_updated_at
  BEFORE UPDATE ON public.course_access_offers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

GRANT ALL ON public.course_access_offers TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 3: Indexes
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_car_status
  ON public.course_access_requests(status);
CREATE INDEX IF NOT EXISTS idx_car_entity
  ON public.course_access_requests(requested_entity_type, requested_entity_id);
CREATE INDEX IF NOT EXISTS idx_car_target
  ON public.course_access_requests(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_car_college_id
  ON public.course_access_requests(college_id);
CREATE INDEX IF NOT EXISTS idx_car_student_id
  ON public.course_access_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_car_created_at
  ON public.course_access_requests(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cao_status
  ON public.course_access_offers(status);
CREATE INDEX IF NOT EXISTS idx_cao_request_id
  ON public.course_access_offers(request_id);
CREATE INDEX IF NOT EXISTS idx_cao_entity
  ON public.course_access_offers(offered_entity_type, offered_entity_id);
CREATE INDEX IF NOT EXISTS idx_cao_target
  ON public.course_access_offers(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_cao_college_id
  ON public.course_access_offers(college_id);
CREATE INDEX IF NOT EXISTS idx_cao_student_id
  ON public.course_access_offers(student_id);
CREATE INDEX IF NOT EXISTS idx_cao_valid_until
  ON public.course_access_offers(valid_until);
CREATE INDEX IF NOT EXISTS idx_cao_created_at
  ON public.course_access_offers(created_at DESC);

-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 4: RLS
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.course_access_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_access_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY course_access_requests_superadmin_all
  ON public.course_access_requests
  FOR ALL
  USING (public.is_superadmin());

CREATE POLICY course_access_offers_superadmin_all
  ON public.course_access_offers
  FOR ALL
  USING (public.is_superadmin());

COMMIT;
