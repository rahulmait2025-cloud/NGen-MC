/**
 * Database types matching Supabase schema (Phase 5).
 * Regenerate or extend when schema changes.
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

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
  plan_id?: string | null;
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
export type CollegeMembershipStatus = 'active' | 'inactive' | 'invited';

export interface CollegeMembershipsRow {
  id: string;
  user_id: string;
  college_id: string;
  role: CollegeMembershipRole;
  status: CollegeMembershipStatus;
  created_at: string;
}

export interface StudentsRow {
  id: string;
  user_id: string;
  college_id: string;
  student_code: string | null;
  cohort_id: string | null;
  program_id: string | null;
  year_or_semester: string | null;
  github_url: string | null;
  linkedin_url: string | null;
  resume_url: string | null;
  placement_ready_status: string | null;
  created_at: string;
  updated_at: string;
}

/** public.non_partnered_students (migration 00056). */
export interface NonPartneredStudentsRow {
  id: string;
  student_id: string;
  user_id: string;
  self_reported_college_name: string | null;
  status: 'active' | 'inactive';
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

// ─── Shared Enums ────────────────────────────────────────────────────────────

export type PricingModel = 'one_time' | 'subscription_ready' | 'per_seat' | 'free' | 'invite_only';

// ─── Phase 2B: TPStreams-centered Master Courses ─────────────────────────────

export type MasterCoursePublishStatus = 'draft' | 'published' | 'unpublished';
export type MasterCourseTpFolderStatus = 'pending' | 'created' | 'failed';
export type MasterCourseKind = 'platform' | 'free_course';
export type MasterCourseItemVideoSource = 'tpstreams' | 'youtube';

// ─── Phase 1: Bootcamps ─────────────────────────────────────────────────────

export type BootcampPublishStatus = 'draft' | 'published' | 'archived';
export type BootcampLifecycleStatus = 'active' | 'inactive';
export type BootcampTpFolderStatus = 'pending' | 'created' | 'failed';
export type BootcampCatalogType = 'pillar' | 'bootcamp' | 'free_course';

export interface BootcampsRow {
  id: string;
  code: string;
  slug: string;
  title: string;
  description: string | null;
  short_description: string | null;
  thumbnail_url: string | null;
  cover_image_url: string | null;
  publish_status: BootcampPublishStatus;
  lifecycle_status: BootcampLifecycleStatus;
  sort_order: number;
  tp_folder_status: BootcampTpFolderStatus;
  tp_folder_uuid: string | null;
  tp_folder_title: string | null;
  tp_last_synced_at: string | null;
  tp_last_error: string | null;
  metadata: Record<string, Json>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type BootcampsInsert = Omit<BootcampsRow, 'id' | 'created_at' | 'updated_at' | 'tp_folder_uuid' | 'tp_folder_title' | 'tp_last_synced_at' | 'tp_last_error'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
  tp_folder_uuid?: string | null;
  tp_folder_title?: string | null;
  tp_last_synced_at?: string | null;
  tp_last_error?: string | null;
};

export type BootcampsUpdate = Partial<BootcampsRow>;

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
  code: string;
  title: string;
  slug: string | null;
  description: string | null;
  short_description: string | null;
  pillar: string | null;
  program_tag: string | null;
  course_kind: MasterCourseKind;
  catalog_type: BootcampCatalogType;
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
  pricing_model: PricingModel | null;
  base_price: number | null;
  selling_price: number | null;
  discounted_price: number | null;
  internal_cost: number | null;
  currency: string;
  default_validity_days: number | null;
  is_free: boolean;
  is_invite_only: boolean;
  show_as_paid_course?: boolean;
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

export interface MasterCoursePillarStatsRow {
  pillar_id: string;
  title: string;
  code: string;
  slug: string;
  description: string | null;
  short_description: string | null;
  publish_status: MasterCoursePublishStatus;
  visible_to_college_admins: boolean;
  visible_to_college_students: boolean;
  visible_to_global_students: boolean;
  tp_folder_status: MasterCourseTpFolderStatus;
  tp_folder_uuid: string | null;
  tp_last_synced_at: string | null;
  tp_last_error: string | null;
  course_count: number;

