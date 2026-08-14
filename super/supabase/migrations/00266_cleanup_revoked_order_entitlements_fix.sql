-- Migration 00266_cleanup_revoked_order_entitlements_fix.sql
-- Backfill: Clean up active entitlements/enrollments for orders that were marked as revoked in metadata but whose entitlements were not properly disabled due to student_id/user_id mismatch.

-- 1. Update student_entitlements
UPDATE student_entitlements se
SET 
  status = 'revoked',
  revoked_at = COALESCE((o.metadata->>'revoked_at')::timestamptz, NOW()),
  revoked_by = NULLIF(o.metadata->>'revoked_by', '')::uuid,
  revoke_reason = COALESCE(o.metadata->>'revoke_reason', 'Order access revoked')
FROM orders o
JOIN students s ON s.user_id = o.purchaser_user_id
WHERE se.student_id = s.id
  AND se.status = 'active'
  AND o.metadata->>'revoked' = 'true'
  AND (
    se.master_course_id = (o.metadata->>'course_id')::uuid
    OR se.master_course_id IN (
      SELECT entity_id::uuid 
      FROM order_items oi 
      WHERE oi.order_id = o.id AND oi.entity_type = 'master_course'
    )
    OR se.master_course_id IN (
      SELECT cv.master_course_id 
      FROM order_items oi
      JOIN course_variants cv ON cv.id = oi.entity_id::uuid
      WHERE oi.order_id = o.id AND oi.entity_type = 'course_variant'
    )
  );

-- 2. Update student_content_entitlements
UPDATE student_content_entitlements sce
SET 
  status = 'revoked',
  revoked_at = COALESCE((o.metadata->>'revoked_at')::timestamptz, NOW()),
  revoked_by = NULLIF(o.metadata->>'revoked_by', '')::uuid,
  revoke_reason = COALESCE(o.metadata->>'revoke_reason', 'Order access revoked')
FROM orders o
JOIN students s ON s.user_id = o.purchaser_user_id
WHERE sce.student_id = s.id
  AND sce.status = 'active'
  AND o.metadata->>'revoked' = 'true'
  AND (
    (sce.assigned_entity_type = 'variant' AND (
      sce.assigned_entity_id = (o.metadata->>'variant_id')::uuid
      OR sce.assigned_entity_id IN (
        SELECT entity_id::uuid 
        FROM order_items oi 
        WHERE oi.order_id = o.id AND oi.entity_type = 'course_variant'
      )
    ))
    OR (sce.assigned_entity_type = 'bundle' AND (
      sce.assigned_entity_id IN (
        SELECT entity_id::uuid 
        FROM order_items oi 
        WHERE oi.order_id = o.id AND oi.entity_type = 'course_bundle'
      )
    ))
  );

-- 3. Update job_ready_bootcamp_enrollments
UPDATE job_ready_bootcamp_enrollments jrbe
SET 
  status = 'revoked',
  updated_at = COALESCE((o.metadata->>'revoked_at')::timestamptz, NOW())
FROM orders o
JOIN students s ON s.user_id = o.purchaser_user_id
WHERE jrbe.student_id = s.id
  AND jrbe.status = 'active'
  AND o.metadata->>'revoked' = 'true'
  AND jrbe.bootcamp_id IN (
    SELECT entity_id::uuid 
    FROM order_items oi 
    WHERE oi.order_id = o.id AND oi.entity_type = 'job_ready_bootcamp'
  );
