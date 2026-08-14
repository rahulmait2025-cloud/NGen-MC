/**
 * Student runtime types for the LMS delivery layer (Phase 4).
 *
 * Mirrors the SuperAdmin schema types needed by the student-facing codebase.
 * Keep this lightweight — only what the LMS actually consumes.
 */

export type EntitlementSourceType = 'b2b_college' | 'b2c_direct' | 'bundle' | 'subscription' | 'manual_grant';
export type EntitlementStatus = 'active' | 'expired' | 'revoked' | 'suspended';
export type MasterCourseItemType = 'video' | 'document' | 'resource' | 'assignment_placeholder' | 'quiz_placeholder' | 'link' | 'note' | 'worksheet' | 'pdf' | 'markdown' | 'external_link';

export interface StudentEntitlement {
  id: string;
  student_id: string;
  master_course_id: string;
  source_type: EntitlementSourceType;
  college_id: string | null;
  status: EntitlementStatus;
  valid_from: string;
  valid_until: string | null;
  created_at: string;
}

export interface StudentProgress {
  id: string;
  student_id: string;
  item_id: string;
  entitlement_id: string | null;
  watched_seconds: number;
  total_seconds: number;
  last_position_seconds: number;
  completed: boolean;
  completed_at: string | null;
}

export interface CurriculumModule {
  id: string;
  master_course_id: string;
  title: string;
  description: string | null;
  sort_order: number;
  publish_status: string;
  visible_to_students: boolean;
  items: CurriculumItem[];
  created_at?: string;
  updated_at?: string;
}

export interface CurriculumItem {
  id: string;
  module_id: string;
  master_course_id: string;
  title: string;
  slug: string | null;
  description: string | null;
  item_type: MasterCourseItemType;
  sort_order: number;
  publish_status: string;
  video_source?: 'tpstreams' | 'youtube' | null;
  video_asset_id: string | null;
  youtube_video_id?: string | null;
  youtube_playlist_id?: string | null;
  youtube_thumbnail_url?: string | null;
  external_metadata?: Record<string, unknown>;
  preview_enabled: boolean;
  duration_seconds?: number | null;
  resource_id: string | null;
  assessment_id?: string | null;
  quiz_id?: string | null;
  metadata: Record<string, unknown>;
  progress?: StudentProgress | null;
  attached_resources?: import('./database').CourseResourceSummary[];
  markdownContent?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CourseForStudent {
  id: string;
  title: string;
  code: string;
  slug: string | null;
  description: string | null;
  short_description: string | null;
  pillar: string | null;
  is_free: boolean;
  pricing_model: string | null;
  publish_status: string;
  metadata?: Record<string, unknown>;
  modules: CurriculumModule[];
}

/** Mirrors video_assets.content_protection_type — informs LMS playback troubleshooting (DRM vs AES). */
export type VideoContentProtectionType = 'drm' | 'aes' | 'disable' | null;

/** Returned from playback token generation */
export interface PlaybackTokenResult {
  embedUrl: string;
  tokenCode?: string;
  expiresAt: string | null;
  videoAssetId?: string;
  /** From Supabase video_assets; DRM often needs Chrome/Edge (Widevine) or Safari (FairPlay). */
  contentProtectionType?: VideoContentProtectionType;
  playbackToken?: string;
}