  module_count: number;
  video_count: number;
}

export type MasterCourseItemType = 'video' | 'document' | 'resource' | 'assignment_placeholder' | 'quiz_placeholder' | 'link' | 'note' | 'worksheet' | 'pdf' | 'markdown' | 'external_link';

export interface MasterCourseDeliveryStatsRow {
  master_course_id: string;
  module_count: number;
  lesson_count: number;
  video_count: number;
  total_duration_seconds: number;
  updated_at: string | null;
}

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
  video_source: MasterCourseItemVideoSource;
  video_asset_id: string | null;
  youtube_video_id: string | null;
  youtube_playlist_id: string | null;
  youtube_original_title: string | null;
  youtube_thumbnail_url: string | null;
  youtube_position: number | null;
  youtube_channel_id: string | null;
  youtube_published_at: string | null;
  external_metadata: Record<string, Json>;
  is_preview: boolean;
  is_required: boolean;
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

export interface CourseResourceWithItem extends CourseResourcesRow {
  attached_item_title?: string | null;
}

// ─── Course Resource Sections (new structured system) ──────────────────────

export type CourseResourceScopeType = 'course' | 'module' | 'item';
export type CourseResourceItemKind = 'external_link' | 'note_collection' | 'markdown_text' | 'file_link' | 'excalidraw_link';

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

// ─── Notes Library ───────────────────────────────────────────────────────

export type NoteCollectionSourceType = 'standalone' | 'course_linked';
export type NoteCollectionCatalogVisibility = 'public_catalog' | 'hidden_course_attached';

export interface NoteCollectionsRow {
  id: string;
  title: string;
  slug: string;
  short_description: string | null;
  description_md: string | null;
  cover_image_path: string | null;
  publish_status: string;
  pricing_model: string;
  price_minor: number;
  currency: string;
  validity_days: number | null;
  source_master_course_id: string | null;
  source_type: NoteCollectionSourceType;
  catalog_visibility: NoteCollectionCatalogVisibility;
  visibility_scope: string;
  created_by: string | null;
  deleted_at: string | null;
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

// ─── Phase 4: Student Delivery Runtime ───────────────────────────────────────

export type EntitlementSourceType =
  | 'b2b_college'
  | 'b2c_direct'
  | 'bundle'
  | 'subscription'
  | 'manual_grant'
  | 'free_course';
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

// ─── Phase 5: Course Variants / Bundles / Assignments ────────────────────────

export type CatalogVisibilityScope = 'private' | 'global' | 'selected_colleges';

export type CourseVariantPublishStatus = 'draft' | 'published' | 'unpublished';

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
  show_as_paid_course?: boolean;
  created_for_college_id: string | null;
  visibility_metadata: Json | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
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

export interface CourseVariantVisibilityCollegesRow {
  id: string;
  variant_id: string;
  college_id: string;
  created_at: string;
  created_by: string | null;
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
  visibility_scope: CatalogVisibilityScope;
  created_for_college_id: string | null;
  visibility_metadata: Json | null;
  landing_card_title: string | null;
  landing_card_description: string | null;
  landing_badge_label: string | null;
  landing_badge_variant: string | null;
  landing_highlights: Json;
  landing_footer_note: string | null;
  landing_hero_title: string | null;
  landing_hero_subtitle: string | null;
  landing_outcomes: Json;
  landing_audience_points: Json;
  show_on_lms_catalog: boolean;
  show_on_lms_curated: boolean;
  curated_sort_order: number | null;
  catalog_sort_order: number | null;
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

export interface CourseBundleVisibilityCollegesRow {
  id: string;
  bundle_id: string;
  college_id: string;
  created_at: string;
  created_by: string | null;
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
  master_course_id: string | null;
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

// ─── Phase 6A: Commerce Core — Orders, Payments, Coupons ─────────────────────

export type OrderStatus = 'pending' | 'paid' | 'failed' | 'cancelled' | 'refunded';
export type PaymentStatus = 'initiated' | 'authorized' | 'captured' | 'failed' | 'refunded';
export type PurchaseSource = 'lms' | 'college_admin';
export type SellableEntityType = 'course_variant' | 'course_bundle' | 'master_course' | 'paid_mentorship_booking' | 'note_collection';
export type CouponDiscountType = 'fixed' | 'percentage';
export type CouponStatus = 'active' | 'expired' | 'exhausted' | 'disabled';

export interface OrdersRow {
  id: string;
  entity_type: SellableEntityType;
  entity_id: string;
  purchaser_user_id: string | null;
  purchaser_email: string;
  purchaser_name: string | null;
  source: PurchaseSource;
  base_amount_minor: number;
  discount_amount_minor: number;
  total_amount_minor: number;
  currency: string;
  coupon_code: string | null;
  status: OrderStatus;
  gateway_name: string;
  gateway_order_id: string | null;
  gateway_payment_id: string | null;
  gateway_signature: string | null;
  metadata: Record<string, unknown>;
  idempotency_key: string | null;
  offer_id: string | null;
  price_plan_id: string | null;
  created_at: string;
  updated_at: string;
  paid_at: string | null;
  cancelled_at: string | null;
  refunded_at: string | null;
}

export type OrdersInsert = Omit<OrdersRow, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type OrdersUpdate = Partial<Omit<OrdersRow, 'id' | 'created_at'>>;

export interface OrderItemsRow {
  id: string;
  order_id: string;
  entity_type: SellableEntityType;
  entity_id: string;
  unit_amount_minor: number;
  discount_amount_minor: number;
  total_amount_minor: number;
  currency: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface PaymentsRow {
  id: string;
  order_id: string;
  gateway_name: string;
  gateway_payment_id: string | null;
  gateway_order_id: string | null;
  gateway_signature: string | null;
  amount_minor: number;
  currency: string;
  status: PaymentStatus;
  method: string | null;
  gateway_payload: Record<string, unknown>;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  captured_at: string | null;
  failed_at: string | null;
  failure_reason: string | null;
  refunded_at: string | null;
}

export interface CouponsRow {
  id: string;
  code: string;
  description: string | null;
  discount_type: CouponDiscountType;
  discount_value: number;
  max_uses: number | null;
  uses_count: number;
  max_uses_per_user: number;
  valid_from: string;
  valid_until: string | null;
  status: CouponStatus;
  applicable_entity_types: SellableEntityType[];
  applicable_entity_ids: string[] | null;
  min_order_amount_minor: number | null;
  applicable_sources: PurchaseSource[];
  metadata: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  disabled_at: string | null;
  disabled_reason: string | null;
}

export interface CouponUsagesRow {
  id: string;
  coupon_id: string;
  order_id: string;
  purchaser_user_id: string | null;
  purchaser_email: string;
  discount_amount_minor: number;
  created_at: string;
}

export interface RefundEventsRow {
  id: string;
  order_id: string;
  payment_id: string | null;
  gateway_refund_id: string | null;
  amount_minor: number;
  currency: string;
  status: string;
  initiated_by: string | null;
  reason: string | null;
  gateway_payload: Record<string, unknown>;
  metadata: Record<string, unknown>;
  created_at: string;
  processed_at: string | null;
  completed_at: string | null;
  failed_at: string | null;
  failure_reason: string | null;
}

export interface WebhookAuditLogsRow {
  id: string;
  provider: string;
  event_type: string;
  event_id: string;
  raw_payload: Record<string, unknown>;
  signature_valid: boolean;
  processing_status: string;
  error_message: string | null;
  processed_at: string | null;
  created_at: string;
}

// ─── Phase 2A: Course Access Requests & Offers ───────────────────────────────

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

// ─── Phase 6B: Platform Announcements ─────────────────────────────────────────

export type AnnouncementType = 'text' | 'coupon' | 'custom_html';

export interface PlatformAnnouncementsRow {
  id: string;
  type: AnnouncementType;
  title: string;
  message: string | null;
  html_content: string | null;
  cta_label: string | null;
  cta_url: string | null;
  coupon_id: string | null;
  is_active: boolean;
  starts_at: string;
  expires_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Database Type ──────────────────────────────────────────────────────────────

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

export interface Database {
  public: {
    Tables: {
      colleges: { Row: CollegesRow; Insert: Omit<CollegesRow, 'created_at' | 'updated_at'> & { created_at?: string; updated_at?: string }; Update: Partial<CollegesRow> };
      profiles: { Row: ProfilesRow; Insert: Omit<ProfilesRow, 'created_at' | 'updated_at'> & { created_at?: string; updated_at?: string }; Update: Partial<ProfilesRow> };
      college_memberships: { Row: CollegeMembershipsRow; Insert: Omit<CollegeMembershipsRow, 'created_at'> & { created_at?: string }; Update: Partial<CollegeMembershipsRow> };
      students: { Row: StudentsRow; Insert: Omit<StudentsRow, 'created_at' | 'updated_at'> & { created_at?: string; updated_at?: string }; Update: Partial<StudentsRow> };
      non_partnered_students: {
        Row: NonPartneredStudentsRow;
        Insert: Omit<NonPartneredStudentsRow, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<NonPartneredStudentsRow>;
      };
      assessments: { Row: AssessmentRow; Insert: Omit<AssessmentRow, 'id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string }; Update: Partial<AssessmentRow> };
      assessment_sections: { Row: AssessmentSectionRow; Insert: Omit<AssessmentSectionRow, 'id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string }; Update: Partial<AssessmentSectionRow> };
      assessment_questions: { Row: AssessmentQuestionRow; Insert: Omit<AssessmentQuestionRow, 'id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string }; Update: Partial<AssessmentQuestionRow> };
      assessment_options: { Row: AssessmentOptionRow; Insert: Omit<AssessmentOptionRow, 'id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string }; Update: Partial<AssessmentOptionRow> };
      assessment_assignments: { Row: AssessmentAssignmentRow; Insert: Omit<AssessmentAssignmentRow, 'id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string }; Update: Partial<AssessmentAssignmentRow> };
      assessment_attempts: { Row: AssessmentAttemptRow; Insert: Omit<AssessmentAttemptRow, 'id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string }; Update: Partial<AssessmentAttemptRow> };
      assessment_responses: { Row: AssessmentResponseRow; Insert: Omit<AssessmentResponseRow, 'id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string }; Update: Partial<AssessmentResponseRow> };
      assessment_results: { Row: AssessmentResultRow; Insert: Omit<AssessmentResultRow, 'id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string }; Update: Partial<AssessmentResultRow> };
      assessment_reviews: { Row: AssessmentReviewRow; Insert: Omit<AssessmentReviewRow, 'id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string }; Update: Partial<AssessmentReviewRow> };
      master_course_pillars: { Row: MasterCoursePillarsRow; Insert: Omit<MasterCoursePillarsRow, 'id' | 'created_at' | 'updated_at' | 'tp_folder_uuid' | 'tp_folder_title' | 'tp_last_synced_at' | 'tp_last_error'> & { id?: string; created_at?: string; updated_at?: string; tp_folder_uuid?: string | null; tp_folder_title?: string | null; tp_last_synced_at?: string | null; tp_last_error?: string | null }; Update: Partial<MasterCoursePillarsRow> };
      bootcamps: { Row: BootcampsRow; Insert: BootcampsInsert; Update: BootcampsUpdate };
      master_courses: { Row: MasterCoursesRow; Insert: Omit<MasterCoursesRow, 'id' | 'created_at' | 'updated_at' | 'pillar_id' | 'bootcamp_id' | 'slug' | 'course_kind' | 'catalog_type' | 'tp_folder_uuid' | 'tp_folder_title' | 'tp_last_synced_at' | 'tp_last_error' | 'pricing_model' | 'base_price' | 'selling_price' | 'discounted_price' | 'internal_cost' | 'currency' | 'default_validity_days' | 'is_free' | 'is_invite_only'> & { id?: string; created_at?: string; updated_at?: string; pillar_id?: string | null; bootcamp_id?: string | null; slug?: string | null; course_kind?: MasterCourseKind; catalog_type?: BootcampCatalogType; tp_folder_uuid?: string | null; tp_folder_title?: string | null; tp_last_synced_at?: string | null; tp_last_error?: string | null; pricing_model?: PricingModel | null; base_price?: number | null; selling_price?: number | null; discounted_price?: number | null; internal_cost?: number | null; currency?: string; default_validity_days?: number | null; is_free?: boolean; is_invite_only?: boolean }; Update: Partial<MasterCoursesRow> };
      video_assets: { Row: VideoAssetsRow; Insert: Omit<VideoAssetsRow, 'id' | 'created_at' | 'updated_at' | 'master_course_module_id'> & { id?: string; created_at?: string; updated_at?: string; master_course_module_id?: string | null }; Update: Partial<VideoAssetsRow> };
      master_course_modules: { Row: MasterCourseModulesRow; Insert: Omit<MasterCourseModulesRow, 'id' | 'created_at' | 'updated_at' | 'tp_folder_uuid' | 'tp_folder_title' | 'tp_last_synced_at' | 'tp_last_error'> & { id?: string; created_at?: string; updated_at?: string; tp_folder_uuid?: string | null; tp_folder_title?: string | null; tp_last_synced_at?: string | null; tp_last_error?: string | null }; Update: Partial<MasterCourseModulesRow> };
      master_course_items: { Row: MasterCourseItemsRow; Insert: Omit<MasterCourseItemsRow, 'id' | 'created_at' | 'updated_at' | 'video_source' | 'youtube_video_id' | 'youtube_playlist_id' | 'youtube_original_title' | 'youtube_thumbnail_url' | 'youtube_position' | 'youtube_channel_id' | 'youtube_published_at' | 'external_metadata'> & { id?: string; created_at?: string; updated_at?: string; video_source?: MasterCourseItemVideoSource; youtube_video_id?: string | null; youtube_playlist_id?: string | null; youtube_original_title?: string | null; youtube_thumbnail_url?: string | null; youtube_position?: number | null; youtube_channel_id?: string | null; youtube_published_at?: string | null; external_metadata?: Record<string, Json> }; Update: Partial<MasterCourseItemsRow> };
      student_entitlements: { Row: StudentEntitlementsRow; Insert: Omit<StudentEntitlementsRow, 'id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string }; Update: Partial<StudentEntitlementsRow> };
      student_progress: { Row: StudentProgressRow; Insert: Omit<StudentProgressRow, 'id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string }; Update: Partial<StudentProgressRow> };
      student_video_sessions: { Row: StudentVideoSessionsRow; Insert: Omit<StudentVideoSessionsRow, 'id' | 'created_at'> & { id?: string; created_at?: string }; Update: Partial<StudentVideoSessionsRow> };
      free_youtube_playlist_enrollments: { Row: FreeYoutubePlaylistEnrollmentsRow; Insert: Omit<FreeYoutubePlaylistEnrollmentsRow, 'id' | 'created_at' | 'enrolled_at'> & { id?: string; created_at?: string; enrolled_at?: string }; Update: Partial<FreeYoutubePlaylistEnrollmentsRow> };
      free_youtube_video_completions: { Row: FreeYoutubeVideoCompletionsRow; Insert: Omit<FreeYoutubeVideoCompletionsRow, 'id' | 'created_at' | 'completed_at'> & { id?: string; created_at?: string; completed_at?: string }; Update: Partial<FreeYoutubeVideoCompletionsRow> };
      course_variants: { Row: CourseVariantsRow; Insert: Omit<CourseVariantsRow, 'id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string }; Update: Partial<CourseVariantsRow> };
      course_variant_items: { Row: CourseVariantItemsRow; Insert: Omit<CourseVariantItemsRow, 'id' | 'created_at'> & { id?: string; created_at?: string }; Update: Partial<CourseVariantItemsRow> };
      course_bundles: { Row: CourseBundlesRow; Insert: Omit<CourseBundlesRow, 'id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string }; Update: Partial<CourseBundlesRow> };
      bundle_items: { Row: BundleItemsRow; Insert: Omit<BundleItemsRow, 'id' | 'created_at'> & { id?: string; created_at?: string }; Update: Partial<BundleItemsRow> };
      bundle_item_selected_items: { Row: BundleSelectedItemRow; Insert: Omit<BundleSelectedItemRow, 'id' | 'created_at'> & { id?: string; created_at?: string }; Update: Partial<BundleSelectedItemRow> };
      bundle_resolved_items: { Row: BundleResolvedItemRow; Insert: Omit<BundleResolvedItemRow, 'id' | 'created_at'> & { id?: string; created_at?: string }; Update: Partial<BundleResolvedItemRow> };
      content_assignments: { Row: ContentAssignmentsRow; Insert: Omit<ContentAssignmentsRow, 'id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string }; Update: Partial<ContentAssignmentsRow> };
      course_access_requests: { Row: CourseAccessRequestsRow; Insert: Omit<CourseAccessRequestsRow, 'id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string }; Update: Partial<CourseAccessRequestsRow> };
      course_access_offers: { Row: CourseAccessOffersRow; Insert: Omit<CourseAccessOffersRow, 'id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string }; Update: Partial<CourseAccessOffersRow> };
      course_price_plans: { Row: CoursePricePlansRow; Insert: Omit<CoursePricePlansRow, 'id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string }; Update: Partial<CoursePricePlansRow> };
      job_posts: { Row: JobPostsRow; Insert: Omit<JobPostsRow, 'id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string }; Update: Partial<JobPostsRow> };
      job_post_colleges: { Row: JobPostCollegesRow; Insert: JobPostCollegesRow; Update: Partial<JobPostCollegesRow> };
      job_applications: { Row: JobApplicationsRow; Insert: Omit<JobApplicationsRow, 'id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string }; Update: Partial<JobApplicationsRow> };
      job_application_status_history: { Row: JobApplicationStatusHistoryRow; Insert: Omit<JobApplicationStatusHistoryRow, 'id' | 'created_at'> & { id?: string; created_at?: string }; Update: Partial<JobApplicationStatusHistoryRow> };
      platform_announcements: { Row: PlatformAnnouncementsRow; Insert: Omit<PlatformAnnouncementsRow, 'id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string }; Update: Partial<PlatformAnnouncementsRow> };
    };
  };
}
