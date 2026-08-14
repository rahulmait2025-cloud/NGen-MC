-- ============================================================================
-- 00301_notes_and_resources_foundation.sql
-- Foundation for note collections, course resource sections, student note
-- entitlements, and associated storage buckets.
--
-- SAFETY: This migration creates the new Notes and Resources foundation tables,
-- indexes, triggers, RLS policies, and storage buckets. It may safely replace
-- policies/triggers for the new objects created in this migration, and may update
-- the configuration of the new storage buckets through ON CONFLICT DO UPDATE.
-- It does not drop existing business data or modify existing production feature
-- tables.
--
-- DO NOT run this migration until it has been reviewed and approved.
-- ============================================================================

BEGIN;

-- ─── 1. note_collections ─────────────────────────────────────────────────────
-- A note collection is a sellable/free set of handwritten or scanned note pages,
-- optionally linked to one or more courses.
CREATE TABLE IF NOT EXISTS public.note_collections (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title               text NOT NULL,
  slug                text NOT NULL
    CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  short_description   text,
  description_md      text,
  cover_image_path    text,
  publish_status      text NOT NULL DEFAULT 'draft'
    CHECK (publish_status IN ('draft', 'published', 'unpublished', 'archived')),
  pricing_model       text NOT NULL DEFAULT 'free'
    CHECK (pricing_model IN ('free', 'paid')),
  price_minor         integer NOT NULL DEFAULT 0
    CHECK (price_minor >= 0),
  currency            text NOT NULL DEFAULT 'INR',
  validity_days       integer
    CHECK (validity_days IS NULL OR validity_days > 0),
  source_master_course_id uuid
    REFERENCES public.master_courses(id) ON DELETE SET NULL,
  visibility_scope    text NOT NULL DEFAULT 'global'
    CHECK (visibility_scope IN ('global', 'selected_colleges', 'private')),
  visibility_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by          uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by          uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  published_at        timestamptz,
  deleted_at          timestamptz,
  metadata            jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.note_collections IS
  'Sellable or free note collections (handwritten/scanned page sets).';

CREATE UNIQUE INDEX IF NOT EXISTS idx_note_collections_slug_unique
  ON public.note_collections (slug);

CREATE INDEX IF NOT EXISTS idx_note_collections_publish_status
  ON public.note_collections (publish_status);

CREATE INDEX IF NOT EXISTS idx_note_collections_pricing_model
  ON public.note_collections (pricing_model);

CREATE INDEX IF NOT EXISTS idx_note_collections_deleted_at
  ON public.note_collections (deleted_at)
  WHERE deleted_at IS NULL;

-- updated_at trigger
DROP TRIGGER IF EXISTS trg_note_collections_updated_at ON public.note_collections;
CREATE TRIGGER trg_note_collections_updated_at
  BEFORE UPDATE ON public.note_collections
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── 2. note_modules ─────────────────────────────────────────────────────────
-- Organizational grouping within a note collection (e.g., "Unit 1", "Chapter 3").
CREATE TABLE IF NOT EXISTS public.note_modules (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note_collection_id  uuid NOT NULL
    REFERENCES public.note_collections(id) ON DELETE CASCADE,
  title               text NOT NULL,
  slug                text NOT NULL
    CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  description_md      text,
  sort_order          integer NOT NULL DEFAULT 0,
  is_published        boolean NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.note_modules IS
  'Organizational modules within a note collection.';

CREATE UNIQUE INDEX IF NOT EXISTS idx_note_modules_collection_slug
  ON public.note_modules (note_collection_id, slug);

CREATE INDEX IF NOT EXISTS idx_note_modules_collection_sort
  ON public.note_modules (note_collection_id, sort_order);

DROP TRIGGER IF EXISTS trg_note_modules_updated_at ON public.note_modules;
CREATE TRIGGER trg_note_modules_updated_at
  BEFORE UPDATE ON public.note_modules
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── 3. note_pages ───────────────────────────────────────────────────────────
-- Individual pages within a note module. Images stored in a private bucket.
CREATE TABLE IF NOT EXISTS public.note_pages (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note_module_id      uuid NOT NULL
    REFERENCES public.note_modules(id) ON DELETE CASCADE,
  title               text,
  image_path          text NOT NULL,
  image_mime          text NOT NULL DEFAULT 'image/jpeg'
    CHECK (image_mime IN ('image/jpeg', 'image/png', 'image/webp')),
  width               integer
    CHECK (width IS NULL OR width > 0),
  height              integer
    CHECK (height IS NULL OR height > 0),
  file_size_bytes     bigint
    CHECK (file_size_bytes IS NULL OR file_size_bytes > 0),
  alt_text            text,
  sort_order          integer NOT NULL DEFAULT 0,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.note_pages IS
  'Individual note pages (scanned images) within a note module.';

CREATE INDEX IF NOT EXISTS idx_note_pages_module
  ON public.note_pages (note_module_id, sort_order);

DROP TRIGGER IF EXISTS trg_note_pages_updated_at ON public.note_pages;
CREATE TRIGGER trg_note_pages_updated_at
  BEFORE UPDATE ON public.note_pages
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── 4. note_course_links ────────────────────────────────────────────────────
-- Links a note collection to a course (optionally to a specific module or item).
CREATE TABLE IF NOT EXISTS public.note_course_links (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note_collection_id  uuid NOT NULL
    REFERENCES public.note_collections(id) ON DELETE CASCADE,
  course_id           uuid NOT NULL
    REFERENCES public.master_courses(id) ON DELETE CASCADE,
  module_id           uuid
    REFERENCES public.master_course_modules(id) ON DELETE SET NULL,
  item_id             uuid
    REFERENCES public.master_course_items(id) ON DELETE SET NULL,
  auto_unlock_with_course boolean NOT NULL DEFAULT true,
  sort_order          integer NOT NULL DEFAULT 0,
  created_at          timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.note_course_links IS
  'Associates note collections with courses for display in the Resources tab.';

CREATE INDEX IF NOT EXISTS idx_note_course_links_collection
  ON public.note_course_links (note_collection_id);

CREATE INDEX IF NOT EXISTS idx_note_course_links_course
  ON public.note_course_links (course_id);

-- Scope-aware unique index: same collection can link to the same course
-- at different scope levels (course-level, module-level, item-level).
CREATE UNIQUE INDEX IF NOT EXISTS idx_note_course_links_scope_unique
  ON public.note_course_links (
    note_collection_id,
    course_id,
    COALESCE(module_id, '00000000-0000-0000-0000-000000000000'::uuid),
    COALESCE(item_id,   '00000000-0000-0000-0000-000000000000'::uuid)
  );

-- ─── 5. course_resource_sections ──────────────────────────────────────────────
-- Groupings for course-level resources (shown in the Resources tab).
-- Scoped to course, module, or item level.
CREATE TABLE IF NOT EXISTS public.course_resource_sections (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id           uuid NOT NULL
    REFERENCES public.master_courses(id) ON DELETE CASCADE,
  scope_type          text NOT NULL DEFAULT 'course'
    CHECK (scope_type IN ('course', 'module', 'item')),
  module_id           uuid
    REFERENCES public.master_course_modules(id) ON DELETE SET NULL,
  item_id             uuid
    REFERENCES public.master_course_items(id) ON DELETE SET NULL,
  title               text NOT NULL,
  icon                text,
  sort_order          integer NOT NULL DEFAULT 0,
  is_visible          boolean NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),

  -- Scope integrity: module scope requires module_id, item scope requires item_id,
  -- course scope requires neither.
  CONSTRAINT course_resource_sections_scope_check CHECK (
    (scope_type = 'course'  AND module_id IS NULL AND item_id IS NULL)
    OR
    (scope_type = 'module' AND module_id IS NOT NULL AND item_id IS NULL)
    OR
    (scope_type = 'item'   AND item_id IS NOT NULL)
  )
);

COMMENT ON TABLE public.course_resource_sections IS
  'Organizational sections for course resources displayed in the Resources tab.';

CREATE INDEX IF NOT EXISTS idx_course_resource_sections_course
  ON public.course_resource_sections (course_id, scope_type, sort_order);

CREATE INDEX IF NOT EXISTS idx_course_resource_sections_module
  ON public.course_resource_sections (module_id)
  WHERE module_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_course_resource_sections_item
  ON public.course_resource_sections (item_id)
  WHERE item_id IS NOT NULL;

DROP TRIGGER IF EXISTS trg_course_resource_sections_updated_at ON public.course_resource_sections;
CREATE TRIGGER trg_course_resource_sections_updated_at
  BEFORE UPDATE ON public.course_resource_sections
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── 6. course_resource_items ─────────────────────────────────────────────────
-- Individual resource items within a section.
CREATE TABLE IF NOT EXISTS public.course_resource_items (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id          uuid NOT NULL
    REFERENCES public.course_resource_sections(id) ON DELETE CASCADE,
  kind                text NOT NULL DEFAULT 'external_link'
    CHECK (kind IN ('external_link', 'note_collection', 'markdown_text', 'file_link')),
  title               text NOT NULL,
  subtitle            text,
  icon                text,
  external_url        text,
  note_collection_id  uuid
    REFERENCES public.note_collections(id) ON DELETE SET NULL,
  file_path           text,
  markdown_body       text,
  open_in_new_tab     boolean NOT NULL DEFAULT true,
  sort_order          integer NOT NULL DEFAULT 0,
  is_visible          boolean NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),

  -- Payload integrity: each kind requires its corresponding payload column.
  CONSTRAINT course_resource_items_payload_check CHECK (
    (kind = 'external_link'   AND external_url IS NOT NULL)
    OR
    (kind = 'note_collection' AND note_collection_id IS NOT NULL)
    OR
    (kind = 'markdown_text'   AND markdown_body IS NOT NULL)
    OR
    (kind = 'file_link'       AND file_path IS NOT NULL)
  )
);

COMMENT ON TABLE public.course_resource_items IS
  'Individual resource items within a course resource section.';

CREATE INDEX IF NOT EXISTS idx_course_resource_items_section
  ON public.course_resource_items (section_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_course_resource_items_note_collection
  ON public.course_resource_items (note_collection_id)
  WHERE note_collection_id IS NOT NULL;

DROP TRIGGER IF EXISTS trg_course_resource_items_updated_at ON public.course_resource_items;
CREATE TRIGGER trg_course_resource_items_updated_at
  BEFORE UPDATE ON public.course_resource_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── 7. student_note_entitlements ────────────────────────────────────────────
-- Tracks which students have access to which note collections.
CREATE TABLE IF NOT EXISTS public.student_note_entitlements (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id          uuid NOT NULL
    REFERENCES public.students(id) ON DELETE CASCADE,
  note_collection_id  uuid NOT NULL
    REFERENCES public.note_collections(id) ON DELETE CASCADE,
  source_type         text NOT NULL DEFAULT 'direct_purchase'
    CHECK (source_type IN ('direct_purchase', 'course_unlock', 'manual_grant', 'bundle', 'free_claim')),
  source_order_id     uuid,
  status              text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'expired', 'revoked', 'refunded')),
  valid_from          timestamptz NOT NULL DEFAULT now(),
  valid_until         timestamptz
    CHECK (valid_until IS NULL OR valid_until > valid_from),
  metadata            jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.student_note_entitlements IS
  'Tracks student access to note collections (purchased, granted, or free).';

CREATE INDEX IF NOT EXISTS idx_student_note_entitlements_student
  ON public.student_note_entitlements (student_id);

CREATE INDEX IF NOT EXISTS idx_student_note_entitlements_collection
  ON public.student_note_entitlements (note_collection_id);

CREATE INDEX IF NOT EXISTS idx_student_note_entitlements_student_status
  ON public.student_note_entitlements (student_id, status);

CREATE UNIQUE INDEX IF NOT EXISTS idx_student_note_entitlements_active_unique
  ON public.student_note_entitlements (student_id, note_collection_id)
  WHERE status = 'active';

DROP TRIGGER IF EXISTS trg_student_note_entitlements_updated_at ON public.student_note_entitlements;
CREATE TRIGGER trg_student_note_entitlements_updated_at
  BEFORE UPDATE ON public.student_note_entitlements
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── 8. note_payment_orders ──────────────────────────────────────────────────
-- Placeholder table for note purchase orders. Full payment flow deferred to Phase 2+.
-- Created now so the entitlement system can reference source_order_id.
CREATE TABLE IF NOT EXISTS public.note_payment_orders (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id          uuid NOT NULL
    REFERENCES public.students(id) ON DELETE CASCADE,
  note_collection_id  uuid NOT NULL
    REFERENCES public.note_collections(id) ON DELETE CASCADE,
  amount_minor        integer NOT NULL CHECK (amount_minor > 0),
  currency            text NOT NULL DEFAULT 'INR',
  status              text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'failed', 'cancelled', 'refunded')),
  gateway_order_id    text,
  gateway_payment_id  text,
  gateway_signature   text,
  idempotency_key     text,
  paid_at             timestamptz,
  metadata            jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.note_payment_orders IS
  'Payment orders for note collection purchases. Full flow deferred to Phase 2+.';

CREATE INDEX IF NOT EXISTS idx_note_payment_orders_student
  ON public.note_payment_orders (student_id);

CREATE INDEX IF NOT EXISTS idx_note_payment_orders_collection
  ON public.note_payment_orders (note_collection_id);

CREATE INDEX IF NOT EXISTS idx_note_payment_orders_status
  ON public.note_payment_orders (status);

CREATE UNIQUE INDEX IF NOT EXISTS idx_note_payment_orders_idempotency
  ON public.note_payment_orders (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_note_payment_orders_gateway_order
  ON public.note_payment_orders (gateway_order_id)
  WHERE gateway_order_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_note_payment_orders_gateway_payment
  ON public.note_payment_orders (gateway_payment_id)
  WHERE gateway_payment_id IS NOT NULL;

DROP TRIGGER IF EXISTS trg_note_payment_orders_updated_at ON public.note_payment_orders;
CREATE TRIGGER trg_note_payment_orders_updated_at
  BEFORE UPDATE ON public.note_payment_orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── 9. Storage buckets ──────────────────────────────────────────────────────

-- Private bucket for note page images (scanned handwritten notes).
-- No image/gif — only photograph-quality scans.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'note-pages',
  'note-pages',
  false,
  10485760,  -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Private bucket for course resource files (PDFs, documents).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'course-resource-files',
  'course-resource-files',
  false,
  52428800,  -- 50MB
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'text/markdown', 'application/zip']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ─── 10. Storage RLS policies ────────────────────────────────────────────────

-- note-pages bucket: SuperAdmin full access ONLY.
-- No student/authenticated read policy. Images are served via access-checked
-- signed URLs from the server side in later phases.
DROP POLICY IF EXISTS "note_pages_superadmin_all" ON storage.objects;
CREATE POLICY "note_pages_superadmin_all" ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'note-pages'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.global_role = 'superadmin'
        AND profiles.is_active = true
    )
  )
  WITH CHECK (
    bucket_id = 'note-pages'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.global_role = 'superadmin'
        AND profiles.is_active = true
    )
  );

