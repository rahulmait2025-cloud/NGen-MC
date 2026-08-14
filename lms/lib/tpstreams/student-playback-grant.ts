import 'server-only';
import { requireSensitiveStudentRuntime } from '@/lib/student-runtime/runtime';
import { createAdminClient } from '@/lib/supabase/admin';
import { validatePlayerCourseAccess } from '@/lib/services/course-access-manager';
import { assertItemInVariantLearnScope } from '@/lib/services/variant-learn-scope';
import { createAccessToken, buildEmbedUrl } from './access-tokens';
import { getTpStreamsOrgId } from './client';
import { generatePlaybackToken } from '@/lib/security/playback-token';
import { StudentRuntimeError } from '@/lib/student-runtime/errors';
import { logDiagnostic, redactId } from '@/lib/student-runtime/diagnostics';
import { isValidUuid } from '@/lib/student-runtime/identity';
import type { TpAccessToken, TpAnnotation } from './types';

// Bounded TTL parameters: 2 hours default, 24 hours max
const DEFAULT_TTL_SECONDS = 2 * 60 * 60;
const MAX_TTL_SECONDS = 24 * 60 * 60;

/**
 * Returns the token TTL in seconds based on environment override or safe default.
 */
export function getPlaybackTtlSeconds(): number {
  const envVal = process.env.TPSTREAMS_TOKEN_TTL_SECONDS;
  if (envVal) {
    const parsed = parseInt(envVal, 10);
    if (Number.isInteger(parsed) && parsed > 0) {
      return Math.min(parsed, MAX_TTL_SECONDS);
    }
  }
  return DEFAULT_TTL_SECONDS;
}

/**
 * Redacts query parameters (such as access_token) from public URL string before logging.
 */
export function redactPlaybackUrl(urlStr: string): string {
  try {
    const url = new URL(urlStr);
    if (url.searchParams.has('access_token')) {
      url.searchParams.set('access_token', '<redacted>');
    }
    return url.toString();
  } catch {
    return '[invalid-url]';
  }
}

/**
 * Helper to validate the incoming TPStreams playback URL format.
 */
export function validateTpStreamsPlaybackUrl(
  urlStr: string,
  orgId: string,
  assetId: string
): boolean {
  try {
    const url = new URL(urlStr);
    if (url.protocol !== 'https:') return false;
    if (url.host !== 'app.tpstreams.com') return false;
    const normalizedPath = url.pathname.endsWith('/') ? url.pathname : `${url.pathname}/`;
    return normalizedPath === `/embed/${orgId}/${assetId}/`;
  } catch {
    return false;
  }
}

/**
 * Helper to mask student emails for display inside the secure moving watermark.
 */
function maskEmail(email: string | null): string {
  if (!email) return '';
  const parts = email.split('@');
  if (parts.length !== 2) return '';
  const [local, domain] = parts;
  if (local.length <= 2) {
    return `${local[0]}*@${domain}`;
  }
  return `${local[0]}***${local[local.length - 1]}@${domain}`;
}

import type { VideoContentProtectionType } from '@/types/student-runtime';

export type PlaybackGrantResponse = {
  embedUrl: string;
  expiresAt: string;
  videoAssetId: string;
  contentProtectionType: VideoContentProtectionType;
  playbackToken: string;
};

/**
 * Single canonical server-only function to resolve a sensitive session,
 * validate course entitlement freshly, create a TPStreams token with a server watermark,
 * and issue a signed LMS playback grant.
 */
