-- resolve_course_access: Single RPC call combining visibility check + entitlement check
-- Replaces multiple sequential DB queries in validateStudentCourseAccess
CREATE OR REPLACE FUNCTION resolve_course_access(
  p_student_id UUID,
  p_course_id UUID,
  p_is_global BOOLEAN DEFAULT false
)
RETURNS TABLE (
  has_access BOOLEAN,
  source_type TEXT,
  entitlement_id UUID,
  source_entitlement_id TEXT,
  status TEXT,
  valid_until TIMESTAMPTZ,
  course_published BOOLEAN,
  pillar_published BOOLEAN,
  bootcamp_published BOOLEAN,
  is_free_course BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH
  course_data AS (
    SELECT
      c.id,
      c.publish_status as course_published,
      c.pillar_id,
      c.bootcamp_id,
      c.is_free,
      c.pricing_model,
      c.course_kind,
      c.visible_to_global_students,
      c.visible_to_college_students,
      (c.is_free = true OR c.pricing_model = 'free' OR c.course_kind = 'free_course') as is_free_flag
    FROM master_courses c
    WHERE c.id = p_course_id
  ),
  entitlement AS (
    SELECT se.id as ent_id, se.source_type, se.status, se.valid_until
    FROM student_entitlements se
    WHERE se.student_id = p_student_id
      AND se.master_course_id = p_course_id
      AND se.status = 'active'
      AND (se.valid_from IS NULL OR se.valid_from <= NOW())
      AND (se.valid_until IS NULL OR se.valid_until > NOW())
    LIMIT 1
  ),
  content_entitlement_master AS (
    SELECT id, assigned_entity_type, status
    FROM student_content_entitlements
    WHERE student_id = p_student_id
      AND assigned_entity_type = 'master_course'
      AND assigned_entity_id = p_course_id::text
      AND status = 'active'
    LIMIT 1
  ),
  content_entitlements_vb AS (
    SELECT assigned_entity_type, assigned_entity_id
    FROM student_content_entitlements
    WHERE student_id = p_student_id
      AND assigned_entity_type IN ('variant', 'bundle')
      AND status = 'active'
  ),
  variant_match AS (
    SELECT cv.id
    FROM course_variants cv
    WHERE cv.id IN (SELECT assigned_entity_id::UUID FROM content_entitlements_vb WHERE assigned_entity_type = 'variant')
      AND cv.master_course_id = p_course_id
    LIMIT 1
  ),
  bundle_course_match AS (
    SELECT DISTINCT bri.parent_master_course_id
    FROM bundle_resolved_items bri
    JOIN content_entitlements_vb cev ON cev.assigned_entity_type = 'bundle' AND cev.assigned_entity_id::UUID = bri.bundle_id
    WHERE bri.parent_master_course_id = p_course_id
    LIMIT 1
  ),
  pillar_status AS (
    SELECT publish_status
    FROM master_course_pillars
    WHERE id = (SELECT pillar_id FROM course_data)
    LIMIT 1
  ),
  bootcamp_status AS (
    SELECT publish_status, lifecycle_status
    FROM bootcamps
    WHERE id = (SELECT bootcamp_id FROM course_data)
    LIMIT 1
  )
  SELECT
    CASE
      WHEN (SELECT id FROM course_data) IS NULL THEN false
      WHEN (SELECT ent_id FROM entitlement) IS NOT NULL THEN true
      WHEN (SELECT id FROM content_entitlement_master) IS NOT NULL THEN true
      WHEN (SELECT id FROM variant_match) IS NOT NULL THEN true
      WHEN (SELECT parent_master_course_id FROM bundle_course_match) IS NOT NULL THEN true
      ELSE false
    END as has_access,
    CASE
      WHEN (SELECT ent_id FROM entitlement) IS NOT NULL THEN (SELECT source_type FROM entitlement)
      WHEN (SELECT id FROM content_entitlement_master) IS NOT NULL THEN 'content_entitlement'
      WHEN (SELECT id FROM variant_match) IS NOT NULL THEN 'content_entitlement'
      WHEN (SELECT parent_master_course_id FROM bundle_course_match) IS NOT NULL THEN 'content_entitlement'
      ELSE NULL
    END as source_type,
    (SELECT ent_id FROM entitlement) as entitlement_id,
    ''::text as source_entitlement_id,
    COALESCE((SELECT status FROM entitlement), (SELECT status FROM content_entitlement_master)) as status,
    COALESCE((SELECT valid_until FROM entitlement)) as valid_until,
    (SELECT course_published = 'published' FROM course_data) as course_published,
    COALESCE((SELECT pillar_published = 'published' FROM pillar_status), true) as pillar_published,
    COALESCE((SELECT publish_status = 'published' AND lifecycle_status = 'active' FROM bootcamp_status), true) as bootcamp_published,
    (SELECT is_free_flag FROM course_data) as is_free_course
  ;
END;
$$;