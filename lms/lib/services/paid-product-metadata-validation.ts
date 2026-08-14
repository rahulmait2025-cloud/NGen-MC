import 'server-only';

/** Minimal paid landing row fields required for public Explore / catalog cards. */
export type PaidLandingMetadataCompletenessInput = {
  title?: string | null;
  slug?: string | null;
  short_description?: string | null;
  description?: string | null;
  cover_image_url?: string | null;
  thumbnail_url?: string | null;
};

export function isPaidProductMetadataComplete(
  metadata: PaidLandingMetadataCompletenessInput | null | undefined,
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
