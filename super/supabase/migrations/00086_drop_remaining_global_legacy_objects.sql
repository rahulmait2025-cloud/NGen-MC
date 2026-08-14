drop view if exists public.v_global_course_assignment_summary cascade;
drop view if exists public.v_global_course_structure_counts cascade;

drop trigger if exists students_global_course_auto_enrollment on public.students;

drop function if exists public.unassign_course_from_college(uuid, uuid, boolean) cascade;
drop function if exists public.assign_course_to_college(uuid, uuid, text) cascade;
drop function if exists public.list_published_assignable_courses(uuid) cascade;
drop function if exists public.handle_student_global_course_auto_enrollment() cascade;
drop function if exists public.auto_enroll_new_student_into_assigned_courses(uuid) cascade;
drop function if exists public.enroll_existing_students_of_college_into_assigned_course(uuid, uuid) cascade;
drop function if exists public.can_current_user_view_global_course(uuid) cascade;
drop function if exists public.list_college_assigned_global_courses(uuid) cascade;

drop table if exists public.global_course_order_intent_lines cascade;
drop table if exists public.global_course_bundle_items cascade;
drop table if exists public.global_course_bundles cascade;
drop table if exists public.global_course_enrollments cascade;
drop table if exists public.global_course_order_intents cascade;
drop table if exists public.global_course_college_assignments cascade;
drop table if exists public.global_course_assignment_blocks cascade;
drop table if exists public.global_course_lesson_resources cascade;
drop table if exists public.global_course_lessons cascade;
drop table if exists public.global_course_modules cascade;
drop table if exists public.global_courses cascade;
