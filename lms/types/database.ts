/**
 * Database types for tenant/college (matches Supabase schema).
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface CollegesRow {
  id: string;
  name: string;
  slug: string;
  short_name: string | null;
  status: string;
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
  avatar_url: string | null;
  username: string;
  username_set: boolean;
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
  status: string;
  created_at: string;
}

export interface StudentsRow {
  id: string;
  user_id: string;
  college_id: string;
  student_code: string | null;
  year_or_semester: string | null;
  github_url: string | null;
  linkedin_url: string | null;
  resume_url: string | null;
  placement_ready_status: string | null;
  bio: string | null;
  leetcode_username: string | null;
  leetcode_stats: Record<string, unknown> | null;
  leetcode_stats_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

/** public.non_partnered_students (Super Admin migration 00056). */
export interface NonPartneredStudentsRow {
  id: string;
  student_id: string;
  user_id: string;
  self_reported_college_name: string | null;
  status: 'active' | 'inactive';
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

/** public.active_sessions — single session enforcement (one row per user). */
export interface ActiveSessionsRow {
  user_id: string;
  token_hash: string;
  logged_in_at: string;
  device_info: string | null;
  device_id: string;
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
  shuffle_questions: boolean;
  shuffle_options: boolean;
  show_correct_answers: boolean;
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

// Quiz-attempt session (direct from master_course_items, no assignment dance)
export interface AssessmentSessionRow {
  id: string;
  assessment_id: string;
  student_id: string;
  status: 'in_progress' | 'submitted' | 'time_expired' | 'auto_submitted';
  start_time: string;
  end_time: string | null;
  created_at: string;
  updated_at: string;
}

export interface AssessmentSessionResponseRow {
  id: string;
  session_id: string;
  question_id: string;
  selected_option_ids: string[] | null;
  text_response: string | null;
  is_correct: boolean | null;
  points_awarded: number | null;
  created_at: string;
}

export interface AssessmentSessionResultRow {
  id: string;
  session_id: string;
  score: number | null;
  max_score: number | null;
  percentage: number | null;
  is_passing: boolean | null;
  status: 'evaluated' | 'released';
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
  bootcamp_id: string | null;
  catalog_type: 'pillar' | 'bootcamp' | 'free_course' | null;
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
  course_kind: string | null;
  is_free: boolean | null;
  pricing_model: string | null;
  selling_price: number | null;
  currency: string | null;
  show_as_paid_course: boolean | null;
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

export type MasterCourseItemType = 'video' | 'document' | 'resource' | 'assignment_placeholder' | 'quiz_placeholder' | 'link' | 'note' | 'worksheet' | 'pdf' | 'markdown' | 'external_link';

export type MasterCourseItemVideoSource = 'tpstreams' | 'youtube';

export interface MasterCourseItemsRow {
  id: string;
  master_course_id: string;
  module_id: string;
  title: string;
  slug: string | null;
  description: string | null;
  item_type: MasterCourseItemType;
  sort_order: number;
  publish_status: MasterCoursePublishStatus;
  video_source?: MasterCourseItemVideoSource | null;
  video_asset_id: string | null;
  youtube_video_id?: string | null;
  youtube_playlist_id?: string | null;
  youtube_original_title?: string | null;
  youtube_thumbnail_url?: string | null;
  youtube_position?: number | null;
  external_metadata?: Record<string, Json>;
  preview_enabled: boolean;
  duration_seconds: number | null;
  resource_id: string | null;
  assessment_id: string | null;
  quiz_id?: string | null;
  metadata: Record<string, Json>;
  created_at: string;
  updated_at: string;
}

// ─── Course Resources ────────────────────────────────────────────────────────

export type CourseResourceScope = 'lesson_attachment' | 'module_item';
export type CourseResourceFileType = 'markdown' | 'pdf' | 'external_link';

export const COURSE_RESOURCES_BUCKET = 'course_resources' as const;

export interface CourseResourcesRow {
  id: string;
  master_course_id: string;
  module_id: string;
  parent_item_id: string | null;
  resource_scope: CourseResourceScope;
  resource_type: CourseResourceFileType;
  title: string;
  description: string | null;
  content_markdown: string | null;
  external_url: string | null;
  storage_bucket: string | null;
  storage_path: string | null;
  original_filename: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  sort_order: number;
  publish_status: MasterCoursePublishStatus;
  visible_to_students: boolean;
  is_downloadable: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CourseResourceSummary {
  id: string;
  resource_type: CourseResourceFileType;
  title: string;
  description: string | null;
}

export interface MasterCourseDeliveryStatsRow {
  master_course_id: string;
  module_count: number;
  lesson_count: number;
  video_count: number;
  total_duration_seconds: number;
  updated_at: string | null;
}

// ─── Phase 4: Student Delivery Runtime ───────────────────────────────────────

export type EntitlementSourceType = 'b2b_college' | 'b2c_direct' | 'bundle' | 'subscription' | 'manual_grant' | 'free_course';
export type EntitlementStatus = 'active' | 'expired' | 'revoked' | 'suspended';

export interface StudentEntitlementsRow {
  id: string;
  student_id: string;
  master_course_id: string;
  source_type: EntitlementSourceType;
  college_id: string | null;
  status: EntitlementStatus;
  valid_from: string;
  valid_until: string | null;
  granted_by: string | null;
  revoked_at: string | null;
  revoked_by: string | null;
  revoke_reason: string | null;
  metadata: Record<string, Json>;
  created_at: string;
  updated_at: string;
}

export interface StudentProgressRow {
  id: string;
  student_id: string;
  item_id: string;
  entitlement_id: string | null;
  watched_seconds: number;
  total_seconds: number;
  last_position_seconds: number;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * @deprecated Use `VideoWatchSessionsRow` (rich schema) instead. This legacy
 * table is no longer written to by the LMS analytics pipeline (writes now go
 * to `video_watch_sessions`). The type is retained only for read-side
 * compatibility with older data and a few non-analytics helpers
 * (e.g. `lib/activity/student-learning-activity.ts` and
 * `lib/lms/analytics/services/progress.ts`).
 */
export interface StudentVideoSessionsRow {
  id: string;
  student_id: string;
  video_asset_id: string;
  item_id: string | null;
  started_at: string;
  ended_at: string | null;
  watched_duration_seconds: number;
  created_at: string;
}

export interface StudentDailyVisitsRow {
  id: string;
  student_id: string;
  visit_date: string;
  created_at: string;
}

export interface FreeYoutubePlaylistEnrollmentsRow {
  id: string;
  student_id: string;
  college_id: string | null;
  playlist_id: string;
  playlist_title: string | null;
  playlist_thumbnail_url: string | null;
  enrolled_at: string;
  created_at: string;
}

export interface FreeYoutubeVideoCompletionsRow {
  id: string;
  student_id: string;
  college_id: string | null;
  playlist_id: string;
  youtube_video_id: string;
  video_title: string | null;
  completed_at: string;
  created_at: string;
}

export interface StudentStreaksRow {
  student_id: string;
  current_streak: number;
  longest_streak: number;
  last_visit_date: string | null;
  updated_at: string;
}

// ─── Phase 5: Course Variants / Bundles / Assignments ────────────────────────

export type CatalogVisibilityScope = 'private' | 'global' | 'selected_colleges';

export type CourseVariantPublishStatus = 'draft' | 'published' | 'unpublished';
export type PricingModel = 'one_time' | 'subscription_ready' | 'per_seat' | 'free' | 'invite_only';

export interface CourseVariantsRow {
  id: string;
  master_course_id: string;
  pillar_id: string | null;
  title: string;
  slug: string;
  code: string;
  description: string | null;
  selling_price: number | null;
  discounted_price: number | null;
  internal_cost: number | null;
  pricing_model: PricingModel | null;
  publish_status: CourseVariantPublishStatus;
  visibility_scope: CatalogVisibilityScope;
  created_for_college_id: string | null;
  visibility_metadata: Json | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  show_as_paid_course?: boolean;
}

export interface CourseVariantVisibilityCollegesRow {
  id: string;
  variant_id: string;
  college_id: string;
  created_at: string;
}

export type VariantInclusionType = 'full_module' | 'selected_item';

export interface CourseVariantItemsRow {
  id: string;
  course_variant_id: string;
  master_course_item_id: string;
  sort_order: number;
  inclusion_type: VariantInclusionType;
  created_at: string;
}

export type BundlePublishStatus = 'draft' | 'published' | 'unpublished';
export type BundleLifecycleStatus = 'draft' | 'active' | 'expired' | 'ended' | 'archived';

export interface CourseBundlesRow {
  id: string;
  title: string;
  slug: string;
  code: string;
  description: string | null;
  selling_price: number | null;
  discounted_price: number | null;
  internal_cost: number | null;
  pricing_model: PricingModel | null;
  publish_status: BundlePublishStatus;
  lifecycle_status: BundleLifecycleStatus;
  visibility_scope?: CatalogVisibilityScope;
  created_for_college_id?: string | null;
  visibility_metadata?: Json | null;
  landing_card_title?: string | null;
  landing_card_description?: string | null;
  landing_badge_label?: string | null;
  landing_badge_variant?: string | null;
  landing_highlights?: Json;
  landing_footer_note?: string | null;
  landing_hero_title?: string | null;
  landing_hero_subtitle?: string | null;
  landing_outcomes?: Json;
  landing_audience_points?: Json;
  show_on_lms_catalog?: boolean;
  show_on_lms_curated?: boolean;
  curated_sort_order?: number | null;
  catalog_sort_order?: number | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface BundlePricePlansRow {
  id: string;
  bundle_id: string;
  plan_name: string;
  description: string | null;
  validity_days: number | null;
  price_minor: number;
  currency: string;
  is_default: boolean;
  is_active: boolean;
  sort_order: number;
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

export type BundleResolvedItemSourceType = 'master_course' | 'variant' | 'master_course_item' | 'bundle';

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
  source_type?: string | null;
  source_id?: string | null;
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

export interface LessonResourcesRow {
  id: string;
  master_course_id: string;
  item_id: string | null;
  title: string;
  resource_type: string;
  url: string | null;
  file_path: string | null;
  metadata: Record<string, Json>;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface StudentLessonNotesRow {
  id: string;
  student_id: string;
  master_course_id: string;
  item_id: string;
  body: string;
  created_at: string;
  updated_at: string;
}

export interface StudentLessonBookmarksRow {
  id: string;
  student_id: string;
  master_course_id: string;
  item_id: string;
  timestamp_seconds: number | null;
  label: string;
  created_at: string;
}

// ─── Note Collections & Resources (Phase 1) ──────────────────────────────────

export type NoteCollectionPublishStatus = 'draft' | 'published' | 'unpublished' | 'archived';
export type NoteCollectionPricingModel = 'free' | 'paid';
export type NoteCollectionVisibilityScope = 'global' | 'selected_colleges' | 'private';
export type NoteCollectionSourceType = 'standalone' | 'course_linked';
export type NoteCollectionCatalogVisibility = 'public_catalog' | 'hidden_course_attached';

export interface NoteCollectionsRow {
  id: string;
  title: string;
  slug: string;
  short_description: string | null;
  description_md: string | null;
  cover_image_path: string | null;
  publish_status: NoteCollectionPublishStatus;
  pricing_model: NoteCollectionPricingModel;
  price_minor: number;
  currency: string;
  validity_days: number | null;
  source_master_course_id: string | null;
  source_type: NoteCollectionSourceType;
  catalog_visibility: NoteCollectionCatalogVisibility;
  visibility_scope: NoteCollectionVisibilityScope;
  visibility_metadata: Record<string, Json>;
  created_by: string | null;
  updated_by: string | null;
  published_at: string | null;
  deleted_at: string | null;
  metadata: Record<string, Json>;
  created_at: string;
  updated_at: string;
}

export interface NoteModulesRow {
  id: string;
  note_collection_id: string;
  title: string;
  slug: string | null;
  description_md: string | null;
  sort_order: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface NotePagesRow {
  id: string;
  note_module_id: string;
  title: string | null;
  image_path: string;
  image_mime: string;
  width: number | null;
  height: number | null;
  file_size_bytes: number | null;
  alt_text: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface NoteCourseLinksRow {
  id: string;
  note_collection_id: string;
  course_id: string;
  module_id: string | null;
  item_id: string | null;
  auto_unlock_with_course: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type CourseResourceScopeType = 'course' | 'module' | 'item';

export interface CourseResourceSectionsRow {
  id: string;
  course_id: string | null;
  scope_type: CourseResourceScopeType;
  module_id: string | null;
  item_id: string | null;
  title: string;
  icon: string | null;
  sort_order: number;
  is_visible: boolean;
  visibility: 'per_course' | 'global';
  created_at: string;
  updated_at: string;
}

export type CourseResourceItemKind = 'external_link' | 'note_collection' | 'markdown_text' | 'file_link' | 'excalidraw_link';

export interface CourseResourceItemsRow {
  id: string;
  section_id: string;
  kind: CourseResourceItemKind;
  title: string;
  subtitle: string | null;
  icon: string | null;
  external_url: string | null;
  note_collection_id: string | null;
  file_path: string | null;
  markdown_body: string | null;
  excalidraw_url: string | null;
  excalidraw_scene_json: Record<string, Json> | null;
  open_in_new_tab: boolean;
  sort_order: number;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
}

export type StudentNoteEntitlementSourceType = 'direct_purchase' | 'course_unlock' | 'manual_grant' | 'bundle' | 'free_claim';
export type StudentNoteEntitlementStatus = 'active' | 'expired' | 'revoked';

export interface StudentNoteEntitlementsRow {
  id: string;
  student_id: string;
  note_collection_id: string;
  source_type: StudentNoteEntitlementSourceType;
  source_order_id: string | null;
  status: StudentNoteEntitlementStatus;
  valid_from: string;
  valid_until: string | null;
  metadata: Record<string, Json>;
  created_at: string;
  updated_at: string;
}

export type NotePaymentOrderStatus = 'pending' | 'paid' | 'failed' | 'cancelled' | 'refunded';

export interface NotePaymentOrdersRow {
  id: string;
  /** Nullable after 00320: ON DELETE SET NULL preserves payment/invoice history. */
  student_id: string | null;
  note_collection_id: string;
  amount_minor: number;
  currency: string;
  status: NotePaymentOrderStatus;
  gateway_order_id: string | null;
  gateway_payment_id: string | null;
  idempotency_key: string | null;
  metadata: Record<string, Json>;
  created_at: string;
  updated_at: string;
}

/** Summary shape for course resources tab (sections + items in one query). */
export interface CourseResourceSectionWithItems {
  id: string;
  title: string;
  icon: string | null;
  sort_order: number;
  scope_type: string;
  module_id: string | null;
  item_id: string | null;
  items: {
    id: string;
    kind: CourseResourceItemKind;
    title: string;
    subtitle: string | null;
    icon: string | null;
    external_url: string | null;
    note_collection_id: string | null;
    excalidraw_url: string | null;
    open_in_new_tab: boolean;
    sort_order: number;
    is_visible: boolean;
  }[];
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

export interface VideoWatchSegmentsRow {
  id: string;
  session_id: string;
  student_id: string;
  pillar_id: string | null;
  course_id: string;
  module_id: string;
  lesson_id: string;
  tpstreams_asset_id: string;
  start_second: number;
  end_second: number;
  playback_rate: number;
  wall_clock_seconds: number;
  source: string;
  created_at: string;
}

export interface StudentVideoProgressRow {
  id: string;
  student_id: string;
  pillar_id: string | null;
  course_id: string | null;
  module_id: string | null;
  lesson_id: string | null;
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
  session_count: number;
  completed_at: string | null;
}

export interface VideoWatchEventsRow {
  id: string;
  session_id: string;
  event_type: string;
  event_data: Record<string, Json>;
  created_at: string;
}

export interface JobPostsRow {
  id: string;
  title: string;
  company_name: string;
  company_website: string | null;
  company_about: string | null;
  location: string | null;
  work_mode: 'remote' | 'onsite' | 'hybrid' | null;
  employment_type: 'internship' | 'full_time' | 'part_time' | 'contract' | null;
  experience_level: string | null;
  salary_min_minor: number | null;
  salary_max_minor: number | null;
  salary_currency: string;
  openings: number | null;
  application_deadline: string | null;
  description: string;
  responsibilities: string[];
  requirements: string[];
  skills: string[];
  perks: string[];
  status: 'draft' | 'open' | 'paused' | 'closed' | 'archived';
  visibility_scope: 'all_lms' | 'selected_colleges' | 'global_only' | 'college_only';
  created_by: string | null;
  updated_by: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface JobPostCollegesRow {
  job_id: string;
  college_id: string;
}

export interface JobApplicationsRow {
  id: string;
  job_id: string;
  student_id: string;
  user_id: string;
  college_id: string | null;
  status: 'applied' | 'under_review' | 'shortlisted' | 'assessment' | 'interview' | 'selected' | 'rejected' | 'on_hold' | 'withdrawn';
  resume_path: string | null;
  resume_file_name: string | null;
  resume_size_bytes: number | null;
  resume_mime_type: string | null;
  cover_note: string | null;
  github_url: string | null;
  linkedin_url: string | null;
  portfolio_url: string | null;
  answers: Record<string, Json>;
  student_edit_count: number;
  applied_at: string;
  last_edited_at: string | null;
  withdrawn_at: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  admin_notes: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface JobApplicationStatusHistoryRow {
  id: string;
  application_id: string;
  old_status: string | null;
  new_status: string;
  changed_by: string | null;
  actor_role: string | null;
  note: string | null;
  created_at: string;
}

export interface VDailyWatchAnalyticsRow {
  report_date: string;
  student_id: string;
  course_id: string;
  module_id: string;
  hours_watched: number;
  lectures_completed: number;
  total_seconds_watched: number;
}

export interface VWeeklyWatchAnalyticsRow {
  report_week: string;
  student_id: string;
  course_id: string;
  hours_watched: number;
  lectures_completed: number;
}

export interface VCourseWatchSummaryRow {
  student_id: string;
  course_id: string;
  total_lessons: number;
  completed_lessons: number;
  course_status: 'completed' | 'started' | 'not_started';
}

export interface Database {
  public: {
    Tables: {
      colleges: { Row: CollegesRow; Update: Partial<CollegesRow> };
      profiles: { Row: ProfilesRow; Update: Partial<ProfilesRow> };
      college_memberships: { Row: CollegeMembershipsRow; Update: Partial<CollegeMembershipsRow> };
      students: { Row: StudentsRow; Update: Partial<StudentsRow> };
      non_partnered_students: { Row: NonPartneredStudentsRow; Update: Partial<NonPartneredStudentsRow> };
      master_course_pillars: { Row: MasterCoursePillarsRow; Update: Partial<MasterCoursePillarsRow> };
      master_courses: { Row: MasterCoursesRow; Update: Partial<MasterCoursesRow> };
      video_assets: { Row: VideoAssetsRow; Update: Partial<VideoAssetsRow> };
      master_course_modules: { Row: MasterCourseModulesRow; Update: Partial<MasterCourseModulesRow> };
      master_course_items: { Row: MasterCourseItemsRow; Update: Partial<MasterCourseItemsRow> };
      student_entitlements: { Row: StudentEntitlementsRow; Update: Partial<StudentEntitlementsRow> };
      student_progress: { Row: StudentProgressRow; Update: Partial<StudentProgressRow> };
      student_video_sessions: { Row: StudentVideoSessionsRow; Update: Partial<StudentVideoSessionsRow> };
      student_daily_visits: { Row: StudentDailyVisitsRow; Update: Partial<StudentDailyVisitsRow> };
      free_youtube_playlist_enrollments: { Row: FreeYoutubePlaylistEnrollmentsRow; Update: Partial<FreeYoutubePlaylistEnrollmentsRow> };
      free_youtube_video_completions: { Row: FreeYoutubeVideoCompletionsRow; Update: Partial<FreeYoutubeVideoCompletionsRow> };
      student_streaks: { Row: StudentStreaksRow; Update: Partial<StudentStreaksRow> };
      course_variants: { Row: CourseVariantsRow; Update: Partial<CourseVariantsRow> };
      course_variant_items: { Row: CourseVariantItemsRow; Update: Partial<CourseVariantItemsRow> };
      course_bundles: { Row: CourseBundlesRow; Update: Partial<CourseBundlesRow> };
      bundle_items: { Row: BundleItemsRow; Update: Partial<BundleItemsRow> };
      bundle_item_selected_items: { Row: BundleSelectedItemRow; Update: Partial<BundleSelectedItemRow> };
      bundle_resolved_items: { Row: BundleResolvedItemRow; Update: Partial<BundleResolvedItemRow> };
      content_assignments: { Row: ContentAssignmentsRow; Update: Partial<ContentAssignmentsRow> };
      lesson_resources: { Row: LessonResourcesRow; Update: Partial<LessonResourcesRow> };
      student_lesson_notes: { Row: StudentLessonNotesRow; Update: Partial<StudentLessonNotesRow> };
      student_lesson_bookmarks: { Row: StudentLessonBookmarksRow; Update: Partial<StudentLessonBookmarksRow> };
      video_watch_sessions: { Row: VideoWatchSessionsRow; Update: Partial<VideoWatchSessionsRow> };
      video_watch_segments: { Row: VideoWatchSegmentsRow; Update: Partial<VideoWatchSegmentsRow> };
      student_video_progress: { Row: StudentVideoProgressRow; Update: Partial<StudentVideoProgressRow> };
      video_watch_events: { Row: VideoWatchEventsRow; Update: Partial<VideoWatchEventsRow> };
      job_posts: { Row: JobPostsRow; Update: Partial<JobPostsRow> };
      job_post_colleges: { Row: JobPostCollegesRow; Update: Partial<JobPostCollegesRow> };
      job_applications: { Row: JobApplicationsRow; Update: Partial<JobApplicationsRow> };
      job_application_status_history: { Row: JobApplicationStatusHistoryRow; Update: Partial<JobApplicationStatusHistoryRow> };
      note_collections: { Row: NoteCollectionsRow; Update: Partial<NoteCollectionsRow> };
      note_modules: { Row: NoteModulesRow; Update: Partial<NoteModulesRow> };
      note_pages: { Row: NotePagesRow; Update: Partial<NotePagesRow> };
      note_course_links: { Row: NoteCourseLinksRow; Update: Partial<NoteCourseLinksRow> };
      course_resource_sections: { Row: CourseResourceSectionsRow; Update: Partial<CourseResourceSectionsRow> };
      course_resource_items: { Row: CourseResourceItemsRow; Update: Partial<CourseResourceItemsRow> };
      student_note_entitlements: { Row: StudentNoteEntitlementsRow; Update: Partial<StudentNoteEntitlementsRow> };
      note_payment_orders: { Row: NotePaymentOrdersRow; Update: Partial<NotePaymentOrdersRow> };
    };
    Views: {
      v_daily_watch_analytics: { Row: VDailyWatchAnalyticsRow };
      v_weekly_watch_analytics: { Row: VWeeklyWatchAnalyticsRow };
      v_course_watch_summary: { Row: VCourseWatchSummaryRow };
    };
  };
}
