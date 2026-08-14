/**
 * Centralized activity event names and categories (matches SuperAdmin/CollegeAdmin).
 */

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const EVENT_NAMES = [
  'login_success', 'login_failure', 'logout', 'password_reset_requested', 'password_reset_completed',
  'invite_sent', 'invite_accepted', 'admin_created', 'admin_deactivated', 'admin_reactivated', 'user_role_changed',
  'course_assigned', 'lecture_created', 'lecture_published', 'lecture_completed', 'attendance_marked',
  'assessment_created', 'assessment_published', 'assessment_started', 'assessment_submitted', 'assessment_evaluated',
  'placement_profile_updated', 'placement_marked_ready', 'placement_verified', 'offer_uploaded',
  'feature_flag_changed', 'notification_sent', 'notification_failed', 'notification_retried',
  'job_started', 'job_failed', 'job_completed', 'file_uploaded', 'profile_updated',
  'payment_checkout_initiated', 'payment_checkout_reused', 'payment_verified', 'payment_failed', 'course_enrollment_granted',
  'suspicious_session_detected', 'session_revoked',
  'college_created', 'college_updated', 'college_deleted', 'student_invited', 'student_updated', 'student_deleted',
  'job_post_applied', 'job_post_reapplied', 'job_post_application_updated', 'job_post_application_withdrawn',
  'job_post_resume_uploaded', 'job_post_resume_replaced', 'job_post_status_changed',
  'job_post_shortlisted', 'job_post_selected', 'job_post_rejected',
] as const;
export type ActivityEventName = (typeof EVENT_NAMES)[number];

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const EVENT_CATEGORIES = ['auth', 'admin', 'user', 'course', 'lecture', 'attendance', 'assessment', 'placement', 'notification', 'job', 'file', 'profile', 'security', 'tenant', 'feature', 'payment'] as const;
export type ActivityEventCategory = (typeof EVENT_CATEGORIES)[number];

export const EVENT_NAME_TO_CATEGORY: Record<ActivityEventName, ActivityEventCategory> = {
  login_success: 'auth', login_failure: 'auth', logout: 'auth', password_reset_requested: 'auth', password_reset_completed: 'auth',
  invite_sent: 'admin', invite_accepted: 'admin', admin_created: 'admin', admin_deactivated: 'admin', admin_reactivated: 'admin', user_role_changed: 'user',
  course_assigned: 'course', lecture_created: 'lecture', lecture_published: 'lecture', lecture_completed: 'lecture', attendance_marked: 'attendance',
  assessment_created: 'assessment', assessment_published: 'assessment', assessment_started: 'assessment', assessment_submitted: 'assessment', assessment_evaluated: 'assessment',
  placement_profile_updated: 'placement', placement_marked_ready: 'placement', placement_verified: 'placement', offer_uploaded: 'placement',
  feature_flag_changed: 'feature', notification_sent: 'notification', notification_failed: 'notification', notification_retried: 'notification',
  job_started: 'job', job_failed: 'job', job_completed: 'job', file_uploaded: 'file', profile_updated: 'profile',
  payment_checkout_initiated: 'payment', payment_checkout_reused: 'payment', payment_verified: 'payment', payment_failed: 'payment', course_enrollment_granted: 'course',
  suspicious_session_detected: 'security', session_revoked: 'security',
  college_created: 'tenant', college_updated: 'tenant', college_deleted: 'tenant', student_invited: 'tenant', student_updated: 'tenant', student_deleted: 'tenant',
  job_post_applied: 'placement', job_post_reapplied: 'placement', job_post_application_updated: 'placement',
  job_post_application_withdrawn: 'placement', job_post_resume_uploaded: 'file', job_post_resume_replaced: 'file',
  job_post_status_changed: 'placement', job_post_shortlisted: 'placement', job_post_selected: 'placement', job_post_rejected: 'placement',
};