-- course-resource-files bucket: SuperAdmin full access
DROP POLICY IF EXISTS "course_resource_files_superadmin_all" ON storage.objects;
CREATE POLICY "course_resource_files_superadmin_all" ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'course-resource-files'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.global_role = 'superadmin'
        AND profiles.is_active = true
    )
  )
  WITH CHECK (
    bucket_id = 'course-resource-files'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.global_role = 'superadmin'
        AND profiles.is_active = true
    )
  );

-- ─── 11. Table RLS ───────────────────────────────────────────────────────────

-- Enable RLS on all new tables
ALTER TABLE public.note_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.note_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.note_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.note_course_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_resource_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_resource_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_note_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.note_payment_orders ENABLE ROW LEVEL SECURITY;

-- SuperAdmin full access on all new tables
DROP POLICY IF EXISTS "note_collections_superadmin_all" ON public.note_collections;
CREATE POLICY "note_collections_superadmin_all" ON public.note_collections
  FOR ALL TO authenticated
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());

DROP POLICY IF EXISTS "note_modules_superadmin_all" ON public.note_modules;
CREATE POLICY "note_modules_superadmin_all" ON public.note_modules
  FOR ALL TO authenticated
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());

DROP POLICY IF EXISTS "note_pages_superadmin_all" ON public.note_pages;
CREATE POLICY "note_pages_superadmin_all" ON public.note_pages
  FOR ALL TO authenticated
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());

