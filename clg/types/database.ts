export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];
/**
 * Database types for tenant/college (matches Supabase schema).
 */
export interface CollegesRow {
  id: string;
  name: string;
  slug: string;
  short_name: string | null;
  status: 'active' | 'inactive' | 'suspended';
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  support_email: string | null;
  support_phone: string | null;
  plan_id: string;
  created_at: string;
  updated_at: string;
}

export interface ProfilesRow {
  id: string;
  full_name: string | null;
  email: string | null;
  global_role: 'superadmin' | null;
  is_active: boolean;
  requires_2fa: boolean;
  suspended_at: string | null;
  suspension_reason: string | null;
  force_logout_after: string | null;
  last_password_reset_at: string | null;
  created_at: string;
  updated_at: string;
}

export type CollegeMembershipRole = 'college_admin' | 'student' | 'faculty_spoc' | 'mentor';

export interface CollegeMembershipsRow {
  id: string;
  user_id: string;
  college_id: string;
  role: CollegeMembershipRole;
  status: 'active' | 'inactive' | 'invited';
  created_at: string;
}

export interface StudentsRow {
  id: string;
  user_id: string;
  college_id: string;
  student_code: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlansRow {
  id: string;
  key: 'starter' | 'growth' | 'enterprise' | string;
  name: string;
  sort_order: number;
  created_at: string;
}

export interface PlanFeaturesRow {
  id: string;
  plan_id: string;
  feature_key: string;
  enabled: boolean;
  created_at: string;
}

export interface TenantFeatureOverridesRow {
  id: string;
  college_id: string;
  feature_key: string;
  enabled: boolean;
  reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface AssessmentRow {
  id: string;
  tenant_id: string;
  title: string;
  description: string | null;
  status: 'draft' | 'published' | 'archived';
  time_limit_minutes: number | null;
  passing_score: number | null;
  max_attempts: number;
  created_at: string;
  updated_at: string;
}

export interface AssessmentSectionRow {
  id: string;
  assessment_id: string;
  title: string;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface AssessmentQuestionRow {
  id: string;
  section_id: string;
  type: 'single_select' | 'multi_select' | 'short_answer' | 'subjective' | 'coding_ready';
  text: string;
  points: number;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface AssessmentOptionRow {
  id: string;
  question_id: string;
  text: string;
  is_correct: boolean;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface AssessmentAssignmentRow {
  id: string;
  assessment_id: string;
  tenant_id: string;
  cohort_id: string | null;
  student_id: string | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface AssessmentAttemptRow {
  id: string;
  assignment_id: string;
  student_id: string;
  status: 'in_progress' | 'submitted' | 'time_expired' | 'auto_submitted';
  start_time: string;
  end_time: string | null;
  created_at: string;
  updated_at: string;
}

export interface AssessmentResponseRow {
  id: string;
  attempt_id: string;
  question_id: string;
  selected_option_ids: string[] | null;
  text_response: string | null;
  created_at: string;
  updated_at: string;
}

export interface AssessmentResultRow {
  id: string;
  attempt_id: string;
  score: number | null;
  is_passing: boolean | null;
  status: 'pending_manual_eval' | 'evaluated' | 'released';
  created_at: string;
  updated_at: string;
}

export interface AssessmentReviewRow {
  id: string;
  response_id: string;
  reviewer_id: string;
  points_awarded: number;
  feedback: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Phase 2B: TPStreams-centered Master Courses ─────────────────────────────

export type MasterCoursePublishStatus = 'draft' | 'published' | 'unpublished';
export type MasterCourseTpFolderStatus = 'pending' | 'created' | 'failed';

export interface MasterCoursePillarsRow {
  id: string;
  code: string;
  title: string;
  slug: string;
  description: string | null;
  short_description: string | null;
  sort_order: number;
  publish_status: MasterCoursePublishStatus;
  visible_to_college_admins: boolean;
  visible_to_college_students: boolean;
  visible_to_global_students: boolean;
  tp_folder_status: MasterCourseTpFolderStatus;
  tp_folder_uuid: string | null;
  tp_folder_title: string | null;
  tp_last_synced_at: string | null;
  tp_last_error: string | null;
  metadata: Record<string, Json>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface MasterCoursesRow {
  id: string;
  pillar_id: string | null;
  code: string;
  title: string;
  slug: string | null;
  description: string | null;
  short_description: string | null;
  pillar: string | null;
  program_tag: string | null;
  publish_status: MasterCoursePublishStatus;
  visible_to_college_admins: boolean;
  visible_to_college_students: boolean;
  visible_to_global_students: boolean;
  modules: Json[];
  tp_folder_status: MasterCourseTpFolderStatus;
  tp_folder_uuid: string | null;
  tp_folder_title: string | null;
  tp_last_synced_at: string | null;
  tp_last_error: string | null;
  metadata: Record<string, Json>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type VideoAssetProcessingStatus = 'pending' | 'queued' | 'processing' | 'completed' | 'error';
export type VideoAssetSyncStatus = 'active' | 'removed';

export interface VideoAssetsRow {
  id: string;
  master_course_id: string;
  master_course_module_id: string | null;
  tp_asset_id: string;
  tp_folder_uuid: string;
  title: string;
  description: string | null;
  processing_status: VideoAssetProcessingStatus;
  sync_status: VideoAssetSyncStatus;
  removed_at: string | null;
  duration_seconds: number | null;
  thumbnail_url: string | null;
  playback_url: string | null;
  dash_url: string | null;
  content_protection_type: 'drm' | 'aes' | 'disable' | null;
  resolutions: string[] | null;
  video_codec: string | null;
  audio_codec: string | null;
  module_id: string | null;
  sort_order: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface MasterCourseModulesRow {
  id: string;
  master_course_id: string;
  title: string;
  description: string | null;
  slug: string | null;
  sort_order: number;
  publish_status: MasterCoursePublishStatus;
  tp_folder_status: MasterCourseTpFolderStatus;
  tp_folder_uuid: string | null;
  tp_folder_title: string | null;
  tp_last_synced_at: string | null;
  tp_last_error: string | null;
  visible_to_students: boolean;
  metadata: Record<string, Json>;
  created_at: string;
  updated_at: string;
}

export type MasterCourseItemType = 'video' | 'document' | 'resource' | 'assignment_placeholder' | 'quiz_placeholder' | 'link' | 'note' | 'worksheet';

export interface MasterCourseItemsRow {
  id: string;
  master_course_id: string;
  module_id: string;
  title: string;
  description: string | null;
  item_type: MasterCourseItemType;
  sort_order: number;
  publish_status: MasterCoursePublishStatus;
  video_asset_id: string | null;
  is_preview: boolean;
  is_required: boolean;
  duration_seconds: number | null;
  metadata: Record<string, Json>;
  created_at: string;
  updated_at: string;
}

export interface MasterCourseDeliveryStatsRow {
  master_course_id: string;
  module_count: number;
  lesson_count: number;
  video_count: number;
  total_duration_seconds: number;
  updated_at: string | null;
}

export type AssignmentType = 'college' | 'batch' | 'group' | 'student';
export type AssignedEntityType = 'variant' | 'bundle' | 'master_course';
export type AssignmentStatus = 'active' | 'scheduled' | 'expired' | 'revoked';

export interface ContentAssignmentsRow {
  id: string;
  assignment_type: AssignmentType;
  target_id: string;
  assigned_entity_type: AssignedEntityType;
  assigned_entity_id: string;
  start_date: string | null;
  end_date: string | null;
  status: AssignmentStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CoursePricePlansRow {
  id: string;
  master_course_id: string;
  plan_name: string;
  description: string | null;
  validity_days: number | null;
  price_minor: number;
  currency: string;
  is_active: boolean;
  is_default: boolean;
  sort_order: number;
  metadata: Record<string, Json>;
  created_at: string;
  updated_at: string;
}

// ─── Phase 3A: Course Access Requests & Offers ───────────────────────────────

export type CourseAccessRequestSource = 'super_admin' | 'college_admin' | 'student' | 'system';
export type CourseAccessTargetType = 'college' | 'batch' | 'group' | 'student' | 'direct_student';
export type CourseAccessRequestedEntityType = 'master_course' | 'variant' | 'bundle' | 'custom_variant' | 'custom_bundle';
export type CourseAccessRequestStatus =
  | 'draft' | 'submitted' | 'under_review' | 'needs_clarification'
  | 'approved' | 'rejected' | 'cancelled' | 'offer_created';
export type CourseAccessRequestPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface CourseAccessRequestsRow {
  id: string;
  request_code: string;
  request_source: CourseAccessRequestSource;
  requester_user_id: string | null;
  requester_email: string | null;
  requester_name: string | null;
  target_type: CourseAccessTargetType;
  target_id: string | null;
  college_id: string | null;
  student_id: string | null;
  requested_entity_type: CourseAccessRequestedEntityType;
  requested_entity_id: string | null;
  proposed_parent_course_id: string | null;
  proposed_title: string | null;
  proposed_description: string | null;
  proposed_content: Record<string, Json>;
  requested_seats: number | null;
  requested_validity_days: number | null;
  requested_start_at: string | null;
  requested_notes: string | null;
  status: CourseAccessRequestStatus;
  priority: CourseAccessRequestPriority;
  review_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  metadata: Record<string, Json>;
  created_at: string;
  updated_at: string;
}

export type CourseAccessOfferSource = 'request' | 'direct' | 'renewal' | 'manual';
export type CourseAccessOfferedEntityType = 'master_course' | 'variant' | 'bundle';
export type CourseAccessOfferStatus =
  | 'draft' | 'sent' | 'viewed' | 'accepted' | 'rejected'
  | 'expired' | 'cancelled' | 'payment_pending' | 'paid' | 'activated';
export type CourseAccessOfferPaymentStatus =
  | 'not_started' | 'pending' | 'paid' | 'failed' | 'refunded' | 'not_required';

export interface CourseAccessOffersRow {
  id: string;
  offer_code: string;
  request_id: string | null;
  offer_source: CourseAccessOfferSource;
  target_type: CourseAccessTargetType;
  target_id: string | null;
  college_id: string | null;
  student_id: string | null;
  offered_entity_type: CourseAccessOfferedEntityType;
  offered_entity_id: string;
  final_price: number;
  currency: string;
  validity_days: number;
  seats: number | null;
  payment_required: boolean;
  status: CourseAccessOfferStatus;
  valid_from: string | null;
  valid_until: string | null;
  accepted_at: string | null;
  rejected_at: string | null;
  sent_at: string | null;
  payment_status: CourseAccessOfferPaymentStatus;
  payment_reference_id: string | null;
  assignment_id: string | null;
  activated_at: string | null;
  created_by: string | null;
  updated_by: string | null;
  terms: string | null;
  internal_notes: string | null;
  metadata: Record<string, Json>;
  created_at: string;
  updated_at: string;
}

// ─── Variant/Bundle listing types (for request entity picker) ────────────────

export type CourseVariantPublishStatus = 'draft' | 'published' | 'unpublished';

export interface CourseVariantsRow {
  id: string;
  master_course_id: string;
  title: string;
  code: string;
  slug: string;
  description: string | null;
  publish_status: CourseVariantPublishStatus;
  created_at: string;
  updated_at: string;
}

export type BundleLifecycleStatus = 'draft' | 'active' | 'expired' | 'ended' | 'archived';
export type BundlePublishStatus = 'draft' | 'published' | 'unpublished';

export interface CourseBundlesRow {
  id: string;
  title: string;
  code: string;
  slug: string;
  description: string | null;
  publish_status: BundlePublishStatus;
  lifecycle_status: BundleLifecycleStatus;
  created_at: string;
  updated_at: string;
}

export type BundleItemType = 'variant' | 'master_course' | 'master_course_item' | 'bundle';

export interface BundleItemsRow {
  id: string;
  bundle_id: string;
  item_type: BundleItemType;
  reference_id: string;
  sort_order: number;
  created_at: string;
}

export interface BundleSelectedItemRow {
  id: string;
  bundle_item_id: string;
  master_course_item_id: string;
  sort_order: number;
  created_at: string;
}

export type BundleResolvedItemSourceType =
  | 'master_course'
  | 'variant'
  | 'master_course_item'
  | 'bundle';

export interface BundleResolvedItemRow {
  id: string;
  bundle_id: string;
  parent_master_course_id: string;
  master_course_item_id: string;
  source_type: BundleResolvedItemSourceType;
  source_id: string;
  source_variant_id: string | null;
  source_bundle_id: string | null;
  display_title: string | null;
  sort_order: number;
  created_at: string;
}

export type PricingModel = 'one_time' | 'subscription_ready' | 'per_seat' | 'free' | 'invite_only';

// ─── Video analytics (shared with Student LMS; schema owned by LMS repo) ─

export interface StudentVideoProgressRow {
  id: string;
  student_id: string;
  pillar_id: string | null;
  course_id: string;
  module_id: string;
  lesson_id: string;
  tpstreams_asset_id: string;
  video_duration_seconds: number;
  total_video_seconds_watched: number;
  unique_watched_seconds: number;
  repeat_watched_seconds: number;
  wall_clock_seconds: number;
  completion_percentage: number;
  completed: boolean;
  first_started_at: string;
  last_watched_at: string;
  last_position_seconds: number;
  max_position_seconds: number;
  play_count: number;
  pause_count: number;
  seek_count: number;
  rate_change_count: number;
}

export interface VideoWatchSessionsRow {
  id: string;
  student_id: string;
  pillar_id: string | null;
  course_id: string;
  module_id: string;
  lesson_id: string;
  tpstreams_asset_id: string;
  started_at: string;
  ended_at: string | null;
  last_position_seconds: number;
  max_position_seconds: number;
  total_video_seconds_watched: number;
  unique_watched_seconds: number;
  repeat_watched_seconds: number;
  wall_clock_seconds: number;
  completion_percentage: number;
  completed: boolean;
  play_count: number;
  pause_count: number;
  seek_count: number;
  rate_change_count: number;
  created_at: string;
  updated_at: string;
}

export interface VCourseWatchSummaryRow {
  student_id: string;
  course_id: string;
  total_lessons: number;
  completed_lessons: number;
  course_status: 'completed' | 'started' | 'not_started';
}
