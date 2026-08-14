-- Migration: 00251_course_player_payload_variant_scoping.sql
-- Description: Add variant item scoping filter to get_student_course_player_payload.

BEGIN;

CREATE OR REPLACE FUNCTION public.get_student_course_player_payload(
  p_student_id uuid,
  p_college_id uuid,
  p_course_id uuid,
  p_item_id uuid DEFAULT null,
  p_variant_id uuid DEFAULT null,
  p_college_slug text DEFAULT ''
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_allowed boolean := false;
  v_deny_reason text := null;
  v_redirect_href text := null;
  v_course_row record;
  v_modules jsonb;
  v_active_item jsonb := null;
  v_resources jsonb := '[]'::jsonb;
  v_note jsonb := null;
  v_bookmarks jsonb := '[]'::jsonb;
  v_course_resource_meta jsonb := '[]'::jsonb;
  v_bootcamp_enrolled boolean := false;
  v_bootcamp_metadata jsonb;
  v_bootcamp_pillar_ids uuid[] := '{}';
  v_is_free boolean := false;
  v_resolved_variant_id uuid := p_variant_id;
BEGIN
  -- 1. Check if course exists and get base info
  SELECT * INTO v_course_row
  FROM public.master_courses
  WHERE id = p_course_id;

  IF v_course_row IS NULL THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'deny_reason', 'course_not_found',
      'redirect_href', null
    );
  END IF;

  -- 2. Determine if it is a free course
  IF v_course_row.is_free = true OR v_course_row.pricing_model = 'free' OR v_course_row.course_kind = 'free_course' THEN
    v_is_free := true;
    v_allowed := true;
  END IF;

  -- 3. Entitlement checks if not free
  IF NOT v_allowed THEN
    -- A. Check direct student entitlement
    SELECT EXISTS (
      SELECT 1 FROM public.student_entitlements
      WHERE student_id = p_student_id AND master_course_id = p_course_id AND status = 'active'
        AND (valid_from IS NULL OR valid_from <= now())
        AND (valid_until IS NULL OR valid_until >= now())
    ) INTO v_allowed;

    -- B. Check student content entitlements (course, variant, or bundle)
    IF NOT v_allowed THEN
      SELECT EXISTS (
        SELECT 1 FROM public.student_content_entitlements
        WHERE student_id = p_student_id AND assigned_entity_type = 'master_course'
          AND assigned_entity_id::uuid = p_course_id AND status = 'active'
          AND (valid_until IS NULL OR valid_until >= now())
      ) INTO v_allowed;
    END IF;

    -- If variant id is explicitly passed, check it
    IF NOT v_allowed AND v_resolved_variant_id IS NOT NULL THEN
      SELECT EXISTS (
        SELECT 1 FROM public.student_content_entitlements
        WHERE student_id = p_student_id AND assigned_entity_type = 'variant'
          AND assigned_entity_id::uuid = v_resolved_variant_id AND status = 'active'
          AND (valid_until IS NULL OR valid_until >= now())
      ) INTO v_allowed;
    END IF;

    -- If variant id is NOT passed, check if they have ANY active variant entitlement for this course
    IF NOT v_allowed AND v_resolved_variant_id IS NULL THEN
      SELECT cv.id INTO v_resolved_variant_id
      FROM public.student_content_entitlements sce
      JOIN public.course_variants cv ON cv.id = sce.assigned_entity_id::uuid
      WHERE sce.student_id = p_student_id
        AND sce.assigned_entity_type = 'variant'
        AND cv.master_course_id = p_course_id
        AND sce.status = 'active'
        AND (sce.valid_until IS NULL OR sce.valid_until >= now())
      LIMIT 1;

      IF v_resolved_variant_id IS NOT NULL THEN
        v_allowed := true;
      END IF;
    END IF;

    IF NOT v_allowed THEN
      SELECT EXISTS (
        SELECT 1 FROM public.student_content_entitlements sce
        JOIN public.bundle_items bi ON bi.bundle_id = sce.assigned_entity_id::uuid
        WHERE sce.student_id = p_student_id AND sce.assigned_entity_type = 'bundle'
          AND bi.reference_id::uuid = p_course_id AND bi.item_type = 'master_course' AND sce.status = 'active'
          AND (sce.valid_until IS NULL OR sce.valid_until >= now())
      ) INTO v_allowed;
    END IF;

    -- C. College content assignments
    IF NOT v_allowed AND p_college_id IS NOT NULL THEN
      -- Direct college course assignment
      SELECT EXISTS (
        SELECT 1 FROM public.content_assignments
        WHERE assignment_type = 'college' AND target_id = p_college_id AND assigned_entity_type = 'master_course'
          AND assigned_entity_id::uuid = p_course_id AND status = 'active'
          AND (start_date IS NULL OR start_date <= now())
          AND (end_date IS NULL OR end_date >= now())
      ) INTO v_allowed;

      -- College bundle assignment
      IF NOT v_allowed THEN
        SELECT EXISTS (
          SELECT 1 FROM public.content_assignments ca
          JOIN public.bundle_items bi ON bi.bundle_id = ca.assigned_entity_id::uuid
          WHERE ca.assignment_type = 'college' AND ca.target_id = p_college_id AND ca.assigned_entity_type = 'bundle'
            AND bi.reference_id::uuid = p_course_id AND bi.item_type = 'master_course' AND ca.status = 'active'
            AND (ca.start_date IS NULL OR ca.start_date <= now())
            AND (ca.end_date IS NULL OR ca.end_date >= now())
        ) INTO v_allowed;
      END IF;
    END IF;

    -- D. Check job ready bootcamp enrollments
    IF NOT v_allowed THEN
      SELECT EXISTS (
        SELECT 1
        FROM public.job_ready_bootcamp_enrollments
        WHERE student_id = p_student_id
          AND status = 'active'
          AND (valid_from IS NULL OR valid_from <= now())
          AND (valid_until IS NULL OR valid_until >= now())
          AND (p_college_id IS NULL OR college_id IS NULL OR college_id = p_college_id)
      ) INTO v_bootcamp_enrolled;

      IF v_bootcamp_enrolled THEN
        -- If enrolled, check if this course is under bootcamp or pillar
        SELECT b.metadata INTO v_bootcamp_metadata
        FROM public.bootcamps b
        WHERE b.slug = 'job-ready-bootcamp';

        IF v_bootcamp_metadata ? 'pillar_ids' THEN
          SELECT array_agg(val::uuid) INTO v_bootcamp_pillar_ids
          FROM jsonb_array_elements_text(v_bootcamp_metadata->'pillar_ids') AS val;
        ELSE
          SELECT array_agg(p.id) INTO v_bootcamp_pillar_ids
          FROM public.master_course_pillars p
          WHERE p.publish_status = 'published';
        END IF;

        IF v_course_row.pillar_id = ANY(v_bootcamp_pillar_ids) OR v_course_row.bootcamp_id = (SELECT id FROM public.bootcamps WHERE slug = 'job-ready-bootcamp') THEN
          v_allowed := true;
        END IF;
      END IF;
    END IF;
  END IF;

  -- 4. Handle expired/denied redirection
  IF NOT v_allowed THEN
    -- Check if student has an expired entitlement for this course to show "expired"
    SELECT EXISTS (
      SELECT 1 FROM public.student_entitlements
      WHERE student_id = p_student_id AND master_course_id = p_course_id AND status = 'expired'
    ) INTO v_bootcamp_enrolled; -- Reusing variable

    IF v_bootcamp_enrolled THEN
      v_deny_reason := 'no_entitlement';
      v_redirect_href := '/c/' || p_college_slug || '/student/my-courses?tab=expired';
    ELSE
      v_deny_reason := 'no_entitlement';
    END IF;

    RETURN jsonb_build_object(
      'allowed', false,
      'deny_reason', v_deny_reason,
      'redirect_href', v_redirect_href
    );
  END IF;

  WITH raw_progress AS (
    SELECT 
      sp.item_id,
      sp.watched_seconds,
      sp.total_seconds,
      sp.last_position_seconds,
      sp.completed
    FROM public.student_progress sp
    JOIN public.master_course_items mci ON mci.id = sp.item_id
    WHERE sp.student_id = p_student_id AND mci.master_course_id = p_course_id
    UNION ALL
    SELECT 
      svp.lesson_id AS item_id,
      svp.unique_watched_seconds AS watched_seconds,
      svp.video_duration_seconds AS total_seconds,
      svp.last_position_seconds,
      svp.completed
    FROM public.student_video_progress svp
    JOIN public.master_course_items mci ON mci.id = svp.lesson_id
    WHERE svp.student_id = p_student_id AND mci.master_course_id = p_course_id
  ),
  progress_entries AS (
    SELECT DISTINCT ON (item_id)
      item_id,
      jsonb_build_object(
        'id', '',
        'student_id', p_student_id,
        'item_id', item_id,
        'entitlement_id', null,
        'watched_seconds', watched_seconds,
        'total_seconds', total_seconds,
        'last_position_seconds', last_position_seconds,
        'completed', completed,
        'completed_at', null
      ) as prog_obj
    FROM raw_progress
    ORDER BY item_id, completed DESC, watched_seconds DESC NULLS LAST
  ),
  items_data AS (
    SELECT 
      ci.id,
      ci.module_id,
      ci.master_course_id,
      ci.title,
      ci.slug,
      ci.description,
      ci.item_type,
      ci.sort_order,
      ci.publish_status,
      ci.video_asset_id,
      ci.is_preview AS preview_enabled,
      ci.metadata,
      ci.resource_id,
      pe.prog_obj AS progress
    FROM public.master_course_items ci
    LEFT JOIN progress_entries pe ON pe.item_id = ci.id
    WHERE ci.master_course_id = p_course_id
      AND (v_is_free OR ci.publish_status = 'published')
      -- Filter by variant scope if resolved variant exists
      AND (v_resolved_variant_id IS NULL OR ci.id IN (SELECT master_course_item_id FROM public.course_variant_items WHERE course_variant_id = v_resolved_variant_id))
    ORDER BY ci.sort_order ASC
  ),
  modules_data AS (
    SELECT 
      m.id,
      m.master_course_id,
      m.title,
      m.description,
      m.slug,
      m.sort_order,
      m.publish_status,
      m.metadata,
      m.visible_to_students
    FROM public.master_course_modules m
    WHERE m.master_course_id = p_course_id
      AND (v_is_free OR m.publish_status = 'published')
    ORDER BY m.sort_order ASC
  ),
  modules_with_items AS (
    SELECT 
      md.id,
      md.master_course_id,
      md.title,
      md.description,
      md.slug,
      md.sort_order,
      md.publish_status,
      md.metadata,
      md.visible_to_students,
      coalesce(
        jsonb_agg(
          jsonb_build_object(
            'id', it.id,
            'module_id', it.module_id,
            'master_course_id', it.master_course_id,
            'title', it.title,
            'slug', it.slug,
            'description', it.description,
            'item_type', it.item_type,
            'sort_order', it.sort_order,
            'publish_status', it.publish_status,
            'video_asset_id', it.video_asset_id,
            'preview_enabled', it.preview_enabled,
            'metadata', it.metadata,
            'resource_id', it.resource_id,
            'progress', it.progress
          )
        ) FILTER (WHERE it.id IS NOT NULL),
        '[]'::jsonb
      ) AS items
    FROM modules_data md
    LEFT JOIN items_data it ON it.module_id = md.id
    GROUP BY md.id, md.master_course_id, md.title, md.description, md.slug, md.sort_order, md.publish_status, md.metadata, md.visible_to_students
    ORDER BY md.sort_order ASC
  )
  SELECT jsonb_agg(to_jsonb(mwi)) INTO v_modules
  FROM modules_with_items mwi;

  -- 6. Fetch active item details if p_item_id is provided
  IF p_item_id IS NOT NULL THEN
    -- Note: check that active item is also part of the variant scope (if variant scope active)
    IF v_resolved_variant_id IS NULL OR EXISTS (SELECT 1 FROM public.course_variant_items WHERE course_variant_id = v_resolved_variant_id AND master_course_item_id = p_item_id) THEN
      SELECT to_jsonb(ci) INTO v_active_item
      FROM (
        SELECT 
          id, master_course_id, module_id, title, slug, description, item_type, sort_order, publish_status, video_asset_id, is_preview AS preview_enabled, metadata, resource_id
        FROM public.master_course_items
        WHERE master_course_id = p_course_id AND id = p_item_id
      ) ci;
    END IF;

    IF v_active_item IS NOT NULL THEN
      -- A. Fetch resources
      SELECT coalesce(jsonb_agg(to_jsonb(lr)), '[]'::jsonb) INTO v_resources
      FROM (
        SELECT * FROM public.lesson_resources
        WHERE master_course_id = p_course_id AND item_id = p_item_id
        ORDER BY sort_order ASC
      ) lr;

      -- B. Fetch student note
      SELECT to_jsonb(sn) INTO v_note
      FROM (
        SELECT * FROM public.student_lesson_notes
        WHERE student_id = p_student_id AND item_id = p_item_id
        LIMIT 1
      ) sn;

      -- C. Fetch bookmarks
      SELECT coalesce(jsonb_agg(to_jsonb(sbk)), '[]'::jsonb) INTO v_bookmarks
      FROM (
        SELECT * FROM public.student_lesson_bookmarks
        WHERE student_id = p_student_id AND item_id = p_item_id
        ORDER BY timestamp_seconds ASC, created_at ASC
      ) sbk;

      -- D. Fetch course resource metadata
      SELECT coalesce(jsonb_agg(to_jsonb(crm)), '[]'::jsonb) INTO v_course_resource_meta
      FROM (
        SELECT id, resource_type, title, description
        FROM public.course_resources
        WHERE master_course_id = p_course_id AND parent_item_id = p_item_id
          AND resource_scope = 'lesson_attachment' AND publish_status = 'published' AND visible_to_students = true
        ORDER BY sort_order ASC
      ) crm;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'allowed', true,
    'deny_reason', null,
    'redirect_href', null,
    'variant_id', v_resolved_variant_id,
    'course', jsonb_build_object(
      'id', v_course_row.id,
      'code', v_course_row.code,
      'title', v_course_row.title,
      'description', v_course_row.description,
      'short_description', v_course_row.short_description,
      'slug', v_course_row.slug,
      'pillar_id', v_course_row.pillar_id,
      'bootcamp_id', v_course_row.bootcamp_id,
      'is_free', v_course_row.is_free,
      'pricing_model', v_course_row.pricing_model,
      'selling_price', v_course_row.selling_price,
      'currency', v_course_row.currency,
      'publish_status', v_course_row.publish_status,
      'visible_to_college_students', v_course_row.visible_to_college_students,
      'visible_to_global_students', v_course_row.visible_to_global_students,
      'metadata', v_course_row.metadata,
      'course_kind', v_course_row.course_kind,
      'modules', coalesce(v_modules, '[]'::jsonb)
    ),
    'active_item', v_active_item,
    'resources', v_resources,
    'note', v_note,
    'bookmarks', v_bookmarks,
    'course_resource_meta', v_course_resource_meta
  );
END;
$$;

COMMIT;
