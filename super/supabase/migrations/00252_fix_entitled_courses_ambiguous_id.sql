-- Migration: 00252_fix_entitled_courses_ambiguous_id.sql
-- Description: Fix column reference "id" and "variant_id" ambiguity in get_student_entitled_courses RPC.

BEGIN;

CREATE OR REPLACE FUNCTION public.get_student_entitled_courses(
  p_student_id uuid,
  p_college_id uuid DEFAULT null,
  p_is_global boolean DEFAULT true,
  p_exclude_bundle_only boolean DEFAULT false
)
RETURNS TABLE (
  id uuid,
  created_at timestamptz,
  updated_at timestamptz,
  code text,
  title text,
  description text,
  short_description text,
  slug text,
  pillar_id uuid,
  bootcamp_id uuid,
  catalog_type text,
  course_kind text,
  is_free boolean,
  pricing_model text,
  selling_price numeric,
  currency text,
  publish_status text,
  visible_to_college_students boolean,
  visible_to_global_students boolean,
  metadata jsonb,
  module_count integer,
  video_count integer,
  progress_percentage integer,
  access_label text,
  source_labels text[],
  bundle_titles text[],
  access_level text,
  variant_id uuid,
  variant_title text,
  thumbnail_url text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_bootcamp_enrolled boolean := false;
  v_bootcamp_metadata jsonb;
  v_bootcamp_pillar_ids uuid[] := '{}';
  v_entitlement_course_ids uuid[] := '{}';
  v_content_course_ids uuid[] := '{}';
  v_variant_course_ids uuid[] := '{}';
  v_bundle_course_ids uuid[] := '{}';
  v_college_course_ids uuid[] := '{}';
  v_college_bundle_course_ids uuid[] := '{}';
  v_free_course_ids uuid[] := '{}';
  v_all_accessible_course_ids uuid[] := '{}';
  v_final_course_ids uuid[] := '{}';
  v_published_pillars uuid[] := '{}';
  v_published_bootcamps uuid[] := '{}';
  v_direct_ids uuid[] := '{}';
  v_bundle_ids uuid[] := '{}';
BEGIN
  -- 1. Check active bootcamp enrollment
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
    SELECT b.metadata INTO v_bootcamp_metadata
    FROM public.bootcamps b
    WHERE b.slug = 'job-ready-bootcamp';

    IF v_bootcamp_metadata ? 'pillar_ids' THEN
      SELECT array_agg(val::uuid) INTO v_bootcamp_pillar_ids
      FROM jsonb_array_elements_text(v_bootcamp_metadata->'pillar_ids') AS val;
    ELSE
      SELECT array_agg(p.id) INTO v_bootcamp_pillar_ids
      FROM public.master_course_pillars p
      WHERE p.publish_status = 'published'
        AND lower(p.slug) <> 'uncategorized'
        AND lower(p.code) <> 'uncategorized'
        AND p.title <> 'Uncategorized';
    END IF;
  END IF;

  -- 2. Traditional entitlements
  SELECT coalesce(array_agg(se.master_course_id), '{}') INTO v_entitlement_course_ids
  FROM public.student_entitlements se
  WHERE se.student_id = p_student_id
    AND se.status = 'active'
    AND (se.valid_from IS NULL OR se.valid_from <= now())
    AND (se.valid_until IS NULL OR se.valid_until >= now());

  -- 3. Content entitlements
  -- master_course
  SELECT coalesce(array_agg(sce.assigned_entity_id::uuid), '{}') INTO v_content_course_ids
  FROM public.student_content_entitlements sce
  WHERE sce.student_id = p_student_id
    AND sce.status = 'active'
    AND sce.assigned_entity_type = 'master_course'
    AND (sce.valid_until IS NULL OR sce.valid_until >= now());

  -- variant
  SELECT coalesce(array_agg(cv.master_course_id), '{}') INTO v_variant_course_ids
  FROM public.student_content_entitlements sce
  JOIN public.course_variants cv ON cv.id = sce.assigned_entity_id::uuid
  WHERE sce.student_id = p_student_id
    AND sce.status = 'active'
    AND sce.assigned_entity_type = 'variant'
    AND (sce.valid_until IS NULL OR sce.valid_until >= now());

  -- bundle
  SELECT coalesce(array_agg(bi.reference_id::uuid), '{}') INTO v_bundle_course_ids
  FROM public.student_content_entitlements sce
  JOIN public.bundle_items bi ON bi.bundle_id = sce.assigned_entity_id::uuid
  WHERE sce.student_id = p_student_id
    AND sce.status = 'active'
    AND sce.assigned_entity_type = 'bundle'
    AND bi.item_type = 'master_course'
    AND (sce.valid_until IS NULL OR sce.valid_until >= now());

  -- 4. College assignments (if p_college_id not null)
  IF p_college_id IS NOT NULL THEN
    -- master_course
    SELECT coalesce(array_agg(ca.assigned_entity_id::uuid), '{}') INTO v_college_course_ids
    FROM public.content_assignments ca
    WHERE ca.assignment_type = 'college'
      AND ca.target_id = p_college_id
      AND ca.status = 'active'
      AND ca.assigned_entity_type = 'master_course'
      AND (ca.start_date IS NULL OR ca.start_date <= now())
      AND (ca.end_date IS NULL OR ca.end_date >= now());

    -- bundle
    SELECT coalesce(array_agg(bi.reference_id::uuid), '{}') INTO v_college_bundle_course_ids
    FROM public.content_assignments ca
    JOIN public.bundle_items bi ON bi.bundle_id = ca.assigned_entity_id::uuid
    WHERE ca.assignment_type = 'college'
      AND ca.target_id = p_college_id
      AND ca.status = 'active'
      AND ca.assigned_entity_type = 'bundle'
      AND bi.item_type = 'master_course'
      AND (ca.start_date IS NULL OR ca.start_date <= now())
      AND (ca.end_date IS NULL OR ca.end_date >= now());
  END IF;

  -- 5. Free courses (if global)
  IF p_is_global THEN
    SELECT coalesce(array_agg(mc.id), '{}') INTO v_free_course_ids
    FROM public.master_courses mc
    WHERE mc.publish_status = 'published'
      AND (mc.is_free = true OR mc.pricing_model = 'free' OR mc.course_kind = 'free_course');
  END IF;

  -- Combine all accessible course IDs
  SELECT array_agg(DISTINCT val) INTO v_all_accessible_course_ids
  FROM (
    SELECT unnest(v_entitlement_course_ids) AS val
    UNION
    SELECT unnest(v_content_course_ids)
    UNION
    SELECT unnest(v_variant_course_ids)
    UNION
    SELECT unnest(v_bundle_course_ids)
    UNION
    SELECT unnest(v_college_course_ids)
    UNION
    SELECT unnest(v_college_bundle_course_ids)
    UNION
    SELECT unnest(v_free_course_ids)
    UNION
    SELECT mc.id
    FROM public.master_courses mc
    WHERE mc.pillar_id = ANY(v_bootcamp_pillar_ids)
      AND mc.publish_status = 'published'
  ) AS t
  WHERE val IS NOT NULL;

  IF v_all_accessible_course_ids IS NULL THEN
    v_all_accessible_course_ids := '{}';
  END IF;

  -- Get published pillars and bootcamps
  SELECT coalesce(array_agg(mcp.id), '{}') INTO v_published_pillars
  FROM public.master_course_pillars mcp
  WHERE mcp.publish_status = 'published';

  SELECT coalesce(array_agg(b.id), '{}') INTO v_published_bootcamps
  FROM public.bootcamps b
  WHERE b.publish_status = 'published';

  -- Apply visibility filters
  SELECT coalesce(array_agg(mc.id), '{}') INTO v_final_course_ids
  FROM public.master_courses mc
  WHERE mc.id = ANY(v_all_accessible_course_ids)
    AND mc.publish_status = 'published'
    -- Direct entitlement row bypasses visibility
    AND (
      mc.id = ANY(v_entitlement_course_ids)
      OR (
        (NOT p_is_global OR mc.visible_to_global_students IS NOT FALSE)
        AND (p_is_global OR mc.visible_to_college_students IS NOT FALSE)
        AND (mc.pillar_id IS NULL OR mc.pillar_id = ANY(v_published_pillars))
        AND (mc.bootcamp_id IS NULL OR mc.bootcamp_id = ANY(v_published_bootcamps))
      )
    );

  -- Handle exclude bundle only courses
  IF p_exclude_bundle_only THEN
    -- directIds: entitlements, content (master_course, variant), college assignments (master_course)
    SELECT coalesce(array_agg(DISTINCT val), '{}') INTO v_direct_ids
    FROM (
      SELECT unnest(v_entitlement_course_ids) AS val
      UNION
      SELECT unnest(v_content_course_ids)
      UNION
      SELECT unnest(v_variant_course_ids)
      UNION
      SELECT unnest(v_college_course_ids)
    ) AS t;

    -- bundleIds: content (bundle), college assignments (bundle)
    SELECT coalesce(array_agg(DISTINCT val), '{}') INTO v_bundle_ids
    FROM (
      SELECT unnest(v_bundle_course_ids) AS val
      UNION
      SELECT unnest(v_college_bundle_course_ids)
    ) AS t;

    SELECT coalesce(array_agg(val_id), '{}') INTO v_final_course_ids
    FROM unnest(v_final_course_ids) AS val_id
    WHERE NOT (val_id = ANY(v_bundle_ids) AND NOT (val_id = ANY(v_direct_ids)));
  END IF;

  IF v_final_course_ids IS NULL OR cardinality(v_final_course_ids) = 0 THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH course_items AS (
    SELECT ci.id AS item_id, ci.master_course_id, ci.item_type, ci.module_id
    FROM public.master_course_items ci
    WHERE ci.master_course_id = ANY(v_final_course_ids)
      AND ci.publish_status = 'published'
  ),
  completed_videos AS (
    SELECT svp.lesson_id AS cmp_item_id
    FROM public.student_video_progress svp
    WHERE svp.student_id = p_student_id
      AND svp.completed = true
      AND svp.lesson_id IN (SELECT ci.item_id FROM course_items ci WHERE ci.item_type = 'video')
  ),
  completed_others AS (
    SELECT sp.item_id AS cmp_item_id
    FROM public.student_progress sp
    WHERE sp.student_id = p_student_id
      AND sp.completed = true
      AND sp.item_id IN (SELECT ci.item_id FROM course_items ci WHERE ci.item_type <> 'video')
  ),
  completed_all AS (
    SELECT cmp_item_id FROM completed_videos
    UNION
    SELECT cmp_item_id FROM completed_others
  ),
  progress_stats AS (
    SELECT
      ci.master_course_id,
      count(ci.item_id) as total_items,
      count(ca.cmp_item_id) as completed_items
    FROM course_items ci
    LEFT JOIN completed_all ca ON ca.cmp_item_id = ci.item_id
    GROUP BY ci.master_course_id
  ),
  -- Master Course standard stats
  course_delivery_stats AS (
    SELECT
      ds.master_course_id,
      ds.module_count AS default_module_count,
      ds.video_count AS default_video_count
    FROM public.master_course_delivery_stats ds
    WHERE ds.master_course_id = ANY(v_final_course_ids)
  ),
  -- Variant metadata and counts
  variant_info AS (
    SELECT
      sce.assigned_entity_id::uuid AS variant_id,
      cv.master_course_id,
      coalesce(nullif(trim(plm.title), ''), cv.title) AS variant_title,
      coalesce(plm.thumbnail_url, plm.cover_image_url) AS variant_thumbnail,
      count(distinct mci.module_id) AS variant_module_count,
      count(case when mci.item_type = 'video' then 1 end) AS variant_video_count,
      sce.source_type
    FROM public.student_content_entitlements sce
    JOIN public.course_variants cv ON cv.id = sce.assigned_entity_id::uuid
    LEFT JOIN public.paid_course_landing_metadata plm 
      ON plm.source_id = sce.assigned_entity_id::uuid AND plm.source_type = 'course_variant'
    LEFT JOIN public.course_variant_items cvi ON cvi.course_variant_id = cv.id
    LEFT JOIN public.master_course_items mci ON mci.id = cvi.master_course_item_id AND mci.publish_status = 'published'
    WHERE sce.student_id = p_student_id
      AND sce.status = 'active'
      AND sce.assigned_entity_type = 'variant'
      AND (sce.valid_until IS NULL OR sce.valid_until >= now())
    GROUP BY sce.assigned_entity_id, cv.master_course_id, cv.title, plm.title, plm.thumbnail_url, plm.cover_image_url, sce.source_type
  ),
  -- Group by course to find the first/best variant if multiple
  best_variant AS (
    SELECT DISTINCT ON (master_course_id)
      master_course_id,
      variant_info.variant_id,
      variant_info.variant_title,
      variant_info.variant_thumbnail,
      variant_info.variant_module_count,
      variant_info.variant_video_count,
      variant_info.source_type
    FROM variant_info
    ORDER BY master_course_id, (source_type = 'b2c_direct') DESC
  ),
  -- Bundles info
  course_bundles_info AS (
    SELECT
      bi.reference_id AS course_id,
      array_agg(coalesce(b.landing_card_title, b.title, 'Bundle')) AS bundle_titles,
      bool_or(bi.access_scope = 'full') AS has_full_bundle_access
    FROM public.course_bundles b
    JOIN public.bundle_items bi ON bi.bundle_id = b.id
    WHERE b.id IN (
      SELECT assigned_entity_id::uuid
      FROM public.student_content_entitlements
      WHERE student_id = p_student_id
        AND status = 'active'
        AND assigned_entity_type = 'bundle'
        AND (valid_until is null or valid_until >= now())
      UNION
      SELECT assigned_entity_id::uuid
      FROM public.content_assignments
      WHERE assignment_type = 'college'
        AND target_id = p_college_id
        AND status = 'active'
        AND assigned_entity_type = 'bundle'
        AND (start_date is null or start_date <= now())
        AND (end_date is null or end_date >= now())
    ) AND bi.item_type = 'master_course'
    GROUP BY bi.reference_id
  )
  SELECT
    mc.id,
    mc.created_at,
    mc.updated_at,
    mc.code,
    mc.title,
    mc.description,
    mc.short_description,
    mc.slug,
    mc.pillar_id,
    mc.bootcamp_id,
    mc.catalog_type,
    mc.course_kind,
    mc.is_free,
    mc.pricing_model,
    mc.selling_price,
    mc.currency,
    mc.publish_status,
    mc.visible_to_college_students,
    mc.visible_to_global_students,
    mc.metadata,
    -- module_count
    coalesce(
      CASE WHEN bv.variant_id IS NOT NULL AND bv.source_type = 'b2c_direct' THEN bv.variant_module_count ELSE NULL END,
      ds.default_module_count,
      0
    )::integer AS module_count,
    -- video_count
    coalesce(
      CASE WHEN bv.variant_id IS NOT NULL AND bv.source_type = 'b2c_direct' THEN bv.variant_video_count ELSE NULL END,
      ds.default_video_count,
      0
    )::integer AS video_count,
    -- progress_percentage
    coalesce(
      CASE WHEN ps.total_items > 0 THEN round((ps.completed_items::numeric / ps.total_items::numeric) * 100)::integer ELSE 0 END,
      0
    )::integer AS progress_percentage,
    -- access_label
    CASE
      WHEN bv.variant_id IS NOT NULL AND bv.source_type = 'b2c_direct' THEN 'Purchased variant'
      ELSE
        coalesce(
          CASE
            WHEN mc.id = ANY(v_entitlement_course_ids) AND (SELECT se.source_type FROM public.student_entitlements se WHERE se.student_id = p_student_id AND se.master_course_id = mc.id AND se.status = 'active' LIMIT 1) = 'b2c_direct' THEN 'Purchased Course'
            WHEN mc.id = ANY(v_entitlement_course_ids) AND (SELECT se.source_type FROM public.student_entitlements se WHERE se.student_id = p_student_id AND se.master_course_id = mc.id AND se.status = 'active' LIMIT 1) IN ('college_assignment', 'b2b_college') THEN 'College Assigned'
            WHEN mc.id = ANY(v_college_course_ids) OR mc.id = ANY(v_college_bundle_course_ids) THEN 'College Assigned'
            WHEN cbi.course_id IS NOT NULL THEN (
              CASE
                WHEN array_length(cbi.bundle_titles, 1) = 1 THEN 'Included in ' || cbi.bundle_titles[1]
                ELSE 'Included in Bundle'
              END
            )
            WHEN bv.variant_id IS NOT NULL THEN 'Variant Access'
            WHEN mc.id = ANY(v_entitlement_course_ids) THEN 'Free Enrollment'
            ELSE NULL
          END,
          CASE WHEN mc.id = ANY(v_bundle_course_ids) THEN 'Partial access via bundle' ELSE NULL END,
          ''
        )
    END::text AS access_label,
    -- source_labels
    CASE
      WHEN bv.variant_id IS NOT NULL AND bv.source_type = 'b2c_direct' THEN
        array_cat(ARRAY['Direct purchase'], coalesce(
          CASE
            WHEN mc.id = ANY(v_college_course_ids) OR mc.id = ANY(v_college_bundle_course_ids) THEN ARRAY['College Assigned']
            WHEN cbi.course_id IS NOT NULL THEN ARRAY['Included in Bundle']
            ELSE '{}'::text[]
          END,
          '{}'::text[]
        ))
      ELSE
        -- Priority list of all matching labels
        ARRAY(
          SELECT lbl
          FROM unnest(ARRAY[
            CASE WHEN mc.id = ANY(v_entitlement_course_ids) AND (SELECT se.source_type FROM public.student_entitlements se WHERE se.student_id = p_student_id AND se.master_course_id = mc.id AND se.status = 'active' LIMIT 1) = 'b2c_direct' THEN 'Purchased Course' ELSE NULL END,
            CASE WHEN mc.id = ANY(v_entitlement_course_ids) AND (SELECT se.source_type FROM public.student_entitlements se WHERE se.student_id = p_student_id AND se.master_course_id = mc.id AND se.status = 'active' LIMIT 1) IN ('college_assignment', 'b2b_college') THEN 'College Assigned' ELSE NULL END,
            CASE WHEN mc.id = ANY(v_college_course_ids) OR mc.id = ANY(v_college_bundle_course_ids) THEN 'College Assigned' ELSE NULL END,
            CASE WHEN cbi.course_id IS NOT NULL THEN 'Included in Bundle' ELSE NULL END,
            CASE WHEN bv.variant_id IS NOT NULL THEN 'Variant Access' ELSE NULL END,
            CASE WHEN mc.id = ANY(v_entitlement_course_ids) AND (SELECT se.source_type FROM public.student_entitlements se WHERE se.student_id = p_student_id AND se.master_course_id = mc.id AND se.status = 'active' LIMIT 1) NOT IN ('b2c_direct', 'college_assignment', 'b2b_college') THEN 'Free Enrollment' ELSE NULL END
          ]) AS lbl
          WHERE lbl IS NOT NULL
        )
    END::text[] AS source_labels,
    -- bundle_titles
    coalesce(cbi.bundle_titles, '{}'::text[]) AS bundle_titles,
    -- access_level
    CASE
      WHEN bv.variant_id IS NOT NULL AND bv.source_type = 'b2c_direct' THEN 'partial'
      ELSE
        coalesce(
          CASE
            WHEN mc.id = ANY(v_entitlement_course_ids) THEN 'full'
            WHEN mc.id = ANY(v_college_course_ids) THEN 'full'
            WHEN cbi.course_id IS NOT NULL AND cbi.has_full_bundle_access THEN 'full'
            WHEN bv.variant_id IS NOT NULL THEN 'partial'
            ELSE 'partial'
          END,
          'full'
        )
    END::text AS access_level,
    -- variant_id
    bv.variant_id,
    -- variant_title
    bv.variant_title,
    -- thumbnail_url
    coalesce(
      bv.variant_thumbnail,
      (mc.metadata->>'thumbnail_url')
    )::text AS thumbnail_url
  FROM public.master_courses mc
  LEFT JOIN course_delivery_stats ds ON ds.master_course_id = mc.id
  LEFT JOIN progress_stats ps ON ps.master_course_id = mc.id
  LEFT JOIN best_variant bv ON bv.master_course_id = mc.id
  LEFT JOIN course_bundles_info cbi ON cbi.course_id = mc.id
  WHERE mc.id = ANY(v_final_course_ids)
  ORDER BY mc.title ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_student_entitled_courses(uuid, uuid, boolean, boolean) FROM public;
GRANT EXECUTE ON FUNCTION public.get_student_entitled_courses(uuid, uuid, boolean, boolean) TO authenticated, postgres, service_role;

COMMIT;
