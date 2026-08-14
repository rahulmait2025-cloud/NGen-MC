-- Migration: 00178_student_content_entitlements_source_type_expand
-- Purpose: Expand student_content_entitlements.source_type constraint to support
-- college_assignment for variant/bundle college assignments (Phase 3.5).
-- Previously only 'manual_grant' was allowed.

begin;

-- Drop existing constraint
alter table public.student_content_entitlements
drop constraint if exists student_content_entitlements_source_type_check;

-- Add expanded constraint allowing all valid source types
alter table public.student_content_entitlements
add constraint student_content_entitlements_source_type_check
check (
  source_type in (
    'manual_grant',
    'college_assignment',
    'b2b_college',
    'b2c_direct',
    'payment'
  )
);

commit;