DROP POLICY IF EXISTS "note_course_links_superadmin_all" ON public.note_course_links;
CREATE POLICY "note_course_links_superadmin_all" ON public.note_course_links
  FOR ALL TO authenticated
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());

DROP POLICY IF EXISTS "course_resource_sections_superadmin_all" ON public.course_resource_sections;
CREATE POLICY "course_resource_sections_superadmin_all" ON public.course_resource_sections
  FOR ALL TO authenticated
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());

DROP POLICY IF EXISTS "course_resource_items_superadmin_all" ON public.course_resource_items;
CREATE POLICY "course_resource_items_superadmin_all" ON public.course_resource_items
  FOR ALL TO authenticated
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());

DROP POLICY IF EXISTS "student_note_entitlements_superadmin_all" ON public.student_note_entitlements;
CREATE POLICY "student_note_entitlements_superadmin_all" ON public.student_note_entitlements
  FOR ALL TO authenticated
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());

DROP POLICY IF EXISTS "note_payment_orders_superadmin_all" ON public.note_payment_orders;
CREATE POLICY "note_payment_orders_superadmin_all" ON public.note_payment_orders
  FOR ALL TO authenticated
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());

-- Authenticated read on published, global-scope note collections (metadata only)
DROP POLICY IF EXISTS "note_collections_authenticated_read" ON public.note_collections;
CREATE POLICY "note_collections_authenticated_read" ON public.note_collections
  FOR SELECT TO authenticated
  USING (
    publish_status = 'published'
    AND deleted_at IS NULL
    AND visibility_scope = 'global'
  );

