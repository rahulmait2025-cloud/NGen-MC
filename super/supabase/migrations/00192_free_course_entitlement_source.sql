-- Allow free_course as student_entitlements.source_type and backfill existing enrollments.

alter table public.student_entitlements
  drop constraint if exists student_entitlements_source_type_check;

alter table public.student_entitlements
  add constraint student_entitlements_source_type_check
  check (source_type in (
    'b2b_college',
    'b2c_direct',
    'bundle',
    'subscription',
    'manual_grant',
    'free_course'
  ));

update public.student_entitlements
set source_type = 'free_course'
where source_type = 'manual_grant'
  and metadata->>'source' = 'free_course_enrollment';