export async function issueStudentPlaybackGrant(
  collegeSlug: string,
  videoAssetId: string,
  options?: {
    variantId?: string | null;
    courseId?: string | null;
    lessonId?: string | null;
  }
): Promise<PlaybackGrantResponse> {
  if (!videoAssetId || !isValidUuid(videoAssetId)) {
    throw new StudentRuntimeError(400, 'SENSITIVE_AUTHORIZATION_FAILED', 'Invalid video asset ID.');
  }

  // 1. Resolve Auth once using Sensitive Assurance
  const runtime = await requireSensitiveStudentRuntime(collegeSlug);
  const studentId = runtime.student.studentId;
  const userId = runtime.identity.userId;
  const collegeId = runtime.tenant.collegeId;

  logDiagnostic(`sensitive-session-check-accepted: userId=${redactId(userId)}`);

  const sb = createAdminClient();

  // 2. Freshly fetch the video asset (bypassing any server caches)
  const { data: asset, error: assetError } = await sb
    .from('video_assets')
    .select('id, master_course_id, master_course_module_id, module_id, title, duration_seconds, tp_asset_id, sync_status, processing_status, content_protection_type')
    .eq('id', videoAssetId)
    .maybeSingle();

  if (assetError || !asset) {
    logDiagnostic(`sensitive-authorization-denied: Video asset not found. assetId=${redactId(videoAssetId)}`);
    throw new StudentRuntimeError(404, 'SENSITIVE_AUTHORIZATION_FAILED', 'Video asset not found.');
  }

  if (asset.sync_status !== 'active' || asset.processing_status !== 'completed' || !asset.tp_asset_id) {
    logDiagnostic(`sensitive-authorization-denied: Video asset is not active or missing TPStreams ID.`);
    throw new StudentRuntimeError(403, 'SENSITIVE_AUTHORIZATION_FAILED', 'Video asset is not active.');
  }

  const courseId = asset.master_course_id;
  const requestedCourseId = options?.courseId?.trim() || null;
  const requestedLessonId = options?.lessonId?.trim() || null;

  if (requestedCourseId && requestedCourseId !== courseId) {
    logDiagnostic(`sensitive-authorization-denied: Requested course does not match video asset course.`);
    throw new StudentRuntimeError(403, 'SENSITIVE_AUTHORIZATION_FAILED', 'Video does not belong to the requested course.');
  }

  // 3. Freshly fetch the master course
  const { data: course, error: courseError } = await sb
    .from('master_courses')
    .select('id, title, publish_status, visible_to_global_students, visible_to_college_students, course_kind, is_free, pricing_model')
    .eq('id', courseId)
    .maybeSingle();

  if (courseError || !course || course.publish_status !== 'published') {
    logDiagnostic(`sensitive-authorization-denied: Course not found or inactive. courseId=${redactId(courseId)}`);
    throw new StudentRuntimeError(404, 'SENSITIVE_AUTHORIZATION_FAILED', 'Course not found or inactive.');
  }

  // 4. Freshly fetch the course item (lesson) mapping video_assets to course
  let itemQuery = sb
    .from('master_course_items')
    .select('id, module_id, master_course_id, title, video_asset_id, publish_status')
    .eq('video_asset_id', videoAssetId)
    .eq('master_course_id', courseId)
    .eq('publish_status', 'published');

  if (requestedLessonId) {
    itemQuery = itemQuery.eq('id', requestedLessonId);
  }

  const { data: item, error: itemError } = await itemQuery.maybeSingle();

  if (itemError || !item) {
    logDiagnostic(`sensitive-authorization-denied: Lesson item not found.`);
    throw new StudentRuntimeError(404, 'SENSITIVE_AUTHORIZATION_FAILED', 'Lesson item not found.');
  }

  const lessonId = item.id;

  // 5. Freshly fetch module and check visibility
  const { data: mod, error: modError } = await sb
    .from('master_course_modules')
    .select('id, publish_status, visible_to_students')
    .eq('id', item.module_id)
    .eq('master_course_id', courseId)
    .eq('publish_status', 'published')
    .maybeSingle();

  if (modError || !mod || mod.visible_to_students === false) {
    logDiagnostic(`sensitive-authorization-denied: Lesson module is not visible to students.`);
    throw new StudentRuntimeError(403, 'SENSITIVE_AUTHORIZATION_FAILED', 'Lesson module is not visible.');
  }

  const assetModuleId = asset.master_course_module_id ?? asset.module_id;
  if (assetModuleId && assetModuleId !== mod.id) {
    logDiagnostic(`sensitive-authorization-denied: Asset module mismatch.`);
    throw new StudentRuntimeError(403, 'SENSITIVE_AUTHORIZATION_FAILED', 'Asset module mismatch.');
  }

  // 6. Entitlement validation must match the course player shell. Do not
  // re-check simple course visibility here: assigned college/bundle/variant
  // access can legitimately play a course hidden from the public catalog.
  const playerAccess = await validatePlayerCourseAccess(
    studentId,
    courseId,
    { isGlobal: runtime.tenant.kind !== 'college', collegeId },
    {
      collegeSlug,
      variantId: options?.variantId ?? null,
      lessonId,
    },
  );

  if (!playerAccess.allowed) {
    logDiagnostic(`sensitive-authorization-denied: ${playerAccess.denyReason ?? 'Playback access denied.'}`);
    throw new StudentRuntimeError(403, 'SENSITIVE_AUTHORIZATION_FAILED', playerAccess.denyReason ?? 'Playback access denied.');
  }

  // 7. Variant scope validation
  const variantId = options?.variantId?.trim() || null;
  if (variantId) {
    const inScope = await assertItemInVariantLearnScope(
      variantId,
      courseId,
      lessonId,
      collegeId
    );
    if (!inScope) {
      logDiagnostic(`sensitive-authorization-denied: Lesson not in variant scope.`);
      throw new StudentRuntimeError(403, 'SENSITIVE_AUTHORIZATION_FAILED', 'Lesson not in variant scope.');
    }
  }

  // 8. Generate dynamic watermark text (student name + masked email)
  const watermarkText = runtime.identity.fullName
    ? `${runtime.identity.fullName} (${maskEmail(runtime.identity.email)})`
    : maskEmail(runtime.identity.email) || 'Student';

  const annotations: TpAnnotation[] = [
    {
      type: 'dynamic',
      text: watermarkText,
      opacity: '0.4',
      color: '#FFFFFF',
      size: 5,
      interval: 5000,
      skip: 2000,
      x: 10,
      y: 10,
    },
  ];

  const ttlSeconds = getPlaybackTtlSeconds();

  // 9. Call TPStreams access token creation POST endpoint (never retried automatically)
  logDiagnostic(`sensitive-authorization-rpc: Calling TPStreams to issue access token for asset=${redactId(asset.tp_asset_id)}`);
  const tpToken: TpAccessToken = await createAccessToken(asset.tp_asset_id, {
    time_to_live: ttlSeconds,
    expires_after_first_usage: false, // Ensure iframe & DRM retries stay functional
    annotations,
  });

  const expiresAt = tpToken.valid_until ?? new Date(Date.now() + ttlSeconds * 1000).toISOString();
  const orgId = getTpStreamsOrgId();

  // Validate upstream play url format
  let finalEmbedUrl = tpToken.playback_url;
  if (!validateTpStreamsPlaybackUrl(finalEmbedUrl, orgId, asset.tp_asset_id)) {
    finalEmbedUrl = buildEmbedUrl(orgId, asset.tp_asset_id, tpToken.code);
  } else {
    const embedUrlObj = new URL(finalEmbedUrl);
    if (!embedUrlObj.searchParams.has('access_token')) {
      embedUrlObj.searchParams.set('access_token', tpToken.code);
      finalEmbedUrl = embedUrlObj.toString();
    }
  }

  // 10. Generate signed LMS playback grant
  const lmsGrantToken = generatePlaybackToken({
    userId,
    studentId,
    tenantKind: runtime.tenant.kind,
    collegeId,
    courseId,
    moduleId: item.module_id,
    lessonId,
    videoAssetId,
    tpAssetId: asset.tp_asset_id,
    version: 'v2',
  }, ttlSeconds);

  logDiagnostic(`sensitive-session-check-accepted: Issued playback grant for student=${redactId(studentId)}, asset=${redactId(videoAssetId)}`);

  return {
    embedUrl: finalEmbedUrl,
    expiresAt,
    videoAssetId,
    contentProtectionType: (asset.content_protection_type as VideoContentProtectionType) ?? null,
    playbackToken: lmsGrantToken,
  };
}