-- Authenticated read on published note modules for global-scope collections only
DROP POLICY IF EXISTS "note_modules_authenticated_read" ON public.note_modules;
CREATE POLICY "note_modules_authenticated_read" ON public.note_modules
  FOR SELECT TO authenticated
  USING (
    is_published = true
    AND EXISTS (
      SELECT 1 FROM public.note_collections nc
      WHERE nc.id = note_modules.note_collection_id
        AND nc.publish_status = 'published'
        AND nc.deleted_at IS NULL
        AND nc.visibility_scope = 'global'
    )
  );

-- Note pages: NO authenticated read policy. Server-only via service role.
-- (Intentionally left without a SELECT policy for authenticated role.)

-- Authenticated read on published note course links for global-scope collections only
DROP POLICY IF EXISTS "note_course_links_authenticated_read" ON public.note_course_links;
CREATE POLICY "note_course_links_authenticated_read" ON public.note_course_links
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.note_collections nc
      WHERE nc.id = note_course_links.note_collection_id
        AND nc.publish_status = 'published'
        AND nc.deleted_at IS NULL
        AND nc.visibility_scope = 'global'
    )
  );

-- course_resource_sections and course_resource_items: NO authenticated read policy.
-- LMS fetches these server-side after existing course access validation using
-- an admin/service-role client. No broad RLS needed.

-- Students read their own note entitlements
DROP POLICY IF EXISTS "student_note_entitlements_student_read" ON public.student_note_entitlements;
CREATE POLICY "student_note_entitlements_student_read" ON public.student_note_entitlements
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.students
      WHERE students.id = student_note_entitlements.student_id
        AND students.user_id = (SELECT auth.uid())
    )
  );

-- Students read their own note payment orders
DROP POLICY IF EXISTS "note_payment_orders_student_read" ON public.note_payment_orders;
CREATE POLICY "note_payment_orders_student_read" ON public.note_payment_orders
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.students
      WHERE students.id = note_payment_orders.student_id
        AND students.user_id = (SELECT auth.uid())
    )
  );

-- ─── 12. Table privileges ────────────────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE, DELETE ON public.note_collections TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.note_modules TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.note_pages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.note_course_links TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_resource_sections TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_resource_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_note_entitlements TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.note_payment_orders TO authenticated;

COMMIT;
