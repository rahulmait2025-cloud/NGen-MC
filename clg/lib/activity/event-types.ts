/**
 * Centralized activity event names and categories (matches SuperAdmin).
 */
const _ACTIVITY_EVENT_NAMES = [
  'login_success', 'login_failure', 'logout', 'password_reset_requested', 'password_reset_completed',
  'invite_sent', 'invite_accepted', 'admin_created', 'admin_deactivated', 'admin_reactivated', 'user_role_changed',
  'course_assigned', 'lecture_created', 'lecture_published', 'lecture_completed', 'attendance_marked',
  'assessment_created', 'assessment_published', 'assessment_started', 'assessment_submitted', 'assessment_evaluated',
  'placement_profile_updated', 'placement_marked_ready', 'placement_verified', 'offer_uploaded',
  'feature_flag_changed', 'notification_sent', 'notification_failed', 'notification_retried',
  'job_started', 'job_failed', 'job_completed', 'file_uploaded', 'profile_updated',
  'suspicious_session_detected', 'session_revoked',
  'college_created', 'college_updated', 'college_deleted', 'student_invited', 'student_updated', 'student_deleted',
] as const;
export const ACTIVITY_EVENT_NAMES = _ACTIVITY_EVENT_NAMES;
export type ActivityEventName = (typeof _ACTIVITY_EVENT_NAMES)[number];
export const ACTIVITY_EVENT_CATEGORIES = ['auth', 'admin', 'user', 'course', 'lecture', 'attendance', 'assessment', 'placement', 'notification', 'job', 'file', 'profile', 'security', 'tenant', 'feature'] as const;
export type ActivityEventCategory = (typeof ACTIVITY_EVENT_CATEGORIES)[number];
export const EVENT_NAME_TO_CATEGORY: Record<ActivityEventName, ActivityEventCategory> = {
  login_success: 'auth', login_failure: 'auth', logout: 'auth', password_reset_requested: 'auth', password_reset_completed: 'auth',
  invite_sent: 'admin', invite_accepted: 'admin', admin_created: 'admin', admin_deactivated: 'admin', admin_reactivated: 'admin', user_role_changed: 'user',
  course_assigned: 'course', lecture_created: 'lecture', lecture_published: 'lecture', lecture_completed: 'lecture', attendance_marked: 'attendance',
  assessment_created: 'assessment', assessment_published: 'assessment', assessment_started: 'assessment', assessment_submitted: 'assessment', assessment_evaluated: 'assessment',
  placement_profile_updated: 'placement', placement_marked_ready: 'placement', placement_verified: 'placement', offer_uploaded: 'placement',
  feature_flag_changed: 'feature', notification_sent: 'notification', notification_failed: 'notification', notification_retried: 'notification',
  job_started: 'job', job_failed: 'job', job_completed: 'job', file_uploaded: 'file', profile_updated: 'profile',
  suspicious_session_detected: 'security', session_revoked: 'security',
  college_created: 'tenant', college_updated: 'tenant', college_deleted: 'tenant', student_invited: 'tenant', student_updated: 'tenant', student_deleted: 'tenant',
};
