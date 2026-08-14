import type { PaidCourseLandingMetadataRow } from '@/lib/services/paid-course-landing-metadata';

const PREVIEW_URL_PATTERN =
  /^(https?:\/\/)([\w-]+\.)+[\w-]+(\/[\w\-._~:/?#[\]@!$&'()*+,;=%]*)?$/i;

export function validatePreviewVideoUrl(url: string | null | undefined): string | null {
  const trimmed = (url ?? '').trim();
  if (!trimmed) return null;
  if (!PREVIEW_URL_PATTERN.test(trimmed)) {
    return 'Preview video URL must be a valid http(s) URL';
  }
  return null;
}

export function isPaidProductMetadataComplete(
  metadata: Partial<PaidCourseLandingMetadataRow> | null | undefined,
): { ok: boolean; missing: string[] } {
  const missing: string[] = [];
  if (!metadata?.title?.trim()) missing.push('title');
  if (!metadata?.slug?.trim()) missing.push('slug');
  if (!metadata?.short_description?.trim() && !metadata?.description?.trim()) {
    missing.push('description');
  }
  if (!metadata?.cover_image_url?.trim() && !metadata?.thumbnail_url?.trim()) {
    missing.push('cover or thumbnail image');
  }
  return { ok: missing.length === 0, missing };
}
